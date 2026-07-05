-- Deeper per-phase AI Phase Assessments. After the 48-question audit, each phase
-- can be deep-dived: an AI process reads that phase's answers + score and
-- generates personalized milestone suggestions (the bank's "deeper Phase
-- Assessment generates the personalized Milestones"). Tenant-scoped; the AI
-- output is generated content (not canonical question text), fully traced via
-- ai_run_id. Approved suggestions become roadmap_milestones (future step).
create table public.audit_phase_assessments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  audit_instance_id uuid not null references public.audit_instances(id) on delete cascade,
  domain_id uuid not null references public.business_command_domains(id),
  status text not null default 'generated' check (status in ('generated', 'approved', 'archived')),
  narrative text,
  generated_milestones jsonb,   -- [{title, purpose, definition_of_done, effort, rationale}]
  ai_run_id uuid references public.ai_runs(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audit_instance_id, domain_id)
);

create index audit_phase_assessments_workspace_idx on public.audit_phase_assessments(workspace_id);
create index audit_phase_assessments_instance_idx on public.audit_phase_assessments(audit_instance_id);

create trigger set_updated_at before update on public.audit_phase_assessments
  for each row execute function public.set_updated_at();

grant all on table public.audit_phase_assessments to authenticated, service_role;

alter table public.audit_phase_assessments enable row level security;

create policy "members can manage workspace phase assessments" on public.audit_phase_assessments
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "super admins can read all phase assessments" on public.audit_phase_assessments
  for select using (private.is_super_admin());
