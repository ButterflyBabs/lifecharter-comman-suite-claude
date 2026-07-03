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
  See [migration-and-deployment.md](migration-and-deployment.md#deployment-history-phase-0-first-real-build)
  for exact values needed to close this out.
