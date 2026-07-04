-- Phase 7: AI Team and KPIs, part 1 — KPIs and Prompt Library (remaining
-- Section 10.9 objects).
--
-- No enrichment beyond 10.9's minimum fields here — Section 6 doesn't
-- describe a dedicated KPI or prompt-library module page with a fuller
-- field list the way it does for other objects; kpis/kpi_values back the
-- existing Reports and Trends page (Section 6's "governed cross-system
-- reporting"), and prompt_templates/prompt_versions back the "Instructions"
-- field on ai_agent_versions (part 2 of this phase) the same way
-- offer_versions backs offers.

create table public.kpis (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  formula text,
  unit text,
  direction text check (direction in ('increase', 'decrease')),
  cadence text check (cadence in ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
  source_rule text,
  owner_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kpi_values (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kpi_id uuid not null references public.kpis(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  value numeric,
  source text,
  calculated_at timestamptz not null default now(),
  approved_at timestamptz
);

create table public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  use_case text,
  owner_user_id uuid references auth.users(id),
  current_version_id uuid,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  prompt_template_id uuid not null references public.prompt_templates(id) on delete cascade,
  version integer not null,
  body text,
  variables_json jsonb,
  test_notes text,
  effective_at timestamptz,
  created_at timestamptz not null default now(),
  unique (prompt_template_id, version)
);

alter table public.prompt_templates
  add constraint prompt_templates_current_version_id_fkey
  foreign key (current_version_id) references public.prompt_versions(id) on delete set null;

-- ============================================================================
-- Indexes
-- ============================================================================

create index kpis_workspace_id_idx on public.kpis(workspace_id);
create index kpi_values_workspace_id_idx on public.kpi_values(workspace_id);
create index kpi_values_kpi_id_idx on public.kpi_values(kpi_id);
create index prompt_templates_workspace_id_idx on public.prompt_templates(workspace_id);
create index prompt_versions_workspace_id_idx on public.prompt_versions(workspace_id);
create index prompt_versions_template_id_idx on public.prompt_versions(prompt_template_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.kpis
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.prompt_templates
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.kpis enable row level security;
alter table public.kpi_values enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.prompt_versions enable row level security;

create policy "members can manage workspace kpis" on public.kpis
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace kpi values" on public.kpi_values
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace prompt templates" on public.prompt_templates
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace prompt versions" on public.prompt_versions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
