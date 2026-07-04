-- Phase 5: Client Experience, part 2 — Journey Design and Onboarding
-- (Section 10.7 subset, merged with Section 6's fuller field lists).
--
-- journey_templates.status goes beyond 10.7's literal minimum fields because
-- Section 6's stated gate is explicit: "Every active offer has a published
-- client journey template" — the gate can't be checked without a published/
-- draft distinction.
--
-- onboarding_instances.risk_status and kickoff_date are named directly in
-- Section 6's field list for this module ("Kickoff date", "Risk status"),
-- richer than 10.7's minimum fields.

create table public.journey_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  offer_version_id uuid references public.offer_versions(id) on delete set null,
  name text not null,
  version integer not null default 1,
  success_definition text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.journey_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  journey_template_id uuid not null references public.journey_templates(id) on delete cascade,
  name text not null,
  sequence integer not null default 0,
  entry_criteria text,
  exit_criteria text,
  created_at timestamptz not null default now()
);

create table public.journey_touchpoints (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  journey_stage_id uuid not null references public.journey_stages(id) on delete cascade,
  touchpoint_type text,
  title text not null,
  owner_role text,
  timing_rule text,
  client_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.onboarding_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  offer_version_id uuid references public.offer_versions(id) on delete set null,
  name text not null,
  version integer not null default 1,
  completion_rule text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.onboarding_instances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_enrollment_id uuid not null references public.client_offer_enrollments(id) on delete cascade,
  template_id uuid references public.onboarding_templates(id) on delete set null,
  owner_user_id uuid references auth.users(id),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  kickoff_date date,
  risk_status text not null default 'on_track' check (risk_status in ('on_track', 'at_risk')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.onboarding_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  onboarding_instance_id uuid not null references public.onboarding_instances(id) on delete cascade,
  title text not null,
  actor_type text not null default 'internal' check (actor_type in ('internal', 'client')),
  required boolean not null default true,
  due_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  evidence_id uuid references public.assets(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index journey_templates_workspace_id_idx on public.journey_templates(workspace_id);
create index journey_stages_workspace_id_idx on public.journey_stages(workspace_id);
create index journey_stages_template_id_idx on public.journey_stages(journey_template_id);
create index journey_touchpoints_workspace_id_idx on public.journey_touchpoints(workspace_id);
create index journey_touchpoints_stage_id_idx on public.journey_touchpoints(journey_stage_id);
create index onboarding_templates_workspace_id_idx on public.onboarding_templates(workspace_id);
create index onboarding_instances_workspace_id_idx on public.onboarding_instances(workspace_id);
create index onboarding_instances_enrollment_id_idx on public.onboarding_instances(client_enrollment_id);
create index onboarding_items_workspace_id_idx on public.onboarding_items(workspace_id);
create index onboarding_items_instance_id_idx on public.onboarding_items(onboarding_instance_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.journey_templates
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.onboarding_templates
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.journey_templates enable row level security;
alter table public.journey_stages enable row level security;
alter table public.journey_touchpoints enable row level security;
alter table public.onboarding_templates enable row level security;
alter table public.onboarding_instances enable row level security;
alter table public.onboarding_items enable row level security;

create policy "members can manage workspace journey templates" on public.journey_templates
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace journey stages" on public.journey_stages
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace journey touchpoints" on public.journey_touchpoints
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace onboarding templates" on public.onboarding_templates
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace onboarding instances" on public.onboarding_instances
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace onboarding items" on public.onboarding_items
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
