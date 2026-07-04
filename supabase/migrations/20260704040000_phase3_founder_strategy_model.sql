-- Phase 3: Business Architecture, part 1 — Founder and Leadership, Vision and
-- Strategy, and Business Model (Section 10.5 subset; field lists merged with
-- Section 6's fuller "Modules and fields" spec for each module, since 10.5
-- explicitly calls its lists "minimum fields", not exhaustive).
--
-- goals.domain_id and goals.review_cadence go beyond 10.5's literal minimum
-- fields (strategy_profile_id, title, metric, target, period, owner, status)
-- because Section 6's stated rule for this module is explicit: "Every goal
-- links to a domain, metric, owner, review cadence, and observable target."
-- See docs/data-model.md.

create table public.founder_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role_statement text,
  leadership_responsibilities text,
  prioritized_values jsonb,
  strengths_and_patterns text,
  boundaries_triggers_responses text,
  non_negotiables text,
  capacity_constraints text,
  support_requirements text,
  review_cadence text not null default 'quarterly'
    check (review_cadence in ('weekly', 'monthly', 'quarterly', 'semiannual', 'annual')),
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (workspace_id)
);

create table public.decision_principles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  principle text not null,
  priority integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.strategy_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  vision text,
  mission text,
  strategic_thesis text,
  horizon text,
  rationale_and_tradeoffs text,
  constraints text,
  strategic_bets text,
  not_doing text,
  owner_user_id uuid references auth.users(id),
  approved_at timestamptz,
  effective_at timestamptz not null default now(),
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  strategy_profile_id uuid not null references public.strategy_profiles(id) on delete cascade,
  domain_id uuid references public.business_command_domains(id),
  title text not null,
  metric text not null,
  target text not null,
  period text,
  review_cadence text not null default 'quarterly'
    check (review_cadence in ('weekly', 'monthly', 'quarterly', 'semiannual', 'annual')),
  owner_user_id uuid references auth.users(id),
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'achieved', 'missed', 'abandoned')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.key_results (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  metric_definition text not null,
  baseline numeric,
  target numeric not null,
  current_value numeric,
  data_source text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.business_models (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  model_types jsonb,
  customer_groups jsonb,
  value_exchanges jsonb,
  revenue_streams jsonb,
  delivery_models jsonb,
  cost_structure text,
  key_resources jsonb,
  key_activities jsonb,
  partners jsonb,
  constraints text,
  revenue_concentration text,
  recurring_vs_onetime_mix text,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index founder_profiles_workspace_id_idx on public.founder_profiles(workspace_id);
create index decision_principles_workspace_id_idx on public.decision_principles(workspace_id);
create index strategy_profiles_workspace_id_idx on public.strategy_profiles(workspace_id);
create index goals_workspace_id_idx on public.goals(workspace_id);
create index goals_strategy_profile_id_idx on public.goals(strategy_profile_id);
create index goals_domain_id_idx on public.goals(domain_id);
create index key_results_workspace_id_idx on public.key_results(workspace_id);
create index key_results_goal_id_idx on public.key_results(goal_id);
create index business_models_workspace_id_idx on public.business_models(workspace_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.founder_profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.decision_principles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.strategy_profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.key_results
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.business_models
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.founder_profiles enable row level security;
alter table public.decision_principles enable row level security;
alter table public.strategy_profiles enable row level security;
alter table public.goals enable row level security;
alter table public.key_results enable row level security;
alter table public.business_models enable row level security;

create policy "members can manage workspace founder profile" on public.founder_profiles
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace decision principles" on public.decision_principles
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace strategy profiles" on public.strategy_profiles
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace goals" on public.goals
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace key results" on public.key_results
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace business models" on public.business_models
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
