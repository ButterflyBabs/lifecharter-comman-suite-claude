-- Phase 2: Review Center (Section 10.9 subset + Section 9). review_templates
-- is global reference data (no workspace_id in its spec'd minimum fields),
-- seeded once for the six cadences from Section 9.1's cadence summary and each
-- subsection's "Required outputs". review_instances/responses/findings are
-- tenant-owned.
--
-- Templates are self-describing (questions_json / output_rules_json) rather
-- than each cadence getting hardcoded application logic — one generic review
-- form renders from whatever the template defines, matching Section 9.9's own
-- framing ("every review template must define... required questions, required
-- outputs..."). output_rules_json.creates lists which row types submitting the
-- review generates (outcome/decision/blocker/finding); quarterly's
-- output_rules_json.launches_audit triggers a new Business Command Audit
-- instance, since Section 9.6 defines the quarterly review AS the domain
-- reassessment.
--
-- Also closes the Phase 1 forward reference: outcomes.review_instance_id now
-- gets its real foreign key, since review_instances exists.

create table public.review_templates (
  id uuid primary key default gen_random_uuid(),
  cadence text not null check (cadence in ('daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual')),
  name text not null,
  version integer not null default 1,
  source_rules_json jsonb,
  questions_json jsonb not null,
  output_rules_json jsonb not null default '{}'::jsonb
);

create table public.review_instances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id uuid not null references public.review_templates(id),
  period_start date not null default current_date,
  period_end date,
  owner uuid references auth.users(id),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_responses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  review_instance_id uuid not null references public.review_instances(id) on delete cascade,
  question_key text not null,
  response_json jsonb,
  evidence_refs jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (review_instance_id, question_key)
);

create table public.review_findings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  review_instance_id uuid not null references public.review_instances(id) on delete cascade,
  category text,
  severity text check (severity in ('strong', 'stable', 'needs_attention', 'at_risk')),
  statement text not null,
  evidence text,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.outcomes
  add constraint outcomes_review_instance_id_fkey
  foreign key (review_instance_id) references public.review_instances(id) on delete set null;

-- ============================================================================
-- Indexes
-- ============================================================================

create index review_instances_workspace_id_idx on public.review_instances(workspace_id);
create index review_instances_template_id_idx on public.review_instances(template_id);
create index review_responses_workspace_id_idx on public.review_responses(workspace_id);
create index review_findings_workspace_id_idx on public.review_findings(workspace_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.review_instances
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.review_responses
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.review_templates enable row level security;
alter table public.review_instances enable row level security;
alter table public.review_responses enable row level security;
alter table public.review_findings enable row level security;

create policy "authenticated users can read review templates" on public.review_templates
  for select using (auth.role() = 'authenticated');

create policy "members can manage workspace review instances" on public.review_instances
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace review responses" on public.review_responses
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace review findings" on public.review_findings
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

-- ============================================================================
-- Seed: the six cadence templates (Section 9.1 through 9.8)
-- ============================================================================

insert into public.review_templates (cadence, name, version, source_rules_json, questions_json, output_rules_json) values
(
  'daily', 'Daily Opening and Close', 1,
  '{"reads": ["tasks", "blockers", "approvals"]}',
  '[
    {"key": "three_outcomes", "label": "Daily Three — the outcomes that matter most today", "type": "outcome_list", "max": 3},
    {"key": "follow_ups", "label": "Follow-ups and client risks to watch", "type": "text"},
    {"key": "completed", "label": "What got completed, moved, or blocked today", "type": "text"},
    {"key": "blockers", "label": "New blockers to log", "type": "blocker_list"},
    {"key": "tomorrow_seed", "label": "Tomorrow''s likely first action", "type": "text"}
  ]',
  '{"creates": ["outcome", "blocker"]}'
),
(
  'weekly', 'Weekly CEO Review', 1,
  '{"reads": ["tasks", "decisions", "blockers"]}',
  '[
    {"key": "top_three", "label": "This week''s Top Three outcomes", "type": "outcome_list", "max": 3},
    {"key": "decisions", "label": "Decisions awaiting command", "type": "decision_list"},
    {"key": "blocked_items", "label": "Blocked items moved to Waiting On", "type": "blocker_list"},
    {"key": "capacity_commitment", "label": "One capacity-protection commitment", "type": "text"}
  ]',
  '{"creates": ["outcome", "decision", "blocker"]}'
),
(
  'monthly', 'Monthly Business Review', 1,
  '{"reads": ["outcomes", "decisions"]}',
  '[
    {"key": "findings", "label": "Monthly findings — strong, stable, needs attention, at risk", "type": "finding_list"},
    {"key": "corrective_actions", "label": "Corrective actions", "type": "text"},
    {"key": "next_month_outcomes", "label": "Next-month outcomes", "type": "outcome_list", "max": 5}
  ]',
  '{"creates": ["finding", "outcome"]}'
),
(
  'quarterly', 'Quarterly Business Command Audit', 1,
  '{"reads": ["audit_instances", "audit_findings"]}',
  '[
    {"key": "domain_reassessment_note", "label": "Domain reassessment note (this launches a new Business Command Audit)", "type": "text"},
    {"key": "quarterly_priorities", "label": "Three to five quarterly priorities", "type": "outcome_list", "max": 5},
    {"key": "risk_response", "label": "Risk response plan", "type": "text"}
  ]',
  '{"creates": ["outcome"], "launches_audit": true}'
),
(
  'semiannual', 'Semiannual Recalibration', 1,
  '{"reads": ["audit_findings", "roadmap_instances"]}',
  '[
    {"key": "assumptions", "label": "Assumptions to retain, test, or retire", "type": "text"},
    {"key": "revised_priorities", "label": "Revised second-half priorities", "type": "outcome_list", "max": 5}
  ]',
  '{"creates": ["outcome"]}'
),
(
  'annual', 'Annual Architecture and Planning', 1,
  '{"reads": ["business_command_domains", "roadmap_instances"]}',
  '[
    {"key": "year_in_review", "label": "Year in review", "type": "text"},
    {"key": "annual_goals", "label": "Annual goals by Business Command Domain", "type": "text"},
    {"key": "quarterly_outcomes", "label": "Quarterly outcomes for the year ahead", "type": "outcome_list", "max": 4}
  ]',
  '{"creates": ["outcome"]}'
);
