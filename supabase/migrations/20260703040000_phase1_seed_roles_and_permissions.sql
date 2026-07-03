-- Phase 1: seed the default system roles (Section 11.1 — the union of Section 4's
-- "Recommended roles" and Section 11.1's "Default workspace roles" lists, since the
-- two lists disagree slightly: Section 4 includes Contractor but omits AI Governance
-- Reviewer and External Advisor/Auditor; Section 11.1 has the reverse. Seeding the
-- union is the safe reasonable option — extra role options cost nothing, and every
-- role named in either list is available to every workspace) and a starter
-- permission catalog scoped to what Phase 1 actually built.
--
-- IMPORTANT: role_permissions below is a starting catalog, not yet the live
-- enforcement path. Phase 1's actual RLS (see 20260703010000 and 20260703020000)
-- enforces workspace membership for general access and named-role checks
-- (Workspace Owner / Administrator) for admin-gated tables. Evolving RLS policies
-- to consult role_permissions directly for fine-grained resource.action.scope
-- enforcement is a later-phase refinement, once real per-role UI exists to manage
-- it — see docs/permissions-and-rls.md.

insert into public.roles (workspace_id, name, description, is_system) values
  (null, 'Workspace Owner', 'Full workspace, billing, security, integration, and data control', true),
  (null, 'Administrator', 'Configuration, users, permissions, integrations, and audit visibility', true),
  (null, 'Executive or Leadership', 'Cross-functional read access, reviews, forecasts, decisions, and approvals', true),
  (null, 'Marketing', 'Markets, brand, content, campaigns, leads, segments, and marketing analytics', true),
  (null, 'Prospector or Appointment Setter', 'Assigned leads, research, outreach, follow-up, and scheduling', true),
  (null, 'Salesperson or Closer', 'Assigned opportunities, discovery, proposals, contracts, and forecasts', true),
  (null, 'Finance', 'Orders, invoices, payments, refunds, budgets, and reconciliation', true),
  (null, 'Onboarding Specialist', 'Handoff, onboarding instances, client access, and kickoff', true),
  (null, 'Coach or Delivery Team', 'Assigned clients, sessions, actions, deliverables, and progress', true),
  (null, 'Client Success', 'Health, interventions, reviews, renewals, referrals, and testimonials', true),
  (null, 'Operations', 'Tasks, SOPs, automations, vendors, technology, and capacity', true),
  (null, 'AI Governance Reviewer', 'AI agents, knowledge sources, approval queue, policies, and usage', true),
  (null, 'Client', 'Only approved client-facing information for the client relationship', true),
  (null, 'External Advisor or Auditor', 'Time-limited, scope-limited read access to approved areas', true),
  (null, 'Contractor', 'Founder plus VA, setter, delivery support, or contractor access, scoped by assignment', true);

-- Starter permission catalog for what Phase 1 actually built. Every later phase
-- adds the permissions its new resources need (see docs/permissions-and-rls.md).
insert into public.permissions (code, resource, action, description) values
  ('workspace.manage.workspace', 'workspace', 'manage', 'Update workspace settings'),
  ('workspace.read.workspace', 'workspace', 'read', 'Read workspace details'),
  ('business_unit.manage.workspace', 'business_unit', 'manage', 'Create, update, and archive business units'),
  ('business_unit.read.workspace', 'business_unit', 'read', 'Read business units'),
  ('member.manage.workspace', 'member', 'manage', 'Invite, suspend, and remove workspace members'),
  ('member.read.workspace', 'member', 'read', 'Read the workspace member roster'),
  ('role.manage.workspace', 'role', 'manage', 'Create and configure workspace roles and role assignments'),
  ('role.read.workspace', 'role', 'read', 'Read roles and role assignments'),
  ('task.manage.workspace', 'task', 'manage', 'Create, update, and complete tasks'),
  ('task.read.workspace', 'task', 'read', 'Read tasks'),
  ('decision.manage.workspace', 'decision', 'manage', 'Create and resolve decisions'),
  ('approval.manage.workspace', 'approval', 'manage', 'Request and decide approvals'),
  ('blocker.manage.workspace', 'blocker', 'manage', 'Log and resolve blockers'),
  ('comment.manage.workspace', 'comment', 'manage', 'Post and manage comments'),
  ('asset.manage.workspace', 'asset', 'manage', 'Upload and version workspace assets'),
  ('asset.read.workspace', 'asset', 'read', 'Read workspace assets'),
  ('template.manage.workspace', 'template', 'manage', 'Create and version workspace templates'),
  ('audit_event.read.workspace', 'audit_event', 'read', 'Read the immutable audit history');

-- Role-to-permission assignments. Owner/Administrator get everything. Other
-- roles get a reasonable operating baseline (read everything readable at this
-- phase, manage the shared work engine) until per-role UI lets a workspace
-- configure this itself. Client and External Advisor/Auditor stay read-only and
-- minimal until the client portal (Phase 5) and time-limited scoped access
-- (later phase) are actually built.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.workspace_id is null
  and r.name in ('Workspace Owner', 'Administrator');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.workspace_id is null
  and r.name in (
    'Executive or Leadership', 'Marketing', 'Prospector or Appointment Setter',
    'Salesperson or Closer', 'Finance', 'Onboarding Specialist',
    'Coach or Delivery Team', 'Client Success', 'Operations', 'Contractor',
    'AI Governance Reviewer'
  )
  and p.code in (
    'workspace.read.workspace', 'business_unit.read.workspace', 'member.read.workspace',
    'role.read.workspace', 'task.manage.workspace', 'task.read.workspace',
    'decision.manage.workspace', 'approval.manage.workspace', 'blocker.manage.workspace',
    'comment.manage.workspace', 'asset.read.workspace', 'asset.manage.workspace'
  );

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.workspace_id is null
  and r.name in ('Client', 'External Advisor or Auditor')
  and p.code = 'workspace.read.workspace';
