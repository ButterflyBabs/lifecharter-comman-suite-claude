# Permissions, Row Level Security, and Privacy

Transcribed from Section 11 of the Master Product Restructure Specification. This is
the non-negotiable security baseline (see Appendix D, Mariposa Execution Directive):
Row Level Security is enforced from day one, on every exposed tenant table, with no
exceptions carved out for convenience.

**Status as of Phase 1: workspace isolation is built and verified, not assumed.**
`workspaces`, `workspace_members`, `roles`, `permissions`, `role_permissions`, and
`member_roles` all exist with RLS enabled. A real, transaction-wrapped SQL test
(`supabase/tests/rls_workspace_isolation.sql`) creates two fake tenants and proves:

- A user cannot read another workspace's rows by direct query (workspaces, tasks).
- A user cannot write another workspace's rows by direct query (a cross-tenant
  `UPDATE` affects 0 rows).
- `audit_events` is readable only by `Workspace Owner` / `Administrator` /
  `AI Governance Reviewer` — a plain member gets 0 rows.
- A **suspended** member of a real workspace sees 0 rows anywhere — Section 11.3's
  "suspended users lose access immediately" is enforced by the RLS policy itself
  (`status = 'active'` is part of every membership check), not by an application-layer
  check that could be bypassed.

A second test (`supabase/tests/audit_logging.sql`) proves membership and role changes
actually write to `audit_events` via triggers (Section 11.6), not just that the table
exists. Both tests run inside `BEGIN; ... ROLLBACK;` — verified by intentionally
triggering a failing assertion first and confirming it surfaces as an error, so a
clean run is known to mean "passed," not "didn't run."

**Not yet true, honestly:** these are SQL files run manually via the Supabase MCP
connector, not wired into an automated CI pipeline — see
[testing.md](testing.md#phase-1-test-status) for what CI wiring would take.
Permission enforcement is coarser than the full model below describes — see
"Phase 1 Enforcement, Honestly" beneath the permission model.

**Phase 2 adds 19 more RLS-enabled tables** (audit, roadmap/gates, review center —
see [data-model.md](data-model.md)) using the same two patterns: workspace-membership
policies for tenant-owned rows, and `auth.role() = 'authenticated'` read-only policies
for the global reference tables (`business_command_domains`, `audit_templates`,
`audit_questions`, `roadmap_templates`, `review_templates`). Also new: two database
triggers that enforce stage-gate blocking regardless of what the UI does or doesn't
check — proven with a real test the same way workspace isolation was (see
[data-model.md's Phase 2 assumptions](data-model.md#assumptions-recorded-in-phase-2)
and `supabase/tests/roadmap_gate_enforcement.sql`). The setup wizard's
workspace-bootstrap flow (the one place in the app that must use the service-role
client, since RLS grants no authenticated INSERT on `workspaces`) was verified with
`supabase/tests/setup_wizard_workspace_bootstrap.sql` to actually produce
RLS-recognized ownership, not just rows that look right.

**Phase 3 adds 19 more RLS-enabled tables** (the full Business Architecture object
set — see [data-model.md](data-model.md)), all using the same workspace-membership
policy pattern as every tenant-owned table since Phase 1; there are no global
reference tables in this set (unlike Phase 2's domains/templates), since every
Business Architecture object is workspace-specific content. Verified with
`supabase/tests/business_architecture_rls.sql`, covering the `founder_profiles`
singleton, the `strategy_profiles` → `goals` → `key_results` chain, and the
`offers` → `offer_versions` → `offer_pricing`/`offer_capacity_models`/
`offer_economics` chain — same rolled-back-transaction, deliberately-break-one-
assertion-first rigor as the earlier test suites.

**Phase 4 adds 32 more RLS-enabled tables** (the full Revenue Engine object set),
all workspace-membership-scoped — no global reference tables here either, since
every Revenue Engine object (leads, opportunities, proposals, payments, etc.) is
workspace-specific. Two real triggers were added this phase and are now part of
what "correct" means for this schema, not just documented rules: opportunity
stage changes are logged to `stage_history` (`log_opportunity_stage_change`), and
sent `proposal_versions` become immutable (`enforce_proposal_version_immutability`)
regardless of role — even a service-role/superuser connection cannot bypass a
trigger the way it can bypass an RLS policy, so this rule holds even for
admin-level database access. Verified with `supabase/tests/revenue_engine_rls.sql`,
covering both triggers plus cross-tenant isolation on the
`people`/`organizations`/`leads` chain and the
`opportunities` → `proposals` → `proposal_versions` chain.

**Phase 5 adds 30 more RLS-enabled tables** (the full Client Experience object
set), all workspace-membership-scoped — no global reference tables here either,
since every Client Experience object (clients, journeys, programs, sessions,
health, renewals, advocacy, etc.) is workspace-specific. One real trigger was
added this phase, following the exact pattern Phase 4 established:
`program_versions` become immutable once `published`
(`enforce_program_version_immutability`), enforced regardless of role. Verified
with `supabase/tests/client_experience_rls.sql`, covering the trigger plus
cross-tenant isolation on the `clients` → `client_offer_enrollments` →
`onboarding_instances` chain and the `programs` → `program_versions` →
`program_phases` → `sessions`/`client_actions` chain.

**Phase 6 adds 28 more RLS-enabled tables** (the full Operations object set).
`integration_providers` is the one global reference table this phase (the same
pattern as Phase 2's `business_command_domains`/`audit_templates`) — read-only
to authenticated users, since it's a shared catalog of provider adapters, not
per-tenant content; every other table is workspace-membership-scoped as usual.
One real trigger was added: `automation_definitions.enabled` cannot be set to
`true` without an owner, a documented idempotency strategy, and a passing test
run on record (`enforce_automation_enable_gate`), matching Section 6's stated
rule verbatim and enforced regardless of role. `log_audit_event()` (Phase 1's
audit trigger function) was generalized with a fallback branch so it can be
attached to any tenant table by its own `workspace_id` column, and is now also
wired to `automation_definitions` — extending Section 11.6's audit coverage to
automation enable/disable. Verified with `supabase/tests/operations_rls.sql`,
covering cross-tenant isolation on teams/responsibilities/vendors/technology
items/integration accounts (plus confirming the global provider catalog stays
readable across tenants) and all three blocking cases plus the positive case
for the automation-enable gate.

**Phase 7 adds 13 more RLS-enabled tables** (KPIs, prompt library, and the full
AI Team object set), all workspace-membership-scoped — no global reference
tables this phase. **This is the phase that finally enforces Appendix C's
Human Approval Matrix**, closing the deferral that has applied to every phase
since Phase 3: `enforce_ai_output_approval_gate` blocks any `ai_outputs` row
from reaching `approved` or `executed` status without a matching `approved`
row already on record in `ai_approvals`, enforced regardless of role on every
insert or update, not only at creation. Outputs at the lower rungs of the
permission ladder (`read_and_analyze` through `execute_low_risk_internal`) are
recorded with `approval_required = false` and bypass the gate by design,
matching Appendix C's own distinction between actions that may execute without
approval and those that may not. No live LLM provider is called by this build
(governance scaffolding only, per explicit user decision) — the gate applies
identically to the manually-recorded outputs this phase produces and to any
future live agent's writes, since it's enforced at the database layer rather
than in application code that a live integration could bypass. Verified with
`supabase/tests/ai_team_rls.sql`, covering cross-tenant isolation on
`kpis`/`ai_agents`/`ai_agent_versions`/`ai_knowledge_sources` and all of the
gate's cases: blocked with no approval on file, blocked with only a rejected
approval on file, and succeeding (through both `approved` and `executed`)
once an approved record exists.

**Phase 8 (subset A) adds 8 more RLS-enabled tables** (subscription billing,
entitlements, usage tracking, and data governance). `subscription_plans`,
`plan_prices`, and `plan_entitlements` are global reference data — read-only
to authenticated users, the same pattern as Phase 2/6/7's reference tables —
since plan definitions are platform-wide, not per-tenant. `workspace_subscriptions`
grants **no authenticated INSERT/UPDATE at all**, the same precedent as the
`workspaces` table itself: only the Stripe webhook handler and the checkout/
portal server actions can write it, both via the service-role admin client
after an app-layer `isWorkspaceAdmin()` check. `billing_webhook_events` has
RLS enabled with **zero policies** — completely inaccessible to
`authenticated`/`anon`, service-role only, the same "default deny" treatment
already given to the revoked-`EXECUTE` `SECURITY DEFINER` trigger functions
from Phase 1; this produces one expected `rls_enabled_no_policy` INFO-level
advisor finding, accepted by design. `data_export_requests` is insertable by
any active member; `data_deletion_requests` insert/update is admin-gated
(`Workspace Owner`/`Administrator` only via `private.has_workspace_role()`),
given how consequential a deletion request is. A new `SECURITY DEFINER` RPC,
`increment_usage_counter()`, is the one sanctioned way to bump a
`usage_counters` row (which itself has no authenticated write policy) —
it self-enforces active membership in the target workspace before writing,
the same discipline as every other `SECURITY DEFINER` function in this
codebase. Verified with `supabase/tests/billing_rls.sql`, covering
cross-tenant isolation, the global plan-data readability, the
no-authenticated-write restriction on `workspace_subscriptions` (even for
the Workspace Owner), and the open-vs-admin-gated insert distinction between
`data_export_requests` and `data_deletion_requests`.

**Also, alongside Phase 8: `/settings/users` adds a real invite flow and one
new trigger, `enforce_seat_limit`**, on `workspace_members` — the first
Section 5 Settings placeholder actually built out. It mirrors
`enforce_automation_enable_gate`'s pattern exactly: an insert or update
setting a member to `invited`/`active` status is blocked with a Postgres
exception once the workspace's active/trialing subscription has a
non-null `seats` entitlement limit already met; no subscription or an
unlimited (enterprise) entitlement is unrestricted. This closes the "seats
are not enforced yet" gap Phase 8 itself documented. No new RLS policy was
needed on `workspace_members` — Phase 1's existing "owners and admins can
manage membership" policy already grants Workspace Owner/Administrator
direct write access, so the invite server action uses the service-role
admin client for exactly one call (`auth.admin.inviteUserByEmail()`, which
has no authenticated equivalent) and the regular RLS-scoped client for
everything else. Verified with
`supabase/tests/settings_users_seat_limit.sql`, covering both the blocking
and unrestricted cases, and confirming the RLS policy (not the admin
client) is what lets a Workspace Owner write directly.

**Also built: the Knowledge and Asset Library and Search, adding one new
RLS-enabled table, `knowledge_entries`.** It uses the exact same
workspace-membership `for all` policy pattern as every other tenant-owned
table since Phase 1 — no new RLS pattern was needed. The six genuine
asset-library CRUD sections (Brand, Offer Collateral, Client Resources,
Content, Recordings, Research) write to Phase 1's existing
`assets`/`asset_versions`/`tags` tables, whose RLS was already proven;
SOPs and Agreements are read-only against `sops`, `legal_documents`, and
`contracts`, likewise already RLS-proven. `/search` reads across eight
already-RLS'd tables (tasks, decisions, opportunities, assets, templates,
sops, kpis, ai_agents) through the regular RLS-scoped client, so a search
can never surface another workspace's rows — the query itself is
workspace-scoped and RLS is the backstop either way. Verified with
`supabase/tests/library_search.sql`, covering cross-tenant isolation on
`knowledge_entries` (the one new table) and the new
`templates.template_type` check constraint.

**Also built: the remaining 7 `/settings/*` routes, completing Appendix
A's entire Settings section — no new tables, one new trigger.**
`enforce_business_unit_limit` mirrors `enforce_seat_limit` exactly,
blocking a `business_units` row from becoming `active` once the
workspace's plan `business_units` entitlement limit is met, closing the
last of the two seat/business-unit enforcement gaps Phase 8 originally
documented. Every RLS policy this build's server actions rely on already
existed from Phase 1 — `business_units` ("owners and admins can manage
business units"), `roles`/`role_permissions` ("owners and admins can
manage workspace roles"/"...role permissions", scoped so only
`workspace_id is not null` custom roles are writable, never the shared
system roles), `notification_preferences` (user manages their own via
`user_id = auth.uid()`), and `user_profiles` (same). No admin client is
used anywhere in this build; every write goes through the regular
RLS-scoped client, verified by reading the exact policy SQL rather than
assuming coverage. Verified with
`supabase/tests/settings_business_unit_limit.sql`, covering cross-tenant
isolation on `business_units` (never directly tested before now) and the
new limit trigger's blocking and unrestricted cases.

**Also built: the template marketplace, adding one new table
(`template_marketplace_listings`) and this build's first deliberate
exception to strict per-workspace isolation.** Every RLS policy since
Phase 1 has scoped tenant-owned tables to `workspace_id in (select
private.active_workspace_ids())` with no exceptions — this table keeps
that exact policy for management (`"publishers manage their own
listings"`) and adds a second, additive, permissive policy
(`"authenticated users can browse published listings"`) that lets any
authenticated member of any workspace read rows where `status =
'published'`, regardless of `source_workspace_id`. This is confirmed
deliberate, not a gap: the user was asked explicitly whether marketplace
content should be self-serve workspace-to-workspace publishing (chosen)
or platform-curated only, precisely because it breaks the isolation
pattern every other table in this schema depends on. Nothing a workspace
hasn't explicitly published is ever exposed — drafts and retired listings
stay covered only by the ownership policy. A new `SECURITY DEFINER` RPC,
`increment_marketplace_install_count`, mirrors Phase 8's
`increment_usage_counter` exactly: it self-validates `status =
'published'` before writing, since a requesting workspace has no general
`UPDATE` right on another workspace's listing row. The security advisor
caught the RPC left callable by `anon`/`public` by default immediately
after the first migration (the same class of finding Phase 1 and Phase 8
each fixed once already) — corrected via an immediate follow-up migration
before any deploy. Verified with `supabase/tests/template_marketplace.sql`,
proving the actual boundary: a draft listing is invisible cross-tenant, a
published one is visible, direct cross-tenant writes are still blocked
even though the row is readable, and the install-count RPC only ever
touches published listings.

**Also built: mobile and voice-first refinements (command palette, Command
Center's mobile hierarchy, approvals batch actions, a table/card fallback)
— no new RLS surface at all.** Every new query (open decisions, at-risk
clients, overdue invoices, failed payments, capacity allocations) reads
tables whose RLS was already proven in earlier phases, through the
regular RLS-scoped client; the batch-approve/reject action
(`decideApprovalsBatch`) uses a plain `.update().in("id", approvalIds)`
against `approvals`, which RLS already scopes to the caller's own
workspace regardless of how many rows are targeted in one call. The
command palette is pure client-side navigation (a static route list,
`router.push()`) with no data access at all.

**Also built: benchmarking with privacy-safe aggregation — the second
deliberate, confirmed exception to strict per-workspace isolation, and a
stricter one than the marketplace's since nothing is stored at all.**
`get_workspace_benchmarks(p_workspace_id)` is `SECURITY DEFINER` and
self-validates the caller is an active member of the requested workspace
before computing anything (mirroring every other self-validating function
in this codebase — `increment_usage_counter`,
`increment_marketplace_install_count`). Internally it reads every
workspace's data for 4 metrics, bypassing RLS the same way any
`SECURITY DEFINER` function does for its own queries — but the *return
value* is the actual privacy boundary, not a policy: only the caller's own
value and a `>=10`-other-workspaces aggregate (or `null` below that) ever
leave the function. There is no table backing this feature, so there is no
RLS policy to get wrong — the entire safeguard lives in the function body
itself, confirmed by a real test proving the exact floor rather than
assumed from the code. Grants were revoked from `public`/`anon` in the
same migration that created the function, closing the gap the marketplace
RPC needed a follow-up fix for. Verified with
`supabase/tests/benchmarking.sql`, covering the floor's blocking and
passing cases, the fixed 4-row return shape regardless of total workspace
count, and a non-member's request being rejected outright.

**Also built: white-label workspace options, adding one new table
(`workspace_domains`) that deliberately does *not* follow the
marketplace/benchmarking's cross-tenant pattern.** A domain has no reason
to be visible to anyone outside its own workspace, so `workspace_domains`
uses the exact same two-policy shape as `business_units` since Phase 1:
a broad `for select` policy scoped to `workspace_id in (select
private.active_workspace_ids())` for any active member, and a narrower
`for all` policy gated on `private.has_workspace_role(workspace_id,
array['Workspace Owner', 'Administrator'])` for writes. The one
cross-tenant-relevant property is a plain SQL `unique` constraint on
`domain` (global, not per-workspace) — it blocks two workspaces from
claiming the same domain without needing any special RLS handling, the
same way any multi-tenant domain-claiming system works. The new branding
columns on `workspaces` needed no new policy at all, since the existing
"owners and admins can update their workspace" `UPDATE` policy already
covers whatever columns a statement touches. Verified with
`supabase/tests/white_label.sql`, covering cross-tenant read isolation,
the uniqueness constraint, and a plain member's `INSERT` attempt being
rejected with an actual `insufficient_privilege` RLS error.

**Also built: multi-brand/multi-business enhancements, the last item from
Phase 8's original deferred list, adding no new RLS policy at all.**
`clients`, `leads`, `opportunities`, `invoices`, and `campaigns` each gain
a nullable `business_unit_id` — an added attribute inside the same
`workspace_id` tenant boundary every existing policy on those tables
already enforces, not a new read surface, so none of their RLS policies
changed. What *did* need a new guard is a data-integrity rule RLS doesn't
express: a record's `business_unit_id` must belong to a business unit in
that record's own workspace. `enforce_business_unit_same_workspace`, a
plain `BEFORE INSERT OR UPDATE` trigger (not an RLS policy), checks this
directly and raises a plain exception on violation — deliberately not
folded into a `WITH CHECK` clause, since this is an integrity constraint
between two columns on the same row, not a visibility rule about who can
see or write the row at all. Verified with
`supabase/tests/multi_brand_scoping.sql`, covering same-workspace
attribution succeeding, cross-workspace attribution being rejected on
both `INSERT` and `UPDATE`, and clearing the column back to `null` still
working.

## 11.1 Default Workspace Roles

| Role | Core access |
|---|---|
| Workspace Owner | Full workspace, billing, security, integration, and data control |
| Administrator | Configuration, users, permissions, integrations, and audit visibility |
| Executive or Leadership | Cross-functional read access, reviews, forecasts, decisions, and approvals |
| Marketing | Markets, brand, content, campaigns, leads, segments, and marketing analytics |
| Prospector or Appointment Setter | Assigned leads, research, outreach, follow-up, and scheduling |
| Salesperson or Closer | Assigned opportunities, discovery, proposals, contracts, and forecasts |
| Finance | Orders, invoices, payments, refunds, budgets, and reconciliation |
| Onboarding Specialist | Handoff, onboarding instances, client access, and kickoff |
| Coach or Delivery Team | Assigned clients, sessions, actions, deliverables, and progress |
| Client Success | Health, interventions, reviews, renewals, referrals, and testimonials |
| Operations | Tasks, SOPs, automations, vendors, technology, and capacity |
| AI Governance Reviewer | AI agents, knowledge sources, approval queue, policies, and usage |
| Client | Only approved client-facing information for the client relationship |
| External Advisor or Auditor | Time-limited, scope-limited read access to approved areas |

## 11.2 Permission Model

Use least privilege with permissions structured as:

```
resource.action.scope
```

Examples:

- `opportunity.read.assigned`
- `opportunity.update.assigned`
- `payment.reconcile.workspace`
- `client_note.read.internal_assigned`
- `ai_agent.configure.workspace`
- `integration.manage.workspace`
- `audit_event.read.workspace`

Scopes should include: `own`, `assigned`, `team`, `business unit`, `workspace`,
`client self-service`.

### Phase 1 Enforcement, Honestly

The `roles`, `permissions`, `role_permissions`, and `member_roles` tables exist and
are seeded (15 system roles — the union of Section 4's and this section's slightly
different lists, see the assumptions below — and an 18-permission starter catalog
scoped to what Phase 1 actually built). But **no RLS policy queries
`role_permissions` at request time yet.** Phase 1's actual enforcement is two-tier:

1. **Workspace membership** (`status = 'active'` in `workspace_members`) gates
   almost everything — the non-negotiable, and what the isolation test proves.
2. **Named-role checks** (`private.has_workspace_role(workspace_id, array[...])`)
   gate the handful of admin-only operations that exist so far: updating a
   workspace, managing business units/roles/membership, reading `audit_events`.

This means every non-admin role (Marketing, Salesperson, Coach, etc.) currently has
*identical* data access within a workspace — the fine-grained `resource.action.scope`
model this section describes is a real, populated catalog, not yet a live decision
path. Building RLS policies that actually consult `role_permissions` per-request is
appropriate once real per-role UI exists to configure it (a workspace owner needs to
*see* what "Marketing can access X" means before that boundary should be enforced) —
targeted for the phase that first needs it (likely Phase 4, when Marketing/Sales/
Finance roles start seeing genuinely different data).

## 11.3 Row Level Security Requirements

Apply database-enforced Row Level Security to every exposed tenant table. Required
tests include:

- A user cannot access another workspace by direct query, URL manipulation, export,
  or API request.
- A client cannot access another client, internal notes, internal health rationale,
  margin, sales scoring, or private risk assessments.
- Marketing cannot reconcile payments.
- Sales cannot change workspace permissions.
- Delivery cannot read private sales notes unless explicitly granted.
- Finance cannot view private coaching notes unless explicitly granted.
- Suspended users lose access immediately.
- Service-role operations are server-only and fully audited.

These tests are formalized as the RLS test suite in [testing.md](testing.md) and as
Scenario H (Permission protection) in Section 19.2 of the spec.

## 11.4 Data Classification

Classify fields and assets as:

- Public
- Workspace internal
- Confidential business
- Confidential client
- Restricted financial or legal
- Restricted credential or secret

Each class must define: allowed roles, export rules, AI use rules, retention period,
encryption requirements, redaction behavior, and deletion process. This classification
scheme is applied when Phase 1+ migrations add columns that hold client PII, financial
data, or credentials — it is not implemented as enforced logic in Phase 0.

## 11.5 Privacy and Consent Controls

Track: marketing consent and source, communication channel consent, recording
consent, testimonial and case-study consent, client portal acceptance,
data-processing or privacy acknowledgement, opt-out history, and consent expiration
when applicable.

The system must never infer or store unnecessary sensitive personal attributes from
public sources. B2C research should prioritize communities, referrals, authorized
engagement, and voluntarily supplied information rather than unsolicited
private-person dossiers.

## 11.6 Audit Requirements

Audit at minimum: authentication and membership changes; role and permission
changes; record merges; stage changes; offer, price, proposal, contract, order,
invoice, payment, and refund changes; client health overrides; destructive actions;
external communications; AI agent configuration and approved AI actions; integration
configuration and source-of-truth changes; exports and bulk downloads.

## AI Action Governance (Appendix C — Human Approval Matrix)

AI may prepare almost anything, but execution authority is strictly limited. This
matrix is non-negotiable per the brief ("AI actions require human approval for all
external and high-risk operations") and governs every AI agent built from Phase 7
onward, though the rule applies to any AI action added earlier too.

| Action | AI may prepare | AI may execute without approval |
|---|---|---|
| Internal summary | Yes | Yes, when permission-safe |
| Internal task suggestion | Yes | Yes, when reversible and policy-approved |
| Assign approved internal task | Yes | Yes, under configured rule |
| Update low-risk internal tag | Yes | Yes, under configured rule |
| External email or message | Yes | No by default |
| Publish content | Yes | No |
| Change price or offer scope | Yes | No |
| Send proposal or contract | Yes | No |
| Sign agreement | No | No |
| Charge payment method | Prepare only | No |
| Issue refund | Prepare only | No |
| Change permissions | Recommend only | No |
| Delete or bulk archive | Recommend only | No |
| Change client health from inference | Recommend only | No |
| Activate high-risk automation | Prepare and test | No |
| Resolve source-of-truth conflict | Recommend | No unless deterministic rule is preapproved |

## Assumptions Recorded in Phase 0

- Supabase Row Level Security is the enforcement mechanism referenced throughout this
  document; `auth.uid()` / `workspace_members` joins will be the standard RLS policy
  pattern once Phase 1 tables exist. No policy language is finalized yet — this is a
  Phase 1 build task.
- The Supabase MCP connector was reconnected to the correct account (ButterflyBabs's
  Org) during Phase 0. The project (`itxfgxmdyqpcytmgdysa`) had one pre-existing
  table with an effectively-open RLS policy (`USING (true)`); it was empty and not
  part of the canonical model, so it was dropped rather than migrated. See
  [migration-and-deployment.md](migration-and-deployment.md) for detail. The project
  now has zero tables and zero security advisor findings — a clean slate for Phase 1.

## Assumptions Recorded in Phase 1

- **Seeded 15 system roles, the union of Section 4's "Recommended roles" and this
  section's "Default workspace roles" lists**, since they disagree: Section 4
  includes `Contractor` but omits `AI Governance Reviewer` and
  `External Advisor or Auditor`; this section has the reverse. The union costs
  nothing (extra role options, not fewer) and avoids guessing which list is
  authoritative.
- **RLS pattern uses `SECURITY DEFINER` helper functions in a `private` schema**
  (`private.active_workspace_ids()`, `private.has_workspace_role()`), not exposed via
  PostgREST. This is the standard Supabase pattern for avoiding infinite recursion
  when a table's own RLS policy needs to check membership in that same table
  (`workspace_members`' policy calling a function that queries `workspace_members`
  would recurse if the function weren't `SECURITY DEFINER`, which bypasses RLS for
  its owner's queries).
- **Two `SECURITY DEFINER` functions were caught and fixed by the security advisor**
  during Phase 1: `handle_new_user()` (auto-creates a `user_profiles` row on
  signup) and `log_audit_event()` (the audit trigger) were both flagged as callable
  directly via `/rest/v1/rpc/...` by any signed-in or anonymous user, which was
  never intended — they're trigger-only plumbing. Fixed by revoking `EXECUTE` from
  `public`/`anon`/`authenticated`; re-verified both triggers still fire correctly
  after the revoke (trigger execution doesn't require the invoking role to hold
  `EXECUTE` on the function).
- **Audit coverage is deliberately narrow in Phase 1**: triggers exist on
  `workspace_members` and `member_roles` (the two sensitive tables Phase 1 actually
  built — membership and role-assignment changes, per Section 11.6's minimum list).
  Coverage for stage changes, financial changes, offer/price/contract changes, etc.
  is added as those tables are built in later phases — Section 11.6's full list
  can't be satisfied before the tables it refers to exist.
