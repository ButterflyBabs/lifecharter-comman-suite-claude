# Migration and Deployment

## Current Status (Phase 0)

| Component | Status | Detail |
|---|---|---|
| GitHub repo | **Pushed** | `ButterflyBabs/lifecharter-comman-suite-claude`. Started with only an auto-generated `README.md`; merged with the Phase 0 scaffold (unrelated histories) and pushed to `main` on 2026-07-03. |
| Vercel project | **Live and verified — build and runtime both confirmed** | `lifecharter-comman-suite-claude` (`prj_l1KLSEJ31ahgDPgmuKJ1t79eHG82`) under team `amilynne-carrolls-projects`. `https://lifecharter-comman-suite-claude.vercel.app/command/today` returns `200` with real rendered HTML as of 2026-07-03 (`dpl_Fid4dXeBvKRcHjz3gee7n3GA48Af`). |
| Supabase project | **Verified, schema-managed from here** | `itxfgxmdyqpcytmgdysa` ("LifeCharter Command Dashboard"), org "ButterflyBabs's Org", region us-east-1, Postgres 17, status `ACTIVE_HEALTHY`. Supabase MCP connector confirmed access 2026-07-03 via `list_organizations`/`list_projects`/`list_tables`. |
| Local repo | Initialized, pushed | `git init -b main`, `origin` set to the GitHub repo above. |

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
