# Security and integration boundary

This repository proves a local real-estate lead/property workflow. CRM, MLS, email/calendar, enrichment, e-signature, payment, social publishing, consent/suppression, and AI-provider surfaces are not authoritative integrations unless separately configured and acceptance-tested.

- Supply configuration from the environment using `.env.example`; never commit secrets.
- Routine `start.sh` never installs packages, changes schema, seeds data, creates databases, or kills unrelated processes.
- Run `prisma/seed.js` only against a disposable database with `ALLOW_DISPOSABLE_SEED=YES` and operator-supplied credentials.
- Public registration always creates a `CLIENT`; privileged roles require an authenticated administrative workflow.
- Generated content, contracts, valuations, compliance advice, and outreach require qualified human review and applicable consent/suppression checks.
- Password reset deliberately never logs a token. An approved mail adapter is still required before reset delivery can be called operational.
