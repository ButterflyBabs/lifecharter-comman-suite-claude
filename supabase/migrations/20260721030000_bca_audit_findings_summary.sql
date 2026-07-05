-- Business Command Audit — findings summary (AI narrative + immutable scores).
--
-- The existing audit_findings table holds per-domain rows (severity/finding/
-- evidence). The audit-wide AI narrative (top gaps, strengths, contradictions,
-- dependency analysis, recommended phase order, 90-day priorities) doesn't fit
-- that shape, so it lives here: one row per audit_instance.
--
-- audit_domain_scores is a security_invoker VIEW derived from audit_responses,
-- so its numbers shift as answers change and it cannot be written to. To give an
-- approved finding a stable record, the deterministic score snapshot computed at
-- generation time is persisted here (overall_score + per_domain_scores jsonb).
-- The AI interprets and explains; it never invents these numbers.

create table public.audit_findings_summary (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  audit_instance_id uuid not null references public.audit_instances(id) on delete cascade,
  -- deterministic score snapshot (captured at generation, not derived live)
  overall_score numeric check (overall_score >= 0 and overall_score <= 100),
  per_domain_scores jsonb,          -- [{domain_id, build_completion, operating_health, ...}]
  business_stage text,
  -- AI narrative (interpretation only)
  top_gaps jsonb,                   -- [{domain_id, phase, impact, risk, rationale, recommended_action, effort}]
  strengths jsonb,
  contradictions jsonb,
  missing_evidence jsonb,
  dependency_analysis jsonb,
  recommended_phase_order jsonb,
  ninety_day_priorities jsonb,
  narrative text,
  ai_run_id uuid references public.ai_runs(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audit_instance_id)
);

create index audit_findings_summary_workspace_idx on public.audit_findings_summary(workspace_id);
create index audit_findings_summary_instance_idx on public.audit_findings_summary(audit_instance_id);

create trigger set_updated_at before update on public.audit_findings_summary
  for each row execute function public.set_updated_at();

grant all on table public.audit_findings_summary to authenticated, service_role;

alter table public.audit_findings_summary enable row level security;

create policy "members can manage workspace findings summary" on public.audit_findings_summary
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
