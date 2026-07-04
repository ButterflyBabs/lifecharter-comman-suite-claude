-- Phase 3: Business Architecture, part 4 — Offer Portfolio and Pricing and
-- Economics (Section 10.5 subset, merged with Section 6's fuller field list).
--
-- Versioned like assets/templates (Phase 1): offers holds stable identity,
-- offer_versions holds the versioned scope/promise, current_version_id added
-- after offer_versions exists (same pattern as assets.current_version_id).
--
-- offer_pricing, offer_capacity_models, and offer_economics are each 1:1 with
-- an offer_version (not workspace-level) per Section 10.5 — every version can
-- have its own price and economics, since re-pricing an offer is exactly the
-- kind of change that should produce a new version, not silently mutate one
-- that may already be sold.
--
-- minimum_enrollment lives on offer_economics per 10.5's literal field list
-- for that object; offer_capacity_models does not duplicate it.

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  offer_type text,
  audience text,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  current_version_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.offer_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  version integer not null,
  problem text,
  desired_outcome text,
  scope_and_exclusions text,
  format text,
  duration text,
  eligibility text,
  client_responsibilities text,
  coach_responsibilities text,
  common_objections text,
  approved_claim_ids jsonb,
  enrollment_and_calendar_links text,
  next_offer_or_renewal_path text,
  related_record_links jsonb,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (offer_id, version)
);

alter table public.offers
  add constraint offers_current_version_id_fkey
  foreign key (current_version_id) references public.offer_versions(id) on delete set null;

create table public.offer_deliverables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  offer_version_id uuid not null references public.offer_versions(id) on delete cascade,
  title text not null,
  description text,
  owner_role text,
  client_visible boolean not null default true,
  sequence integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.offer_pricing (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  offer_version_id uuid not null references public.offer_versions(id) on delete cascade,
  currency text not null default 'USD',
  price numeric not null,
  billing_type text not null default 'one_time'
    check (billing_type in ('one_time', 'installments', 'subscription')),
  installments integer,
  deposit numeric,
  refund_and_cancellation_policy text,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.offer_capacity_models (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  offer_version_id uuid not null references public.offer_versions(id) on delete cascade,
  max_clients integer,
  coach_hours numeric,
  prep_hours numeric,
  support_hours numeric,
  team_hours numeric,
  team_cost numeric,
  capacity_period text,
  founder_energy_load text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.offer_economics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  offer_version_id uuid not null references public.offer_versions(id) on delete cascade,
  delivery_cost numeric,
  software_and_fulfillment_cost numeric,
  acquisition_cost numeric,
  gross_margin numeric,
  revenue_per_delivery_hour numeric,
  break_even_point numeric,
  renewal_and_expansion_value numeric,
  minimum_enrollment integer,
  assumptions_and_scenario_version text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index offers_workspace_id_idx on public.offers(workspace_id);
create index offer_versions_workspace_id_idx on public.offer_versions(workspace_id);
create index offer_versions_offer_id_idx on public.offer_versions(offer_id);
create index offer_deliverables_workspace_id_idx on public.offer_deliverables(workspace_id);
create index offer_deliverables_offer_version_id_idx on public.offer_deliverables(offer_version_id);
create index offer_pricing_workspace_id_idx on public.offer_pricing(workspace_id);
create index offer_pricing_offer_version_id_idx on public.offer_pricing(offer_version_id);
create index offer_capacity_models_workspace_id_idx on public.offer_capacity_models(workspace_id);
create index offer_capacity_models_offer_version_id_idx on public.offer_capacity_models(offer_version_id);
create index offer_economics_workspace_id_idx on public.offer_economics(workspace_id);
create index offer_economics_offer_version_id_idx on public.offer_economics(offer_version_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.offers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.offer_versions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.offer_deliverables
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.offer_pricing
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.offer_capacity_models
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.offer_economics
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.offers enable row level security;
alter table public.offer_versions enable row level security;
alter table public.offer_deliverables enable row level security;
alter table public.offer_pricing enable row level security;
alter table public.offer_capacity_models enable row level security;
alter table public.offer_economics enable row level security;

create policy "members can manage workspace offers" on public.offers
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace offer versions" on public.offer_versions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace offer deliverables" on public.offer_deliverables
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace offer pricing" on public.offer_pricing
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace offer capacity models" on public.offer_capacity_models
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace offer economics" on public.offer_economics
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
