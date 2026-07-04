# Testing and Quality Assurance

Transcribed from Section 19 of the Master Product Restructure Specification.

**Status as of Phase 0:** no test suite exists yet — there is no application logic to
test. `vitest` is wired into `package.json` (`npm test`) as the runner so Phase 1 can
add the first real tests (workspace isolation) without further tooling setup. This
document is the checklist every later phase's tests are measured against.

## 19.1 Required Test Layers

- Unit tests
- Database migration tests
- RLS and permission tests
- API and server-action tests
- Integration adapter contract tests
- Webhook signature and idempotency tests
- Automation trigger, retry, and failure tests
- End-to-end lifecycle tests
- Financial reconciliation tests
- AI grounding and approval tests
- Responsive tests
- Accessibility tests
- Performance tests
- Security review
- Backup and recovery rehearsal
- Data migration rehearsal

## 19.2 Required End-to-End Scenarios

| Scenario | Summary |
|---|---|
| A. New coach setup | Create workspace → setup wizard → Business Command Audit → roadmap → complete a gated milestone → first weekly review. |
| B. Lead to active client | Lead enters (form/import) → duplicate check → owner/source assigned → research/scoring → outreach/follow-up → discovery/qualification → versioned proposal/contract → payment reconciles → handoff/onboarding → client active after kickoff. |
| C. Failed payment | Contract signed → payment fails → opportunity stays Payment Pending → finance task created → onboarding does not begin → successful retry updates records exactly once. |
| D. Client onboarding delay | Payment succeeds → welcome/portal provisioned → intake becomes overdue → reminder runs → owner alerted → Command Center shows onboarding at risk. |
| E. Client risk and recovery | Missed actions/declining metrics lower health → system explains contributing signals → intervention task/plan created → coach records recovery actions → health improves or client exits through a controlled path. |
| F. Renewal and advocacy | Client reaches meaningful outcome → renewal review opens → expansion/completion selected → testimonial/referral suggested → consent, request, result, attribution recorded. |
| G. AI approval protection | AI drafts outreach message → sources/inferences shown → user edits and approves → approved provider sends it once → activity and AI approval history recorded. |
| H. Permission protection | Verify unauthorized roles cannot bypass restrictions via interface, direct URL, export, API, or database access. |
| I. Integration failure | Provider auth expires or webhook fails → error logged without data loss → owner gets a specific recovery action → retry is safe and idempotent → sync resumes and reconciles. |

These scenarios are exercised end-to-end starting once the relevant modules exist —
Scenario A becomes testable at the end of Phase 2, Scenario B at the end of Phase 4/5,
etc. Scenario H (permission protection) is testable as soon as Phase 1's RLS lands and
should be re-run after every phase that adds a new tenant table.

## 19.3 Deployment Gates

- Run migrations in staging first.
- Test all RLS policies in staging.
- Use test credentials for payment and communication providers.
- Verify webhooks and scheduled jobs.
- Run the full lifecycle suite.
- Confirm responsive and accessibility behavior.
- Back up production data before structural migration.
- Deploy through the established GitHub-to-Vercel process.
- Verify environment variables and secrets.
- Run production smoke tests.
- Monitor logs, queues, integration events, and financial reconciliation.
- Document deployment commit, migration version, feature flags, and rollback
  procedure.

## Phase 0 Test Status

No automated test suite exists yet (`npm test` has no tests to run). Verification
performed in Phase 0, in lieu of a local Node.js runtime (none was available in the
execution sandbox):

- Confirmed the Supabase project (`itxfgxmdyqpcytmgdysa`) is reachable, schema-managed
  (RLS advisor clean, zero tables after removing a stray pre-existing one), and the
  MCP connector has real access — see [migration-and-deployment.md](migration-and-deployment.md).
- Confirmed the GitHub-to-Vercel pipeline triggers automatically on push: pushed a
  commit, Vercel built it, the build **failed twice** (a real TypeScript
  strict-mode bug, then a Vercel project framework-detection issue) — both
  diagnosed from Vercel's build logs and fixed. Treating Vercel's own build as the
  compile check (rather than assuming a local `npm install` would have passed) is
  what actually caught these.
- The build then reached `READY`, but hitting the live URL immediately surfaced a
  **third, runtime-only failure** that a green build didn't catch: every route
  500s (`MIDDLEWARE_INVOCATION_FAILED`) because the Supabase environment variables
  were never set in the Vercel project. Caught by actually fetching the deployed
  URL and checking `get_runtime_logs`, not by the build status alone — a reminder
  that "build succeeded" and "app works" are different claims, worth keeping in
  mind for Phase 1's smoke tests (Section 19.3: "run production smoke tests").
- User added the env vars and redeployed; re-fetching the live URL confirmed
  `GET /command/today` returns `200` with correctly rendered HTML. **Phase 0's
  deployment verification is complete: build and runtime both confirmed, not
  assumed.** See [migration-and-deployment.md](migration-and-deployment.md#deployment-history-phase-0-first-real-build)
  for full detail.

## Phase 1 Test Status

**RLS and permission tests (Section 19.1) exist and pass**, run as real SQL against
the live project rather than described in prose:

- `supabase/tests/rls_workspace_isolation.sql` — two fake tenants, proves cross-tenant
  read/write denial, admin-gated table access, and immediate suspension enforcement.
  Sanity-checked by first confirming a deliberately-failing assertion actually
  surfaces as an error (so a clean run is known to mean "passed").
- `supabase/tests/audit_logging.sql` — proves membership/role changes actually write
  to `audit_events` via triggers.

Both wrap their setup and assertions in `BEGIN; ... ROLLBACK;`, verified afterward by
querying row counts to confirm zero residue.

**Database migration tests**: every migration was applied via `apply_migration` and
followed immediately by `get_advisors` (security) — two real issues were caught this
way (a mutable-search-path function, and two `SECURITY DEFINER` functions callable
via unintended public RPC) and fixed before moving on, not just applied and assumed
clean.

**Deployment/runtime verification**: pushed the Phase 1 commit, confirmed the Vercel
build reached `READY`, then fetched the live URL twice — `/command/today`
unauthenticated correctly redirects to `/login` (proving middleware route protection
works in production, not just in code review), and `/login` returns a real rendered
sign-in form.

**Honestly not done yet:**

- **No automated CI test runner.** The SQL tests above are run manually via the
  Supabase MCP `execute_sql` tool. Wiring them into a CI pipeline (e.g., a GitHub
  Action that runs them against a preview branch on every PR) is real, valuable work
  that hasn't happened — `npm test` still has zero tests.
- **No manual assistive-technology testing.** The accessibility foundation (skip
  link, focus-visible outlines, `prefers-reduced-motion`/`prefers-contrast` support,
  semantic landmarks, `aria-current`/`aria-pressed`) was verified structurally
  (correct HTML/ARIA in the rendered output) but not tested with a real screen
  reader, a keyboard-only pass through every interactive element, or a browser zoom
  test. Section 18's Phase 1 acceptance criterion ("keyboard, screen reader, zoom,
  and responsive smoke tests pass") is **not** fully satisfied by structural review
  alone — this is flagged honestly rather than checked off.
- **No end-to-end auth flow test** (sign up → confirm email → sign in → land on
  Command Center) was run against a real email address; the code path was reviewed
  and the redirect logic verified, but Supabase's mailer wasn't exercised end-to-end.
- **Login/sign-up haven't been exercised with real credentials** — form rendering
  and the unauthenticated-redirect behavior are confirmed; a full round-trip
  (create account, receive email, click link, sign in, see workspace data) is not.

## Phase 2 Test Status

Two more real, transaction-wrapped SQL tests were added and pass:

- `supabase/tests/roadmap_gate_enforcement.sql` — proves a milestone cannot be marked
  done without approved evidence, a phase cannot be marked complete with incomplete
  milestones, and both **can** proceed once their conditions are actually met (the
  positive case, not just the blocking case).
- `supabase/tests/setup_wizard_workspace_bootstrap.sql` — proves the setup wizard's
  service-role bootstrap (workspace + membership + Workspace Owner role) produces a
  membership the RLS policies actually recognize as ownership (the new user can read
  *and update* their own workspace), not just that the rows were inserted.

**Deployment took four build-fix iterations this phase** (vs. two for Phase 0, zero
for Phase 1's first pass) — the largest, most logic-heavy phase so far, and it showed:

1. An unescaped apostrophe in JSX text (`react/no-unescaped-entities`).
2. An `eslint-disable-next-line` referencing a rule
   (`@typescript-eslint/no-explicit-any`) not registered in this project's ESLint
   config — Next treats unknown rule names in disable comments as errors.
3. `typedRoutes` (an experimental flag enabled in Phase 0 without strong
   justification) rejected a dynamic `string` prop passed to `<Link href>` — a
   totally normal pattern for a shared component with multiple callers. Disabled
   the flag rather than restructuring working code around an experimental one.
4. `noUncheckedIndexedAccess` (a real strict-mode setting, kept) flagged
   `Record<string, T>` and `array[i]` indexed reads as possibly `undefined`, since TS
   can't track prior assignment through computed keys or loop counters. Fixed with a
   `?? []` fallback and a `for...of .entries()` loop instead of indexed access.

Each was a genuine compile-time catch, not a false alarm — this is the same pattern
established in Phase 0: treating Vercel's build as the real verification step (since
no local Node runtime exists in the execution sandbox) rather than assuming
hand-written code compiles.

**Honestly not done yet, on top of Phase 1's carried-forward gaps:**

- **No UI testing with a real browser or user.** Every Phase 2 flow (setup wizard,
  audit scoring, roadmap generation, review completion, Command Center) has been
  verified at the SQL layer (schema, RLS, gate triggers) and the build/runtime layer
  (compiles, route protection still works), but never clicked through by a human or
  driven by browser automation. The "close phase and advance to next phase" cascade
  in particular has only been reasoned through, not executed.
- **Review completion's TypeScript logic (`lib/reviews/actions.ts`) now typechecks
  cleanly, but was never executed.** Vercel's build step type-checks and bundles the
  code; it does not run it. The loop that parses form fields, upserts responses, and
  creates outcomes/decisions/blockers/findings by type has not been exercised against
  a real form submission.
- **No automated CI** for the SQL tests (same gap as Phase 1 — still run manually).

## Phase 3 Test Status

One more real, transaction-wrapped SQL test was added and passes:

- `supabase/tests/business_architecture_rls.sql` — inserts one row per new table
  (catches column/type typos across all 19 Business Architecture objects) and proves
  workspace isolation on a representative cross-section: the `founder_profiles`
  singleton, the `strategy_profiles` → `goals` → `key_results` chain, and the
  `offers` → `offer_versions` → `offer_pricing` chain, including that tenant A cannot
  read or update tenant B's rows by direct query. Sanity-checked the same way as every
  earlier test suite — a deliberately-failing assertion was run once first to confirm
  it actually surfaces as an error.

**Deployment took four build-fix iterations this phase** (tying Phase 2 for the most
so far):

1. TypeScript's `never[]` inference on `: { data: [] }` ternary fallbacks used for
   "skip this query" branches — once something (`.push()`) needed a concrete element
   type, the whole union collapsed to `never`. Fixed by switching every one of these
   fallbacks to `: { data: null }`, matching the pattern already used elsewhere in the
   app, and typing the resulting `Map`s as `NonNullable<typeof data>`.
2. A nested-relation cast (`goals.business_command_domains`) failed TypeScript's
   overlap check because the untyped Supabase client infers a many-to-one join as an
   array by default; fixed by casting through `unknown` first, the same escape hatch
   already used elsewhere in this codebase for untyped nested selects.

Both were genuine compile-time catches from Vercel's build log, not false alarms —
same verification discipline as every prior phase.

**Honestly not done yet, on top of Phase 1 and 2's carried-forward gaps:**

- **No UI testing with a real browser or user.** Every Phase 3 flow (founder profile,
  strategy/goals, business model, market/positioning, brand/messaging, offer
  portfolio, pricing/economics) has been verified at the SQL layer (schema, RLS) and
  the build/runtime layer (compiles, routes resolve and correctly redirect
  unauthenticated requests to `/login`), but never clicked through by a human or
  driven by browser automation — none of the ~15 server actions across the seven
  pages have been exercised against a real form submission.
- **The Market and Positioning "gate" and Offer Portfolio activation are informational
  only, not enforced.** Section 6 describes these as hard gates ("the system
  recommends active campaigns or prospecting" / offer activation requirements), but
  since the downstream systems they'd gate (campaigns, prospecting, full offer
  readiness checks) don't exist until later phases, Phase 3 surfaces the gate status
  as a banner/badge rather than blocking any action.
- **No automated CI** for the SQL tests (same gap as every prior phase — still run
  manually).

## Phase 4 Test Status

One more real, transaction-wrapped SQL test was added and passes:

- `supabase/tests/revenue_engine_rls.sql` — proves cross-tenant isolation across
  the `people`/`organizations`/`leads` chain and the
  `opportunities` → `proposals` → `proposal_versions` chain, and exercises both
  new triggers: an opportunity stage change logs exactly one `stage_history` row,
  and updating a `proposal_versions` row after its parent proposal has been sent
  raises the expected immutability exception rather than succeeding. Building this
  test surfaced a real test-authoring mistake (not a schema bug): comparing two
  `now()`-derived timestamps captured inside the same `BEGIN;...ROLLBACK;` block
  can never detect a same-transaction change, since `now()` is frozen at
  transaction start for the whole block — corrected to rely on the
  `stage_history` row alone as proof the trigger fired.

**This phase's build reached `READY` on the first deploy** — zero build-fix
iterations, a first for this project. The two TypeScript pitfalls that took
multiple iterations to catch in Phase 3 (`never[]` inference on `: { data: [] }`
ternary fallbacks, and nested-relation casts needing `as unknown as` before the
target type) were applied proactively across all 12 new pages from the start,
based directly on what Phase 3's failures taught.

**Honestly not done yet, on top of every prior phase's carried-forward gaps:**

- **No UI testing with a real browser or user.** Every Phase 4 flow (relationships,
  pipeline with stage moves, discovery sessions, proposals, contracts, payments,
  forecast, campaigns, content workflow, marketing nurture sequences, outreach)
  has been verified at the SQL layer (schema, RLS, both triggers) and the
  build/runtime layer (compiles, routes resolve and correctly redirect
  unauthenticated requests to `/login`), but never clicked through by a human or
  driven by browser automation — none of the ~20 server actions across the 12
  pages have been exercised against a real form submission.
- **The Campaign launch gate and Content publish gate are informational only, not
  enforced** — same pattern as Phase 3's Market gate: Section 6 describes them as
  hard gates, but Phase 4 surfaces gate status as a banner/badge rather than
  blocking the underlying action, since enforcing them meaningfully would require
  systems (real campaign execution, real publishing pipelines) this build doesn't
  have yet.
- **The "contract signed creates the order and invoice workflow" automation rule
  is not implemented as a trigger** — unlike the stage-history and proposal-
  immutability rules, this one was judged too underspecified to encode safely (the
  spec doesn't define the exact order/invoice field mapping), so Phase 4 leaves it
  as a manual action (create contract, then separately create the order) rather
  than guessing at an automation that could silently do the wrong thing.
- **No automated CI** for the SQL tests (same gap as every prior phase — still run
  manually).

## Phase 5 Test Status

One more real, transaction-wrapped SQL test was added and passes:

- `supabase/tests/client_experience_rls.sql` — proves cross-tenant isolation
  across the `clients` → `client_offer_enrollments` → `onboarding_instances`
  chain and the `programs` → `program_versions` → `program_phases` →
  `sessions`/`client_actions` chain (tenant B gets 0 rows querying tenant A's
  sessions and program versions directly, and a cross-tenant `UPDATE` on
  tenant A's client affects 0 rows), and exercises the new trigger: publishing
  a `program_versions` row and then attempting to update it raises the
  expected immutability exception rather than succeeding.

**Deployment took one build-fix iteration this phase**:

1. `NEXT_STATUS[client.status]` (a `Record<string, string>` lookup) was
   checked truthy once in a JSX conditional, then re-indexed twice more
   inside that same block. `noUncheckedIndexedAccess` types every index
   expression independently — TypeScript doesn't narrow a later read of the
   same expression just because an earlier read of it was checked truthy, so
   the second and third reads still typed as `string | undefined` against a
   `string`-only prop. Fixed by computing the lookup once into a local
   variable and reusing it — the same fix pattern already used for
   `CADENCE_LABELS` in Phase 2.

A genuine compile-time catch from Vercel's build log, not a false alarm — same
verification discipline as every prior phase.

**Honestly not done yet, on top of every prior phase's carried-forward gaps:**

- **No UI testing with a real browser or user.** Every Phase 5 flow (client
  overview, journey design, onboarding, active client record, programs and
  delivery, sessions, actions and accountability, outcomes, health, renewals,
  advocacy, portal settings) has been verified at the SQL layer (schema, RLS,
  the immutability trigger) and the build/runtime layer (compiles, all four
  spot-checked routes resolve and correctly redirect unauthenticated requests
  to `/login`), but never clicked through by a human or driven by browser
  automation — none of the ~30 server actions across the 12 pages have been
  exercised against a real form submission.
- **No automated CI** for the SQL tests (same gap as every prior phase — still
  run manually).

## Phase 6 Test Status

One more real, transaction-wrapped SQL test was added and passes:

- `supabase/tests/operations_rls.sql` — proves cross-tenant isolation across
  teams, team_memberships, responsibilities, vendors, technology_items, and
  integration_accounts (tenant B gets 0 rows querying tenant A's teams, SOPs,
  and technology items directly, and a cross-tenant `UPDATE` on tenant A's
  vendor affects 0 rows), confirms the global `integration_providers` catalog
  stays readable regardless of tenant, and exercises the new
  `enforce_automation_enable_gate` trigger through all four cases: three
  blocking cases (no owner, no idempotency strategy, no passing test run) each
  raise the expected exception, and the positive case (all three conditions
  satisfied) both succeeds and confirms the enable was written to
  `audit_events` via the generalized `log_audit_event()` trigger.

**This phase's build reached `READY` on the first deploy** — zero build-fix
iterations, matching Phase 4's clean first pass. Every TypeScript pitfall
learned from prior phases (`never[]` ternary fallbacks, nested-relation casts
needing `as unknown as`, and repeated `Record`-index reads under
`noUncheckedIndexedAccess`) was applied proactively across all 10 new pages
from the start.

**Honestly not done yet, on top of every prior phase's carried-forward gaps:**

- **No UI testing with a real browser or user.** Every Phase 6 flow (team and
  roles, capacity, SOPs, systems and automations, finance, legal and risk,
  technology, integrations, vendors) has been verified at the SQL layer
  (schema, RLS, the automation-enable gate trigger) and the build/runtime
  layer (compiles, all four spot-checked routes resolve and correctly
  redirect unauthenticated requests to `/login`), but never clicked through
  by a human or driven by browser automation — none of the server actions
  across the 10 pages have been exercised against a real form submission,
  including the automation gate's UI path (claim ownership, record a test
  run, then enable).
- **The Operations Overview's "every critical operational alert has an
  owner, response action, and date" rule is informational only, not
  enforced** — the live counts are real, but there is no dedicated
  action-queue object tying a specific alert to a specific follow-up task.
- **No automated CI** for the SQL tests (same gap as every prior phase — still
  run manually).

## Phase 7 Test Status

**This is the final phase of the Section 18 build order — all 7 phases are
now complete.**

One more real, transaction-wrapped SQL test was added and passes:

- `supabase/tests/ai_team_rls.sql` — proves cross-tenant isolation across
  `kpis`, `ai_agents` → `ai_agent_versions`, and `ai_knowledge_sources`
  (tenant B gets 0 rows querying tenant A's kpis, agents, and AI outputs
  directly, and a cross-tenant `UPDATE` on tenant A's agent affects 0 rows),
  and exercises the new `enforce_ai_output_approval_gate` trigger through
  every case: an output cannot be marked `approved` with no `ai_approvals`
  record on file (blocked), cannot be marked `approved` with only a
  `rejected` `ai_approvals` record on file (blocked), succeeds once an
  `approved` record exists, and the same output can then transition to
  `executed` without a further approval (the existing approved record
  still satisfies the gate).

**This phase's build reached `READY` on the first deploy** — zero
build-fix iterations, tying Phase 4 and Phase 6's clean first passes.

One real bug was caught and fixed before it ever reached the build, by
self-review rather than by a compile error: an early draft of the
"record AI work for review" form on `/ai/runs` tried to pass the selected
agent's permission level to the server action via a hidden input, but that
input was hardcoded to the *first* agent in the dropdown list rather than
whichever one the user actually selected — a static server-rendered form
has no client-side way to keep a hidden field in sync with a `<select>`'s
current value without JavaScript. Fixed by having the server action look
up the submitted `agent_version_id`'s `permission_level` directly from the
database instead of trusting the unreliable hidden field.

**Honestly not done yet, on top of every prior phase's carried-forward gaps:**

- **No UI testing with a real browser or user.** Every Phase 7 flow (AI
  overview, agent roster including the one-click seed action, knowledge
  sources, approval queue, run history including the manual record-for-
  review form, policies, usage and cost) has been verified at the SQL
  layer (schema, RLS, the approval-gate trigger) and the build/runtime
  layer (compiles, all four spot-checked routes resolve and correctly
  redirect unauthenticated requests to `/login`), but never clicked
  through by a human or driven by browser automation — none of the server
  actions across the 7 pages have been exercised against a real form
  submission, including the full record → approve → execute workflow the
  approval gate is meant to protect.
- **No live LLM provider integration** — by explicit user decision for
  this phase, no AI agent in this build actually calls a model. Every
  `ai_runs`/`ai_outputs` row that exists is manually recorded through the
  demo workflow on `/ai/runs`, not produced by a real agent. Wiring up an
  actual provider (API key, SDK, per-call cost) is a deliberate future
  decision, not an oversight.
- **No automated CI** for the SQL tests (same gap as every prior phase — still
  run manually).

## Phase 8 Test Status (subset A)

One more real, transaction-wrapped SQL test was added and passes:

- `supabase/tests/billing_rls.sql` — proves cross-tenant isolation on
  `workspace_subscriptions`/`usage_counters`/`data_export_requests`/
  `data_deletion_requests` (tenant B gets 0 rows querying any of tenant A's
  billing/data-governance records directly), confirms the seeded plan
  reference data (3 plans, 12 entitlements) stays globally readable, proves
  no authenticated role — not even the Workspace Owner — can write
  `workspace_subscriptions` directly (0 rows affected, since there is no
  UPDATE policy at all), confirms `billing_webhook_events` is completely
  unreadable to the authenticated role, and confirms the open-to-all-members
  insert policy on `data_export_requests` versus the admin-only insert
  policy on `data_deletion_requests` (a plain member's deletion-request
  insert attempt raises the expected RLS violation).

**This phase's build reached `READY` on the first deploy** — including
installing the new `stripe` npm dependency for the first time in this
project and a correct first guess at the Stripe API version string
matching the installed SDK version.

Two real bugs were caught and fixed before they shipped, both by
self-review rather than by a compile error or a failing test:

1. An early version of the data-export action computed the full export
   bundle and then discarded it, marking the request `completed` while
   pointing at an `assets` row with a `null storage_path` — this build has
   no file-storage bucket configured, so nothing would have actually been
   retrievable. Fixed by storing the bundle inline as `jsonb` and serving
   it through an authenticated `/api/data-export/[id]` route instead.
2. The original `workspace_subscriptions.status` check constraint only
   covered a subset of Stripe's real `Subscription.status` enum — missing
   `incomplete_expired`, `unpaid`, and `paused` — which would have made the
   webhook handler's upsert fail (and be recorded as a failed
   `billing_webhook_event`) the first time Stripe sent one of those
   statuses. Fixed via a follow-up migration widening the constraint before
   any real webhook could hit it.

**Honestly not done yet, on top of every prior phase's carried-forward gaps:**

- **No UI testing with a real browser or user.** Every Phase 8 flow
  (billing plan comparison and subscribe, customer portal hand-off, data
  export and download, data deletion request/cancel, the guided-activation
  banner) has been verified at the SQL layer (schema, RLS) and the
  build/runtime layer (compiles, both spot-checked routes resolve and
  correctly redirect unauthenticated requests to `/login`), but never
  clicked through by a human or driven by browser automation.
- **No live Stripe environment configured yet.** `STRIPE_SECRET_KEY` and
  `STRIPE_WEBHOOK_SECRET` are not set in Vercel, no webhook endpoint is
  registered in the Stripe dashboard pointing at `/api/stripe/webhook`, and
  all three plans' `stripe_price_id` values are still `null` pending the
  user creating the test-mode Prices themselves (the connected Stripe MCP
  tool is bound to the account's live secret key and cannot create
  test-mode objects). The full checkout → webhook → subscription-active
  flow has not been exercised end-to-end even once.
- **Data deletion has no automated executor** — requests can be scheduled
  and canceled, but nothing actually purges a workspace on its scheduled
  date; that needs a recurring job (pg_cron or a Vercel cron) this build
  doesn't have.
- **No automated CI** for the SQL tests (same gap as every prior phase —
  still run manually).

## Settings/Users Test Status

Built alongside Phase 8: `/settings/users`, the first of the never-built
Section 5 Settings placeholders to actually be built out (real invite
flow, role assignment, access review, suspend/reactivate/remove), plus a
new `enforce_seat_limit` trigger closing Phase 8's own documented "seats
not enforced" gap.

One more real, transaction-wrapped SQL test was added and passes:

- `supabase/tests/settings_users_seat_limit.sql` — proves adding members
  is unrestricted with no subscription on file; proves both an
  `active`-status and an `invited`-status insert are blocked once a
  solo-plan seat limit (1) is already met, each via the exact expected
  exception message rather than any error; confirms a Workspace Owner can
  set `access_review_at` directly through RLS with no admin client
  involved (1 row affected); and confirms a plain member cannot change
  another member's status (0 rows affected).

**This build reached `READY` on the first deploy.** One real bug was
caught and fixed before it shipped, by the test itself throwing an actual
exception rather than by inspection: the first version of
`enforce_seat_limit` fired on every `UPDATE` to an invited/active member,
not just the transition into that state, so a harmless `access_review_at`
update incorrectly tripped the seat-limit block. Fixed by adding the same
`tg_op = 'INSERT' or old.status not in (...)` transition guard
`enforce_automation_enable_gate` (Phase 6/8) already had.

**Honestly not done yet, on top of every prior phase's carried-forward
gaps:**

- **No UI testing with a real browser or user.** `/settings/users` has
  been verified at the SQL layer (schema, RLS, the seat-limit trigger) and
  the build/runtime layer (compiles, the route resolves and correctly
  redirects an unauthenticated request to `/login` with a 200), but the
  invite/role/access-review/suspend forms have never been exercised
  against a real form submission, and no real invite email has been sent
  end-to-end.
- **No automated CI** for the SQL tests (same gap as every prior phase —
  still run manually). (Business-unit limits and the rest of Settings are
  now built too — see the Settings Completion Test Status section below.)

## Library/Search Test Status

Built alongside Phase 8/Settings-Users: all 11 `/library/*` routes and
`/search`, closing the last unbuilt canonical route section from
Appendix A.

One more real, transaction-wrapped SQL test was added and passes:

- `supabase/tests/library_search.sql` — proves cross-tenant isolation on
  `knowledge_entries` (the one new table this build adds: tenant B gets 0
  rows querying tenant A's knowledge entries directly, and a cross-tenant
  `UPDATE` affects 0 rows), and confirms the new
  `templates.template_type` check constraint actually rejects an
  out-of-list value (`check_violation` raised as expected) while accepting
  a valid one. Assets, asset_versions, folders, tags, and templates
  already had their RLS proven by Phase 1's isolation test — not repeated
  here, only what's new.

**This build reached `READY` on the first deploy.**

**Honestly not done yet, on top of every prior phase's carried-forward
gaps:**

- **No UI testing with a real browser or user.** All 11 `/library/*`
  routes and `/search` have been verified at the SQL layer (schema, RLS on
  the new table, the template_type constraint) and the build/runtime
  layer (compiles; `/library/business-brain`, `/library/templates`, and
  `/search` all resolve and correctly redirect an unauthenticated request
  to `/login` with a 200), but none of the create/edit/archive forms
  across the asset-library sections, Templates, or Business Brain's
  Policies/Glossary CRUD have been exercised against a real form
  submission.
- **No file storage bucket is configured**, so "add a version" on any
  asset-library section stores a link to an external file location
  rather than an uploaded file — the same deferral already recorded for
  Phase 8's data export. Folder hierarchy management has no UI yet either;
  tags are the only organization/filter mechanism.
- **Search is a representative cross-section (8 object types), not a
  full-text index across all 176 tables** — it does not exclude archived
  items and has no relevance ranking beyond grouping by type.
- **No automated CI** for the SQL tests (same gap as every prior phase —
  still run manually).

## Settings Completion Test Status

Built the remaining 7 `/settings/*` routes (workspace, business-units,
roles, integrations, notifications, accessibility, ai-policies),
completing Appendix A's entire Settings section — every canonical route
in the app is now built except Phase 8's explicitly deferred remainder.

One more real, transaction-wrapped SQL test was added and passes:

- `supabase/tests/settings_business_unit_limit.sql` — proves cross-tenant
  isolation on `business_units` (never directly tested before now that
  real UI writes to it: tenant A gets 0 rows querying tenant B's business
  units directly), proves adding business units is unrestricted with no
  subscription on file, proves a second `active`-status business unit is
  blocked once a solo-plan limit (1) is already met via the exact
  expected exception message, and confirms an `archived`-status insert is
  unaffected by the guard (only active-status transitions are gated).

**This build reached `READY` on the first deploy.**

**Honestly not done yet, on top of every prior phase's carried-forward
gaps:**

- **No UI testing with a real browser or user.** All 7 routes have been
  verified at the SQL layer (schema, RLS, the new limit trigger) and the
  build/runtime layer (compiles; `/settings/workspace`,
  `/settings/business-units`, and `/settings/roles` all resolve and
  correctly redirect an unauthenticated request to `/login` with a 200),
  but none of the create/edit/delete forms — business unit CRUD, role
  creation and permission-checkbox toggling, notification preference
  saves, or the accessibility overrides actually changing rendered
  output — have been exercised against a real form submission.
- **Notification preferences have no generator behind most trigger
  types yet** — Section 14.4's 13 named triggers (decision due, approval
  requested, etc.) are all configurable, but nothing in this build
  actually inserts a `notifications` row for most of them; only a human
  or a future automation would populate them.
- **No automated CI** for the SQL tests (same gap as every prior phase —
  still run manually).

## Template Marketplace Test Status

Built the first item of Phase 8's deferred remainder: a template
marketplace, and this build's first deliberate exception to strict
per-workspace RLS isolation (confirmed with the user before building,
not a gap — see docs/permissions-and-rls.md).

One more real, transaction-wrapped SQL test was added and passes:

- `supabase/tests/template_marketplace.sql` — proves the actual
  cross-tenant read boundary rather than just that RLS is enabled: a
  workspace's draft listing is invisible to another workspace (0 rows),
  the same workspace's published listing IS visible to another workspace
  (1 row) — the first test in this project that expects and confirms a
  successful cross-tenant read — a direct cross-tenant `UPDATE` on the
  published listing still affects 0 rows even though it's readable, the
  `increment_marketplace_install_count` RPC succeeds when called from the
  other workspace's `authenticated` context and the count reflects it
  afterward, and the same RPC leaves a draft listing's count at 0 even
  when called directly against it.

**This build reached `READY` on the first deploy.** One real bug was
caught and fixed immediately by the security advisor, not by inspection
or a failing test: `increment_marketplace_install_count` was left
callable by the `anon` role by default (Postgres grants `EXECUTE` to
`PUBLIC` on new functions unless explicitly revoked) — the same class of
finding Phase 1's `handle_new_user()`/`log_audit_event()` and Phase 8's
`increment_usage_counter` had each already fixed once, caught here within
the same session via a routine post-migration `get_advisors` check and
fixed via an immediate follow-up migration before anything used the
function.

**Honestly not done yet, on top of every prior phase's carried-forward
gaps:**

- **No UI testing with a real browser or user.** `/library/templates`
  (now including the publish/unpublish/install marketplace controls) has
  been verified at the SQL layer (schema, RLS, the new cross-tenant
  policy, the install-count RPC) and the build/runtime layer (compiles,
  the route resolves and correctly redirects an unauthenticated request
  to `/login` with a 200), but publishing a real template, browsing the
  marketplace, and installing a listing have never been exercised against
  a real form submission.
- **No certification workflow** — the `certified` column exists but
  nothing in this build can set it true, since there is no
  platform-operator/superadmin role anywhere in the app. Documented as an
  explicit, confirmed-with-the-user deferral, not an oversight.
- **3 of Phase 8's 5 deferred items remain**: white-label client
  workspace options, benchmarking with privacy-safe aggregation, and
  multi-brand/multi-business enhancements beyond what `business_units`
  already provides. (Mobile and voice-first refinements are now built —
  see the section below.)
- **No automated CI** for the SQL tests (same gap as every prior phase —
  still run manually).

## Mobile and Voice-First Refinements Test Status

Built Phase 8's deferred-remainder item 2 (Section 16.2/16.4): a global
command palette, Command Center's mobile-priority rebuild, approvals
batch/voice-friendly labels, and a table/card fallback on `/ai/policies`.
No schema changes, so no new SQL test was needed — this phase's
verification is build/runtime only.

**This build reached `READY` on the first deploy.** `/command/today`,
`/approvals`, and `/ai/policies` all resolve and correctly redirect an
unauthenticated request to `/login` with a 200.

**Honestly not done yet, on top of every prior phase's carried-forward
gaps:**

- **No UI testing with a real browser or user.** The command palette's
  keyboard interaction (Cmd/Ctrl+K, arrow-key navigation, Enter to
  navigate), Command Center's new stat tiles, the approvals batch-select
  checkboxes tied to a sibling form via the HTML `form` attribute, and
  the `/ai/policies` card fallback below the `sm` breakpoint have all
  been read-reviewed and compile cleanly, but none have been clicked
  through, tested at a real mobile viewport width, or driven by an actual
  keyboard-only or screen-reader pass.
- **The at-risk-client count is a bounded approximation** (latest of the
  300 most recent `client_health_events` rows workspace-wide, deduped per
  client) rather than a true per-client "current status" query — could
  undercount in a workspace with unusually heavy health-event volume
  across many distinct clients. See docs/data-model.md's assumptions for
  detail.
- **Capacity utilization is an all-time ratio, not period-scoped** —
  `capacity_allocations.period` has no established format convention to
  filter on yet.
- **A full sweep of every button label across ~80 routes for
  voice-friendly phrasing was not attempted** — only the spec's own named
  example surface (Approvals) was fixed.
- **2 of Phase 8's 5 deferred items remain**: white-label client
  workspace options and multi-brand/multi-business enhancements.
  (Benchmarking is now built too — see the section below.)
- **No automated CI** for the SQL tests (same gap as every prior phase —
  still run manually).

## Benchmarking Test Status

Built Phase 8's deferred-remainder item 3 (Section 15's "Benchmarking with
privacy-safe aggregation"): a single `get_workspace_benchmarks()`
function, no new table, computing 4 metrics with a 10-workspace anonymity
floor confirmed with the user before building.

One more real, transaction-wrapped SQL test was added and passes:

- `supabase/tests/benchmarking.sql` — proves the actual floor, not just
  that the function runs without error: a pool of 12 other workspaces
  (each with one won opportunity) returns a real `closed_won_rate`
  benchmark; a pool of 0 other workspaces with `client_health_events`
  returns `null` for `client_at_risk_pct` even though the function ran
  successfully; the function always returns exactly 4 rows regardless of
  how many workspaces exist in the transaction (14 by the test's end),
  proving it's structurally incapable of leaking a per-workspace row; and
  a user who is not a member of the target workspace is rejected with the
  membership-guard exception rather than silently reading its data.

**This phase needed one build-fix iteration**: `supabase.rpc()` with no
generated types left the result's `.map()` callback parameter implicitly
`any` under strict mode. Fixed by casting the result through `unknown` to
a concrete `BenchmarkRow` type — the same escape hatch already used for
untyped nested-relation selects since Phase 3. A genuine compile-time
catch from Vercel's build log, not a false alarm — same verification
discipline as every prior phase.

**Honestly not done yet, on top of every prior phase's carried-forward
gaps:**

- **No UI testing with a real browser or user.** `/reviews/reports`'
  Benchmarks section has been verified at the SQL layer (the floor's
  blocking and passing cases, the membership guard) and the build/runtime
  layer (compiles after the one fix, the route resolves and correctly
  redirects an unauthenticated request to `/login` with a 200), but no one
  has viewed the actual benchmark tiles rendered with real data across
  more than one workspace.
- **The 10-workspace floor has not been exercised against this build's
  actual production data** — the test proves the mechanism works with
  synthetic data inside a rolled-back transaction; whether any real
  workspace will see an actual number soon depends on how many workspaces
  sign up and how much opportunity/health/capacity/automation data they
  each accumulate.
- **1 of Phase 8's 5 deferred items remains**: multi-brand/multi-business
  enhancements. (White-label is now built too — see the section below.)
- **No automated CI** for the SQL tests (same gap as every prior phase —
  still run manually).

## White-Label Test Status

Built Phase 8's deferred-remainder item 4: custom-domain
request/verification (`workspace_domains`, real DNS lookups) and
client-facing branding columns on `workspaces`, both confirmed in scope
with the user before building.

One more real, transaction-wrapped SQL test was added and passes:

- `supabase/tests/white_label.sql` — proves cross-tenant read isolation
  on `workspace_domains` (tenant B gets 0 rows querying tenant A's
  domain directly), the global domain-uniqueness constraint blocking
  tenant B from claiming a domain already registered to tenant A (a real
  `unique_violation`, not a silent failure), a plain member of tenant A
  being rejected with an actual `insufficient_privilege` RLS error when
  attempting to add a domain (INSERT under RLS raises rather than
  silently affecting 0 rows, unlike UPDATE/DELETE against hidden rows —
  this test initially miscounted that distinction and was corrected
  before the final run), and a Workspace Owner successfully adding a
  second domain for their own workspace.

**This build reached `READY` on the first deploy.**

**Honestly not done yet, on top of every prior phase's carried-forward
gaps:**

- **No UI testing with a real browser or user.** `/settings/workspace`'s
  White-Label section (add/check/remove domain, branding form) and
  `/clients/portal`'s branding preview card have been verified at the SQL
  layer (RLS, the uniqueness constraint) and the build/runtime layer
  (compiles, both routes resolve and correctly redirect an
  unauthenticated request to `/login` with a 200), but no one has
  actually registered a real domain, watched a live DNS check resolve to
  `verified`, or saved real branding and viewed the preview render.
- **No real domain has been verified or attached** — the DNS-check logic
  is real, but exercising it end-to-end needs a workspace owner who
  actually controls a domain's DNS records; even once "verified," this
  build never calls Vercel's API, so making that domain actually resolve
  to the live app is a manual step nobody has performed yet.
- **No dedicated client-facing portal view exists to actually show this
  branding to a client** — `/clients/portal` remains the coach-facing
  management page it always was; this is a real, pre-existing gap
  surfaced (not created) by this work, flagged honestly rather than
  expanded into scope to fix.
- **1 of Phase 8's 5 deferred items remained at this point**:
  multi-brand/multi-business enhancements. (Now built too — see the
  section below.)
- **No automated CI** for the SQL tests (same gap as every prior phase —
  still run manually).

## Multi-Brand/Multi-Business Test Status

Built the last item of Phase 8's deferred remainder: scoping operational
data (`clients`, `leads`, `opportunities`, `invoices`, `campaigns`) by
`business_unit_id`, confirmed in scope with the user before building
(the alternatives — business-unit-level branding, or business-unit-scoped
roles/permissions — were offered and declined).

One more real, transaction-wrapped SQL test was added and passes:

- `supabase/tests/multi_brand_scoping.sql` — proves a client can be
  attributed to a business unit in its own workspace, that attributing it
  to another workspace's business unit is rejected on both `INSERT` and
  `UPDATE` by the new `enforce_business_unit_same_workspace` trigger (a
  plain exception, not an RLS `WITH CHECK` failure, since this is a
  data-integrity rule rather than a visibility rule — no new RLS boundary
  was added at all, since business units already live inside the existing
  `workspace_id` tenant boundary), and that clearing `business_unit_id`
  back to `null` still works.

**This build reached `READY` on the first deploy.**

**Honestly not done yet, on top of every prior phase's carried-forward
gaps:**

- **No UI testing with a real browser or user.** `/clients/overview`'s
  and `/revenue/overview`'s business-unit filters, and the business-unit
  selects on the clients/leads/opportunities/campaigns creation forms,
  have been verified at the SQL layer (the same-workspace trigger) and
  the build/runtime layer (compiles, both routes resolve and correctly
  redirect an unauthenticated request to `/login` with a 200), but no one
  has actually filtered a real list by business unit or watched an
  invoice inherit its business unit from a real opportunity.
- **Proposals and contracts are not scoped by business unit** — only the
  five tables named above carry `business_unit_id`; extending it further
  was judged out of scope for this pass and is documented honestly rather
  than silently left inconsistent.
- **No automated CI** for the SQL tests (same gap as every prior phase —
  still run manually).
- **Every item from Phase 8's original 5-item deferred list is now
  complete**: template marketplace, mobile/voice-first refinements,
  privacy-safe benchmarking, white-label workspace options, and
  multi-brand/multi-business enhancements.
