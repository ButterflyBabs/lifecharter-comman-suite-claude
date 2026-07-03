# Migration and Deployment

## Current Status (Phase 0)

| Component | Status | Detail |
|---|---|---|
| GitHub repo | Exists, empty | `ButterflyBabs/lifecharter-comman-suite-claude`, contained only an auto-generated `README.md` at Phase 0 start. |
| Vercel project | Exists, linked | `lifecharter-comman-suite-claude` (`prj_l1KLSEJ31ahgDPgmuKJ1t79eHG82`) under team `amilynne-carrolls-projects`. Has one prior production deployment in `READY` state (framework detection: none — the placeholder README-only commit). |
| Supabase project | **Verified, schema-managed from here** | `itxfgxmdyqpcytmgdysa` ("LifeCharter Command Dashboard"), org "ButterflyBabs's Org", region us-east-1, Postgres 17, status `ACTIVE_HEALTHY`. Supabase MCP connector confirmed access 2026-07-03 via `list_organizations`/`list_projects`/`list_tables`. |
| Local repo | Initialized | `git init -b main`, `origin` set to the GitHub repo above. Not yet pushed (see blocker below). |

## Resolved Blockers

1. **Supabase MCP connector was scoped to the wrong account.** It originally only had
   access to a project called `lifecharter-bot` (`nttcmfrasqqskgeyvnlx`, org
   "Life Charter", `INACTIVE`) — not `itxfgxmdyqpcytmgdysa`. The user
   reconnected/re-authorized the integration under the ButterflyBabs Supabase account
   on 2026-07-03; `list_organizations` now returns "ButterflyBabs's Org"
   (`uiwsflsltkupzdlxwyvo`) and `list_projects` confirms `itxfgxmdyqpcytmgdysa` is
   visible and `ACTIVE_HEALTHY`.

   **Finding at first connection:** the project already had one table,
   `public.dashboard_data` (`id text`, `data jsonb`, `updated_at`), not part of the
   canonical Section 10 schema, with an RLS policy the security advisor flagged as
   `rls_policy_always_true` (`USING (true) WITH CHECK (true)` — RLS nominally
   enabled but the policy grants unrestricted access). It had 0 rows. Per user
   decision, dropped via migration `supabase/migrations/20260703000000_drop_stray_dashboard_data_table.sql`.
   Re-ran `list_tables`/`get_advisors` after: zero tables, zero security lints —
   confirmed clean before any Phase 1 schema work begins.

## Open Blockers From Phase 0

1. **No GitHub push credentials in the execution sandbox.** `git` can read the public
   repo anonymously but has no stored credentials to push. User decision: a
   personal access token (repo scope) will be supplied for this session to push
   directly.
2. **No Node.js runtime in the execution sandbox.** All Next.js/TypeScript/Tailwind
   config and route files were hand-written rather than generated and installed via
   `npm`. `npm install`, `npm run build`, and `npm run dev` have not been run.
   **This must be the first thing verified** once the code reaches an environment
   with Node — either locally or via the Vercel build itself, which will fail loudly
   if something is wrong.

## Deployment Pipeline (Target Steady State)

1. Push to any branch → Vercel builds a preview deployment automatically (GitHub
   integration, already connected).
2. Push/merge to `main` → Vercel builds and promotes to production.
3. Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, feature-flag defaults) are set in the Vercel project
   dashboard, not committed — see `.env.example` for the required keys.
4. Database migrations live in `supabase/migrations/` (created starting Phase 1) and
   are applied to staging before production, per Section 19.3.

## Rollback Strategy

- **Application:** Vercel retains every deployment; rolling back is re-promoting a
  prior deployment, no rebuild required.
- **Database:** every schema change is a versioned, forward-only migration file in
  `supabase/migrations/`; a rollback is a new migration that reverses the change,
  never an edit to a migration already applied to production (Section 19.3: "back up
  production data before structural migration").
- **Feature flags:** since flags gate visibility, not data, a bad rollout can be
  contained by flipping a flag off without a deploy, once the Phase 1+ DB-backed flag
  table exists (see [master-product-architecture.md](master-product-architecture.md#feature-flag-strategy)).

## Next Steps to Close Phase 0

- [x] User reconnects Supabase MCP to include `itxfgxmdyqpcytmgdysa`; re-run
  `list_tables` / `get_advisors` to confirm and update this doc.
- [ ] User supplies a GitHub PAT for this session; push the initial commit.
- [ ] Confirm Vercel picks up the new commit and produces a fresh deployment (check
  build logs for the hand-written config before assuming success).
- [ ] Run `npm install && npm run build` in an environment with Node to confirm the
  hand-written scaffold actually compiles.
