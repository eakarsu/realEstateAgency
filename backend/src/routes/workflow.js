const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { appendAudit, verifyAuditChain } = require('../workflow/audit');
const { runDueOperations } = require('../workflow/provider');
const { validateProviderUrl, verifySignature } = require('../workflow/policy');
const {
  acceptHandoff,
  applyWebhook,
  createDraft,
  decideHandoff,
  metrics,
  requestHandoff,
  reviewDraft,
  transitionLead,
} = require('../workflow/service');

const router = express.Router();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post('/webhooks/:connectionName', asyncRoute(async (req, res) => {
  const prisma = req.app.get('prisma');
  const connection = await prisma.providerConnection.findUnique({ where: { name: req.params.connectionName } });
  if (!connection?.isActive) return res.status(404).json({ error: 'Active provider connection not found' });
  const secret = process.env[connection.webhookSecretEnv];
  if (!verifySignature(secret, req.rawBody || Buffer.from(''), req.get('x-workflow-signature'))) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  const result = await applyWebhook(prisma, connection, req.body);
  res.status(result.replay ? 200 : 202).json(result);
}));

router.use(authenticateToken);

router.get('/connections', requireRole('ADMIN', 'MANAGER'), asyncRoute(async (req, res) => {
  const rows = await req.app.get('prisma').providerConnection.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] });
  res.json(rows.map(({ tokenEnv, webhookSecretEnv, ...connection }) => ({ ...connection, tokenConfigured: Boolean(process.env[tokenEnv]), webhookSecretConfigured: Boolean(process.env[webhookSecretEnv]) })));
}));

router.post('/connections', requireRole('ADMIN'), asyncRoute(async (req, res) => {
  const prisma = req.app.get('prisma');
  const { name, type, baseUrl, tokenEnv, webhookSecretEnv, contractRef, isActive = false } = req.body;
  if (!/^[A-Z][A-Z0-9_]{2,80}$/.test(String(tokenEnv || '')) || !/^[A-Z][A-Z0-9_]{2,80}$/.test(String(webhookSecretEnv || ''))) {
    return res.status(400).json({ error: 'Credential references must be uppercase environment variable names' });
  }
  if (!['CRM', 'EMAIL', 'CALENDAR', 'ENRICHMENT', 'CONSENT', 'SUPPRESSION'].includes(type)) return res.status(400).json({ error: 'Unsupported provider type' });
  const normalizedBaseUrl = validateProviderUrl(baseUrl);
  if (!String(contractRef || '').trim()) return res.status(400).json({ error: 'A data-processing contract reference is required' });
  if (isActive && (!process.env[tokenEnv] || !process.env[webhookSecretEnv])) return res.status(409).json({ error: 'Credentials must exist in the environment before activation' });
  const connection = await prisma.providerConnection.create({ data: { name: String(name || '').trim(), type, baseUrl: normalizedBaseUrl, tokenEnv, webhookSecretEnv, contractRef: String(contractRef).trim(), isActive: Boolean(isActive) } });
  await appendAudit(prisma, { entityType: 'ProviderConnection', entityId: connection.id, action: 'CREATED', actorUserId: req.user.id, detail: { name: connection.name, type, baseUrl: normalizedBaseUrl, contractRef, isActive: Boolean(isActive) } });
  res.status(201).json({ id: connection.id, name: connection.name, type: connection.type, isActive: connection.isActive });
}));

router.patch('/leads/:id/lifecycle', requireRole('ADMIN', 'MANAGER', 'AGENT'), asyncRoute(async (req, res) => {
  res.json(await transitionLead(req.app.get('prisma'), req.params.id, req.user, req.body));
}));

router.post('/leads/:id/handoffs', requireRole('ADMIN', 'MANAGER', 'AGENT'), asyncRoute(async (req, res) => {
  res.status(201).json(await requestHandoff(req.app.get('prisma'), req.params.id, req.user, req.body));
}));

router.post('/handoffs/:id/review', requireRole('ADMIN', 'MANAGER'), asyncRoute(async (req, res) => {
  if (!['approve', 'reject'].includes(req.body.decision)) return res.status(400).json({ error: 'decision must be approve or reject' });
  res.json(await decideHandoff(req.app.get('prisma'), req.params.id, req.user, req.body.decision, req.body.reason));
}));

router.post('/handoffs/:id/accept', requireRole('AGENT', 'MANAGER'), asyncRoute(async (req, res) => {
  res.json(await acceptHandoff(req.app.get('prisma'), req.params.id, req.user));
}));

router.post('/leads/:id/outreach', requireRole('ADMIN', 'MANAGER', 'AGENT'), asyncRoute(async (req, res) => {
  res.status(201).json(await createDraft(req.app.get('prisma'), req.params.id, req.user, req.body));
}));

router.post('/outreach/:id/review', requireRole('ADMIN', 'MANAGER'), asyncRoute(async (req, res) => {
  if (!['approve', 'reject'].includes(req.body.decision)) return res.status(400).json({ error: 'decision must be approve or reject' });
  res.json(await reviewDraft(req.app.get('prisma'), req.params.id, req.user, req.body.decision, req.body.reason));
}));

router.get('/queue', requireRole('ADMIN', 'MANAGER'), asyncRoute(async (req, res) => {
  const prisma = req.app.get('prisma');
  const [handoffs, outreach, operations] = await Promise.all([
    prisma.leadHandoff.findMany({ where: { status: { in: ['REQUESTED', 'APPROVED', 'RETRY_REQUIRED'] } }, include: { lead: true, fromAgent: { include: { user: true } }, toAgent: { include: { user: true } } }, orderBy: { createdAt: 'asc' }, take: 100 }),
    prisma.outreachDraft.findMany({ where: { status: 'PENDING_REVIEW' }, include: { lead: true }, orderBy: { createdAt: 'asc' }, take: 100 }),
    prisma.integrationOperation.findMany({ where: { status: { in: ['PENDING', 'PROCESSING', 'RETRY', 'DEAD_LETTER'] } }, include: { providerConnection: { select: { name: true, type: true } } }, orderBy: { createdAt: 'asc' }, take: 100 }),
  ]);
  res.json({ handoffs, outreach, operations });
}));

router.post('/operations/run', requireRole('ADMIN', 'MANAGER'), asyncRoute(async (req, res) => {
  const transport = req.app.get('providerTransport') || fetch;
  const result = await runDueOperations(req.app.get('prisma'), { limit: req.body.limit, transport, skipDnsValidation: Boolean(req.app.get('allowTestProvider')) });
  res.json(result);
}));

router.post('/operations/:id/retry', requireRole('ADMIN'), asyncRoute(async (req, res) => {
  const prisma = req.app.get('prisma');
  const operation = await prisma.integrationOperation.findUnique({ where: { id: req.params.id } });
  if (!operation || operation.status !== 'DEAD_LETTER') return res.status(409).json({ error: 'Only dead-letter operations can be retried' });
  const updated = await prisma.integrationOperation.update({ where: { id: operation.id }, data: { status: 'RETRY', attempts: 0, nextAttemptAt: new Date(), lastError: null } });
  await appendAudit(prisma, { entityType: 'IntegrationOperation', entityId: updated.id, action: 'MANUAL_RETRY', actorUserId: req.user.id, detail: { kind: updated.kind } });
  res.json(updated);
}));

router.get('/metrics', requireRole('ADMIN', 'MANAGER'), asyncRoute(async (req, res) => {
  res.json(await metrics(req.app.get('prisma')));
}));

router.get('/audit/verify', requireRole('ADMIN'), asyncRoute(async (req, res) => {
  const result = await verifyAuditChain(req.app.get('prisma'));
  res.status(result.valid ? 200 : 409).json(result);
}));

router.get('/leads/:id/journey', asyncRoute(async (req, res) => {
  const prisma = req.app.get('prisma');
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      account: true, consentRecords: { orderBy: { capturedAt: 'desc' } }, lifecycleEvents: { orderBy: { createdAt: 'asc' } },
      handoffs: { orderBy: { createdAt: 'asc' } }, outreachDrafts: { include: { deliveries: true }, orderBy: { createdAt: 'asc' } },
      operations: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (req.user.role === 'AGENT' && req.user.agentId !== lead.agentId) return res.status(403).json({ error: 'Lead is owned by another agent' });
  res.json(lead);
}));

module.exports = router;
