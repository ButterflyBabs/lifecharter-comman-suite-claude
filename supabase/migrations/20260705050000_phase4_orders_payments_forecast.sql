-- Phase 4: Revenue Engine, part 5 — Orders, Payments, and Revenue Forecast
-- (Section 10.6 subset, merged with Section 6's fuller field lists).
--
-- payments has unique(provider, provider_payment_id) — Section 6's stated
-- automation rule is explicit: "Duplicate provider events must not duplicate
-- payments or onboarding." This is the idempotency guard for that rule at the
-- payments layer; the onboarding half can't be implemented yet since
-- onboarding_instances doesn't exist until Phase 5 (Client Experience) — see
-- docs/data-model.md for the recorded deferral.
--
-- refunds.approval_id references the approvals table from Phase 1 — refund
-- issuance is exactly the kind of action Appendix C requires human approval
-- for ("Issue refund: Prepare only, No" AI execution), so it's wired through
-- the existing approval-queue mechanism rather than inventing a new one.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  offer_version_id uuid references public.offer_versions(id) on delete set null,
  total numeric not null,
  currency text not null default 'USD',
  payment_terms text,
  status text not null default 'pending'
    check (status in ('pending', 'invoiced', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  invoice_number text,
  amount_due numeric not null,
  due_at date,
  status text not null default 'open' check (status in ('open', 'paid', 'overdue', 'void')),
  external_invoice_id text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  provider text,
  provider_payment_id text,
  amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  failure_reason text,
  retry_status text,
  reconciliation_status text not null default 'unreconciled'
    check (reconciliation_status in ('unreconciled', 'reconciled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (provider, provider_payment_id)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  amount numeric not null,
  reason text,
  approval_id uuid references public.approvals(id) on delete set null,
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'processed', 'rejected')),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.revenue_forecasts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period text not null,
  scenario text not null default 'base' check (scenario in ('best_case', 'base_case', 'downside')),
  owner_user_id uuid references auth.users(id),
  generated_at timestamptz not null default now(),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.forecast_lines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  forecast_id uuid not null references public.revenue_forecasts(id) on delete cascade,
  category text not null
    check (category in ('committed', 'scheduled_cash', 'weighted_pipeline', 'best_case', 'base_case', 'downside', 'renewal', 'capacity_ceiling')),
  opportunity_id uuid references public.opportunities(id) on delete set null,
  amount numeric not null,
  expected_date date,
  confidence text,
  assumption text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index orders_workspace_id_idx on public.orders(workspace_id);
create index orders_opportunity_id_idx on public.orders(opportunity_id);
create index invoices_workspace_id_idx on public.invoices(workspace_id);
create index invoices_order_id_idx on public.invoices(order_id);
create index payments_workspace_id_idx on public.payments(workspace_id);
create index payments_invoice_id_idx on public.payments(invoice_id);
create index refunds_workspace_id_idx on public.refunds(workspace_id);
create index refunds_payment_id_idx on public.refunds(payment_id);
create index revenue_forecasts_workspace_id_idx on public.revenue_forecasts(workspace_id);
create index forecast_lines_workspace_id_idx on public.forecast_lines(workspace_id);
create index forecast_lines_forecast_id_idx on public.forecast_lines(forecast_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.orders enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.revenue_forecasts enable row level security;
alter table public.forecast_lines enable row level security;

create policy "members can manage workspace orders" on public.orders
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace invoices" on public.invoices
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace payments" on public.payments
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace refunds" on public.refunds
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace revenue forecasts" on public.revenue_forecasts
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace forecast lines" on public.forecast_lines
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
