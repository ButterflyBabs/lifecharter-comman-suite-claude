-- Phase 4: Revenue Engine, part 1 — Relationships/CRM, Lead Sources, Leads, and
-- Research (Section 10.6 subset; field lists merged with Section 6's fuller
-- "Outreach" and "Relationships and CRM" module specs, since 10.6 explicitly
-- calls its lists "minimum fields", same convention as Phase 3).
--
-- The Outreach module (/revenue/outreach) has no dedicated table of its own in
-- 10.6 beyond outreach_messages — its "core fields" (qualification rationale,
-- recommended offer, outreach angle, reply status, next action) are added to
-- `leads` here, since Outreach is a working view over leads + research +
-- scores + messages, not a separate object.
--
-- people.consent_status is jsonb (per-channel), not a single text value —
-- Section 6 explicitly describes "Consent by channel" (plural/structured),
-- which a single status column can't represent.

create table public.people (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  preferred_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  timezone text,
  consent_status jsonb,
  owner_user_id uuid references auth.users(id),
  primary_pathway text check (primary_pathway in ('b2b', 'b2c', 'partner')),
  secondary_pathways jsonb,
  tags jsonb,
  next_action text,
  external_ids jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  domain text,
  industry text,
  size_band text,
  revenue_band text,
  location text,
  website text,
  owner_user_id uuid references auth.users(id),
  tags jsonb,
  next_action text,
  external_ids jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.relationship_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_type text not null check (subject_type in ('person', 'organization')),
  subject_id uuid not null,
  role_type text not null,
  start_at timestamptz not null default now(),
  end_at timestamptz,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.relationship_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  from_subject_type text not null check (from_subject_type in ('person', 'organization')),
  from_subject_id uuid not null,
  to_subject_type text not null check (to_subject_type in ('person', 'organization')),
  to_subject_id uuid not null,
  relationship_type text not null,
  source text,
  confidence text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  source_type text,
  parent_source_id uuid references public.lead_sources(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  source_id uuid references public.lead_sources(id),
  pathway text check (pathway in ('b2b', 'b2c', 'partner')),
  owner_user_id uuid references auth.users(id),
  acquired_at timestamptz not null default now(),
  status text not null default 'new'
    check (status in ('new', 'researching', 'qualified', 'disqualified', 'contacted', 'converted')),
  qualification_rationale text,
  recommended_offer_id uuid references public.offers(id) on delete set null,
  outreach_angle text,
  reply_status text,
  next_action text,
  external_ids jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.research_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  goal text not null,
  pathway text check (pathway in ('b2b', 'b2c', 'partner')),
  criteria_json jsonb,
  source_selection text,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'cancelled')),
  requested_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.research_findings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  research_project_id uuid not null references public.research_projects(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  subject text not null,
  fact_or_inference text not null
    check (fact_or_inference in ('fact', 'inference', 'missing_information')),
  statement text not null,
  source_url text,
  confidence text,
  researched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.lead_scores (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  fit_score numeric check (fit_score >= 0 and fit_score <= 100),
  engagement_score numeric check (engagement_score >= 0 and engagement_score <= 100),
  intent_score numeric check (intent_score >= 0 and intent_score <= 100),
  priority_score numeric check (priority_score >= 0 and priority_score <= 100),
  explanation_json jsonb,
  calculated_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index people_workspace_id_idx on public.people(workspace_id);
create index organizations_workspace_id_idx on public.organizations(workspace_id);
create index relationship_roles_workspace_id_idx on public.relationship_roles(workspace_id);
create index relationship_roles_subject_idx on public.relationship_roles(subject_type, subject_id);
create index relationship_links_workspace_id_idx on public.relationship_links(workspace_id);
create index lead_sources_workspace_id_idx on public.lead_sources(workspace_id);
create index leads_workspace_id_idx on public.leads(workspace_id);
create index leads_person_id_idx on public.leads(person_id);
create index leads_organization_id_idx on public.leads(organization_id);
create index research_projects_workspace_id_idx on public.research_projects(workspace_id);
create index research_findings_workspace_id_idx on public.research_findings(workspace_id);
create index research_findings_project_id_idx on public.research_findings(research_project_id);
create index lead_scores_workspace_id_idx on public.lead_scores(workspace_id);
create index lead_scores_lead_id_idx on public.lead_scores(lead_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.people
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.relationship_roles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.research_projects
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.people enable row level security;
alter table public.organizations enable row level security;
alter table public.relationship_roles enable row level security;
alter table public.relationship_links enable row level security;
alter table public.lead_sources enable row level security;
alter table public.leads enable row level security;
alter table public.research_projects enable row level security;
alter table public.research_findings enable row level security;
alter table public.lead_scores enable row level security;

create policy "members can manage workspace people" on public.people
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace organizations" on public.organizations
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace relationship roles" on public.relationship_roles
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace relationship links" on public.relationship_links
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace lead sources" on public.lead_sources
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace leads" on public.leads
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace research projects" on public.research_projects
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace research findings" on public.research_findings
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace lead scores" on public.lead_scores
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
