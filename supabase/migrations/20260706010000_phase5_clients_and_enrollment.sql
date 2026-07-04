-- Phase 5: Client Experience, part 1 — Clients, Contacts, Enrollments, and
-- Portal Access (Section 10.7 subset; field lists merged with Section 6's
-- fuller "Client Overview" and "Active Client Record" module specs, same
-- convention as Phases 3/4).
--
-- clients.status includes 'onboarding' as a distinct state beyond 10.7's
-- "active or former" framing — Section 6's Onboarding gate is explicit
-- ("Payment, agreement, portal, required intake, and kickoff requirements
-- are satisfied before the client becomes Active"), which only makes sense
-- if there's a state before Active to satisfy those requirements in.

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  owner_user_id uuid references auth.users(id),
  status text not null default 'onboarding'
    check (status in ('onboarding', 'active', 'paused', 'completed', 'former')),
  start_at timestamptz not null default now(),
  end_at timestamptz,
  source_opportunity_id uuid references public.opportunities(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role text,
  portal_access boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.client_offer_enrollments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  offer_version_id uuid references public.offer_versions(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  start_at timestamptz not null default now(),
  end_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.client_portal_access (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid references auth.users(id),
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended')),
  invited_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index clients_workspace_id_idx on public.clients(workspace_id);
create index client_contacts_workspace_id_idx on public.client_contacts(workspace_id);
create index client_contacts_client_id_idx on public.client_contacts(client_id);
create index client_offer_enrollments_workspace_id_idx on public.client_offer_enrollments(workspace_id);
create index client_offer_enrollments_client_id_idx on public.client_offer_enrollments(client_id);
create index client_portal_access_workspace_id_idx on public.client_portal_access(workspace_id);
create index client_portal_access_client_id_idx on public.client_portal_access(client_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.client_offer_enrollments
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.clients enable row level security;
alter table public.client_contacts enable row level security;
alter table public.client_offer_enrollments enable row level security;
alter table public.client_portal_access enable row level security;

create policy "members can manage workspace clients" on public.clients
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace client contacts" on public.client_contacts
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace client offer enrollments" on public.client_offer_enrollments
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace client portal access" on public.client_portal_access
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
