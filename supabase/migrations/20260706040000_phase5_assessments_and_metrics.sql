-- Phase 5: Client Experience, part 4 — Assessments and Outcomes/Progress
-- (Section 10.7 subset, merged with Section 6's fuller field lists).
--
-- client_metric_values.source has a check constraint matching Section 6's
-- exact enumerated list for this field ("client report, coach observation,
-- system record, or assessment") — the stated rule for this module is
-- explicit: "Reports distinguish evidence, client report, coach observation,
-- and inference," which only holds if the source values are constrained to
-- a known set rather than free text.

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  version integer not null default 1,
  questions_json jsonb,
  scoring_rule text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.assessment_instances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  opened_at timestamptz not null default now(),
  completed_at timestamptz,
  result_json jsonb
);

create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  unit text,
  direction text check (direction in ('increase', 'decrease')),
  collection_method text,
  client_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.client_metric_values (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  metric_id uuid not null references public.metrics(id) on delete cascade,
  measured_at timestamptz not null default now(),
  value numeric not null,
  source text check (source in ('client_report', 'coach_observation', 'system_record', 'assessment')),
  notes text
);

create table public.client_milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  target_at date,
  achieved_at date,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'achieved', 'missed')),
  evidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index assessments_workspace_id_idx on public.assessments(workspace_id);
create index assessment_instances_workspace_id_idx on public.assessment_instances(workspace_id);
create index assessment_instances_client_id_idx on public.assessment_instances(client_id);
create index metrics_workspace_id_idx on public.metrics(workspace_id);
create index client_metric_values_workspace_id_idx on public.client_metric_values(workspace_id);
create index client_metric_values_client_id_idx on public.client_metric_values(client_id);
create index client_milestones_workspace_id_idx on public.client_milestones(workspace_id);
create index client_milestones_client_id_idx on public.client_milestones(client_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.assessments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.client_milestones
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.assessments enable row level security;
alter table public.assessment_instances enable row level security;
alter table public.metrics enable row level security;
alter table public.client_metric_values enable row level security;
alter table public.client_milestones enable row level security;

create policy "members can manage workspace assessments" on public.assessments
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace assessment instances" on public.assessment_instances
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace metrics" on public.metrics
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace client metric values" on public.client_metric_values
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace client milestones" on public.client_milestones
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
