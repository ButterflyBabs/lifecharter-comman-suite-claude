-- Phase 1: Core spine and tenant safety — unified work engine
-- (Section 10.4 subset: tasks, task_dependencies, outcomes, decisions, approvals,
-- blockers, comments). Roadmap/audit/gate objects are Phase 2.
--
-- Enforcement in Phase 1 is workspace-wide for active members (read + write) —
-- matching the product principle that the Command Center surfaces all workspace
-- work, not just the current user's. Finer scoping (assigned/team/business-unit,
-- per Section 11.2's permission scopes) is deferred until role/permission
-- configuration UI actually exists to manage it; the workspace boundary is the
-- non-negotiable enforced now (Section 11.3).

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_unit_id uuid references public.business_units(id) on delete set null,
  title text not null,
  description text,
  owner uuid references auth.users(id),
  due_at timestamptz,
  priority text check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_on', 'done', 'cancelled')),
  next_action text,
  related_object jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  archived_at timestamptz
);

create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  predecessor_task_id uuid not null references public.tasks(id) on delete cascade,
  successor_task_id uuid not null references public.tasks(id) on delete cascade,
  dependency_type text not null default 'blocks',
  created_at timestamptz not null default now(),
  unique (predecessor_task_id, successor_task_id)
);

create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_unit_id uuid references public.business_units(id) on delete set null,
  cadence text not null check (cadence in ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
  title text not null,
  owner uuid references auth.users(id),
  due_date date,
  definition_of_done text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'missed')),
  -- review_instances doesn't exist until Phase 2 (Review Center); forward
  -- reference kept as a plain uuid until then, no FK constraint yet.
  review_instance_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  archived_at timestamptz
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_unit_id uuid references public.business_units(id) on delete set null,
  question text not null,
  context text,
  options_json jsonb,
  recommendation text,
  owner uuid references auth.users(id),
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'decided', 'deferred', 'cancelled')),
  final_choice text,
  rationale text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  archived_at timestamptz
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  approval_type text not null,
  requested_from uuid references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  decision_at timestamptz,
  comment text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.blockers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  reason text not null,
  waiting_on text,
  impact text,
  follow_up_at timestamptz,
  backup_plan text,
  status text not null default 'active' check (status in ('active', 'resolved')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  author_id uuid references auth.users(id),
  body text not null,
  visibility text not null default 'internal' check (visibility in ('internal', 'client_visible')),
  parent_comment_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index tasks_workspace_id_idx on public.tasks(workspace_id);
create index tasks_owner_idx on public.tasks(owner);
create index tasks_status_idx on public.tasks(workspace_id, status);
create index task_dependencies_workspace_id_idx on public.task_dependencies(workspace_id);
create index outcomes_workspace_id_idx on public.outcomes(workspace_id);
create index outcomes_cadence_idx on public.outcomes(workspace_id, cadence);
create index decisions_workspace_id_idx on public.decisions(workspace_id);
create index approvals_workspace_id_idx on public.approvals(workspace_id);
create index approvals_subject_idx on public.approvals(subject_type, subject_id);
create index blockers_workspace_id_idx on public.blockers(workspace_id);
create index blockers_subject_idx on public.blockers(subject_type, subject_id);
create index comments_workspace_id_idx on public.comments(workspace_id);
create index comments_subject_idx on public.comments(subject_type, subject_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.outcomes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.decisions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.approvals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.blockers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security — workspace-wide read/write for active members
-- ============================================================================

alter table public.tasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.outcomes enable row level security;
alter table public.decisions enable row level security;
alter table public.approvals enable row level security;
alter table public.blockers enable row level security;
alter table public.comments enable row level security;

create policy "members can manage workspace tasks" on public.tasks
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage task dependencies" on public.task_dependencies
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace outcomes" on public.outcomes
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace decisions" on public.decisions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace approvals" on public.approvals
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace blockers" on public.blockers
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace comments" on public.comments
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
