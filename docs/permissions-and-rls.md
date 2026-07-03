# Permissions, Row Level Security, and Privacy

Transcribed from Section 11 of the Master Product Restructure Specification. This is
the non-negotiable security baseline (see Appendix D, Mariposa Execution Directive):
Row Level Security is enforced from day one, on every exposed tenant table, with no
exceptions carved out for convenience.

**Status as of Phase 0:** no tables exist yet, so no RLS policies exist yet either.
Phase 1 ("Core spine and tenant safety") is where `workspaces`, `workspace_members`,
`roles`, `permissions`, and their RLS policies are created — and per its acceptance
criteria, workspace isolation must pass direct database and API tests before Phase 2
begins. This document is written now so Phase 1 has a checklist instead of a blank
page.

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
