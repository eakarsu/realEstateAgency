const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { createApp } = require('../src/index');
const { appendAudit } = require('../src/workflow/audit');

const PREFIX = 'review-workflow';
const TEST_PASSWORD = 'WorkflowTestPass!2026';
const emails = {
  admin: `${PREFIX}-admin@example.test`,
  manager: `${PREFIX}-manager@example.test`,
  firstAgent: `${PREFIX}-agent-one@example.test`,
  secondAgent: `${PREFIX}-agent-two@example.test`,
  lead: `${PREFIX}-lead@example.test`,
  suppressed: `${PREFIX}-suppressed@example.test`,
};

let prisma;
let app;
let transportMode = 'success';

function signature(secret, body) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function postWebhook(name, secret, envelope) {
  const body = JSON.stringify(envelope);
  return request(app)
    .post(`/api/workflow/webhooks/${name}`)
    .set('content-type', 'application/json')
    .set('x-workflow-signature', `sha256=${signature(secret, body)}`)
    .send(body);
}

async function cleanup() {
  const leads = await prisma.lead.findMany({ where: { email: { endsWith: '@example.test' } }, select: { id: true, accountId: true } });
  const leadIds = leads.map((lead) => lead.id);
  const accountIds = leads.map((lead) => lead.accountId).filter(Boolean);
  const connections = await prisma.providerConnection.findMany({ where: { name: { startsWith: PREFIX } }, select: { id: true } });
  const connectionIds = connections.map((connection) => connection.id);
  if (connectionIds.length) {
    await prisma.syncEvent.deleteMany({ where: { providerConnectionId: { in: connectionIds } } });
    await prisma.integrationOperation.deleteMany({ where: { providerConnectionId: { in: connectionIds } } });
  }
  if (leadIds.length) {
    await prisma.outreachDelivery.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.outreachDraft.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.leadHandoff.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.leadLifecycleEvent.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.consentRecord.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
  }
  await prisma.suppressionEntry.deleteMany({ where: { normalizedEmail: { in: Object.values(emails) } } });
  if (accountIds.length) await prisma.customerAccount.deleteMany({ where: { id: { in: accountIds } } });
  await prisma.workflowAuditEvent.deleteMany({});
  const users = await prisma.user.findMany({ where: { email: { in: Object.values(emails) } }, include: { agent: true } });
  const agentIds = users.map((user) => user.agent?.id).filter(Boolean);
  if (agentIds.length) await prisma.agent.deleteMany({ where: { id: { in: agentIds } } });
  await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
  if (connectionIds.length) await prisma.providerConnection.deleteMany({ where: { id: { in: connectionIds } } });
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'workflow-test-jwt-secret-at-least-32-characters';
  process.env.CORS_ORIGINS = 'http://127.0.0.1:3001';
  process.env.AGENCY_POSTAL_ADDRESS = '123 Test Street, Austin, TX 78701';
  process.env.REVIEW_WORKFLOW_CRM_TOKEN = 'crm-token';
  process.env.REVIEW_WORKFLOW_CRM_WEBHOOK = 'crm-webhook-secret';
  process.env.REVIEW_WORKFLOW_EMAIL_TOKEN = 'email-token';
  process.env.REVIEW_WORKFLOW_EMAIL_WEBHOOK = 'email-webhook-secret';
  process.env.REVIEW_WORKFLOW_ENRICH_TOKEN = 'enrich-token';
  process.env.REVIEW_WORKFLOW_ENRICH_WEBHOOK = 'enrich-webhook-secret';
  process.env.REVIEW_WORKFLOW_CONSENT_TOKEN = 'consent-token';
  process.env.REVIEW_WORKFLOW_CONSENT_WEBHOOK = 'consent-webhook-secret';
  process.env.REVIEW_WORKFLOW_SUPPRESSION_TOKEN = 'suppression-token';
  process.env.REVIEW_WORKFLOW_SUPPRESSION_WEBHOOK = 'suppression-webhook-secret';
  prisma = new PrismaClient();
  await cleanup();
  app = createApp({
    prisma,
    allowTestProvider: true,
    providerTransport: async () => {
      if (transportMode === 'failure') return new Response('{"error":"temporary"}', { status: 503, headers: { 'content-type': 'application/json' } });
      return new Response('{"id":"provider-message-1"}', { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

test('governs deduplicated sync, ownership, outreach, retries, consent, metrics, and audit end to end', async () => {
  const password = await bcrypt.hash(TEST_PASSWORD, 10);
  const admin = await prisma.user.create({ data: { email: emails.admin, password, firstName: 'Workflow', lastName: 'Admin', role: 'ADMIN' } });
  await prisma.user.create({ data: { email: emails.manager, password, firstName: 'Workflow', lastName: 'Manager', role: 'MANAGER' } });
  const firstAgentUser = await prisma.user.create({ data: { email: emails.firstAgent, password, firstName: 'Agent', lastName: 'One', role: 'AGENT' } });
  const secondAgentUser = await prisma.user.create({ data: { email: emails.secondAgent, password, firstName: 'Agent', lastName: 'Two', role: 'AGENT' } });
  const firstAgent = await prisma.agent.create({ data: { userId: firstAgentUser.id, licenseNumber: `${PREFIX}-1`, specializations: [] } });
  await prisma.agent.create({ data: { userId: secondAgentUser.id, licenseNumber: `${PREFIX}-2`, specializations: [] } });

  async function login(email) {
    const response = await request(app).post('/api/auth/login').send({ email, password: TEST_PASSWORD });
    expect(response.statusCode).toBe(200);
    return response.body.token;
  }
  const adminToken = await login(emails.admin);
  const managerToken = await login(emails.manager);
  const firstAgentToken = await login(emails.firstAgent);

  const definitions = [
    ['crm', 'CRM', 'REVIEW_WORKFLOW_CRM_TOKEN', 'REVIEW_WORKFLOW_CRM_WEBHOOK'],
    ['email', 'EMAIL', 'REVIEW_WORKFLOW_EMAIL_TOKEN', 'REVIEW_WORKFLOW_EMAIL_WEBHOOK'],
    ['enrich', 'ENRICHMENT', 'REVIEW_WORKFLOW_ENRICH_TOKEN', 'REVIEW_WORKFLOW_ENRICH_WEBHOOK'],
    ['consent', 'CONSENT', 'REVIEW_WORKFLOW_CONSENT_TOKEN', 'REVIEW_WORKFLOW_CONSENT_WEBHOOK'],
    ['suppression', 'SUPPRESSION', 'REVIEW_WORKFLOW_SUPPRESSION_TOKEN', 'REVIEW_WORKFLOW_SUPPRESSION_WEBHOOK'],
  ];
  for (const [suffix, type, tokenEnv, webhookSecretEnv] of definitions) {
    const created = await request(app)
      .post('/api/workflow/connections')
      .set('authorization', `Bearer ${adminToken}`)
      .send({ name: `${PREFIX}-${suffix}`, type, baseUrl: `https://${suffix}.provider.example`, tokenEnv, webhookSecretEnv, contractRef: `DPA-${suffix}`, isActive: true });
    expect(created.statusCode).toBe(201);
  }
  await Promise.all(Array.from({ length: 5 }, (_, index) => appendAudit(prisma, {
    entityType: 'ConcurrencyProof', entityId: `${PREFIX}-audit-${index}`, action: 'APPENDED', actorUserId: admin.id, detail: { index },
  })));

  const leadEnvelope = {
    id: `${PREFIX}-event-1`,
    type: 'lead.upsert',
    sourceOccurredAt: new Date(Date.now() - 1_000).toISOString(),
    data: {
      externalId: `${PREFIX}-external-lead`, firstName: 'Taylor', lastName: 'Buyer', email: emails.lead,
      accountName: `${PREFIX} Household`, privacyRegion: 'US_CAN_SPAM', campaign: 'review-proof',
      consent: { status: 'GRANTED', capturedAt: new Date(Date.now() - 2_000).toISOString(), source: 'web-form', purpose: 'property updates', evidence: { formVersion: 1 } },
    },
  };
  const accepted = await postWebhook(`${PREFIX}-crm`, process.env.REVIEW_WORKFLOW_CRM_WEBHOOK, leadEnvelope);
  expect(accepted.statusCode).toBe(202);
  expect(accepted.body.deduplicated).toBe(false);
  const replay = await postWebhook(`${PREFIX}-crm`, process.env.REVIEW_WORKFLOW_CRM_WEBHOOK, leadEnvelope);
  expect(replay.statusCode).toBe(200);
  expect(replay.body.replay).toBe(true);
  const invalidSignature = await request(app).post(`/api/workflow/webhooks/${PREFIX}-crm`).set('x-workflow-signature', 'bad').send(leadEnvelope);
  expect(invalidSignature.statusCode).toBe(401);

  let lead = await prisma.lead.findUnique({ where: { normalizedEmail: emails.lead } });
  expect(lead.attribution.source).toBe(`${PREFIX}-crm`);
  const requested = await request(app)
    .post(`/api/workflow/leads/${lead.id}/handoffs`)
    .set('authorization', `Bearer ${adminToken}`)
    .send({ toAgentId: firstAgent.id, reason: 'Territory owner' });
  expect(requested.statusCode).toBe(201);
  const approved = await request(app)
    .post(`/api/workflow/handoffs/${requested.body.id}/review`)
    .set('authorization', `Bearer ${managerToken}`)
    .send({ decision: 'approve', reason: 'Ownership verified' });
  expect(approved.statusCode).toBe(200);
  const acceptedHandoff = await request(app)
    .post(`/api/workflow/handoffs/${requested.body.id}/accept`)
    .set('authorization', `Bearer ${firstAgentToken}`);
  expect(acceptedHandoff.statusCode).toBe(200);

  lead = await prisma.lead.findUnique({ where: { id: lead.id } });
  const qualified = await request(app)
    .patch(`/api/workflow/leads/${lead.id}/lifecycle`)
    .set('authorization', `Bearer ${firstAgentToken}`)
    .send({ lifecycle: 'QUALIFIED', expectedVersion: lead.version, reason: 'Budget and timeline confirmed' });
  expect(qualified.statusCode).toBe(200);

  const draft = await request(app)
    .post(`/api/workflow/leads/${lead.id}/outreach`)
    .set('authorization', `Bearer ${firstAgentToken}`)
    .send({ subject: 'Matching homes', body: 'Here are the reviewed properties matching your stated criteria.' });
  expect(draft.statusCode).toBe(201);
  const reviewed = await request(app)
    .post(`/api/workflow/outreach/${draft.body.id}/review`)
    .set('authorization', `Bearer ${managerToken}`)
    .send({ decision: 'approve', reason: 'Consent and content verified' });
  expect(reviewed.statusCode).toBe(200);

  const run = await request(app).post('/api/workflow/operations/run').set('authorization', `Bearer ${managerToken}`).send({ limit: 25 });
  expect(run.statusCode).toBe(200);
  expect(run.body.succeeded).toBeGreaterThanOrEqual(3);
  const delivery = await prisma.outreachDelivery.findUnique({ where: { idempotencyKey: `email:${draft.body.id}` } });
  expect(delivery.status).toBe('SENT');

  const crm = await prisma.providerConnection.findUnique({ where: { name: `${PREFIX}-crm` } });
  const retryOperation = await prisma.integrationOperation.create({
    data: { providerConnectionId: crm.id, leadId: lead.id, kind: 'CRM_UPSERT', payload: { proof: 'retry' }, idempotencyKey: `${PREFIX}-retry` },
  });
  transportMode = 'failure';
  const failedRun = await request(app).post('/api/workflow/operations/run').set('authorization', `Bearer ${managerToken}`).send({ limit: 25 });
  expect(failedRun.body.retried).toBe(1);
  await prisma.integrationOperation.update({ where: { id: retryOperation.id }, data: { nextAttemptAt: new Date(0) } });
  transportMode = 'success';
  const retriedRun = await request(app).post('/api/workflow/operations/run').set('authorization', `Bearer ${managerToken}`).send({ limit: 25 });
  expect(retriedRun.body.succeeded).toBe(1);

  const revokedEnvelope = {
    id: `${PREFIX}-consent-1`, type: 'consent.updated', sourceOccurredAt: new Date().toISOString(),
    data: { email: emails.lead, status: 'REVOKED', source: 'preference-center', purpose: 'property updates', evidence: { requestId: `${PREFIX}-optout` } },
  };
  const revoked = await postWebhook(`${PREFIX}-consent`, process.env.REVIEW_WORKFLOW_CONSENT_WEBHOOK, revokedEnvelope);
  expect(revoked.statusCode).toBe(202);
  expect(await prisma.suppressionEntry.findUnique({ where: { normalizedEmail: emails.lead } })).toBeTruthy();
  const secondDraft = await request(app)
    .post(`/api/workflow/leads/${lead.id}/outreach`)
    .set('authorization', `Bearer ${firstAgentToken}`)
    .send({ subject: 'Must not send', body: 'This message should be blocked after opt-out.' });
  expect(secondDraft.statusCode).toBe(201);
  const blocked = await request(app)
    .post(`/api/workflow/outreach/${secondDraft.body.id}/review`)
    .set('authorization', `Bearer ${managerToken}`)
    .send({ decision: 'approve', reason: 'Negative control' });
  expect(blocked.statusCode).toBe(409);

  const suppressionEnvelope = {
    id: `${PREFIX}-suppression-1`, type: 'suppression.created', sourceOccurredAt: new Date().toISOString(),
    data: { email: emails.suppressed, reason: 'COMPLAINT' },
  };
  expect((await postWebhook(`${PREFIX}-suppression`, process.env.REVIEW_WORKFLOW_SUPPRESSION_WEBHOOK, suppressionEnvelope)).statusCode).toBe(202);

  const metrics = await request(app).get('/api/workflow/metrics').set('authorization', `Bearer ${managerToken}`);
  expect(metrics.statusCode).toBe(200);
  expect(metrics.body.totalLeads).toBeGreaterThanOrEqual(1);
  expect(metrics.body.dataQuality.suppressed).toBeGreaterThanOrEqual(2);
  const audit = await request(app).get('/api/workflow/audit/verify').set('authorization', `Bearer ${adminToken}`);
  expect(audit.statusCode).toBe(200);
  expect(audit.body.valid).toBe(true);
  expect(audit.body.checked).toBeGreaterThan(0);
  expect(admin.id).toBeTruthy();
});
