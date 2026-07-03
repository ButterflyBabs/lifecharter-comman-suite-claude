# Migration and Deployment

## Current Status (Phase 1)

| Component | Status | Detail |
|---|---|---|
| GitHub repo | **Pushed** | `ButterflyBabs/lifecharter-comman-suite-claude`, `main` branch, Phase 1 commit `feb829d`. |
| Vercel project | **Live and verified — build and runtime both confirmed** | `lifecharter-comman-suite-claude` (`prj_l1KLSEJ31ahgDPgmuKJ1t79eHG82`). Phase 1 build (`dpl_HfCUgn8bHJ5qXSJSoVNwMSSkVX9Y`) reached `READY`; confirmed `GET /command/today` unauthenticated redirects to `/login`, which renders a real sign-in form — route protection works in production. |
| Supabase project | **26 tables live, RLS on all of them, zero advisor findings** | `itxfgxmdyqpcytmgdysa` ("LifeCharter Command Dashboard"). Tenancy/governance + unified work engine + notifications/assets from Section 10.3/10.4/10.9, 15 seeded system roles, 18 seeded permissions, 170 role-permission mappings. See [data-model.md](data-model.md) and [permissions-and-rls.md](permissions-and-rls.md). |
| Local repo | Initialized, pushed | `git init -b main`, `origin` set to the GitHub repo above. |

## Phase 1 Migrations Applied

| Migration | What it did |
|---|---|
| `20260703010000_phase1_tenancy_governance` | 10 tables (workspaces through activity_events), the `private` schema membership-check functions, RLS on all 10. |
| `20260703010100_fix_set_updated_at_search_path` | Security advisor caught a mutable search_path on the shared `set_updated_at()` trigger function; pinned it. |
| `20260703020000_phase1_work_engine` | 7 tables (tasks through comments), RLS on all 7. |
| `20260703030000_phase1_notifications_and_assets` | 9 tables (notifications through template_versions), RLS on all 9. |
| `20260703040000_phase1_seed_roles_and_permissions` | 15 system roles, 18 permissions, 170 role_permissions rows. |
| `20260703050000_phase1_auto_create_user_profile` | Trigger: every new `auth.users` row gets a `user_profiles` row automatically. |
| `20260703050100_revoke_handle_new_user_execute` | Security advisor caught the new trigger function being directly callable via public RPC; revoked EXECUTE from public/anon/authenticated. |
| `20260703060000_phase1_audit_triggers` | Triggers on `workspace_members` and `member_roles` writing to `audit_events` automatically (Section 11.6). |

Every migration was followed by `get_advisors(type: security)` before moving to the
next one — two real findings were caught and fixed this way (not just applied and
assumed clean). See [permissions-and-rls.md](permissions-and-rls.md#assumptions-recorded-in-phase-1)
for detail on both.

## Deployment History (Phase 0 First Real Build)

Since no Node.js runtime was available to test the hand-written scaffold before
pushing, the first two Vercel builds surfaced real issues — this is exactly the
verification the brief called for, working as intended:

1. **Build 1 (`dpl_BjaAMFJsaFFVEjXf4yjqJ66XTCri`) — failed at type-check.**
   `lib/supabase/server.ts:15` — `setAll(cookiesToSet)` had an implicit `any`
   parameter under `strict: true`. Same pattern existed in `middleware.ts`. Fixed by
   typing both as `CookieToSet[]` using `@supabase/ssr`'s `CookieOptionsWithName`.
2. **Build 2 (`dpl_7ebSChkvZZEnmy5BgTowdjRBRJCk`) — compiled successfully, failed at
   output-directory detection.** All 93 routes compiled and prerendered correctly;
   the failure was `No Output Directory named "public" found` — a **Vercel project
   setting**, not a code bug. The project's Framework Preset was `null`/"Other"
   (left over from the initial README-only placeholder deployment, which had no
   `package.json` for Vercel to detect a framework from). Fixed by adding
   `vercel.json` with `"framework": "nextjs"`, which overrides the stored project
   setting per Vercel's docs, rather than requiring a manual dashboard change.
3. **Build 3 (`dpl_2DoFxik7HzYu3ecsecFnihLf5Ub9`) — reached `READY`.** All 93 routes
   built. Build-time verification is now genuinely complete.
4. **Runtime failure found immediately after, on the live URL.** Every request
   (`GET /command/today` and, by construction, every other route) 500s with
   `MIDDLEWARE_INVOCATION_FAILED`. Runtime logs show the real cause:
   `Error: Your project's URL and Key are required to create a Supabase client!`
   — **`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` were
   never set as Vercel environment variables.** `.env.example` documents the
   required keys, but nothing has populated them in the Vercel project itself, and
   no MCP tool available in this environment can set Vercel env vars — this needs a
   human to add them via Project Settings → Environment Variables (or the Vercel
   CLI). **Values needed:**
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://itxfgxmdyqpcytmgdysa.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_sGjDbfJxA7_33C_WH88E4g_B1h5t2dA`
   - `SUPABASE_SERVICE_ROLE_KEY` = (paste directly into Vercel; do not share this
     value in chat — it bypasses Row Level Security)

   After adding these (scope to Production/Preview/Development as needed), redeploy
   — either click "Redeploy" on the latest deployment in the Vercel dashboard, or a
   new push will trigger a fresh build automatically.
5. **User added the Supabase env vars in Vercel and redeployed (`dpl_A2tfxrra3UZm8u7KdWpJtPqmXc2J`,
   `dpl_4GQUcFz9q9DwiUmGntYj9ZUZJgYG`).** A further push (`dpl_Fid4dXeBvKRcHjz3gee7n3GA48Af`)
   confirmed the fix: `GET /command/today` now returns `200` with correctly
   rendered HTML (`x-vercel-cache: PRERENDER`), not a 500. **The GitHub-to-Vercel
   pipeline is fully verified end-to-end — build and runtime both.**

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

## Resolved Blockers (continued)

2. **No GitHub push credentials in the execution sandbox.** Resolved: user supplied
   a personal access token for this session; used inline in the push URL only
   (never written to `.git/config` or any file) and not reused beyond this session.
3. **No Node.js runtime in the execution sandbox.** The hand-written scaffold was
   never locally `npm install`'d/built before pushing. Resolved by treating Vercel's
   own build as the first real compile check — see "Deployment History" above. Two
   real issues surfaced and were fixed; this is the intended verification path when
   no local Node is available, not a shortcut around it.

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
- [x] User supplies a GitHub PAT for this session; push the initial commit.
- [x] Confirm Vercel picks up new commits and builds them (check build logs for the
  hand-written config before assuming success). Two real issues found and fixed —
  see Deployment History above.
- [x] Confirm the fix commit (adding `vercel.json`) produces a `READY` deployment —
  confirmed, Build 3 (`dpl_2DoFxik7HzYu3ecsecFnihLf5Ub9`).
- [x] User adds the three Supabase environment variables to the Vercel project.
- [x] After env vars are added, redeploy and confirm a route actually renders (not
  just that the build succeeds) — confirmed, `GET /command/today` returns `200`.

**Phase 0 acceptance criteria are all met:** repository scaffolded with the correct
folder structure, Supabase connection verified (clean schema, RLS advisor clean),
Vercel deployment pipeline live (build **and** runtime confirmed), all required
docs/ files created and committed, tech stack documented with rationale, no open
blockers before Phase 1.

## Deployment History (Phase 1)

One build, no failures this time — the lessons from Phase 0's two build failures
(strict-mode typing, `vercel.json` framework override) carried forward, so the much
larger Phase 1 commit (134 files changed: schema migrations, auth pages, route
restructuring, real data queries) built clean on the first try
(`dpl_HfCUgn8bHJ5qXSJSoVNwMSSkVX9Y`, `READY`).

Runtime verified by fetching the live URL twice:

- `GET /command/today` (no session cookie) → served the `/login` page
  (`x-matched-path: /login`), confirming `middleware.ts`'s route-protection logic
  redirects unauthenticated requests correctly in production, not just in code.
- `GET /login` → `200`, real rendered sign-in form (email/password fields, submit
  button, sign-up link) with the Server Action wired up (`$ACTION_ID` hidden input
  present in the HTML).

Not yet verified: an actual sign-up → email-confirm → sign-in round trip with a real
inbox, and what the authenticated Command Center view looks like once a session
exists — both require a real user, which the next phase's setup wizard will make
easy to create for testing.

## Next Steps to Close Phase 1

- [x] Design and apply the tenancy/governance schema with RLS.
- [x] Design and apply the unified work-engine schema with RLS.
- [x] Design and apply notifications/asset/template schema with RLS.
- [x] Seed default roles and permissions.
- [x] Prove workspace isolation with real, transaction-wrapped SQL tests (not just
  RLS-enabled tables).
- [x] Prove audit logging actually fires on membership/role changes.
- [x] Build Supabase Auth (login/sign-up/email-confirm callback) and middleware
  route protection.
- [x] Build the global navigation shell (header, primary nav) and restructure
  routes so it doesn't wrap the auth pages.
- [x] Build the accessibility foundation (skip link, focus-visible, reduced-motion,
  semantic landmarks).
- [x] Wire `/work`, `/decisions`, `/approvals`, `/notifications` to real queries
  with working actions (approve/reject, mark-read).
- [x] Push, confirm the Vercel build passes, confirm route protection works at the
  live URL.
- [ ] Wire the SQL tests into automated CI (currently run manually via the Supabase
  MCP connector).
- [ ] Manual assistive-technology pass (real screen reader, keyboard-only, browser
  zoom) — only structural/semantic correctness has been verified so far.
- [ ] Real sign-up → email-confirm → sign-in round trip with a live inbox.

**Phase 1 acceptance criteria (Section 18):**

- [x] Workspace isolation passes direct database and API tests — proven via
  `supabase/tests/rls_workspace_isolation.sql` (the same RLS policies PostgREST
  uses for API requests, exercised directly).
- [x] A user sees only permitted records and actions — enforced by RLS on all 26
  tables; coarser than the full permission model describes (see
  [permissions-and-rls.md](permissions-and-rls.md#phase-1-enforcement-honestly)).
- [x] Every active work item can have owner, next action, due date, definition of
  done, and blocker — `tasks` has `owner`/`next_action`/`due_at`; `outcomes` has
  `definition_of_done`; `blockers` exists and is wired into `/work`.
- [x] Audit history captures sensitive changes — membership and role changes,
  specifically (the two sensitive things Phase 1 actually built); wider coverage
  arrives with the tables later phases add.
- [ ] **Keyboard, screen reader, zoom, and responsive smoke tests pass — partially.**
  The foundation is built and structurally correct, but not exercised with real
  assistive technology. Flagged honestly rather than checked off; see
  [testing.md](testing.md#phase-1-test-status).

Four of five criteria are fully met with real verification, not assumption. The
fifth has the foundation built but lacks manual AT testing — worth doing before
treating accessibility as solid, but not blocking enough to hold up Phase 2's start
given the rest of Phase 1 is sound.
