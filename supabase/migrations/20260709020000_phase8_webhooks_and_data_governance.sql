-- Phase 8, part 2 — Billing Webhook Ledger and Data Export/Deletion
-- (Section 18's "Usage limits and billing controls" and "Data export,
-- deletion, portability, and enterprise administration" build
-- requirements).
--
-- billing_webhook_events has RLS enabled but deliberately NO policies at
-- all for authenticated/anon — the same "default deny, service-role only"
-- treatment already used for the SECURITY DEFINER trigger functions
-- (Phase 1's log_audit_event, handle_new_user): this table is pure
-- internal plumbing written only by the Stripe webhook route using the
-- admin client, and read only by that same server-side code, never
-- exposed to any authenticated tenant user. unique(stripe_event_id) is the
-- idempotency guard — the same pattern as Phase 6's webhook_events table,
-- but scoped to Stripe's own event stream rather than a per-workspace
-- integration_account, since Stripe delivers one event stream for the
-- whole connected account covering every workspace's subscription.
--
-- data_deletion_requests creation is restricted to Workspace Owner /
-- Administrator (the same admin-gated pattern as workspaces itself) given
-- how consequential the action is, and is a *request* with a
-- cancellable scheduled_for date, not an immediate delete — actually
-- executing a scheduled purge needs a recurring job (pg_cron or a Vercel
-- cron hitting a server action) that doesn't exist yet in this build, so
-- this phase builds the request/schedule/cancel data model and UI, not an
-- automated executor, consistent with the "defer what needs infrastructure
-- this build doesn't have yet" pattern from every prior phase.

create table public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text,
  workspace_id uuid references public.workspaces(id) on delete set null,
  payload jsonb,
  status text not null default 'received' check (status in ('received', 'processed', 'failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  requested_by uuid references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  asset_id uuid references public.assets(id) on delete set null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  requested_by uuid references auth.users(id),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'scheduled', 'canceled', 'completed')),
  scheduled_for date,
  canceled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index billing_webhook_events_workspace_id_idx on public.billing_webhook_events(workspace_id);
create index data_export_requests_workspace_id_idx on public.data_export_requests(workspace_id);
create index data_deletion_requests_workspace_id_idx on public.data_deletion_requests(workspace_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.billing_webhook_events enable row level security;
alter table public.data_export_requests enable row level security;
alter table public.data_deletion_requests enable row level security;

-- billing_webhook_events: no policies — service-role (bypasses RLS) only.

create policy "members can view workspace export requests" on public.data_export_requests
  for select
  using (workspace_id in (select private.active_workspace_ids()));

create policy "members can request a workspace export" on public.data_export_requests
  for insert
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can view workspace deletion requests" on public.data_deletion_requests
  for select
  using (workspace_id in (select private.active_workspace_ids()));

create policy "owners and admins can request workspace deletion" on public.data_deletion_requests
  for insert
  with check (private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator']));

create policy "owners and admins can cancel workspace deletion" on public.data_deletion_requests
  for update
  using (private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator']))
  with check (private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator']));
