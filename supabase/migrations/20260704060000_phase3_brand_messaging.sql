-- Phase 3: Business Architecture, part 3 — Brand and Messaging
-- (Section 10.5 subset, merged with Section 6's fuller field list).
--
-- proof_items has no brand_profile_id, matching Section 10.5's minimum fields
-- for that object exactly (type, title, statement, source, consent_status,
-- asset_id, approved_use) — proof can be gathered before a brand profile is
-- finalized, so it's workspace-scoped rather than nested under one.

create table public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_identity_description text,
  voice_traits jsonb,
  formality text,
  average_length text,
  preferred_vocabulary jsonb,
  avoid_list jsonb,
  core_promise text,
  audience_variants jsonb,
  compliance_language text,
  calls_to_action jsonb,
  signoff text,
  approved_writing_sample_asset_ids jsonb,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (workspace_id)
);

create table public.message_pillars (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_profile_id uuid not null references public.brand_profiles(id) on delete cascade,
  title text not null,
  message text not null,
  audience text,
  proof_required boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.claim_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_profile_id uuid not null references public.brand_profiles(id) on delete cascade,
  claim_text text not null,
  status text not null check (status in ('approved', 'restricted', 'prohibited')),
  scope text,
  required_disclaimer text,
  approved_by uuid references auth.users(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.proof_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  proof_type text not null check (proof_type in ('testimonial', 'outcome', 'credential', 'evidence')),
  title text not null,
  statement text,
  source text,
  consent_status text not null default 'pending' check (consent_status in ('pending', 'granted', 'revoked')),
  asset_id uuid references public.assets(id) on delete set null,
  approved_use text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index brand_profiles_workspace_id_idx on public.brand_profiles(workspace_id);
create index message_pillars_workspace_id_idx on public.message_pillars(workspace_id);
create index message_pillars_brand_profile_id_idx on public.message_pillars(brand_profile_id);
create index claim_rules_workspace_id_idx on public.claim_rules(workspace_id);
create index claim_rules_brand_profile_id_idx on public.claim_rules(brand_profile_id);
create index proof_items_workspace_id_idx on public.proof_items(workspace_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.brand_profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.message_pillars
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.claim_rules
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.proof_items
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.brand_profiles enable row level security;
alter table public.message_pillars enable row level security;
alter table public.claim_rules enable row level security;
alter table public.proof_items enable row level security;

create policy "members can manage workspace brand profile" on public.brand_profiles
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace message pillars" on public.message_pillars
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace claim rules" on public.claim_rules
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace proof items" on public.proof_items
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
