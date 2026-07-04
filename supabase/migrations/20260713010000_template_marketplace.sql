-- Template Marketplace and certified implementation pathways (Section 18,
-- Phase 8's deferred remainder). Explicit user decisions (asked because
-- this is the first table in this build where content becomes readable
-- across the workspace-isolation boundary every RLS policy since Phase 1
-- has assumed):
--
-- 1. Self-serve snapshot publish/install, not live cross-tenant access to
--    a workspace's real templates/template_versions rows. Publishing
--    copies a snapshot into this table; installing copies that snapshot
--    into the installing workspace's own templates/template_versions as a
--    fresh, independent, editable row with no ongoing link back to the
--    source. A workspace's live, possibly-draft template content is never
--    directly exposed to other workspaces.
-- 2. `certified` exists as a column (matching the spec's "certified
--    implementation pathways" language) but nothing in this build can set
--    it true — there is no platform-operator/superadmin role anywhere in
--    this app, only workspace-scoped roles. Left as an honest, documented
--    gap rather than a fake toggle.

create table public.template_marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  source_workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_template_id uuid references public.templates(id) on delete set null,
  name text not null,
  template_type text not null check (template_type in (
    'email_sms', 'outreach', 'campaign', 'content_brief', 'proposal', 'contract',
    'onboarding', 'journey_program', 'session', 'progress_review', 'renewal',
    'testimonial_referral', 'sop', 'automation', 'review', 'report'
  )),
  description text,
  content text,
  variables_json jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  certified boolean not null default false,
  install_count integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  archived_at timestamptz
);

create index template_marketplace_listings_source_workspace_id_idx
  on public.template_marketplace_listings(source_workspace_id);
create index template_marketplace_listings_status_idx
  on public.template_marketplace_listings(status) where status = 'published';

create trigger set_updated_at before update on public.template_marketplace_listings
  for each row execute function public.set_updated_at();

alter table public.template_marketplace_listings enable row level security;

-- Standard pattern: the publishing workspace manages its own listings
-- (drafts, published, retired — all statuses, own workspace only).
create policy "publishers manage their own listings" on public.template_marketplace_listings
  for all
  using (source_workspace_id in (select private.active_workspace_ids()))
  with check (source_workspace_id in (select private.active_workspace_ids()));

-- The new policy: any authenticated member of any workspace can browse
-- listings other workspaces have chosen to publish. This is deliberate and
-- the first cross-tenant-visible read in this build's RLS model — gated
-- strictly to status = 'published' (drafts and retired listings stay
-- covered only by the policy above).
create policy "authenticated users can browse published listings" on public.template_marketplace_listings
  for select
  using (auth.role() = 'authenticated' and status = 'published');

-- SECURITY DEFINER RPC to bump install_count on someone else's published
-- listing — a requesting workspace has no general UPDATE right on another
-- workspace's row (the "publishers manage their own" policy blocks it), so
-- this mirrors increment_usage_counter's self-validating pattern: it only
-- ever touches a row that is actually status = 'published', regardless of
-- who calls it.
create or replace function public.increment_marketplace_install_count(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.template_marketplace_listings
  set install_count = install_count + 1
  where id = p_listing_id and status = 'published';
end;
$$;

grant execute on function public.increment_marketplace_install_count(uuid) to authenticated;
