-- Phase 8, part 1 — Subscription Plans, Entitlements, and Usage (Section
-- 18's "Subscription plans and entitlements" / "Usage limits and billing
-- controls" build requirements).
--
-- subscription_plans/plan_prices/plan_entitlements are global reference
-- data (no workspace_id, read-only to authenticated users) — the same
-- pattern as Phase 2's business_command_domains and Phase 6's
-- integration_providers, since plan definitions are platform-wide, not
-- per-tenant content.
--
-- workspace_subscriptions grants NO authenticated INSERT/UPDATE, the same
-- precedent as the workspaces table itself (Phase 1/2): RLS only allows
-- SELECT for active members, since the only two writers are the Stripe
-- webhook handler and the checkout/portal server actions, both of which
-- use the service-role admin client after an explicit
-- has_workspace_role(...) check in application code — mirroring exactly
-- how workspace bootstrap already works.
--
-- Seeded with three plan tiers (solo/team/enterprise) and reasonable
-- default entitlement limits as a starting assumption — real pricing
-- amounts are set by the actual Stripe Prices the user creates in test
-- mode; plan_prices.stripe_price_id starts null and is filled in once
-- those are provided.

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  stripe_price_id text unique,
  billing_interval text not null check (billing_interval in ('month', 'year')),
  amount_cents integer,
  currency text not null default 'usd',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (plan_id, billing_interval)
);

create table public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  entitlement_key text not null,
  limit_value integer,
  unit text,
  unique (plan_id, entitlement_key)
);

create table public.workspace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'none' check (status in (
    'none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete'
  )),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

create table public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entitlement_key text not null,
  period_start date not null,
  period_end date not null,
  current_value integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (workspace_id, entitlement_key, period_start)
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index plan_prices_plan_id_idx on public.plan_prices(plan_id);
create index plan_entitlements_plan_id_idx on public.plan_entitlements(plan_id);
create index workspace_subscriptions_workspace_id_idx on public.workspace_subscriptions(workspace_id);
create index workspace_subscriptions_plan_id_idx on public.workspace_subscriptions(plan_id);
create index usage_counters_workspace_id_idx on public.usage_counters(workspace_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.subscription_plans
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.workspace_subscriptions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.usage_counters
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.subscription_plans enable row level security;
alter table public.plan_prices enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.workspace_subscriptions enable row level security;
alter table public.usage_counters enable row level security;

create policy "authenticated users can read subscription plans" on public.subscription_plans
  for select using (auth.role() = 'authenticated');

create policy "authenticated users can read plan prices" on public.plan_prices
  for select using (auth.role() = 'authenticated');

create policy "authenticated users can read plan entitlements" on public.plan_entitlements
  for select using (auth.role() = 'authenticated');

create policy "members can read their workspace subscription" on public.workspace_subscriptions
  for select using (workspace_id in (select private.active_workspace_ids()));

create policy "members can read their workspace usage" on public.usage_counters
  for select using (workspace_id in (select private.active_workspace_ids()));

-- ============================================================================
-- Seed plan tiers
-- ============================================================================

insert into public.subscription_plans (code, name, description, sort_order) values
  ('solo', 'Solo', 'For a single coach running one business.', 1),
  ('team', 'Team', 'For a small delivery team across a few brands.', 2),
  ('enterprise', 'Enterprise', 'Unlimited seats and business units, dedicated support.', 3);

insert into public.plan_entitlements (plan_id, entitlement_key, limit_value, unit)
select id, 'seats', 1, 'workspace_members' from public.subscription_plans where code = 'solo'
union all
select id, 'business_units', 1, 'business_units' from public.subscription_plans where code = 'solo'
union all
select id, 'ai_runs_per_month', 50, 'ai_runs' from public.subscription_plans where code = 'solo'
union all
select id, 'automations_enabled', 2, 'automation_definitions' from public.subscription_plans where code = 'solo'
union all
select id, 'seats', 5, 'workspace_members' from public.subscription_plans where code = 'team'
union all
select id, 'business_units', 3, 'business_units' from public.subscription_plans where code = 'team'
union all
select id, 'ai_runs_per_month', 500, 'ai_runs' from public.subscription_plans where code = 'team'
union all
select id, 'automations_enabled', 10, 'automation_definitions' from public.subscription_plans where code = 'team'
union all
select id, 'seats', null, 'workspace_members' from public.subscription_plans where code = 'enterprise'
union all
select id, 'business_units', null, 'business_units' from public.subscription_plans where code = 'enterprise'
union all
select id, 'ai_runs_per_month', null, 'ai_runs' from public.subscription_plans where code = 'enterprise'
union all
select id, 'automations_enabled', null, 'automation_definitions' from public.subscription_plans where code = 'enterprise';

insert into public.plan_prices (plan_id, billing_interval, amount_cents)
select id, 'month', null::integer from public.subscription_plans where code = 'solo'
union all
select id, 'month', null::integer from public.subscription_plans where code = 'team'
union all
select id, 'month', null::integer from public.subscription_plans where code = 'enterprise';
