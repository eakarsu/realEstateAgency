const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');

const TRANSITIONS = Object.freeze({
  NEW: ['ASSIGNED', 'DISQUALIFIED'],
  ASSIGNED: ['QUALIFIED', 'DISQUALIFIED'],
  QUALIFIED: ['OUTREACH_READY', 'DISQUALIFIED'],
  OUTREACH_READY: ['ENGAGED', 'DISQUALIFIED'],
  ENGAGED: ['CONVERTED', 'DISQUALIFIED'],
  CONVERTED: [],
  DISQUALIFIED: [],
});

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function assertLifecycleTransition(from, to) {
  if (!(TRANSITIONS[from] || []).includes(to)) {
    const error = new Error(`Lifecycle cannot move from ${from} to ${to}`);
    error.status = 409;
    throw error;
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function verifySignature(secret, rawBody, supplied) {
  if (!secret || !supplied) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const actual = String(supplied).replace(/^sha256=/, '');
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const parts = address.split('.').map(Number);
    return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168);
  }
  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:');
  }
  return true;
}

function validateProviderUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw Object.assign(new Error('Provider URL is invalid'), { status: 400 });
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) {
    throw Object.assign(new Error('Provider URL must be credential-free HTTPS on the default port'), { status: 400 });
  }
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw Object.assign(new Error('Provider URL must contain only an origin'), { status: 400 });
  }
  return parsed.origin;
}

async function assertPublicHost(hostname) {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error('Provider host resolved to a private or unavailable address');
  }
}

module.exports = {
  TRANSITIONS,
  normalizeEmail,
  normalizeName,
  isValidEmail,
  assertLifecycleTransition,
  stableJson,
  sha256,
  verifySignature,
  validateProviderUrl,
  assertPublicHost,
  isPrivateAddress,
};
