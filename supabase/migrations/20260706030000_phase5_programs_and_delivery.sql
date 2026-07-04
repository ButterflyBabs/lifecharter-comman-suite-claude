-- Phase 5: Client Experience, part 3 — Programs and Delivery, Sessions, and
-- Actions/Accountability (Section 10.7 subset, merged with Section 6's fuller
-- field lists for each module).
--
-- "Published program versions are immutable for existing enrollments. Changes
-- for future clients create a new version." is implemented as a real trigger
-- (enforce_program_version_immutability), the same pattern as Phase 4's
-- sent-proposal immutability — once a program_versions row is 'published', it
-- can no longer be updated; a revision must create a new version.
--
-- sessions.client_summary_status supports Section 6's stated gate ("A shared
-- summary is reviewed before client release") — richer than 10.7's minimum
-- fields, which only list client_summary itself with no review state.

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  offer_id uuid references public.offers(id) on delete set null,
  current_version_id uuid,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.program_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  version integer not null,
  outcome text,
  format text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  effective_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (program_id, version)
);

alter table public.programs
  add constraint programs_current_version_id_fkey
  foreign key (current_version_id) references public.program_versions(id) on delete set null;

create table public.program_phases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  program_version_id uuid not null references public.program_versions(id) on delete cascade,
  name text not null,
  sequence integer not null default 0,
  objective text,
  completion_rule text,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  program_phase_id uuid references public.program_phases(id) on delete set null,
  coach_id uuid references auth.users(id),
  session_type text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  agenda text,
  preparation_brief text,
  internal_notes text,
  client_summary text,
  client_summary_status text not null default 'draft'
    check (client_summary_status in ('draft', 'reviewed', 'released')),
  next_session_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.client_actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'done', 'skipped')),
  evidence text,
  client_visible boolean not null default true,
  reminder_rule text,
  dependency text,
  reschedule_count integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.coach_actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  owner_user_id uuid references auth.users(id),
  title text not null,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'done', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  owner_user_id uuid references auth.users(id),
  due_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'approved', 'rejected')),
  asset_id uuid references public.assets(id) on delete set null,
  client_approval_status text not null default 'pending'
    check (client_approval_status in ('pending', 'approved', 'changes_requested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Program version immutability trigger
-- ============================================================================

create or replace function public.enforce_program_version_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'published' then
    raise exception 'Published program versions are immutable — create a new version instead of editing version %', old.version;
  end if;
  return new;
end;
$$;

create trigger enforce_program_version_immutability
  before update on public.program_versions
  for each row execute function public.enforce_program_version_immutability();

-- ============================================================================
-- Indexes
-- ============================================================================

create index programs_workspace_id_idx on public.programs(workspace_id);
create index program_versions_workspace_id_idx on public.program_versions(workspace_id);
create index program_versions_program_id_idx on public.program_versions(program_id);
create index program_phases_workspace_id_idx on public.program_phases(workspace_id);
create index program_phases_version_id_idx on public.program_phases(program_version_id);
create index sessions_workspace_id_idx on public.sessions(workspace_id);
create index sessions_client_id_idx on public.sessions(client_id);
create index client_actions_workspace_id_idx on public.client_actions(workspace_id);
create index client_actions_client_id_idx on public.client_actions(client_id);
create index coach_actions_workspace_id_idx on public.coach_actions(workspace_id);
create index coach_actions_client_id_idx on public.coach_actions(client_id);
create index deliverables_workspace_id_idx on public.deliverables(workspace_id);
create index deliverables_client_id_idx on public.deliverables(client_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.programs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.client_actions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.coach_actions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.deliverables
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.programs enable row level security;
alter table public.program_versions enable row level security;
alter table public.program_phases enable row level security;
alter table public.sessions enable row level security;
alter table public.client_actions enable row level security;
alter table public.coach_actions enable row level security;
alter table public.deliverables enable row level security;

create policy "members can manage workspace programs" on public.programs
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace program versions" on public.program_versions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace program phases" on public.program_phases
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace sessions" on public.sessions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace client actions" on public.client_actions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace coach actions" on public.coach_actions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace deliverables" on public.deliverables
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
