# LifeCharter Command Suite

The command center for running and building a coaching business. Built from
[Master Product Restructure Specification](docs/master-product-architecture.md), whose
Appendix D ("Mariposa Execution Directive") is the standing operating instruction for
this repository.

## Status

Phase 0 (foundation). See [docs/migration-and-deployment.md](docs/migration-and-deployment.md)
for exactly what is and isn't verified yet, including open blockers.

## Local Setup

```bash
npm install
cp .env.example .env.local   # fill in real values, see below
npm run dev
```

Requires Node.js 18.18+.

## Environment Variables

See `.env.example`. Required:

| Variable | Where it's used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Safe to expose. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | Safe to expose; respects RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (`lib/supabase/admin.ts`) | **Never** expose to the client bundle. Bypasses Row Level Security — every call site must write to `audit_events` per [docs/permissions-and-rls.md](docs/permissions-and-rls.md#116-audit-requirements). |
| `NEXT_PUBLIC_FF_*` | feature flags | See [docs/master-product-architecture.md](docs/master-product-architecture.md#feature-flag-strategy). |

In Vercel, set these under Project Settings → Environment Variables, scoped per
environment (Production/Preview/Development) rather than committed.

## Migrations

Database migrations live in `supabase/migrations/` (created starting Phase 1) and are
applied via the Supabase CLI or MCP tooling — never hand-edited against production
directly. Run against staging first; see
[docs/migration-and-deployment.md](docs/migration-and-deployment.md) and
[docs/testing.md](docs/testing.md#193-deployment-gates).

## Tests

```bash
npm run typecheck
npm test
```

Test layers and required end-to-end scenarios are defined in
[docs/testing.md](docs/testing.md).

## Deployment

GitHub → Vercel: pushes build preview deployments automatically; merges to `main`
promote to production. See
[docs/migration-and-deployment.md](docs/migration-and-deployment.md) for pipeline
detail and rollback procedure.

## Feature Flags

Interim: environment-variable flags in `lib/feature-flags.ts`. Target: a
workspace-scoped `feature_flags` table once Phase 1 lands. See
[docs/master-product-architecture.md](docs/master-product-architecture.md#feature-flag-strategy).

## Support / Documentation Index

All living documentation required by Section 21 of the spec lives in `docs/`:

- [master-product-architecture.md](docs/master-product-architecture.md) — stack decisions, rationale, assumptions log
- [navigation-and-routes.md](docs/navigation-and-routes.md) — canonical route map
- [data-model.md](docs/data-model.md) — canonical database object model
- [permissions-and-rls.md](docs/permissions-and-rls.md) — roles, RLS, AI approval matrix
- [testing.md](docs/testing.md) — required test layers, e2e scenarios, deployment gates
- [migration-and-deployment.md](docs/migration-and-deployment.md) — pipeline status, blockers, rollback

Further docs (`roadmap-and-stage-gates.md`, `workflows-and-automations.md`,
`ai-agents-and-governance.md`, etc.) are added as the phases that need them are built,
per Section 18's build order — they don't exist yet because the modules they'd
document don't exist yet.

## Legacy Code

`_archive/legacy-vanilla-app/` contains a pre-existing hand-rolled HTML/JS
implementation of this product that was found in the project folder at the start of
Phase 0. It has been archived, not deleted, and is not part of the active
application.
