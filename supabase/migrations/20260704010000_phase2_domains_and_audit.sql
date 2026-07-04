-- Phase 2: Audit, roadmap, stage gates, and Review Center — the Twelve Business
-- Command Domains and the Business Command Audit (Section 10.4 subset).
--
-- business_command_domains, audit_templates, and audit_questions are global
-- reference data (not tenant-owned — they're shared framework/template content,
-- consistent with the spec listing no workspace_id in their minimum fields).
-- audit_instances, audit_responses, and audit_findings are tenant-owned.
--
-- Scoring: audit_questions.score_category (build_completion | operating_health) is
-- an addition beyond the spec's literal minimum fields, necessary to satisfy
-- Section 9.6's requirement that domains be reassessed "using two independent
-- measures" — the spec names the two measures but doesn't specify how a question
-- maps to them, so this is the mechanism. See docs/data-model.md.

create table public.business_command_domains (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  display_order integer not null,
  active boolean not null default true
);

create table public.audit_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null default 1,
  cadence text not null default 'quarterly',
  effective_at timestamptz not null default now(),
  retired_at timestamptz
);

create table public.audit_questions (
  id uuid primary key default gen_random_uuid(),
  audit_template_id uuid not null references public.audit_templates(id) on delete cascade,
  domain_id uuid not null references public.business_command_domains(id) on delete cascade,
  prompt text not null,
  response_type text not null default 'scale_0_100',
  score_category text not null check (score_category in ('build_completion', 'operating_health')),
  weight numeric not null default 1,
  evidence_rule text
);

create table public.audit_instances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id uuid not null references public.audit_templates(id),
  period_start date not null default current_date,
  period_end date,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  owner_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_responses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  audit_instance_id uuid not null references public.audit_instances(id) on delete cascade,
  question_id uuid not null references public.audit_questions(id),
  response_json jsonb,
  score numeric check (score >= 0 and score <= 100),
  notes text,
  evidence_refs jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audit_instance_id, question_id)
);

create table public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  audit_instance_id uuid not null references public.audit_instances(id) on delete cascade,
  domain_id uuid not null references public.business_command_domains(id),
  severity text not null check (severity in ('strength', 'stable', 'needs_attention', 'at_risk')),
  finding text not null,
  evidence text,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Independent Build Completion / Operating Health scores per domain, per
-- Section 9.6. A view rather than stored/duplicated columns — always derived
-- from the actual responses.
create view public.audit_domain_scores as
select
  ar.audit_instance_id,
  ai.workspace_id,
  q.domain_id,
  avg(ar.score) filter (where q.score_category = 'build_completion') as build_completion_score,
  avg(ar.score) filter (where q.score_category = 'operating_health') as operating_health_score
from public.audit_responses ar
join public.audit_questions q on q.id = ar.question_id
join public.audit_instances ai on ai.id = ar.audit_instance_id
group by ar.audit_instance_id, ai.workspace_id, q.domain_id;

alter view public.audit_domain_scores set (security_invoker = true);

-- ============================================================================
-- Indexes
-- ============================================================================

create index audit_questions_template_id_idx on public.audit_questions(audit_template_id);
create index audit_questions_domain_id_idx on public.audit_questions(domain_id);
create index audit_instances_workspace_id_idx on public.audit_instances(workspace_id);
create index audit_responses_workspace_id_idx on public.audit_responses(workspace_id);
create index audit_responses_instance_id_idx on public.audit_responses(audit_instance_id);
create index audit_findings_workspace_id_idx on public.audit_findings(workspace_id);
create index audit_findings_instance_id_idx on public.audit_findings(audit_instance_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.audit_instances
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.audit_responses
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.business_command_domains enable row level security;
alter table public.audit_templates enable row level security;
alter table public.audit_questions enable row level security;
alter table public.audit_instances enable row level security;
alter table public.audit_responses enable row level security;
alter table public.audit_findings enable row level security;

create policy "authenticated users can read domains" on public.business_command_domains
  for select using (auth.role() = 'authenticated');

create policy "authenticated users can read audit templates" on public.audit_templates
  for select using (auth.role() = 'authenticated');

create policy "authenticated users can read audit questions" on public.audit_questions
  for select using (auth.role() = 'authenticated');

create policy "members can manage workspace audit instances" on public.audit_instances
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace audit responses" on public.audit_responses
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace audit findings" on public.audit_findings
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

-- ============================================================================
-- Seed: the Twelve Business Command Domains (Section 2, verbatim)
-- ============================================================================

insert into public.business_command_domains (code, name, description, display_order) values
  ('founder_leadership', 'Founder and Leadership', 'Alignment, leadership decisions, boundaries, role clarity, and operating capacity.', 1),
  ('vision_strategy', 'Vision and Strategy', 'Direction, goals, strategic choices, business model, and priority coherence.', 2),
  ('market_positioning', 'Market and Positioning', 'Audience clarity, evidence, competitive context, relevance, and differentiation.', 3),
  ('offers_pricing', 'Offers and Pricing', 'Offer structure, value, price, scope, profitability, and capacity.', 4),
  ('brand_messaging', 'Brand and Messaging', 'Voice, promise, proof, claims, consistency, and resonance.', 5),
  ('marketing_growth', 'Marketing and Audience Growth', 'Content, campaigns, demand, lead capture, attribution, and channel performance.', 6),
  ('sales_revenue', 'Sales and Revenue', 'Pipeline, discovery, proposals, contracts, payments, conversion, and forecast.', 7),
  ('client_journey_delivery', 'Client Journey and Delivery', 'Onboarding, milestones, sessions, resources, delivery quality, and outcomes.', 8),
  ('client_success_retention', 'Client Success and Retention', 'Health, satisfaction, renewal, expansion, referral, and advocacy.', 9),
  ('operations_systems_technology', 'Operations, Systems, and Technology', 'SOPs, automations, integrations, reliability, ownership, and data flow.', 10),
  ('team_capacity', 'Team and Capacity', 'Roles, delegation, workload, hiring readiness, delivery limits, and founder energy.', 11),
  ('finance_legal_risk', 'Finance, Legal, and Risk', 'Cash, margins, expenses, agreements, privacy, compliance, and continuity.', 12);

-- ============================================================================
-- Seed: starter audit template + two questions per domain (one build-completion,
-- one operating-health question, grounded in what each domain measures)
-- ============================================================================

insert into public.audit_templates (name, version, cadence) values
  ('Business Command Audit — Standard', 1, 'quarterly');

insert into public.audit_questions (audit_template_id, domain_id, prompt, score_category, weight, evidence_rule)
select
  t.id,
  d.id,
  q.prompt,
  q.score_category,
  1,
  'Attach a supporting document or note where available.'
from public.audit_templates t
cross join (values
  ('founder_leadership', 'Have you defined your role, decision boundaries, and operating capacity in writing?', 'build_completion'),
  ('founder_leadership', 'Are you currently operating within your defined capacity and boundaries without regular overwhelm?', 'operating_health'),
  ('vision_strategy', 'Do you have a documented vision, strategic thesis, and set of goals?', 'build_completion'),
  ('vision_strategy', 'Are your day-to-day priorities and decisions consistently aligned with that strategy?', 'operating_health'),
  ('market_positioning', 'Have you documented your ideal audience, evidence of demand, and competitive differentiation?', 'build_completion'),
  ('market_positioning', 'Is your positioning currently resonating — do prospects immediately understand why you are different?', 'operating_health'),
  ('offers_pricing', 'Do your offers have documented scope, pricing, and delivery capacity models?', 'build_completion'),
  ('offers_pricing', 'Are your offers currently profitable and within sustainable delivery capacity?', 'operating_health'),
  ('brand_messaging', 'Have you documented your brand voice, core promise, and approved proof points?', 'build_completion'),
  ('brand_messaging', 'Is your messaging currently landing consistently across channels and audiences?', 'operating_health'),
  ('marketing_growth', 'Do you have defined content, campaign, and lead-capture systems in place?', 'build_completion'),
  ('marketing_growth', 'Is your marketing currently generating a reliable, attributable flow of qualified leads?', 'operating_health'),
  ('sales_revenue', 'Do you have a documented sales pipeline, discovery process, and proposal or contract system?', 'build_completion'),
  ('sales_revenue', 'Is your current conversion rate and sales cycle meeting your revenue targets?', 'operating_health'),
  ('client_journey_delivery', 'Have you documented your client journey, onboarding, and delivery milestones?', 'build_completion'),
  ('client_journey_delivery', 'Are clients currently completing onboarding and reaching milestones on schedule?', 'operating_health'),
  ('client_success_retention', 'Do you have a defined process for tracking client health, renewals, and referrals?', 'build_completion'),
  ('client_success_retention', 'Are your current retention, renewal, and referral rates meeting expectations?', 'operating_health'),
  ('operations_systems_technology', 'Are your core SOPs, automations, and integrations documented and owned?', 'build_completion'),
  ('operations_systems_technology', 'Are your systems currently reliable, with data flowing correctly between tools?', 'operating_health'),
  ('team_capacity', 'Have you documented roles, delegation, and capacity limits for yourself and your team?', 'build_completion'),
  ('team_capacity', 'Is current workload within sustainable capacity for you and your team?', 'operating_health'),
  ('finance_legal_risk', 'Do you have documented agreements, privacy practices, and a financial tracking system?', 'build_completion'),
  ('finance_legal_risk', 'Is your current cash position, margin, and compliance status healthy?', 'operating_health')
) as q(domain_code, prompt, score_category)
join public.business_command_domains d on d.code = q.domain_code
where t.name = 'Business Command Audit — Standard';
