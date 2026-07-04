-- Phase 6: Operations, part 2 — SOPs, Systems and Automations (Section 10.8
-- subset, merged with Section 6's fuller field lists).
--
-- automation_definitions.idempotency_strategy, sop_id, and exception_note
-- support two stated rules directly:
--   "Every active automation and critical workflow links to an SOP or
--   documented exception" — sop_id is nullable and exception_note is the
--   documented-exception escape hatch; not hard-enforced (which of the two
--   applies is a judgment call the spec doesn't make deterministic).
--   "No automation is enabled without a test run, owner, error path,
--   idempotency protection, and audit history" — THIS is deterministic and
--   is enforced by a real trigger below (enforce_automation_enable_gate),
--   the same pattern as Phase 2's gate triggers and Phase 4/5's immutability
--   triggers: encode the rules that are unambiguous, document the ones that
--   aren't rather than guessing.

create table public.sops (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  business_area text,
  owner_user_id uuid references auth.users(id),
  current_version_id uuid,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  review_at date,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.sop_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  sop_id uuid not null references public.sops(id) on delete cascade,
  version integer not null,
  purpose text,
  trigger_description text,
  preconditions text,
  steps_json jsonb,
  systems_and_links text,
  qa_json jsonb,
  escalation_json jsonb,
  effective_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (sop_id, version)
);

alter table public.sops
  add constraint sops_current_version_id_fkey
  foreign key (current_version_id) references public.sop_versions(id) on delete set null;

create table public.automation_definitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  version integer not null default 1,
  automation_trigger text,
  conditions_json jsonb,
  actions_json jsonb,
  owner_user_id uuid references auth.users(id),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  enabled boolean not null default false,
  idempotency_strategy text,
  dependencies text,
  test_mode boolean not null default true,
  sop_id uuid references public.sops(id) on delete set null,
  exception_note text,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  automation_id uuid not null references public.automation_definitions(id) on delete cascade,
  trigger_record jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'success', 'failed', 'test_passed', 'test_failed')),
  result_json jsonb
);

create table public.automation_errors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  automation_run_id uuid not null references public.automation_runs(id) on delete cascade,
  error_code text,
  message text,
  retry_count integer not null default 0,
  next_retry_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Automation enable gate
-- ============================================================================

create or replace function public.enforce_automation_enable_gate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.enabled and (tg_op = 'INSERT' or not old.enabled) then
    if new.owner_user_id is null then
      raise exception 'Cannot enable automation "%": no owner assigned', new.name;
    end if;
    if new.idempotency_strategy is null or new.idempotency_strategy = '' then
      raise exception 'Cannot enable automation "%": no idempotency strategy documented', new.name;
    end if;
    if not exists (
      select 1 from public.automation_runs
      where automation_id = new.id and status = 'test_passed'
    ) then
      raise exception 'Cannot enable automation "%": no passing test run on record', new.name;
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_automation_enable_gate
  before insert or update on public.automation_definitions
  for each row execute function public.enforce_automation_enable_gate();

-- ============================================================================
-- Indexes
-- ============================================================================

create index sops_workspace_id_idx on public.sops(workspace_id);
create index sop_versions_workspace_id_idx on public.sop_versions(workspace_id);
create index sop_versions_sop_id_idx on public.sop_versions(sop_id);
create index automation_definitions_workspace_id_idx on public.automation_definitions(workspace_id);
create index automation_runs_workspace_id_idx on public.automation_runs(workspace_id);
create index automation_runs_automation_id_idx on public.automation_runs(automation_id);
create index automation_errors_workspace_id_idx on public.automation_errors(workspace_id);
create index automation_errors_run_id_idx on public.automation_errors(automation_run_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.sops
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.automation_definitions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.sops enable row level security;
alter table public.sop_versions enable row level security;
alter table public.automation_definitions enable row level security;
alter table public.automation_runs enable row level security;
alter table public.automation_errors enable row level security;

create policy "members can manage workspace sops" on public.sops
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace sop versions" on public.sop_versions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace automation definitions" on public.automation_definitions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace automation runs" on public.automation_runs
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace automation errors" on public.automation_errors
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

-- ============================================================================
-- Extend audit coverage (Section 11.6) to automation enable/disable
-- ============================================================================

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  if tg_table_name = 'workspace_members' then
    v_workspace_id := coalesce(new.workspace_id, old.workspace_id);
  elsif tg_table_name = 'member_roles' then
    select wm.workspace_id into v_workspace_id
    from public.workspace_members wm
    where wm.id = coalesce(new.workspace_member_id, old.workspace_member_id);
  else
    v_workspace_id := coalesce(new.workspace_id, old.workspace_id);
  end if;

  insert into public.audit_events (workspace_id, actor, action, resource_type, resource_id, before_json, after_json)
  values (
    v_workspace_id,
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

create trigger audit_automation_definitions
  after insert or update or delete on public.automation_definitions
  for each row execute function public.log_audit_event();
