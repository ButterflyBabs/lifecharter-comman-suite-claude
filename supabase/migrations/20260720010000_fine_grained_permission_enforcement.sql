-- Section 11.2's fine-grained resource.action.scope permission model has,
-- since Phase 1, been a real, populated catalog that no RLS policy actually
-- consulted at request time (see docs/permissions-and-rls.md's "Phase 1
-- Enforcement, Honestly"). That was deliberately deferred until real
-- per-role UI existed to configure it (built in the Settings/Users phase,
-- /settings/roles) and until roles actually needed to see genuinely
-- different data — true since Revenue Engine, Client Experience, and
-- Operations shipped. This migration adds the missing primitive plus real
-- enforcement on the two Section 11.3 example scenarios that have an
-- actual, currently-shipped UI surface today:
--
--   - "Marketing cannot reconcile payments" -> payment.reconcile.workspace
--   - "Finance cannot view private coaching notes unless explicitly
--     granted" -> session_note.read.internal
--
-- The other two Section 11.3 examples aren't new work here:
--   - "Sales cannot change workspace permissions" is already true today —
--     roles/role_permissions/member_roles have been named-role-gated RLS
--     since Phase 1 (private.has_workspace_role(..., ['Workspace Owner',
--     'Administrator'])), independent of this permission engine.
--   - "Delivery cannot read private sales notes" has no live UI surface
--     yet — no page in this app currently reads opportunities' discovery
--     fields (decision_maker, decision_criteria, close_notes, etc.) at
--     all. Adding an enforcement point with nothing to enforce would be
--     exactly the "reviewed, not proven" gap this session already caught
--     once this week (notification_generators.sql) — left honestly
--     undone instead, same as Phase 1 deferred this whole feature.

-- True if the current user's active membership in p_workspace_id carries
-- any role granted p_permission_code via role_permissions. The general
-- primitive private.has_workspace_role (named-role checks) predates this
-- and continues to gate the handful of things it already gates — this is
-- additive, not a replacement.
create or replace function private.has_permission(p_workspace_id uuid, p_permission_code text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    join public.member_roles mr on mr.workspace_member_id = wm.id
    join public.role_permissions rp on rp.role_id = mr.role_id
    join public.permissions p on p.id = rp.permission_id
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and p.code = p_permission_code
  )
$$;

-- private.* isn't reachable via PostgREST (not in the exposed schema
-- list), so app code needs a public-schema wrapper to check a permission
-- before showing/attempting an action. Read-only, narrow, and — like
-- every other RPC in this codebase — explicitly revoked from anon:
-- `revoke ... from public` alone doesn't reliably strip the default
-- PUBLIC execute grant new functions get, so anon must be named too.
create or replace function public.current_user_has_permission(p_workspace_id uuid, p_permission_code text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select private.has_permission(p_workspace_id, p_permission_code)
$$;

revoke execute on function public.current_user_has_permission(uuid, text) from public, anon;
grant execute on function public.current_user_has_permission(uuid, text) to authenticated;

insert into public.permissions (code, resource, action, description) values
  ('payment.reconcile.workspace', 'payment', 'reconcile', 'Mark payments as reconciled'),
  ('session_note.read.internal', 'session_note', 'read', 'Read internal coaching notes (agenda, preparation brief, internal notes) on sessions');

-- Owner/Administrator get every permission as a matter of course (same
-- as every other permission this catalog has ever added).
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.workspace_id is null
  and r.name in ('Workspace Owner', 'Administrator')
  and p.code in ('payment.reconcile.workspace', 'session_note.read.internal');

-- Finance is Section 11.1's named owner of "reconciliation."
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.workspace_id is null
  and r.name = 'Finance'
  and p.code = 'payment.reconcile.workspace';

-- Coach/Delivery (the notes' actual authors), Executive/Leadership
-- (cross-functional access per Section 11.1), and Client Success
-- (health/intervention work regularly needs session context) get
-- coaching-note visibility. Marketing, Sales, Finance, Operations,
-- Prospector, Onboarding, AI Governance Reviewer, Contractor, Client,
-- and External Advisor do not.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.workspace_id is null
  and r.name in ('Coach or Delivery Team', 'Executive or Leadership', 'Client Success')
  and p.code = 'session_note.read.internal';

-- Real DB-level enforcement, not app-layer trust: even a direct UPDATE
-- (or a service-role script) that isn't itself permission-checked still
-- can't flip reconciliation_status without the permission. Every other
-- payment field/action keeps the existing workspace-membership policy
-- from Phase 4 — this only narrows the one column Section 11.3 calls out.
create or replace function private.enforce_payment_reconcile_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reconciliation_status is distinct from old.reconciliation_status
     and not private.has_permission(new.workspace_id, 'payment.reconcile.workspace') then
    raise exception 'You do not have permission to reconcile payments in this workspace';
  end if;
  return new;
end;
$$;

create trigger enforce_payment_reconcile_permission
  before update on public.payments
  for each row execute function private.enforce_payment_reconcile_permission();

-- Column-level masking for coaching notes, the same technique this
-- schema already uses for the client portal (client_portal_sessions):
-- Postgres RLS is row-level only, so genuine per-column visibility needs
-- a security-definer view rather than a table policy. Default (non-
-- security_invoker) view semantics bypass the base table's own RLS, so
-- the workspace-membership check has to be re-stated here explicitly —
-- same as every other view of this kind in this schema.
create view public.sessions_for_role
  with (security_invoker = false)
as
select
  s.id,
  s.workspace_id,
  s.client_id,
  s.program_phase_id,
  s.coach_id,
  s.session_type,
  s.scheduled_at,
  s.completed_at,
  case when private.has_permission(s.workspace_id, 'session_note.read.internal')
    then s.agenda else null end as agenda,
  case when private.has_permission(s.workspace_id, 'session_note.read.internal')
    then s.preparation_brief else null end as preparation_brief,
  case when private.has_permission(s.workspace_id, 'session_note.read.internal')
    then s.internal_notes else null end as internal_notes,
  s.client_summary,
  s.client_summary_status,
  s.next_session_at,
  s.status,
  s.created_at,
  s.created_by,
  s.updated_at,
  s.updated_by
from public.sessions s
where s.workspace_id in (select private.active_workspace_ids());

grant select on public.sessions_for_role to authenticated;
