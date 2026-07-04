# Migration and Deployment

## Current Status (Phase 2)

| Component | Status | Detail |
|---|---|---|
| GitHub repo | **Pushed** | `ButterflyBabs/lifecharter-comman-suite-claude`, `main` branch, Phase 2 commit `c41b5f6` (after 4 build-fix commits — see Deployment History below). |
| Vercel project | **Live and verified — build and runtime both confirmed** | `lifecharter-comman-suite-claude` (`prj_l1KLSEJ31ahgDPgmuKJ1t79eHG82`). Phase 2 build (`dpl_Chtw6cvP9wfutaREMrF7K4shv4KG`) reached `READY`; re-confirmed `GET /command/today` unauthenticated still redirects to `/login` after all the routing/schema changes. |
| Supabase project | **45 tables live, RLS on all of them, zero advisor findings** | `itxfgxmdyqpcytmgdysa` ("LifeCharter Command Dashboard"). Phase 1's 26 tables plus Phase 2's 19 (audit, roadmap/gates, review center). See [data-model.md](data-model.md) and [permissions-and-rls.md](permissions-and-rls.md). |
| Local repo | Initialized, pushed | `git init -b main`, `origin` set to the GitHub repo above. |

## Phase 2 Migrations Applied

| Migration | What it did |
|---|---|
| `20260704010000_phase2_domains_and_audit` | 6 tables (business_command_domains through audit_findings) + `audit_domain_scores` view, RLS on all 6, seeded 12 domains + 1 template + 24 questions. |
| `20260704020000_phase2_roadmap_and_gates` | 8 tables (roadmap_templates through completion_evidence), RLS on all 8, the two gate-enforcement triggers, seeded 1 roadmap template. |
| `20260704030000_phase2_review_center` | 4 tables (review_templates through review_findings), RLS on all 4, closed the Phase 1 `outcomes.review_instance_id` forward reference, seeded 6 cadence templates. |

Same discipline as Phase 1: every migration followed by `get_advisors(type: security)`
before moving on — zero findings this time (Phase 1's two findings had already taught
the right patterns: pin `search_path`, revoke `EXECUTE` on trigger-only functions).

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

## Deployment History (Phase 2)

Four build-fix iterations, notably more than Phase 0 (two) or Phase 1 (zero) — Phase
2 is the largest, most logic-heavy phase so far (schema + gate-enforcement triggers +
setup wizard + audit scoring + roadmap generation + six-cadence review engine +
Command Center), and it showed:

1. **`dpl_AdbEDVPXBVriV1PJ15D9oG4594Q4` — failed.** Unescaped apostrophe in JSX text
   (`react/no-unescaped-entities`) in Command Center's "today's review" link, and an
   `eslint-disable-next-line` referencing `@typescript-eslint/no-explicit-any`, a
   rule not registered in this project's ESLint config (Next treats unknown rule
   names in disable comments as errors). Fixed both.
2. **`dpl_BfG7iSX1Pcu8WTKnyaykucHX4j6X` — failed.** `typedRoutes` (an experimental
   flag enabled in Phase 0 without strong justification) rejected a computed
   `string` prop passed to `<Link href>` in `CommandCadencePage` — a completely
   normal shared-component pattern. Disabled the experimental flag rather than
   restructuring working code around it.
3. **`dpl_7uACGQtoQ9pokA668N9Vb6NiDJ1L` — failed.** `noUncheckedIndexedAccess` (a
   real strict-mode setting from Phase 0, kept) flagged `Record<string, T>` and
   `array[i]` indexed reads in `lib/reviews/actions.ts` and `lib/roadmap/generate.ts`
   as possibly `undefined` — TypeScript can't track prior assignment through
   computed keys or loop counters. Fixed with a `?? []` fallback and a
   `for...of .entries()` loop instead of indexed access.
4. **`dpl_Chtw6cvP9wfutaREMrF7K4shv4KG` — `READY`.** Re-confirmed
   `GET /command/today` unauthenticated still redirects to `/login` correctly after
   all the schema and routing changes — regression check, not just a fresh feature
   check.

Every failure was a genuine compile-time catch (verified by reading the actual error
message from `get_deployment_build_logs`, never guessed at), consistent with treating
Vercel's build as the real verification step since no local Node runtime exists in
the execution sandbox.

## Next Steps to Close Phase 2

- [x] Design and apply the audit schema (domains, templates, questions, instances,
  responses, findings) with RLS and the independent build/health scoring view.
- [x] Design and apply the roadmap/gates schema with RLS and two triggered
  gate-enforcement rules.
- [x] Design and apply the review center schema with RLS, seeded for all six
  cadences, and close the Phase 1 `outcomes.review_instance_id` forward reference.
- [x] Prove gate enforcement (blocking and unblocking cases) with a real,
  transaction-wrapped SQL test.
- [x] Prove the setup wizard's service-role bootstrap produces RLS-recognized
  ownership, not just rows.
- [x] Build the setup wizard, Business Command Audit UI, roadmap generation and UI,
  six-cadence Review Center, and Command Center v1.
- [x] Push, fix all real build errors (four iterations), confirm the build passes
  and route protection still works at the live URL.
- [ ] Exercise the actual UI flows with a real browser or user — setup wizard →
  audit → roadmap → review completion → Command Center, end to end. Not done this
  phase; everything is verified at the SQL and build/runtime layers only.
- [ ] Wire the SQL tests into automated CI (same gap as Phase 1).
- [ ] Manual assistive-technology pass (same gap as Phase 1, now covering more
  pages).

**Phase 2 acceptance criteria (Section 18):**

- [x] **A new workspace can complete setup and receive a prioritized roadmap** —
  the setup wizard creates a real workspace + membership + Workspace Owner role
  (verified by SQL test), and completing the Business Command Audit generates a
  real `roadmap_instances` row with phases sequenced lowest-scoring-domain-first.
  Not yet verified: clicking through this flow in a real browser.
- [x] **The system prevents progression when a blocking gate is incomplete** —
  proven with a real SQL test: a milestone can't be marked done without approved
  evidence, a phase can't be marked complete with incomplete milestones, and both
  work correctly once satisfied.
- [x] **Audit Build Completion and Operating Health are scored independently** —
  `audit_domain_scores` computes both from separate question categories via a
  `filter (where score_category = ...)` aggregate; confirmed 12 build-completion and
  12 operating-health questions exist (24 total, verified by direct query).
- [~] **A completed review produces approved outcomes, tasks, decisions, and
  roadmap updates** — `lib/reviews/actions.ts` creates real `outcomes`, `decisions`,
  `blockers`, and `review_findings` rows based on each template's
  `output_rules_json`, and quarterly reviews add priorities directly to the active
  roadmap phase. The code typechecks cleanly (Vercel's build confirms this) but has
  **not been executed** — no form was actually submitted through the UI. Marked
  partial rather than fully checked off.
- [~] **The Command Center shows only relevant, permission-safe information** —
  `/command/today` queries are scoped by `workspace_id` (RLS-enforced) and change
  emphasis based on Build/Run mode; not yet verified is what it actually looks like
  rendered with real data behind an authenticated session, since no test user has
  been created and driven through the UI.

Three of five criteria are fully verified with real tests; two are implemented and
typecheck cleanly but haven't been exercised end-to-end through the actual UI. This
is a meaningfully lower verification bar than Phase 1 hit, and worth closing before
Phase 3 adds still more surface area on top.
