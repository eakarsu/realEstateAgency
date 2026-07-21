const { assertPublicHost } = require('./policy');

const MAX_RESPONSE_BYTES = 64 * 1024;

async function readBounded(response) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new Error('Provider response exceeded 64 KiB');
    return text;
  }
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error('Provider response exceeded 64 KiB');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function postOperation(connection, operation, transport = fetch, options = {}) {
  const base = new URL(connection.baseUrl);
  if (!options.skipDnsValidation) await assertPublicHost(base.hostname);
  const token = process.env[connection.tokenEnv];
  if (!token) throw new Error(`Provider credential environment variable ${connection.tokenEnv} is missing`);

  const response = await transport(new URL('/v1/operations', base), {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'idempotency-key': operation.idempotencyKey,
    },
    body: JSON.stringify({ kind: operation.kind, payload: operation.payload }),
  });
  const text = await readBounded(response);
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  let parsed = {};
  if (text) {
    try { parsed = JSON.parse(text); } catch { throw new Error('Provider returned invalid JSON'); }
  }
  return { externalId: parsed.id ? String(parsed.id) : null };
}

async function runDueOperations(prisma, { limit = 25, transport = fetch, skipDnsValidation = false } = {}) {
  const candidates = await prisma.integrationOperation.findMany({
    where: { status: { in: ['PENDING', 'RETRY'] }, nextAttemptAt: { lte: new Date() } },
    include: { providerConnection: true },
    orderBy: { createdAt: 'asc' },
    take: Math.min(Number(limit) || 25, 100),
  });
  const result = { claimed: 0, succeeded: 0, retried: 0, deadLettered: 0 };
  for (const candidate of candidates) {
    const claimed = await prisma.integrationOperation.updateMany({
      where: { id: candidate.id, status: { in: ['PENDING', 'RETRY'] } },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) continue;
    result.claimed += 1;
    try {
      const response = await postOperation(candidate.providerConnection, candidate, transport, { skipDnsValidation });
      await prisma.$transaction(async (tx) => {
        await tx.integrationOperation.update({
          where: { id: candidate.id },
          data: { status: 'SUCCEEDED', externalId: response.externalId, lastError: null },
        });
        if (candidate.kind === 'EMAIL_SEND') {
          await tx.outreachDelivery.updateMany({
            where: { idempotencyKey: candidate.idempotencyKey },
            data: { status: 'SENT', providerMessageId: response.externalId, sentAt: new Date(), attempts: { increment: 1 } },
          });
        }
      });
      result.succeeded += 1;
    } catch (error) {
      const attempts = candidate.attempts + 1;
      const terminal = attempts >= 3;
      await prisma.$transaction(async (tx) => {
        await tx.integrationOperation.update({
          where: { id: candidate.id },
          data: {
            status: terminal ? 'DEAD_LETTER' : 'RETRY',
            lastError: String(error.message).slice(0, 500),
            nextAttemptAt: new Date(Date.now() + Math.min(60_000 * (2 ** attempts), 3_600_000)),
          },
        });
        if (terminal && candidate.kind === 'EMAIL_SEND') {
          await tx.outreachDelivery.updateMany({
            where: { idempotencyKey: candidate.idempotencyKey },
            data: { status: 'FAILED', lastError: String(error.message).slice(0, 500), attempts: { increment: 1 } },
          });
        }
      });
      if (terminal) result.deadLettered += 1;
      else result.retried += 1;
    }
  }
  return result;
}

module.exports = { postOperation, runDueOperations, readBounded };
