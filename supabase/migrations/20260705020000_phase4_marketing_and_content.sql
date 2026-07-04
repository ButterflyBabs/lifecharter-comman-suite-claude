-- Phase 4: Revenue Engine, part 2 — Campaigns, Content, Nurture, and Outreach
-- Messages/Interactions (Section 10.6 subset, merged with Section 6's fuller
-- Marketing/Content/Campaigns/Outreach module specs).
--
-- campaigns.launch_approved_at and scheduled_close_review_at go beyond 10.6's
-- literal minimum fields because Section 6's stated gate for this module is
-- explicit: "Campaign has objective, audience, CTA, owner, tracking, launch
-- approval, and scheduled close review." Same pattern as Phase 3's gate-support
-- columns — informational, not yet enforced (no downstream system depends on
-- it blocking anything yet).
--
-- content_assets.claim_check_status/accessibility_check_status support the
-- stated rule ("No content publishes without approved voice, claim, CTA,
-- owner, and required accessibility review") the same way.

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  campaign_type text,
  objective text,
  audience text,
  offer_id uuid references public.offers(id) on delete set null,
  channels jsonb,
  cta text,
  start_at timestamptz,
  end_at timestamptz,
  budget numeric,
  owner_user_id uuid references auth.users(id),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed', 'cancelled')),
  tracking_code text,
  launch_approved_at timestamptz,
  scheduled_close_review_at timestamptz,
  close_review text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'exited')),
  entered_at timestamptz not null default now(),
  exited_at timestamptz
);

create table public.content_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  format text,
  topic_and_pillar text,
  audience text,
  funnel_stage text,
  campaign_id uuid references public.campaigns(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  cta text,
  source_material text,
  owner_user_id uuid references auth.users(id),
  status text not null default 'idea'
    check (status in ('idea', 'brief', 'drafting', 'needs_review', 'approved', 'scheduled', 'live', 'repurpose', 'archived')),
  publish_at timestamptz,
  published_url text,
  brand_profile_version integer,
  claim_check_status text not null default 'pending' check (claim_check_status in ('pending', 'passed', 'flagged')),
  accessibility_check_status text not null default 'pending' check (accessibility_check_status in ('pending', 'passed', 'flagged')),
  performance_metrics jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.nurture_sequences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  audience text,
  trigger_rule text,
  stop_conditions text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.nurture_steps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  sequence_id uuid not null references public.nurture_sequences(id) on delete cascade,
  step_order integer not null default 0,
  delay_period text,
  channel text,
  template_id uuid references public.templates(id) on delete set null,
  owner_rule text,
  created_at timestamptz not null default now()
);

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  opportunity_id uuid,
  owner_user_id uuid references auth.users(id),
  direction text check (direction in ('inbound', 'outbound')),
  channel text,
  outcome text,
  summary text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  interaction_id uuid references public.interactions(id) on delete set null,
  template_id uuid references public.templates(id) on delete set null,
  subject text,
  body text,
  approval_status text not null default 'draft'
    check (approval_status in ('draft', 'pending_approval', 'approved', 'rejected')),
  sent_at timestamptz,
  provider_message_id text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index campaigns_workspace_id_idx on public.campaigns(workspace_id);
create index campaign_members_workspace_id_idx on public.campaign_members(workspace_id);
create index campaign_members_campaign_id_idx on public.campaign_members(campaign_id);
create index content_assets_workspace_id_idx on public.content_assets(workspace_id);
create index content_assets_campaign_id_idx on public.content_assets(campaign_id);
create index nurture_sequences_workspace_id_idx on public.nurture_sequences(workspace_id);
create index nurture_steps_workspace_id_idx on public.nurture_steps(workspace_id);
create index nurture_steps_sequence_id_idx on public.nurture_steps(sequence_id);
create index interactions_workspace_id_idx on public.interactions(workspace_id);
create index interactions_person_id_idx on public.interactions(person_id);
create index outreach_messages_workspace_id_idx on public.outreach_messages(workspace_id);
create index outreach_messages_lead_id_idx on public.outreach_messages(lead_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.content_assets
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.nurture_sequences
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.outreach_messages
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.content_assets enable row level security;
alter table public.nurture_sequences enable row level security;
alter table public.nurture_steps enable row level security;
alter table public.interactions enable row level security;
alter table public.outreach_messages enable row level security;

create policy "members can manage workspace campaigns" on public.campaigns
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace campaign members" on public.campaign_members
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace content assets" on public.content_assets
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace nurture sequences" on public.nurture_sequences
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace nurture steps" on public.nurture_steps
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace interactions" on public.interactions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace outreach messages" on public.outreach_messages
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
