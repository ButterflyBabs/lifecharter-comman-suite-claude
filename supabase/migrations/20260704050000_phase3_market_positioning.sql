-- Phase 3: Business Architecture, part 2 — Market and Positioning
-- (Section 10.5 subset; ideal_profiles fields merged with Section 6's explicit
-- 15-field "Ideal profile fields" list).
--
-- ideal_profiles.is_primary and positioning_profiles.is_primary aren't in
-- Section 10.5's minimum fields, but Section 6's stated gate is explicit:
-- "At least one approved primary ideal profile and positioning statement
-- exist before the system recommends active campaigns or prospecting" — the
-- gate can't be checked without a way to identify which one is primary.

create table public.market_segments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  segment_type text,
  need text,
  evidence text,
  size_notes text,
  geography text,
  priority integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.ideal_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  market_segment_id uuid references public.market_segments(id) on delete set null,
  profile_name text not null,
  pathway text not null check (pathway in ('b2b', 'b2c', 'partner')),
  subject_type text,
  industries_and_roles jsonb,
  geography text,
  business_size_or_maturity text,
  revenue_indicators text,
  audiences_served text,
  needs_goals_interests_values jsonb,
  technologies jsonb,
  keywords jsonb,
  disqualifying_characteristics text,
  preferred_research_and_contact jsonb,
  qualification_weights jsonb,
  recommended_offers jsonb,
  is_primary boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.positioning_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ideal_profile_id uuid references public.ideal_profiles(id) on delete set null,
  audience text,
  category text,
  problem text,
  promise text,
  differentiation text,
  alternatives text,
  proof_refs jsonb,
  evidence_last_verified_at timestamptz,
  is_primary boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index market_segments_workspace_id_idx on public.market_segments(workspace_id);
create index ideal_profiles_workspace_id_idx on public.ideal_profiles(workspace_id);
create index ideal_profiles_market_segment_id_idx on public.ideal_profiles(market_segment_id);
create index positioning_profiles_workspace_id_idx on public.positioning_profiles(workspace_id);
create index positioning_profiles_ideal_profile_id_idx on public.positioning_profiles(ideal_profile_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.market_segments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.ideal_profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.positioning_profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.market_segments enable row level security;
alter table public.ideal_profiles enable row level security;
alter table public.positioning_profiles enable row level security;

create policy "members can manage workspace market segments" on public.market_segments
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace ideal profiles" on public.ideal_profiles
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace positioning profiles" on public.positioning_profiles
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
