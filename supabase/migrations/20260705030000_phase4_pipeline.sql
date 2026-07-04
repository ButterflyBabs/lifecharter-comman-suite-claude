-- Phase 4: Revenue Engine, part 3 — Sales Pipeline and Discovery (Section 10.6
-- subset, merged with Section 6's much fuller "Sales Pipeline" and "Discovery"
-- module specs — 10.6's opportunity fields are a small subset of what Section 6
-- actually lists).
--
-- pipeline_stages.entry_gate_id/exit_gate_id reference the stage_gates table
-- built in Phase 2 for roadmap gates — the same generic gate mechanism, reused
-- rather than duplicated, per 10.6's own field names for this object.
--
-- Stage movement rule ("record who moved it, preserve prior stage and
-- timestamp, recalculate stage aging") is implemented as a real trigger
-- (log_opportunity_stage_change), not just static columns — same rigor as
-- Phase 2's gate-enforcement triggers. days_in_stage is not a stored column;
-- it's `now() - stage_entered_at`, computed at query time, since there is no
-- scheduled job in this build to keep a stored value fresh — recording that as
-- an honest simplification rather than a stale-and-wrong stored number.

create table public.pipeline_definitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  pathway text check (pathway in ('b2b', 'b2c', 'partner')),
  active_version integer not null default 1,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  pipeline_id uuid not null references public.pipeline_definitions(id) on delete cascade,
  name text not null,
  sequence integer not null default 0,
  probability numeric check (probability >= 0 and probability <= 1),
  expected_days integer,
  entry_gate_id uuid references public.stage_gates(id) on delete set null,
  exit_gate_id uuid references public.stage_gates(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  primary_contact_id uuid references public.people(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  pipeline_id uuid references public.pipeline_definitions(id),
  stage_id uuid references public.pipeline_stages(id),
  stage_entered_at timestamptz not null default now(),
  owner_user_id uuid references auth.users(id),
  expected_value numeric,
  weighted_value numeric,
  probability numeric check (probability >= 0 and probability <= 1),
  target_close_date date,
  expected_start_date date,
  decision_maker text,
  decision_criteria text,
  budget_status text,
  urgency text,
  alternatives_or_competitors text,
  primary_need text,
  desired_outcome text,
  risks text,
  next_action text,
  next_action_due_at timestamptz,
  last_activity_at timestamptz,
  source_id uuid references public.lead_sources(id),
  campaign_id uuid references public.campaigns(id) on delete set null,
  lost_reason text,
  close_notes text,
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.interactions
  add constraint interactions_opportunity_id_fkey
  foreign key (opportunity_id) references public.opportunities(id) on delete set null;

create table public.opportunity_stakeholders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role text,
  influence_level text,
  decision_authority text,
  created_at timestamptz not null default now()
);

create table public.stage_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  from_stage_id uuid references public.pipeline_stages(id),
  to_stage_id uuid references public.pipeline_stages(id),
  moved_by uuid references auth.users(id),
  moved_at timestamptz not null default now(),
  reason text
);

create table public.discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  appointment_at timestamptz,
  preparation_brief text,
  current_state text,
  desired_state text,
  consequences text,
  timing text,
  authority_or_decision_path text,
  budget_status text,
  decision_criteria text,
  alternatives text,
  fit_status text check (fit_status in ('fit', 'not_fit', 'undetermined')),
  offer_recommendation_id uuid references public.offers(id) on delete set null,
  next_action text,
  occurred_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- ============================================================================
-- Stage movement trigger — Section 6's "Sales Pipeline" stage movement rules
-- ============================================================================

create or replace function public.log_opportunity_stage_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.stage_id is distinct from old.stage_id then
    insert into public.stage_history (workspace_id, opportunity_id, from_stage_id, to_stage_id, moved_by, moved_at)
    values (new.workspace_id, new.id, old.stage_id, new.stage_id, auth.uid(), now());
    new.stage_entered_at := now();
  end if;
  return new;
end;
$$;

create trigger log_opportunity_stage_change
  before update on public.opportunities
  for each row execute function public.log_opportunity_stage_change();

-- ============================================================================
-- Indexes
-- ============================================================================

create index pipeline_definitions_workspace_id_idx on public.pipeline_definitions(workspace_id);
create index pipeline_stages_workspace_id_idx on public.pipeline_stages(workspace_id);
create index pipeline_stages_pipeline_id_idx on public.pipeline_stages(pipeline_id);
create index opportunities_workspace_id_idx on public.opportunities(workspace_id);
create index opportunities_pipeline_id_idx on public.opportunities(pipeline_id);
create index opportunities_stage_id_idx on public.opportunities(stage_id);
create index opportunity_stakeholders_workspace_id_idx on public.opportunity_stakeholders(workspace_id);
create index opportunity_stakeholders_opportunity_id_idx on public.opportunity_stakeholders(opportunity_id);
create index stage_history_workspace_id_idx on public.stage_history(workspace_id);
create index stage_history_opportunity_id_idx on public.stage_history(opportunity_id);
create index discovery_sessions_workspace_id_idx on public.discovery_sessions(workspace_id);
create index discovery_sessions_opportunity_id_idx on public.discovery_sessions(opportunity_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.pipeline_definitions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.opportunities
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.discovery_sessions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.pipeline_definitions enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_stakeholders enable row level security;
alter table public.stage_history enable row level security;
alter table public.discovery_sessions enable row level security;

create policy "members can manage workspace pipeline definitions" on public.pipeline_definitions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace pipeline stages" on public.pipeline_stages
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace opportunities" on public.opportunities
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace opportunity stakeholders" on public.opportunity_stakeholders
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace stage history" on public.stage_history
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace discovery sessions" on public.discovery_sessions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
