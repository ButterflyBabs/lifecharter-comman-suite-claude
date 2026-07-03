-- Phase 1: Core spine and tenant safety — tenancy, identity, and governance objects
-- (Section 10.3 of the Master Product Restructure Specification).
--
-- RLS pattern: membership checks go through SECURITY DEFINER helper functions in
-- the `private` schema (not exposed via PostgREST). Because these functions run as
-- their owner, their internal queries against workspace_members bypass that table's
-- own RLS policy, which is what avoids infinite recursion when workspace_members'
-- own policy calls back into a membership check.

create schema if not exists private;

-- ============================================================================
-- Tables
-- ============================================================================

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'UTC',
  currency text not null default 'USD',
  locale text not null default 'en-US',
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  subscription_plan_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  archived_at timestamptz
);

create table public.business_units (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  code text not null,
  type text,
  parent_id uuid references public.business_units(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  archived_at timestamptz,
  unique (workspace_id, code)
);

-- Not tenant-owned: one row per auth user, independent of workspace membership.
create table public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  timezone text,
  locale text,
  accessibility_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended', 'removed')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- workspace_id null = system role template, available to every workspace.
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

-- Global catalog, not tenant-owned.
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  resource text not null,
  action text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  unique (role_id, permission_id)
);

create table public.member_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_member_id uuid not null references public.workspace_members(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  business_unit_scope uuid references public.business_units(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (workspace_member_id, role_id, business_unit_scope)
);

-- Immutable — insert-only, no update/delete policy granted.
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor uuid references auth.users(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  before_json jsonb,
  after_json jsonb,
  ip_or_context jsonb,
  occurred_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  event_type text not null,
  summary text not null,
  visibility text not null default 'internal' check (visibility in ('internal', 'client_visible')),
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index business_units_workspace_id_idx on public.business_units(workspace_id);
create index workspace_members_workspace_id_idx on public.workspace_members(workspace_id);
create index workspace_members_user_id_idx on public.workspace_members(user_id);
create index roles_workspace_id_idx on public.roles(workspace_id);
create index member_roles_workspace_member_id_idx on public.member_roles(workspace_member_id);
create index audit_events_workspace_id_idx on public.audit_events(workspace_id);
create index activity_events_workspace_id_idx on public.activity_events(workspace_id);
create index activity_events_subject_idx on public.activity_events(subject_type, subject_id);

-- ============================================================================
-- updated_at / updated_by trigger
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if to_jsonb(new) ? 'updated_by' then
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

create trigger set_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.business_units
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.user_profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.workspace_members
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.roles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Membership helper functions (private schema — not exposed via PostgREST)
-- ============================================================================

-- Workspaces the current user is an ACTIVE member of. SECURITY DEFINER so this
-- query is not itself subject to workspace_members' RLS policy (avoids recursion).
create or replace function private.active_workspace_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select workspace_id
  from public.workspace_members
  where user_id = auth.uid()
    and status = 'active'
$$;

-- True if the current user holds a role named in role_names within workspace_id.
-- Used for admin-only tables (audit_events, roles/permissions management).
-- Phase 1 keeps enforcement coarse (named-role check) rather than the full
-- resource.action.scope permission engine from Section 11.2, which is a later
-- refinement once real features need finer-grained checks.
create or replace function private.has_workspace_role(p_workspace_id uuid, role_names text[])
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
    join public.roles r on r.id = mr.role_id
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and r.name = any(role_names)
  )
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.workspaces enable row level security;
alter table public.business_units enable row level security;
alter table public.user_profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.member_roles enable row level security;
alter table public.audit_events enable row level security;
alter table public.activity_events enable row level security;

-- workspaces: members can read; owner/admin can update; creation happens
-- server-side (service role) as part of a guided setup flow, not directly by
-- authenticated users, so no insert policy for the authenticated role.
create policy "members can read their workspaces" on public.workspaces
  for select
  using (id in (select private.active_workspace_ids()));

create policy "owners and admins can update their workspace" on public.workspaces
  for update
  using (private.has_workspace_role(id, array['Workspace Owner', 'Administrator']))
  with check (private.has_workspace_role(id, array['Workspace Owner', 'Administrator']));

-- business_units: members can read; owner/admin can manage.
create policy "members can read business units" on public.business_units
  for select
  using (workspace_id in (select private.active_workspace_ids()));

create policy "owners and admins can manage business units" on public.business_units
  for all
  using (private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator']))
  with check (private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator']));

-- user_profiles: strictly own-row only. Not tenant-scoped.
create policy "users manage their own profile" on public.user_profiles
  for all
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- workspace_members: members can see the roster of workspaces they belong to.
-- Only owners/admins can change membership (invite, suspend, remove).
create policy "members can read their workspace roster" on public.workspace_members
  for select
  using (workspace_id in (select private.active_workspace_ids()));

create policy "owners and admins can manage membership" on public.workspace_members
  for all
  using (private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator']))
  with check (private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator']));

-- roles: system roles (workspace_id is null) are readable by any authenticated
-- user; workspace-specific custom roles are readable by that workspace's
-- members. Only owners/admins can manage workspace-specific roles; system
-- roles are managed by service-role migrations only (no policy grants writes).
create policy "system roles are readable by authenticated users" on public.roles
  for select
  using (workspace_id is null or workspace_id in (select private.active_workspace_ids()));

create policy "owners and admins can manage workspace roles" on public.roles
  for all
  using (workspace_id is not null and private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator']))
  with check (workspace_id is not null and private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator']));

-- permissions: global read-only catalog, no tenant scoping.
create policy "authenticated users can read the permission catalog" on public.permissions
  for select
  using (auth.role() = 'authenticated');

-- role_permissions: readable if the underlying role is visible to the user;
-- writable only by owners/admins of the role's workspace (system roles are
-- managed by migrations only).
create policy "role permissions follow role visibility" on public.role_permissions
  for select
  using (
    exists (
      select 1 from public.roles r
      where r.id = role_id
        and (r.workspace_id is null or r.workspace_id in (select private.active_workspace_ids()))
    )
  );

create policy "owners and admins can manage role permissions" on public.role_permissions
  for all
  using (
    exists (
      select 1 from public.roles r
      where r.id = role_id
        and r.workspace_id is not null
        and private.has_workspace_role(r.workspace_id, array['Workspace Owner', 'Administrator'])
    )
  )
  with check (
    exists (
      select 1 from public.roles r
      where r.id = role_id
        and r.workspace_id is not null
        and private.has_workspace_role(r.workspace_id, array['Workspace Owner', 'Administrator'])
    )
  );

-- member_roles: readable by fellow workspace members; writable by owners/admins.
create policy "members can read role assignments" on public.member_roles
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.id = workspace_member_id
        and wm.workspace_id in (select private.active_workspace_ids())
    )
  );

create policy "owners and admins can manage role assignments" on public.member_roles
  for all
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.id = workspace_member_id
        and private.has_workspace_role(wm.workspace_id, array['Workspace Owner', 'Administrator'])
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.id = workspace_member_id
        and private.has_workspace_role(wm.workspace_id, array['Workspace Owner', 'Administrator'])
    )
  );

-- audit_events: sensitive (Section 11.6) — readable only by owners/admins and
-- the AI Governance Reviewer role; insert-only otherwise (server/service-role
-- writes), no update or delete policy at all (immutable history, Section 10.1).
create policy "owners, admins, and governance reviewers can read audit events" on public.audit_events
  for select
  using (private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator', 'AI Governance Reviewer']));

create policy "workspace members can insert audit events" on public.audit_events
  for insert
  with check (workspace_id in (select private.active_workspace_ids()));

-- activity_events: readable by workspace members. Client-visibility filtering
-- (hiding internal-only events from the future client portal role) is a
-- Phase 5 refinement once the Client role/portal actually exists.
create policy "members can read workspace activity" on public.activity_events
  for select
  using (workspace_id in (select private.active_workspace_ids()));

create policy "members can log workspace activity" on public.activity_events
  for insert
  with check (workspace_id in (select private.active_workspace_ids()));
