const crypto = require('crypto');
const { appendAudit } = require('./audit');
const {
  assertLifecycleTransition,
  isValidEmail,
  normalizeEmail,
  normalizeName,
  sha256,
  stableJson,
} = require('./policy');

function problem(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function requireText(value, name, max = 200) {
  const normalized = String(value || '').trim();
  if (!normalized) throw problem(`${name} is required`);
  if (normalized.length > max) throw problem(`${name} is too long`);
  return normalized;
}

function validateSourceTime(value) {
  const sourceOccurredAt = new Date(value);
  if (Number.isNaN(sourceOccurredAt.getTime())) throw problem('sourceOccurredAt must be an ISO timestamp');
  if (sourceOccurredAt.getTime() > Date.now() + 5 * 60_000) throw problem('sourceOccurredAt is too far in the future');
  return sourceOccurredAt;
}

async function queueOperation(tx, { connection, leadId, kind, payload, idempotencyKey }) {
  if (!connection) return null;
  return tx.integrationOperation.upsert({
    where: { idempotencyKey },
    create: { providerConnectionId: connection.id, leadId, kind, payload, idempotencyKey },
    update: {},
  });
}

async function applyWebhook(prisma, connection, envelope) {
  const externalEventId = requireText(envelope.id, 'event id', 200);
  const eventType = requireText(envelope.type, 'event type', 100);
  const payload = envelope.data || {};
  const sourceOccurredAt = validateSourceTime(envelope.sourceOccurredAt);
  const payloadHash = sha256(stableJson(payload));

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
      const syncEvent = await tx.syncEvent.create({
        data: {
          providerConnectionId: connection.id,
          externalEventId,
          eventType,
          direction: 'INBOUND',
          payloadHash,
          payload,
          sourceOccurredAt,
        },
      });

      let result;
      if (eventType === 'lead.upsert') result = await applyLeadUpsert(tx, connection, payload, sourceOccurredAt, externalEventId);
      else if (eventType === 'consent.updated') result = await applyConsent(tx, payload, sourceOccurredAt, externalEventId);
      else if (eventType === 'suppression.created') result = await applySuppression(tx, payload, sourceOccurredAt, externalEventId);
      else if (eventType === 'email.delivery') result = await applyDelivery(tx, payload, sourceOccurredAt, externalEventId);
      else throw problem(`Unsupported event type ${eventType}`, 422);

      await tx.syncEvent.update({
        where: { id: syncEvent.id },
        data: { status: result.quarantined ? 'QUARANTINED' : 'APPLIED', error: result.error || null, processedAt: new Date() },
      });
      await appendAudit(tx, {
        entityType: 'SyncEvent', entityId: syncEvent.id, action: result.quarantined ? 'QUARANTINED' : 'APPLIED',
        detail: { externalEventId, eventType, result },
      });
      return { replay: false, syncEventId: syncEvent.id, ...result };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error.code === 'P2002') {
        const prior = await prisma.syncEvent.findUnique({
          where: { providerConnectionId_externalEventId: { providerConnectionId: connection.id, externalEventId } },
        });
        if (prior?.payloadHash !== payloadHash) throw problem('Event ID was reused with different content', 409);
        return { replay: true, syncEventId: prior.id, status: prior.status };
      }
      if (error.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
  throw problem('Webhook could not be serialized after three attempts', 503);
}

async function applyLeadUpsert(tx, connection, payload, sourceOccurredAt, eventId) {
  if (connection.type !== 'CRM') throw problem('lead.upsert requires a CRM connection', 422);
  const email = normalizeEmail(payload.email);
  if (!isValidEmail(email)) throw problem('A valid lead email is required');
  const firstName = requireText(payload.firstName, 'firstName', 100);
  const lastName = requireText(payload.lastName, 'lastName', 100);
  if (!['US_CAN_SPAM', 'EU_GDPR', 'CA_CCPA'].includes(payload.privacyRegion)) {
    throw problem('A supported privacyRegion is required');
  }
  const existing = await tx.lead.findUnique({ where: { normalizedEmail: email } });
  if (existing && existing.updatedAt > sourceOccurredAt) {
    return { leadId: existing.id, quarantined: true, error: 'Stale provider update requires human resolution' };
  }

  let account = null;
  if (payload.accountName) {
    const name = requireText(payload.accountName, 'accountName', 200);
    account = await tx.customerAccount.upsert({
      where: { normalizedName: normalizeName(name) },
      create: { name, normalizedName: normalizeName(name), privacyRegion: payload.privacyRegion },
      update: { name, privacyRegion: payload.privacyRegion, version: { increment: 1 } },
    });
  }
  const data = {
    firstName, lastName, email, normalizedEmail: email,
    phone: payload.phone ? String(payload.phone).slice(0, 40) : null,
    privacyRegion: payload.privacyRegion,
    externalCrmId: payload.externalId ? String(payload.externalId).slice(0, 200) : null,
    accountId: account?.id || null,
    attribution: { source: connection.name, campaign: payload.campaign || null, firstTouchEventId: eventId },
  };
  const lead = existing
    ? await tx.lead.update({ where: { id: existing.id }, data: { ...data, version: { increment: 1 } } })
    : await tx.lead.create({ data });

  if (payload.consent) {
    const status = payload.consent.status;
    if (!['GRANTED', 'REVOKED'].includes(status)) throw problem('Consent status must be GRANTED or REVOKED');
    const capturedAt = validateSourceTime(payload.consent.capturedAt);
    await tx.consentRecord.create({
      data: {
        leadId: lead.id, status, source: requireText(payload.consent.source, 'consent source', 100),
        purpose: requireText(payload.consent.purpose, 'consent purpose', 200),
        evidence: payload.consent.evidence || {}, capturedAt,
        revokedAt: status === 'REVOKED' ? capturedAt : null,
      },
    });
    await tx.lead.update({ where: { id: lead.id }, data: { consentStatus: status } });
  }
  const enrichment = await tx.providerConnection.findFirst({ where: { type: 'ENRICHMENT', isActive: true } });
  await queueOperation(tx, {
    connection: enrichment, leadId: lead.id, kind: 'ENRICHMENT_REQUEST',
    payload: { leadId: lead.id, email }, idempotencyKey: `enrich:${lead.id}:${lead.version}`,
  });
  return { leadId: lead.id, deduplicated: Boolean(existing), accountId: account?.id || null };
}

async function applyConsent(tx, payload, sourceOccurredAt, eventId) {
  const email = normalizeEmail(payload.email);
  const lead = await tx.lead.findUnique({ where: { normalizedEmail: email } });
  if (!lead) throw problem('Consent event does not match a lead', 422);
  if (!['GRANTED', 'REVOKED'].includes(payload.status)) throw problem('Consent status must be GRANTED or REVOKED');
  const latest = await tx.consentRecord.findFirst({ where: { leadId: lead.id }, orderBy: { capturedAt: 'desc' } });
  if (latest && latest.capturedAt > sourceOccurredAt) {
    return { leadId: lead.id, quarantined: true, error: 'Stale consent update requires human resolution' };
  }
  await tx.consentRecord.create({
    data: {
      leadId: lead.id, status: payload.status, source: requireText(payload.source, 'source', 100),
      purpose: requireText(payload.purpose, 'purpose', 200), evidence: payload.evidence || { eventId },
      capturedAt: sourceOccurredAt, revokedAt: payload.status === 'REVOKED' ? sourceOccurredAt : null,
    },
  });
  await tx.lead.update({ where: { id: lead.id }, data: { consentStatus: payload.status, version: { increment: 1 } } });
  if (payload.status === 'REVOKED') await suppressLead(tx, lead, 'CONSENT_REVOKED', 'consent-webhook', sourceOccurredAt);
  return { leadId: lead.id, consentStatus: payload.status };
}

async function suppressLead(tx, lead, reason, source, occurredAt) {
  await tx.suppressionEntry.upsert({
    where: { normalizedEmail: lead.normalizedEmail },
    create: { normalizedEmail: lead.normalizedEmail, reason, source, occurredAt },
    update: { reason, source, occurredAt },
  });
  await tx.integrationOperation.updateMany({
    where: { leadId: lead.id, kind: 'EMAIL_SEND', status: { in: ['PENDING', 'RETRY'] } },
    data: { status: 'CANCELLED', lastError: `Cancelled: ${reason}` },
  });
  await tx.outreachDelivery.updateMany({
    where: { leadId: lead.id, status: 'QUEUED' }, data: { status: 'OPTED_OUT', lastError: reason },
  });
}

async function applySuppression(tx, payload, sourceOccurredAt) {
  const email = normalizeEmail(payload.email);
  if (!isValidEmail(email)) throw problem('A valid email is required');
  const lead = await tx.lead.findUnique({ where: { normalizedEmail: email } });
  await tx.suppressionEntry.upsert({
    where: { normalizedEmail: email },
    create: { normalizedEmail: email, reason: requireText(payload.reason, 'reason', 100), source: 'suppression-webhook', occurredAt: sourceOccurredAt },
    update: { reason: requireText(payload.reason, 'reason', 100), source: 'suppression-webhook', occurredAt: sourceOccurredAt },
  });
  if (lead) await suppressLead(tx, lead, payload.reason, 'suppression-webhook', sourceOccurredAt);
  return { leadId: lead?.id || null, suppressed: true };
}

async function applyDelivery(tx, payload, sourceOccurredAt) {
  const delivery = await tx.outreachDelivery.findFirst({ where: { providerMessageId: String(payload.messageId || '') } });
  if (!delivery) throw problem('Delivery event does not match a provider message', 422);
  const allowed = ['DELIVERED', 'BOUNCED', 'COMPLAINED', 'OPTED_OUT'];
  if (!allowed.includes(payload.status)) throw problem('Unsupported delivery status');
  await tx.outreachDelivery.update({
    where: { id: delivery.id },
    data: { status: payload.status, deliveredAt: payload.status === 'DELIVERED' ? sourceOccurredAt : null },
  });
  if (['BOUNCED', 'COMPLAINED', 'OPTED_OUT'].includes(payload.status)) {
    const lead = await tx.lead.findUnique({ where: { id: delivery.leadId } });
    await suppressLead(tx, lead, payload.status, 'email-provider', sourceOccurredAt);
    if (payload.status === 'OPTED_OUT') {
      await tx.lead.update({ where: { id: lead.id }, data: { consentStatus: 'REVOKED', version: { increment: 1 } } });
    }
  }
  return { leadId: delivery.leadId, deliveryId: delivery.id, deliveryStatus: payload.status };
}

async function transitionLead(prisma, leadId, actor, { lifecycle, expectedVersion, reason }) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw problem('Lead not found', 404);
  if (actor.role === 'AGENT' && actor.agentId !== lead.agentId) throw problem('Only the owning agent may move this lead', 403);
  if (Number(expectedVersion) !== lead.version) throw problem('Lead was changed by another user; refresh before retrying', 409);
  assertLifecycleTransition(lead.lifecycle, lifecycle);
  if (lifecycle === 'QUALIFIED' && !lead.agentId) throw problem('A lead must have an accepted owner before qualification', 409);
  const crm = await prisma.providerConnection.findFirst({ where: { type: 'CRM', isActive: true } });
  return prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id: lead.id },
      data: { lifecycle, status: lifecycleToLegacy(lifecycle), version: { increment: 1 } },
    });
    await tx.leadLifecycleEvent.create({
      data: { leadId, fromLifecycle: lead.lifecycle, toLifecycle: lifecycle, actorUserId: actor.id, reason: requireText(reason, 'reason', 500) },
    });
    await queueOperation(tx, {
      connection: crm, leadId, kind: 'CRM_UPSERT',
      payload: { externalCrmId: lead.externalCrmId, lifecycle, version: updated.version },
      idempotencyKey: `crm:lifecycle:${leadId}:${updated.version}`,
    });
    await appendAudit(tx, { entityType: 'Lead', entityId: leadId, action: 'LIFECYCLE_TRANSITION', actorUserId: actor.id, detail: { from: lead.lifecycle, to: lifecycle, version: updated.version } });
    return updated;
  }, { isolationLevel: 'Serializable' });
}

function lifecycleToLegacy(lifecycle) {
  return ({ NEW: 'NEW', ASSIGNED: 'CONTACTED', QUALIFIED: 'QUALIFIED', OUTREACH_READY: 'NURTURING', ENGAGED: 'SHOWING', CONVERTED: 'CLOSED_WON', DISQUALIFIED: 'CLOSED_LOST' })[lifecycle];
}

async function requestHandoff(prisma, leadId, actor, input) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw problem('Lead not found', 404);
  if (actor.role === 'AGENT' && actor.agentId !== lead.agentId) throw problem('Only the owner may request handoff', 403);
  const target = await prisma.agent.findUnique({ where: { id: input.toAgentId }, include: { user: true } });
  if (!target?.user.isActive) throw problem('Target agent is unavailable', 409);
  if (target.id === lead.agentId) throw problem('Target agent already owns this lead', 409);
  const handoff = await prisma.leadHandoff.create({ data: { leadId, fromAgentId: lead.agentId, toAgentId: target.id, requestedById: actor.id, reason: requireText(input.reason, 'reason', 500) } });
  await appendAudit(prisma, { entityType: 'LeadHandoff', entityId: handoff.id, action: 'REQUESTED', actorUserId: actor.id, detail: { leadId, toAgentId: target.id } });
  return handoff;
}

async function decideHandoff(prisma, id, actor, decision, reason) {
  const handoff = await prisma.leadHandoff.findUnique({ where: { id } });
  if (!handoff) throw problem('Handoff not found', 404);
  if (handoff.status !== 'REQUESTED') throw problem('Only requested handoffs can be reviewed', 409);
  if (handoff.requestedById === actor.id) throw problem('Requester cannot approve their own handoff', 409);
  const status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  const updated = await prisma.leadHandoff.update({ where: { id }, data: { status, approvedById: actor.id, lastError: decision === 'reject' ? requireText(reason, 'reason', 500) : null } });
  await appendAudit(prisma, { entityType: 'LeadHandoff', entityId: id, action: status, actorUserId: actor.id, detail: { reason: reason || null } });
  return updated;
}

async function acceptHandoff(prisma, id, actor) {
  const handoff = await prisma.leadHandoff.findUnique({ where: { id }, include: { lead: true, toAgent: { include: { user: true } } } });
  if (!handoff) throw problem('Handoff not found', 404);
  if (handoff.status !== 'APPROVED') throw problem('Handoff is not approved', 409);
  if (handoff.toAgent.userId !== actor.id) throw problem('Only the target agent may accept', 403);
  const crm = await prisma.providerConnection.findFirst({ where: { type: 'CRM', isActive: true } });
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id: handoff.leadId }, data: { agentId: handoff.toAgentId, lifecycle: 'ASSIGNED', status: 'CONTACTED', version: { increment: 1 } },
    });
    const updated = await tx.leadHandoff.update({ where: { id }, data: { status: 'ACCEPTED', acceptedById: actor.id } });
    await queueOperation(tx, { connection: crm, leadId: lead.id, kind: 'CRM_UPSERT', payload: { ownerAgentId: handoff.toAgentId, version: lead.version }, idempotencyKey: `crm:handoff:${id}` });
    await appendAudit(tx, { entityType: 'LeadHandoff', entityId: id, action: 'ACCEPTED', actorUserId: actor.id, detail: { leadId: lead.id, ownerAgentId: handoff.toAgentId } });
    return updated;
  }, { isolationLevel: 'Serializable' });
}

async function createDraft(prisma, leadId, actor, input) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw problem('Lead not found', 404);
  if (actor.role === 'AGENT' && actor.agentId !== lead.agentId) throw problem('Only the owner may draft outreach', 403);
  if (!['QUALIFIED', 'OUTREACH_READY'].includes(lead.lifecycle)) throw problem('Lead must be qualified before outreach', 409);
  const calendarAt = input.calendarAt ? new Date(input.calendarAt) : null;
  if (calendarAt && (Number.isNaN(calendarAt.getTime()) || calendarAt <= new Date())) throw problem('calendarAt must be in the future');
  const draft = await prisma.outreachDraft.create({
    data: { leadId, requesterUserId: actor.id, subject: requireText(input.subject, 'subject', 200), body: requireText(input.body, 'body', 5000), calendarAt, status: 'PENDING_REVIEW' },
  });
  await appendAudit(prisma, { entityType: 'OutreachDraft', entityId: draft.id, action: 'SUBMITTED_FOR_REVIEW', actorUserId: actor.id, detail: { leadId } });
  return draft;
}

async function reviewDraft(prisma, id, actor, decision, reason) {
  const draft = await prisma.outreachDraft.findUnique({ where: { id }, include: { lead: true } });
  if (!draft) throw problem('Draft not found', 404);
  if (draft.status !== 'PENDING_REVIEW') throw problem('Draft is not awaiting review', 409);
  if (draft.requesterUserId === actor.id) throw problem('Requester cannot review their own outreach', 409);
  if (decision === 'reject') {
    const updated = await prisma.outreachDraft.update({ where: { id }, data: { status: 'REJECTED', reviewerUserId: actor.id, reviewReason: requireText(reason, 'reason', 500) } });
    await appendAudit(prisma, { entityType: 'OutreachDraft', entityId: id, action: 'REJECTED', actorUserId: actor.id, detail: { reason } });
    return updated;
  }
  await assertOutreachEligible(prisma, draft);
  const emailProvider = await prisma.providerConnection.findFirst({ where: { type: 'EMAIL', isActive: true } });
  if (!emailProvider) throw problem('No active email provider is configured', 409);
  const calendarProvider = draft.calendarAt ? await prisma.providerConnection.findFirst({ where: { type: 'CALENDAR', isActive: true } }) : null;
  if (draft.calendarAt && !calendarProvider) throw problem('No active calendar provider is configured', 409);
  const postal = process.env.AGENCY_POSTAL_ADDRESS;
  if (!postal) throw problem('AGENCY_POSTAL_ADDRESS is required before outreach can be approved', 503);
  return prisma.$transaction(async (tx) => {
    const approved = await tx.outreachDraft.update({ where: { id }, data: { status: 'APPROVED', reviewerUserId: actor.id, approvedAt: new Date(), reviewReason: reason || null } });
    const key = `email:${id}`;
    await tx.outreachDelivery.create({ data: { outreachDraftId: id, leadId: draft.leadId, idempotencyKey: key } });
    await queueOperation(tx, {
      connection: emailProvider, leadId: draft.leadId, kind: 'EMAIL_SEND', idempotencyKey: key,
      payload: { to: draft.lead.email, subject: draft.subject, body: `${draft.body}\n\n${postal}\nUnsubscribe: {{unsubscribe_url}}`, draftId: id },
    });
    if (calendarProvider) {
      await queueOperation(tx, {
        connection: calendarProvider, leadId: draft.leadId, kind: 'CALENDAR_CREATE', idempotencyKey: `calendar:${id}`,
        payload: { attendee: draft.lead.email, startsAt: draft.calendarAt.toISOString(), subject: draft.subject, draftId: id },
      });
    }
    await tx.lead.update({ where: { id: draft.leadId }, data: { lifecycle: 'OUTREACH_READY', status: 'NURTURING', version: { increment: 1 } } });
    await appendAudit(tx, { entityType: 'OutreachDraft', entityId: id, action: 'APPROVED_AND_QUEUED', actorUserId: actor.id, detail: { emailProvider: emailProvider.name, calendarQueued: Boolean(calendarProvider) } });
    return approved;
  }, { isolationLevel: 'Serializable' });
}

async function assertOutreachEligible(prisma, draft) {
  const lead = draft.lead;
  if (lead.consentStatus !== 'GRANTED') throw problem('Current email consent is required', 409);
  if (!['US_CAN_SPAM', 'EU_GDPR', 'CA_CCPA'].includes(lead.privacyRegion)) throw problem('Lead privacy region must be classified', 409);
  if (!isValidEmail(lead.normalizedEmail)) throw problem('Lead email is not deliverable', 409);
  if (await prisma.suppressionEntry.findUnique({ where: { normalizedEmail: lead.normalizedEmail } })) throw problem('Lead is suppressed from outreach', 409);
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const [recipientCount, ownerCount] = await Promise.all([
    prisma.outreachDelivery.count({ where: { leadId: lead.id, createdAt: { gte: since }, status: { in: ['QUEUED', 'SENT', 'DELIVERED'] } } }),
    prisma.outreachDelivery.count({ where: { lead: { agentId: lead.agentId }, createdAt: { gte: since }, status: { in: ['QUEUED', 'SENT', 'DELIVERED'] } } }),
  ]);
  const recipientLimit = Number(process.env.OUTREACH_RECIPIENT_DAILY_LIMIT || 1);
  const ownerLimit = Number(process.env.OUTREACH_AGENT_DAILY_LIMIT || 100);
  if (recipientCount >= recipientLimit || ownerCount >= ownerLimit) throw problem('Outreach daily rate limit reached', 429);
}

async function metrics(prisma) {
  const [total, lifecycleGroups, missingOwner, missingConsent, unknownRegion, suppressed, syncQuarantined, deliveryGroups] = await Promise.all([
    prisma.lead.count(), prisma.lead.groupBy({ by: ['lifecycle'], _count: { _all: true } }),
    prisma.lead.count({ where: { agentId: null } }), prisma.lead.count({ where: { consentStatus: { not: 'GRANTED' } } }),
    prisma.lead.count({ where: { privacyRegion: 'OTHER' } }), prisma.suppressionEntry.count(),
    prisma.syncEvent.count({ where: { status: 'QUARANTINED' } }),
    prisma.outreachDelivery.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const lifecycle = Object.fromEntries(lifecycleGroups.map((row) => [row.lifecycle, row._count._all]));
  const deliveries = Object.fromEntries(deliveryGroups.map((row) => [row.status, row._count._all]));
  return {
    generatedAt: new Date().toISOString(), totalLeads: total, lifecycle, deliveries,
    conversionRate: total ? Number(((lifecycle.CONVERTED || 0) / total).toFixed(4)) : 0,
    dataQuality: { missingOwner, missingConsent, unknownRegion, suppressed, syncQuarantined },
  };
}

module.exports = {
  applyWebhook, transitionLead, requestHandoff, decideHandoff, acceptHandoff,
  createDraft, reviewDraft, metrics, problem, requireText,
};
