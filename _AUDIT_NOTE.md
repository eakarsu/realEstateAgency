# Audit Note - realEstateAgency

Source: `_AUDIT/reports/batch_11.md` (lines 538-598).

## Original Audit Recommendations

### Missing AI Counterparts
- `/comparable-analysis` for CMA reports.
- `/compliance-checker` for real-estate regulations.
- `/document-e-sign` integration.

### Missing Non-AI Features
- Transaction/closing workflow with document assembly + e-signature.
- CRM integration (Salesforce, HubSpot sync).
- Mobile app for agents.
- Pipeline reporting (sales forecast, commission tracking).
- Dual-agency flagging / compliance automation.

### Custom Feature Suggestions
1. Agentic Multi-Offer Negotiation.
2. Closing Assistant Agent.
3. Predictive Churn for Listings.
4. MLS Data Sync & Automated Comps.
5. Buyer Journey Personalization.
6. Predictive Lead Scoring with historical data.

## Implementations Applied

Added 2 AI endpoints to `backend/src/routes/ai.js` matching the project's existing OpenRouter-with-JSON-strip pattern and `authenticateToken` middleware:
- `POST /api/ai/comparable-analysis`
- `POST /api/ai/compliance-checker`

Both produce structured JSON output, follow existing error-handling style, and add no new dependencies.

## Backlog (Prioritized)

### High
- E-signature integration (DocuSign/HelloSign) — needs SDK + creds.
- Closing workflow state machine.
- Pipeline reporting (sales forecast, commission tracking dashboard).

### Medium
- MLS sync + automated comp ingestion.
- Predictive lead scoring using historical-deal training data.
- Buyer journey personalization (email triggers).

### Low / Product Decisions
- Mobile app.
- CRM integrations.
- Multi-offer negotiation agent.

## Apply pass 3 (frontend)

LEFT-AS-IS. Frontend already wired for the ~24 AI endpoints in `backend/src/routes/ai.js`, including the two pass-2 additions:
- `frontend/src/pages/ai/AILegalTools.jsx` is a dedicated tabbed page for `/api/ai/comparable-analysis` and `/api/ai/compliance-checker`, calling `aiAPI.comparableAnalysis` and `aiAPI.complianceChecker` from `services/api.js`.
- `frontend/src/pages/ai/AIHub.jsx` covers listing-description, market-analysis, price-predictor, neighborhood-insights, property-appraiser, investment-analyzer, virtual-staging, etc.
- `frontend/src/components/AIChatbotWidget.jsx` and `AIResponseModal.jsx` are shared widgets.
- `App.jsx` mounts `/ai-hub` and `/ai-legal-tools`.
- `services/api.js` (axios) injects `Authorization: Bearer <token>` from localStorage and handles errors; 503-no-key errors surface via the existing toast pipeline.

Log: `/Users/erolakarsu/projects/_AUDIT/apply3_logs/ab3_98.md`.

## Apply pass 4 (mechanical backlog)

Backlog items needing creds/SDKs (DocuSign, MLS sync, CRM) and
risky/product-decision items (closing-workflow state machine, mobile app,
multi-offer negotiation agent) were skipped per policy. Implemented three
mechanical AI-only items:

### Backend (`backend/src/routes/ai.js`)
- `POST /api/ai/predictive-lead-scoring` — score leads on close-probability
  with reasons, tier, and recommended actions.
- `POST /api/ai/buyer-journey-personalization` — generate personalized
  channel-aware triggers per buyer stage with Fair Housing guardrail.
- `POST /api/ai/pipeline-forecast` — base/optimistic/pessimistic forecast
  across configurable horizon with monthly breakdown and risk flags.

Reuse existing `callOpenRouter` (now throws `NO_API_KEY` when key missing or
placeholder) + `authenticateToken`. Added `handleAIError` helper so all three
endpoints return 503 on missing key. `node --check` clean.

### Frontend
- New `frontend/src/pages/ai/AISalesIntelligence.jsx` with three tabs
  (matching `AILegalTools.jsx` styling: tools sidebar + form panel +
  ResultBlock). Forms accept JSON inputs with sensible defaults; toast +
  inline error surface 503 messages.
- Wired into `App.jsx` (`/ai-sales-intelligence`) and
  `components/layouts/DashboardLayout.jsx` aiNav.
- `services/api.js` adds `aiAPI.predictiveLeadScoring`,
  `aiAPI.buyerJourneyPersonalization`, `aiAPI.pipelineForecast`. JWT bearer
  injection via existing axios interceptor.

Babel JSX parse clean. No new deps.

Log: `/Users/erolakarsu/projects/_AUDIT/apply4_logs/ab3_98.md`.
