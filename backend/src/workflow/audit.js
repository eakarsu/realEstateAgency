const { sha256, stableJson } = require('./policy');

async function appendAudit(prisma, { entityType, entityId, action, actorUserId = null, detail = {} }) {
  const write = async (tx) => {
    // Serialize the global chain head even when separate HTTP requests append concurrently.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(72198431)::text AS locked`;
    const previous = await tx.workflowAuditEvent.findFirst({ orderBy: { sequence: 'desc' } });
    const previousHash = previous?.hash || 'GENESIS';
    const material = stableJson({ entityType, entityId, action, actorUserId, detail, previousHash });
    return tx.workflowAuditEvent.create({
      data: { entityType, entityId, action, actorUserId, detail, previousHash, hash: sha256(material) },
    });
  };
  return typeof prisma.$transaction === 'function' ? prisma.$transaction(write) : write(prisma);
}

async function verifyAuditChain(prisma) {
  const events = await prisma.workflowAuditEvent.findMany({ orderBy: { sequence: 'asc' } });
  let previousHash = 'GENESIS';
  for (const event of events) {
    const material = stableJson({
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      actorUserId: event.actorUserId,
      detail: event.detail,
      previousHash,
    });
    if (event.previousHash !== previousHash || event.hash !== sha256(material)) {
      return { valid: false, checked: events.length, brokenSequence: event.sequence.toString() };
    }
    previousHash = event.hash;
  }
  return { valid: true, checked: events.length, head: previousHash };
}

module.exports = { appendAudit, verifyAuditChain };
