// === Batch 11 Gaps & Frontend Mounts ===
// Gap features (AI counterparts + Non-AI features) for realEstateAgency.
// Lazy gap_features table (in-memory), OpenRouter via native fetch.

const express = require('express');
const router = express.Router();

const gapFeatures = new Map();

async function llm(systemPrompt, userMsg, maxTokens = 1400) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { const e = new Error('OPENROUTER_API_KEY not configured'); e.status = 503; throw e; }
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'realEstateAgency Gap Features' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }], max_tokens: maxTokens }),
  });
  const data = await r.json();
  if (data && data.error) throw new Error(data.error.message || 'LLM error');
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

function track(slug, payload) {
  const list = gapFeatures.get(slug) || [];
  list.push({ at: new Date().toISOString(), payload });
  gapFeatures.set(slug, list);
}

function safe(res, e) { return res.status((e && e.status) || 500).json({ error: (e && e.message) || 'request failed' }); }

// ---- AI Gap Counterparts ----

router.post('/gap-comp-analysis', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You suggest comparable property sales using attributes (location, size, beds/baths, year, condition).";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('comp-analysis', { keys: Object.keys(body) });
    res.json({ comps: out });
  } catch (e) { safe(res, e); }
});

router.post('/gap-compliance-checker', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You check state-by-state disclosures and fair-housing wording in listings.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('compliance-checker', { keys: Object.keys(body) });
    res.json({ flags: out });
  } catch (e) { safe(res, e); }
});

router.post('/gap-esign-workflow', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You orchestrate e-signature workflows: order, dependencies, reminders.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('esign-workflow', { keys: Object.keys(body) });
    res.json({ plan: out });
  } catch (e) { safe(res, e); }
});

router.post('/gap-dual-agency-check', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You detect dual-agency conflicts given agent, buyer, seller, transaction.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('dual-agency-check', { keys: Object.keys(body) });
    res.json({ flags: out });
  } catch (e) { safe(res, e); }
});

// ---- Non-AI Gap Features ----

router.post('/gap-closing-workflow', (req, res) => {
  const body = req.body || {};
  const record = { id: 'closing-workflow_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('closing-workflow', record);
  res.json({ milestone: record, status: 'recorded' });
});

router.post('/gap-crm-sync', (req, res) => {
  const body = req.body || {};
  const record = { id: 'crm-sync_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('crm-sync', record);
  res.json({ syncJob: record, status: 'recorded' });
});

router.post('/gap-mobile-agent-app', (req, res) => {
  const body = req.body || {};
  const record = { id: 'mobile-agent-app_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('mobile-agent-app', record);
  res.json({ event: record, status: 'recorded' });
});

router.post('/gap-commission-forecasting', (req, res) => {
  const body = req.body || {};
  const record = { id: 'commission-forecasting_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('commission-forecasting', record);
  res.json({ forecast: record, status: 'recorded' });
});

router.post('/gap-rental-management', (req, res) => {
  const body = req.body || {};
  const record = { id: 'rental-management_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('rental-management', record);
  res.json({ lease: record, status: 'recorded' });
});

router.get('/gap-features/_audit', (req, res) => {
  const rows = [];
  for (const [k, v] of gapFeatures.entries()) rows.push({ feature: k, events: v.length });
  res.json({ rows });
});

module.exports = router;
