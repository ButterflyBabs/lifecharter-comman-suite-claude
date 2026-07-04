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
