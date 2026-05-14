// AI Extras — Custom Feature Suggestions (batch 11)
// Multi-Offer Negotiation, Closing Assistant, Predictive Churn for Listings,
// MLS Sync + Auto Comps, Buyer Journey Personalization, Predictive Lead Scoring.

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

function handleAIError(err, res, fallbackMsg) {
  if (err && (err.code === 'NO_API_KEY' || /OPENROUTER_API_KEY not configured/i.test(err.message || ''))) {
    return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
  }
  console.error(fallbackMsg || 'AI error:', err);
  return res.status(500).json({ error: fallbackMsg || 'AI request failed' });
}

async function callOpenRouter(prompt, systemPrompt = '', options = {}) {
  if (!process.env.OPENROUTER_API_KEY || /your-/i.test(process.env.OPENROUTER_API_KEY)) {
    const e = new Error('OPENROUTER_API_KEY not configured');
    e.code = 'NO_API_KEY';
    throw e;
  }
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'RealEstateAI Extras',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: options.max_tokens || 1800,
      temperature: options.temperature ?? 0.5,
    }),
  });
  if (!r.ok) throw new Error(`OpenRouter error: ${await r.text()}`);
  const data = await r.json();
  return (data.choices?.[0]?.message?.content || '').replace(/^```(?:\w+)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
}

// 1) Agentic Multi-Offer Negotiation
router.post('/multi-offer-negotiation', authenticateToken, async (req, res) => {
  try {
    const { listingId, offers = [], marketComps = [] } = req.body || {};
    if (!offers.length) return res.status(400).json({ error: 'offers[] required' });
    const sys = 'You are an experienced listing agent. Compare offers vs. market comps. Suggest counters, acceptance thresholds, contingencies to push back on. Output JSON: { ranked, recommendedAcceptance, counters: [{offerId, counterTerms}], notes }.';
    const out = await callOpenRouter(`Listing: ${listingId}\nOffers: ${JSON.stringify(offers).slice(0, 5000)}\nComps: ${JSON.stringify(marketComps).slice(0, 4000)}`, sys);
    res.json({ raw: out });
  } catch (e) { handleAIError(e, res, 'multi-offer-negotiation failed'); }
});

// 2) Closing Assistant Agent — coordinate inspection/appraisal/lender milestones.
router.post('/closing-assistant', authenticateToken, async (req, res) => {
  try {
    const { transactionId, closingDate, milestones = [], contractTerms = {} } = req.body || {};
    if (!transactionId) return res.status(400).json({ error: 'transactionId required' });
    const sys = 'You are a closing coordinator. From transaction context, produce a dated milestone plan (inspection, appraisal, lender review, title clear, walkthrough, closing). Flag items at risk. Output JSON: { schedule: [{ milestone, dueDate, owner, status }], riskFlags, nextActions }.';
    const out = await callOpenRouter(`Closing: ${closingDate}\nMilestones: ${JSON.stringify(milestones)}\nTerms: ${JSON.stringify(contractTerms).slice(0, 3000)}`, sys);
    res.json({ raw: out });
  } catch (e) { handleAIError(e, res, 'closing-assistant failed'); }
});

// 3) Predictive Churn for Listings — flag stale listings.
router.post('/listing-churn', authenticateToken, async (req, res) => {
  try {
    const { listings = [] } = req.body || {};
    if (!listings.length) return res.status(400).json({ error: 'listings[] required' });
    const sys = 'You are a listings analyst. Score each listing\'s churn risk based on days-on-market, price changes, showings, comparable price drift. Suggest interventions (price reduction, new photos, virtual tour, open house). Output JSON.';
    const out = await callOpenRouter(`Listings: ${JSON.stringify(listings).slice(0, 6000)}`, sys);
    res.json({ raw: out });
  } catch (e) { handleAIError(e, res, 'listing-churn failed'); }
});

// 4) MLS Data Sync & Automated Comps
// TODO: configure credentials — MLS_API_KEY, MLS_BASE_URL.
router.post('/mls-sync', authenticateToken, async (req, res) => {
  const { mlsArea, propertyId } = req.body || {};
  if (!mlsArea && !propertyId) return res.status(400).json({ error: 'mlsArea or propertyId required' });
  if (!process.env.MLS_API_KEY) {
    return res.status(503).json({ error: 'MLS_API_KEY not configured', message: 'TODO: configure credentials.' });
  }
  // Lean v0: surface placeholder shape; real fetch wired when creds + base URL provided.
  res.json({ mlsArea, propertyId, synced: true, recordsImported: 0, note: 'Wire real MLS fetch in production.' });
});

router.post('/auto-comps', authenticateToken, async (req, res) => {
  try {
    const { subjectProperty, candidatePool = [] } = req.body || {};
    if (!subjectProperty) return res.status(400).json({ error: 'subjectProperty required' });
    const sys = 'You are an appraisal-grade comp analyst. From candidatePool, pick the 5 best comparables to subject; explain adjustments. Output JSON: { comps: [{ id, adjustedPrice, adjustments: [...], rationale }], suggestedList }.';
    const out = await callOpenRouter(`Subject: ${JSON.stringify(subjectProperty).slice(0, 2500)}\nCandidates: ${JSON.stringify(candidatePool).slice(0, 6000)}`, sys);
    res.json({ raw: out });
  } catch (e) { handleAIError(e, res, 'auto-comps failed'); }
});

// 5) Buyer Journey Personalization
router.post('/buyer-journey', authenticateToken, async (req, res) => {
  try {
    const { buyerId, engagementSignals = {}, savedSearches = [], lastTouch } = req.body || {};
    if (!buyerId) return res.status(400).json({ error: 'buyerId required' });
    const sys = 'You are a buyer engagement strategist. From recent engagement (email opens, property saves, showings) propose the next-best-action and a personalized message. Output JSON: { stage, nextAction, message, urgency, daysSinceTouchpoint }.';
    const out = await callOpenRouter(`Buyer: ${buyerId}\nLastTouch: ${lastTouch}\nSignals: ${JSON.stringify(engagementSignals)}\nSavedSearches: ${JSON.stringify(savedSearches).slice(0, 2000)}`, sys);
    res.json({ raw: out });
  } catch (e) { handleAIError(e, res, 'buyer-journey failed'); }
});

// 6) Predictive Lead Scoring with Historical Data
router.post('/predictive-lead-score', authenticateToken, async (req, res) => {
  try {
    const { lead, agentClosedDeals = [] } = req.body || {};
    if (!lead) return res.status(400).json({ error: 'lead required' });
    const sys = 'You are a predictive lead-scoring model. Score lead conversion probability 0-100 using agent\'s past closed-deal patterns. Recommend best-fit agent for assignment. Output JSON: { score, confidence, recommendedAgent, reasoning }.';
    const out = await callOpenRouter(`Lead: ${JSON.stringify(lead).slice(0, 2000)}\nClosed deal history: ${JSON.stringify(agentClosedDeals).slice(0, 4000)}`, sys);
    res.json({ raw: out });
  } catch (e) { handleAIError(e, res, 'predictive-lead-score failed'); }
});

module.exports = router;
