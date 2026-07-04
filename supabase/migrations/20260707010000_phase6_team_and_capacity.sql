-- Phase 6: Operations, part 1 — Team and Roles, Capacity (Section 10.8 subset,
-- merged with Section 6's fuller field lists), same convention as Phases 3-5.
--
-- responsibilities.owner_member_id/backup_member_id implement 10.8's
-- owner_role/backup_role fields as FKs to workspace_members rather than free
-- text — Section 6 describes these as "Primary owner"/"Backup owner", i.e.
-- specific people, not abstract role labels. criticality supports the stated
-- rule: "Every critical responsibility has a primary owner and, when
-- continuity requires it, a backup owner" — informational only (backup stays
-- nullable), since "when continuity requires it" is a judgment call, not a
-- deterministic condition this build can enforce.
--
-- team_memberships.status and access_review_at are named directly in Section
-- 6's fuller field list ("Onboarding and offboarding status", "Access review
-- date"), richer than 10.8's minimum fields.
--
-- capacity_profiles is enriched with decision_limit/client_cap/energy_load/
-- fixed_constraints — all named directly in Section 6's field list for this
-- module, supporting the stated rule "Capacity warnings appear before
-- enrollment, campaign expansion, or additional commitments are approved."
-- That downstream warning surface doesn't exist until later phases reference
-- it, so this phase only builds the data foundation, not the warning logic.

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  purpose text,
  leader_id uuid references auth.users(id),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  workspace_member_id uuid not null references public.workspace_members(id) on delete cascade,
  role text,
  allocation_percent numeric check (allocation_percent >= 0 and allocation_percent <= 100),
  start_at date,
  end_at date,
  status text not null default 'active' check (status in ('onboarding', 'active', 'offboarding', 'ended')),
  access_review_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.responsibilities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_area text not null,
  responsibility text not null,
  owner_member_id uuid references public.workspace_members(id) on delete set null,
  backup_member_id uuid references public.workspace_members(id) on delete set null,
  criticality text not null default 'standard' check (criticality in ('standard', 'important', 'critical')),
  review_cadence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.capacity_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  workspace_member_id uuid not null references public.workspace_members(id) on delete cascade,
  weekly_hours numeric,
  meeting_limit numeric,
  focus_blocks text,
  recovery_rules text,
  decision_limit integer,
  client_cap integer,
  energy_load text,
  fixed_constraints text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_member_id)
);

create table public.capacity_allocations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  capacity_profile_id uuid not null references public.capacity_profiles(id) on delete cascade,
  period text not null,
  category text not null,
  planned_hours numeric,
  actual_hours numeric,
  exception_note text,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index teams_workspace_id_idx on public.teams(workspace_id);
create index team_memberships_workspace_id_idx on public.team_memberships(workspace_id);
create index team_memberships_team_id_idx on public.team_memberships(team_id);
create index team_memberships_member_id_idx on public.team_memberships(workspace_member_id);
create index responsibilities_workspace_id_idx on public.responsibilities(workspace_id);
create index capacity_profiles_workspace_id_idx on public.capacity_profiles(workspace_id);
create index capacity_allocations_workspace_id_idx on public.capacity_allocations(workspace_id);
create index capacity_allocations_profile_id_idx on public.capacity_allocations(capacity_profile_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.teams
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.team_memberships
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.responsibilities
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.capacity_profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.responsibilities enable row level security;
alter table public.capacity_profiles enable row level security;
alter table public.capacity_allocations enable row level security;

create policy "members can manage workspace teams" on public.teams
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace team memberships" on public.team_memberships
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace responsibilities" on public.responsibilities
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace capacity profiles" on public.capacity_profiles
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace capacity allocations" on public.capacity_allocations
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
