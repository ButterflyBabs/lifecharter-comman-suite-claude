-- Phase 5: Client Experience, part 5 — Support, Client Health, Renewals, and
-- Advocacy (Section 10.7 subset, merged with Section 6's fuller field lists).
--
-- intervention_plans.trigger_event_id references client_health_events per
-- 10.7's own field name — the stated rule for Client Overview is explicit
-- ("Every at-risk client has an intervention owner and review date"), which
-- this table's owner_user_id/review_at already satisfy.
--
-- testimonials and case_studies both carry consent_status with a matching
-- check constraint — the stated rule for Advocacy is explicit: "No public use
-- occurs without explicit permission and approved wording."

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  category text,
  priority text check (priority in ('low', 'normal', 'high', 'urgent')),
  summary text not null,
  owner_user_id uuid references auth.users(id),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  response_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_health_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  score numeric check (score >= 0 and score <= 100),
  status text check (status in ('healthy', 'watch', 'at_risk')),
  signals_json jsonb,
  calculated_at timestamptz not null default now(),
  override_reason text
);

create table public.intervention_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  trigger_event_id uuid references public.client_health_events(id) on delete set null,
  owner_user_id uuid references auth.users(id),
  actions_json jsonb,
  review_at date,
  status text not null default 'active' check (status in ('active', 'resolved', 'escalated')),
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.renewal_opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  current_enrollment_id uuid references public.client_offer_enrollments(id) on delete set null,
  recommended_offer_id uuid references public.offers(id) on delete set null,
  contract_end_date date,
  review_at date,
  recommended_path text check (recommended_path in ('renew', 'expand', 'complete', 'pause', 'refer')),
  status text not null default 'pending' check (status in ('pending', 'in_conversation', 'won', 'lost')),
  opportunity_id uuid references public.opportunities(id) on delete set null,
  close_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offboarding_instances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  reason text,
  checklist_json jsonb,
  completed_at timestamptz,
  archive_rules text,
  created_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  statement text,
  format text,
  consent_status text not null default 'pending' check (consent_status in ('pending', 'granted', 'revoked')),
  approved_channels jsonb,
  asset_id uuid references public.assets(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  referring_client_id uuid not null references public.clients(id) on delete cascade,
  referred_person_id uuid references public.people(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'declined')),
  incentive text,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.case_studies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  situation text,
  intervention text,
  outcome text,
  evidence text,
  consent_status text not null default 'pending' check (consent_status in ('pending', 'granted', 'revoked')),
  asset_id uuid references public.assets(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index support_requests_workspace_id_idx on public.support_requests(workspace_id);
create index support_requests_client_id_idx on public.support_requests(client_id);
create index client_health_events_workspace_id_idx on public.client_health_events(workspace_id);
create index client_health_events_client_id_idx on public.client_health_events(client_id);
create index intervention_plans_workspace_id_idx on public.intervention_plans(workspace_id);
create index intervention_plans_client_id_idx on public.intervention_plans(client_id);
create index renewal_opportunities_workspace_id_idx on public.renewal_opportunities(workspace_id);
create index renewal_opportunities_client_id_idx on public.renewal_opportunities(client_id);
create index offboarding_instances_workspace_id_idx on public.offboarding_instances(workspace_id);
create index offboarding_instances_client_id_idx on public.offboarding_instances(client_id);
create index testimonials_workspace_id_idx on public.testimonials(workspace_id);
create index referrals_workspace_id_idx on public.referrals(workspace_id);
create index case_studies_workspace_id_idx on public.case_studies(workspace_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.support_requests
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.intervention_plans
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.renewal_opportunities
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.support_requests enable row level security;
alter table public.client_health_events enable row level security;
alter table public.intervention_plans enable row level security;
alter table public.renewal_opportunities enable row level security;
alter table public.offboarding_instances enable row level security;
alter table public.testimonials enable row level security;
alter table public.referrals enable row level security;
alter table public.case_studies enable row level security;

create policy "members can manage workspace support requests" on public.support_requests
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace client health events" on public.client_health_events
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace intervention plans" on public.intervention_plans
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace renewal opportunities" on public.renewal_opportunities
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace offboarding instances" on public.offboarding_instances
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace testimonials" on public.testimonials
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace referrals" on public.referrals
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace case studies" on public.case_studies
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
