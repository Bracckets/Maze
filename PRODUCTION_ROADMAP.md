# Production Roadmap

This repo is now beyond MVP, but it is not production-ready yet. Use the roadmap below to move from a demoable product into a secure, operable, multi-tenant release.

## Phase 1: Production Foundations

Target: 1 to 3 days

Goals:

- Centralize environment-driven configuration
- Prevent demo data from leaking into production
- Add readiness checks for deployment health probes
- Expose integration contracts for auth, API key, and workspace services
- Patch known web framework security issues

Deliverables:

- `APP_ENV`, `DATABASE_URL`, and `SEED_DEMO_DATA` drive backend startup behavior
- Production blocks SQLite and requires an explicit database URL
- `/ready` endpoint validates database connectivity
- `.env.example` files exist for backend and web
- Web app uses internal route handlers as stable integration boundaries
- Next.js is upgraded from `15.3.1` to `15.3.8`

## Phase 2: Security and Identity

Target: 3 to 7 days

Goals:

- Replace all mock auth behavior with a real identity provider
- Store user sessions securely
- Enforce authorization and tenant isolation
- Harden API key management

Deliverables:

- Real sign-in integration behind `/api/auth/signin`
- Secure cookie or token session handling
- Workspace-aware authorization on all protected pages and APIs
- API keys shown only once at creation time
- API keys hashed at rest and revocable
- Audit logging for sign-in, settings changes, and key operations

## Phase 3: Data and Processing Hardening

Target: 1 to 2 weeks

Goals:

- Move to production-grade storage and background processing
- Make ingestion durable and scalable
- Add safe schema evolution

Deliverables:

- PostgreSQL required in every non-local deployed environment
- Redis or a queue-backed worker for ingestion and issue processing
- Alembic migrations replace `create_all`
- Idempotency and retry strategy on event ingestion
- Rate limiting and payload size limits on `/events`
- Structured logs, tracing, and metrics across API and worker paths

## Phase 4: Product Completeness

Target: 1 to 2 weeks

Goals:

- Replace remaining placeholder UI data with real backend data
- Add proper user workflows around workspaces and integrations
- Make the dashboard useful during daily operations

Deliverables:

- Real workspace settings persistence
- Real API key list/history states
- Empty, loading, unauthorized, and degraded-service states
- Team management and workspace switching
- Integration setup UX for mobile SDKs and backend ingestion
- Better insights history, filters, and time ranges

## Phase 5: Release Operations

Target: 1 week

Goals:

- Make deployment safe, observable, and repeatable
- Define rollback and incident handling

Deliverables:

- CI pipeline for typecheck, tests, builds, and migrations
- CD pipeline with environment promotion and rollback
- Production logging, dashboards, alerts, and on-call thresholds
- Database backup and restore runbook
- Secret rotation process
- Security headers, TLS, CORS, and origin allowlists

## Phase 6: Reliability and Compliance

Target: ongoing

Goals:

- Reach reliability targets for customer-facing production use
- Formalize privacy and compliance controls

Deliverables:

- SLOs for sign-in, ingestion, and dashboard latency
- Load testing for event bursts and dashboard traffic
- PII review of all tracked metadata
- Data retention controls by workspace
- Incident response and breach response playbooks
- Compliance documentation as needed for the target market

## Immediate Sequence

1. Finish Phase 1 everywhere.
2. Start Phase 2 before any external customer rollout.
3. Start Phase 3 before opening ingestion to real customer traffic.
4. Complete Phase 5 before the first paid production deployment.
