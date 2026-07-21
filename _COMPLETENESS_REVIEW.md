# Completeness Review: realEstateAgency

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 125 project files (114 source files), 2 manifest(s), 6 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Functional but incomplete**

This is a substantive but unfinished sales/customer operations application, not just an empty scaffold. Inspection found 114 source files across `frontend/`, `backend/` using Next.js, React, Express, Prisma; however, the checked-in workflow and delivery controls do not yet demonstrate a complete, production-operable product.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.
- No environment template documents required configuration and secret boundaries.

## Needed features

1. Integrate CRM, email/calendar, enrichment, consent, and suppression sources with bidirectional, deduplicated sync.
2. Implement explicit lead/account lifecycle, ownership, approvals, attribution, and handoff/retry states.
3. Add deliverability, opt-out, regional privacy, rate-limit, and human-review controls for automated outreach.
4. Measure conversion and data quality with representative end-to-end workflow tests rather than generated sample records.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.
- No CI evidence prevents broken or insecure changes from reaching a release.

## Evidence inspected

- `frontend/src/App.jsx:87`
- `backend/package-lock.json:763`
- `backend/tests/testApp.js`
- `frontend/src/App.jsx`
- `backend/tests/api.test.js`
- `backend/package.json`

## Recommended next action

Choose one real sales/customer operations journey, define acceptance criteria and external contracts, then close its persistence, permission, integration, failure, and test gaps before expanding features.

## Implementation completed — 2026-07-20

The supported product boundary is now one governed real-estate lead-to-outreach journey. Generated gap pages, custom visualizations, generic AI surfaces, and simulated integration routes are not mounted by the production server or frontend. CRM, email, calendar, enrichment, consent, and suppression connections remain non-authoritative until an administrator supplies environment-held credentials, an HTTPS provider origin, and a data-processing contract reference.

### Completed workflow

- Added a PostgreSQL-backed, bidirectional integration ledger with HMAC-authenticated inbound webhooks, payload hashing, replay-safe provider event IDs, source timestamps, outbound idempotency keys, bounded provider responses, SSRF/DNS checks, retry/backoff, dead-letter recovery, and deduplication by normalized lead/account identity.
- Added explicit lead and account lifecycle fields, optimistic lead versions, immutable lifecycle events, first-touch attribution, owned handoff requests, independent manager approval, target-agent acceptance, and outbound CRM ownership/lifecycle updates.
- Added consent evidence, suppression records, regional privacy classification, unsubscribe/postal-address enforcement, per-recipient and per-agent daily limits, delivery/bounce/complaint/opt-out ingestion, and automatic cancellation of queued outreach after suppression.
- Added separate requester/reviewer controls for outreach. Approval queues provider operations; it does not bypass consent, suppression, privacy, provider, or rate-limit checks.
- Added conversion and data-quality metrics, an advisory-lock-serialized hash-chained workflow audit, and an authenticated manager/admin Workflow Control screen for approvals, queue visibility, retries, metrics, and audit verification.

### Security and operations

- Production startup now validates exact CORS origins, a 32+ character JWT secret, database configuration, installed dependencies, built frontend assets, and port availability. It does not install, migrate, seed, kill another process, or mutate data.
- JWT signing and verification now share an HS256-only, one-hour issuer/audience contract. Every protected request re-resolves the active database user and checks the session version.
- Public registration is rate-limited and always creates `CLIENT`, ignoring any caller-supplied role. Passwords are bounded for bcrypt, and password changes invalidate all existing sessions.
- Password reset tokens are random, stored only as SHA-256 hashes, expire after one hour, are never logged, and are issued only when an approved notifier adapter is present. Responses do not disclose whether an account exists.
- The fixture seed is opt-in, restricted to loopback PostgreSQL, requires an empty users table and caller-supplied administrator credentials, and gives fixture users an unreported random password. A repeated run against populated data was refused.
- Added `.env.example`, `SECURITY.md`, a least-privilege GitHub Actions workflow, and a checked-in baseline migration. CI uses `prisma migrate deploy`, the database-backed tests, the frontend production build, and dependency audits.

### Verification evidence

- Dependency installation: locked `npm ci` completed for backend and frontend.
- Database: Prisma schema validation and client generation passed; the 1,112-line baseline migration deployed successfully to fresh PostgreSQL 14 test and runtime databases.
- Automated tests: 3 suites and 50 tests passed. The representative end-to-end suite proves signed and replay-safe sync, normalized deduplication, attribution, ownership handoff, independent approval, lifecycle versioning, consent-gated outreach, provider success/retry, opt-out suppression, concurrent audit appends, metrics, and audit-chain verification.
- Frontend: Vite 8.1.5 production build completed with 770 transformed modules. The remaining bundle-size and browser-data messages are optimization advisories, not build failures.
- Supply chain: backend and frontend `npm audit --audit-level=low` both reported zero vulnerabilities.
- Secret scan: the current worktree passed `gitleaks detect --no-git`. Git history still contains one generic provider-like credential finding in commit `69b09ccb10e5b5cf4d438ed0a599e7dd33103245`, `start.sh:100`; its owner must revoke it, and any history rewrite must be coordinated with repository collaborators.
- Production runtime: `start.sh` launched the built application on `127.0.0.1:3095` without startup/runtime errors. Health readiness returned 200; valid login returned 200; invalid login returned 401; `/api/auth/me`, `/api/leads`, `/api/workflow/metrics`, `/api/workflow/queue`, and audit verification returned 200 with a valid operator JWT; missing and tampered JWTs returned 401; a caller requesting `ADMIN` through registration was created as `CLIENT`; an unapproved CORS origin returned 403; `/login` and `/workflow` returned the production SPA with 200.
- Browser evidence: `BLOCKED_BROWSER` — no in-app browser tab/session was available. No visual-click claim is made. Login and protected-route behavior were instead verified against the real built production server and authentication contract, not a mock application.

External-provider acceptance, notifier delivery, and historical-secret revocation require owner-controlled credentials or coordination and are explicitly outside this local proof.

### Runtime acceptance refresh (2026-07-20)

- The launcher now requires an explicit unused `PORT` and supports source-artifact resolution through `RUNTIME_PROJECT_SOURCE`; it still performs no install, migration, seed, or unrelated process termination.
- With isolated PostgreSQL on `55681` and the application on `6166`, one-time administrator provisioning, production startup, real database credential login, session-version/user revalidation, and an authenticated `/api/auth/me` request passed: `API_VERIFIED|realEstateAgency|startup_login_session_api`.
- The baseline migration, all 3 suites/50 database-backed tests, and the 770-module frontend production build passed in this refresh. All assigned ports were released afterward.
