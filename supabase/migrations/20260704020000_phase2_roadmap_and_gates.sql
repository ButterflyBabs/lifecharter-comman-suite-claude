-- Phase 2: Roadmap, milestones, dependencies, and stage gates (Section 10.4
-- subset). roadmap_templates is global reference data (no workspace_id in its
-- spec'd minimum fields — it's a reusable named/versioned journey, not
-- per-tenant content); everything generated from it per workspace is
-- tenant-owned.
--
-- Gate enforcement (Section 3: "Stage gates have meaning" / Phase 2 acceptance
-- criterion "the system prevents progression when a blocking gate is
-- incomplete") is implemented as two concrete, triggered rules rather than a
-- generic rule interpreter, which the spec doesn't fully specify:
--   1. A milestone cannot be marked done without at least one *approved*
--      completion_evidence row referencing it.
--   2. A phase cannot be marked complete while any of its milestones are not
--      done.
-- Both are still expressed through stage_gates/gate_requirements rows (so the
-- data model matches Section 10.4), but the trigger checks the concrete
-- condition directly rather than interpreting arbitrary validation_rule JSON —
-- a documented scope decision, not a spec gap left unfilled.

create table public.roadmap_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_stage text,
  business_model text,
  version integer not null default 1
);

create table public.roadmap_instances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id uuid references public.roadmap_templates(id),
  primary_outcome text,
  start_date date not null default current_date,
  target_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stage_gates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  context_type text not null,
  context_id uuid not null,
  rule_mode text not null default 'blocking' check (rule_mode in ('blocking', 'advisory')),
  status text not null default 'active' check (status in ('active', 'bypassed')),
  created_at timestamptz not null default now()
);

create table public.gate_requirements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stage_gate_id uuid not null references public.stage_gates(id) on delete cascade,
  requirement_type text not null check (requirement_type in ('evidence_required', 'all_milestones_done')),
  field_path text,
  validation_rule jsonb,
  blocking boolean not null default true
);

create table public.roadmap_phases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  roadmap_instance_id uuid not null references public.roadmap_instances(id) on delete cascade,
  name text not null,
  sequence integer not null,
  status text not null default 'not_started' check (status in ('not_started', 'active', 'complete')),
  entry_gate_id uuid references public.stage_gates(id),
  exit_gate_id uuid references public.stage_gates(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roadmap_milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  phase_id uuid not null references public.roadmap_phases(id) on delete cascade,
  title text not null,
  purpose text,
  owner uuid references auth.users(id),
  due_date date,
  definition_of_done text,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.milestone_dependencies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  predecessor_id uuid not null references public.roadmap_milestones(id) on delete cascade,
  successor_id uuid not null references public.roadmap_milestones(id) on delete cascade,
  dependency_type text not null default 'finish_to_start',
  unique (predecessor_id, successor_id)
);

create table public.completion_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  evidence_type text not null,
  asset_id uuid references public.assets(id) on delete set null,
  note text,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index roadmap_instances_workspace_id_idx on public.roadmap_instances(workspace_id);
create index stage_gates_workspace_id_idx on public.stage_gates(workspace_id);
create index stage_gates_context_idx on public.stage_gates(context_type, context_id);
create index gate_requirements_workspace_id_idx on public.gate_requirements(workspace_id);
create index gate_requirements_stage_gate_id_idx on public.gate_requirements(stage_gate_id);
create index roadmap_phases_workspace_id_idx on public.roadmap_phases(workspace_id);
create index roadmap_phases_instance_id_idx on public.roadmap_phases(roadmap_instance_id);
create index roadmap_milestones_workspace_id_idx on public.roadmap_milestones(workspace_id);
create index roadmap_milestones_phase_id_idx on public.roadmap_milestones(phase_id);
create index milestone_dependencies_workspace_id_idx on public.milestone_dependencies(workspace_id);
create index completion_evidence_workspace_id_idx on public.completion_evidence(workspace_id);
create index completion_evidence_subject_idx on public.completion_evidence(subject_type, subject_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.roadmap_instances
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.roadmap_phases
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.roadmap_milestones
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Gate enforcement
-- ============================================================================

create or replace function public.enforce_milestone_gate()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_gate_id uuid;
  v_has_evidence boolean;
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    select sg.id into v_gate_id
    from public.stage_gates sg
    join public.gate_requirements gr on gr.stage_gate_id = sg.id
    where sg.context_type = 'roadmap_milestone'
      and sg.context_id = new.id
      and sg.status = 'active'
      and sg.rule_mode = 'blocking'
      and gr.requirement_type = 'evidence_required'
      and gr.blocking = true
    limit 1;

    if v_gate_id is not null then
      select exists (
        select 1 from public.completion_evidence ce
        where ce.subject_type = 'roadmap_milestone'
          and ce.subject_id = new.id
          and ce.approved_by is not null
      ) into v_has_evidence;

      if not v_has_evidence then
        raise exception 'Blocking gate incomplete: milestone % requires approved completion evidence before it can be marked done', new.id
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_milestone_gate
  before update on public.roadmap_milestones
  for each row execute function public.enforce_milestone_gate();

create or replace function public.enforce_phase_gate()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_incomplete_count int;
begin
  if new.status = 'complete' and old.status is distinct from 'complete' then
    select count(*) into v_incomplete_count
    from public.roadmap_milestones m
    where m.phase_id = new.id
      and m.archived_at is null
      and m.status <> 'done';

    if v_incomplete_count > 0 then
      raise exception 'Blocking gate incomplete: phase % has % milestone(s) not yet done', new.id, v_incomplete_count
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_phase_gate
  before update on public.roadmap_phases
  for each row execute function public.enforce_phase_gate();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.roadmap_templates enable row level security;
alter table public.roadmap_instances enable row level security;
alter table public.roadmap_phases enable row level security;
alter table public.roadmap_milestones enable row level security;
alter table public.milestone_dependencies enable row level security;
alter table public.stage_gates enable row level security;
alter table public.gate_requirements enable row level security;
alter table public.completion_evidence enable row level security;

create policy "authenticated users can read roadmap templates" on public.roadmap_templates
  for select using (auth.role() = 'authenticated');

create policy "members can manage workspace roadmap instances" on public.roadmap_instances
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace roadmap phases" on public.roadmap_phases
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace roadmap milestones" on public.roadmap_milestones
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage milestone dependencies" on public.milestone_dependencies
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace stage gates" on public.stage_gates
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage gate requirements" on public.gate_requirements
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage completion evidence" on public.completion_evidence
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

-- ============================================================================
-- Seed: default roadmap template
-- ============================================================================

insert into public.roadmap_templates (name, business_stage, business_model, version) values
  ('Standard Business Build', 'any', 'coaching', 1);
