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
