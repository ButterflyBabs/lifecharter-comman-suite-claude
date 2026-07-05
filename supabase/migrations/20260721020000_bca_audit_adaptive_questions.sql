-- Business Command Audit — adaptive (AI follow-up) questions.
--
-- Tenant-scoped. AI-generated follow-up questions must never leak into the
-- shared audit_questions bank or across workspaces, so they live in their own
-- workspace-scoped table keyed on workspace_id + audit_instance_id + domain_id.
-- Answers are stored inline here (not in audit_responses, whose question_id FK
-- targets the shared bank) so an adaptive Q/A pair stays fully tenant-isolated.

create table public.audit_adaptive_questions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  audit_instance_id uuid not null references public.audit_instances(id) on delete cascade,
  domain_id uuid not null references public.business_command_domains(id),
  parent_question_id uuid references public.audit_questions(id),
  prompt text not null,
  response_type text not null default 'text',
  score_category text check (score_category in ('build_completion', 'operating_health')),
  weight numeric not null default 0,
  rationale text,
  ai_run_id uuid references public.ai_runs(id),
  -- inline answer (kept out of the shared audit_responses table on purpose)
  response_json jsonb,
  score numeric check (score >= 0 and score <= 100),
  notes text,
  evidence_refs jsonb,
  answered_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'answered', 'dismissed')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index audit_adaptive_questions_workspace_idx on public.audit_adaptive_questions(workspace_id);
create index audit_adaptive_questions_instance_idx on public.audit_adaptive_questions(audit_instance_id);
create index audit_adaptive_questions_domain_idx on public.audit_adaptive_questions(domain_id);

create trigger set_updated_at before update on public.audit_adaptive_questions
  for each row execute function public.set_updated_at();

grant all on table public.audit_adaptive_questions to authenticated, service_role;

alter table public.audit_adaptive_questions enable row level security;

-- Mirrors the exact sibling predicate on audit_responses / audit_instances.
create policy "members can manage workspace adaptive questions" on public.audit_adaptive_questions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
