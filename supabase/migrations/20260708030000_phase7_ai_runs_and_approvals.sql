-- Phase 7: AI Team and KPIs, part 3 — Run History, Outputs, Approvals,
-- Feedback, and Cost (Section 10.9 subset, merged with Section 6's fuller
-- Run History / AI Approval Queue field lists), plus the AI-action human
-- approval gate deferred since Phase 3.
--
-- ai_runs.prompt_version_id and action_type are named directly in Section
-- 6's Run History field list, beyond 10.9's minimum fields — "Prompt
-- version" and "Action type" respectively.
--
-- ai_outputs.risk_level and due_at are named directly in Section 6's AI
-- Approval Queue field list ("Risk level", "Due date"); these describe the
-- pending request itself, not the eventual decision, so they live on the
-- output rather than the approval record.
--
-- THE APPROVAL GATE: Appendix C's Human Approval Matrix has been documented
-- but not enforced in every phase since Phase 3, per the standing
-- instruction that AI-action approval gating lands once the AI Team
-- infrastructure exists to enforce it. It exists now. enforce_ai_output_
-- approval_gate makes it real: an ai_outputs row that requires approval
-- can never reach 'approved' or 'executed' status without a matching
-- 'approved' row in ai_approvals already on record — checked on every
-- insert or update, not just at creation, so no code path (this build's or
-- a future live-agent's) can skip a human decision by writing the output
-- directly. This is the same "encode the deterministic rule, enforce it at
-- the database layer regardless of role" pattern as every prior phase's
-- gate/immutability trigger (Phase 2's milestone gates, Phase 4/5's
-- immutability, Phase 6's automation-enable gate).

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_version_id uuid not null references public.ai_agent_versions(id),
  prompt_version_id uuid references public.prompt_versions(id) on delete set null,
  user_id uuid references auth.users(id),
  purpose text,
  action_type text,
  input_hash text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'failed', 'cancelled')),
  error_message text,
  cost numeric
);

create table public.ai_run_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ai_run_id uuid not null references public.ai_runs(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  excerpt_hash text,
  authorization_basis text
);

create table public.ai_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ai_run_id uuid not null references public.ai_runs(id) on delete cascade,
  output_type text,
  content text,
  confidence text check (confidence in ('low', 'medium', 'high')),
  approval_required boolean not null default true,
  risk_level text check (risk_level in ('low', 'medium', 'high')),
  due_at timestamptz,
  status text not null default 'draft' check (status in (
    'draft', 'pending_approval', 'approved', 'rejected', 'executed'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ai_output_id uuid not null references public.ai_outputs(id) on delete cascade,
  reviewer_id uuid references auth.users(id),
  status text not null check (status in ('approved', 'rejected', 'returned_for_revision', 'delegated')),
  edits_summary text,
  decision_rationale text,
  decided_at timestamptz not null default now()
);

create table public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ai_output_id uuid not null references public.ai_outputs(id) on delete cascade,
  rating integer check (rating >= 1 and rating <= 5),
  issue_type text,
  comment text,
  submitted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.ai_cost_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ai_run_id uuid not null references public.ai_runs(id) on delete cascade,
  provider text,
  model text,
  input_units integer,
  output_units integer,
  tool_cost numeric,
  total_cost numeric,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- AI output human-approval gate
-- ============================================================================

create or replace function public.enforce_ai_output_approval_gate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.approval_required and new.status in ('approved', 'executed') then
    if not exists (
      select 1 from public.ai_approvals
      where ai_output_id = new.id and status = 'approved'
    ) then
      raise exception 'Cannot mark AI output "%" as %: no approved ai_approvals record on file', new.id, new.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_ai_output_approval_gate
  before insert or update on public.ai_outputs
  for each row execute function public.enforce_ai_output_approval_gate();

-- ============================================================================
-- Indexes
-- ============================================================================

create index ai_runs_workspace_id_idx on public.ai_runs(workspace_id);
create index ai_runs_agent_version_id_idx on public.ai_runs(agent_version_id);
create index ai_run_sources_workspace_id_idx on public.ai_run_sources(workspace_id);
create index ai_run_sources_run_id_idx on public.ai_run_sources(ai_run_id);
create index ai_outputs_workspace_id_idx on public.ai_outputs(workspace_id);
create index ai_outputs_run_id_idx on public.ai_outputs(ai_run_id);
create index ai_approvals_workspace_id_idx on public.ai_approvals(workspace_id);
create index ai_approvals_output_id_idx on public.ai_approvals(ai_output_id);
create index ai_feedback_workspace_id_idx on public.ai_feedback(workspace_id);
create index ai_feedback_output_id_idx on public.ai_feedback(ai_output_id);
create index ai_cost_events_workspace_id_idx on public.ai_cost_events(workspace_id);
create index ai_cost_events_run_id_idx on public.ai_cost_events(ai_run_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.ai_outputs
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.ai_runs enable row level security;
alter table public.ai_run_sources enable row level security;
alter table public.ai_outputs enable row level security;
alter table public.ai_approvals enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.ai_cost_events enable row level security;

create policy "members can manage workspace ai runs" on public.ai_runs
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace ai run sources" on public.ai_run_sources
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace ai outputs" on public.ai_outputs
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace ai approvals" on public.ai_approvals
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace ai feedback" on public.ai_feedback
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace ai cost events" on public.ai_cost_events
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
