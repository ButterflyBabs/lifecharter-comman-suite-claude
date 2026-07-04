-- White-label client workspace options (Section 18, Phase 8's deferred
-- remainder, item 4). Two explicit user decisions before building: (1)
-- both custom-domain request/verification and client-facing branding are
-- in scope; (2) DNS verification is real, but actually attaching a
-- verified domain to the live Vercel project stays a manual step done in
-- the Vercel dashboard — this build never calls Vercel's domain API on a
-- workspace's behalf, the same "we verify, you attach the real
-- credential/infra yourself" precedent as the Stripe price IDs.

alter table public.workspaces
  add column client_portal_display_name text,
  add column client_portal_logo_url text,
  add column client_portal_primary_color text;

create table public.workspace_domains (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  domain text not null unique,
  status text not null default 'pending_dns' check (status in ('pending_dns', 'verified', 'failed')),
  last_checked_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index workspace_domains_workspace_id_idx on public.workspace_domains(workspace_id);

create trigger set_updated_at before update on public.workspace_domains
  for each row execute function public.set_updated_at();

alter table public.workspace_domains enable row level security;

create policy "members can read workspace domains" on public.workspace_domains
  for select
  using (workspace_id in (select private.active_workspace_ids()));

create policy "owners and admins can manage workspace domains" on public.workspace_domains
  for all
  using (private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator']))
  with check (private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator']));
