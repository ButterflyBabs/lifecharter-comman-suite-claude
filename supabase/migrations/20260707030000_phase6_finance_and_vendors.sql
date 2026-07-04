-- Phase 6: Operations, part 3 — Finance, Technology, and Vendors (Section
-- 10.8 subset, merged with Section 6's fuller field lists).
--
-- vendors is enriched with primary_contact_id, service, agreement_asset_id,
-- performance_review, criticality, and backup_plan — all named directly in
-- Section 6's Vendors field list, richer than 10.8's minimum fields.
--
-- technology_items.cost_cadence (monthly/annual) supports Section 6's
-- explicit "Monthly and annual cost" field pair without duplicating the
-- amount column; data_classification reuses 11.4's exact classification
-- scheme rather than inventing a new one.
--
-- budgets.scenario reuses the same enum values as Phase 4's
-- revenue_forecasts.scenario (best_case/base_case/downside) for consistency
-- across every forecast-shaped object in this codebase.

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  category text,
  primary_contact_id uuid references public.people(id) on delete set null,
  service text,
  owner_user_id uuid references auth.users(id),
  agreement_asset_id uuid references public.assets(id) on delete set null,
  cost numeric,
  renewal_at date,
  performance_review text,
  risk_rating text check (risk_rating in ('low', 'medium', 'high')),
  criticality text not null default 'standard' check (criticality in ('standard', 'important', 'critical')),
  backup_plan text,
  status text not null default 'active' check (status in ('active', 'under_review', 'terminated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.technology_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  product text not null,
  purpose text,
  owner_user_id uuid references auth.users(id),
  license_count integer,
  cost numeric,
  cost_cadence text check (cost_cadence in ('monthly', 'annual')),
  data_classification text check (data_classification in (
    'public', 'workspace_internal', 'confidential_business',
    'confidential_client', 'restricted_financial_or_legal', 'restricted_credential_or_secret'
  )),
  source_of_truth_role boolean not null default false,
  renewal_at date,
  integration_links text,
  risk_note text,
  alternative_plan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period text not null,
  scenario text not null default 'base_case' check (scenario in ('best_case', 'base_case', 'downside')),
  currency text not null default 'USD',
  owner_user_id uuid references auth.users(id),
  status text not null default 'draft' check (status in ('draft', 'approved')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  category text not null,
  offer_id uuid references public.offers(id) on delete set null,
  planned_amount numeric,
  actual_amount numeric,
  created_at timestamptz not null default now()
);

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  parent_id uuid references public.expense_categories(id) on delete set null,
  tax_treatment_note text,
  active boolean not null default true
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  category_id uuid references public.expense_categories(id) on delete set null,
  amount numeric not null,
  occurred_at date not null default current_date,
  offer_id uuid references public.offers(id) on delete set null,
  source text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index vendors_workspace_id_idx on public.vendors(workspace_id);
create index technology_items_workspace_id_idx on public.technology_items(workspace_id);
create index technology_items_vendor_id_idx on public.technology_items(vendor_id);
create index budgets_workspace_id_idx on public.budgets(workspace_id);
create index budget_lines_workspace_id_idx on public.budget_lines(workspace_id);
create index budget_lines_budget_id_idx on public.budget_lines(budget_id);
create index expense_categories_workspace_id_idx on public.expense_categories(workspace_id);
create index expenses_workspace_id_idx on public.expenses(workspace_id);
create index expenses_category_id_idx on public.expenses(category_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.vendors
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.technology_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.vendors enable row level security;
alter table public.technology_items enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_lines enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;

create policy "members can manage workspace vendors" on public.vendors
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace technology items" on public.technology_items
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace budgets" on public.budgets
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace budget lines" on public.budget_lines
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace expense categories" on public.expense_categories
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace expenses" on public.expenses
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
