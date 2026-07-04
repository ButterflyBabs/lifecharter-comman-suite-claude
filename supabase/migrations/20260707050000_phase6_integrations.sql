-- Phase 6: Operations, part 5 — Integrations (Section 10.8 subset, merged
-- with Section 6's fuller field lists).
--
-- integration_providers is treated as global reference data (no
-- workspace_id, read-only to authenticated users) — the same pattern as
-- Phase 2's business_command_domains/audit_templates — since it's a shared
-- catalog of known provider adapters, not per-tenant content. Every
-- workspace's actual connection is integration_accounts, which is
-- tenant-owned as usual.
--
-- integration_accounts.auth_reference is deliberately a text reference (a
-- token/secret-manager key), never the raw credential itself — Section 6's
-- stated rule is explicit: "Credentials are encrypted and never exposed
-- client-side." This is a naming/discipline choice enforced by never adding
-- a raw-secret column, not a constraint the database can check on its own.
--
-- webhook_events has unique(integration_account_id, external_event_id),
-- the same idempotency-guard pattern as Phase 4's
-- payments.unique(provider, provider_payment_id) — directly serving
-- Scenario I in Section 19.2 ("retry is safe and idempotent").

create table public.integration_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  adapter_code text not null unique,
  capabilities_json jsonb,
  auth_methods text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider_id uuid not null references public.integration_providers(id),
  auth_reference text,
  connected_user text,
  granted_permissions text,
  source_of_truth boolean not null default false,
  sync_direction text check (sync_direction in ('inbound', 'outbound', 'bidirectional')),
  sync_frequency text,
  status text not null default 'disconnected' check (status in ('connected', 'error', 'disconnected')),
  connected_at timestamptz,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_of_truth_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  module text not null,
  field_path text not null,
  integration_account_id uuid references public.integration_accounts(id) on delete set null,
  direction text check (direction in ('inbound', 'outbound', 'bidirectional')),
  conflict_rule text,
  created_at timestamptz not null default now()
);

create table public.field_mappings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  integration_account_id uuid not null references public.integration_accounts(id) on delete cascade,
  object_type text not null,
  internal_field text not null,
  external_field text not null,
  transform_rule text,
  created_at timestamptz not null default now()
);

create table public.sync_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  integration_account_id uuid not null references public.integration_accounts(id) on delete cascade,
  object_type text not null,
  sync_event text,
  direction text check (direction in ('inbound', 'outbound', 'bidirectional')),
  frequency text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  sync_rule_id uuid not null references public.sync_rules(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  error_count integer not null default 0,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed'))
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  integration_account_id uuid references public.integration_accounts(id) on delete cascade,
  provider_id uuid references public.integration_providers(id),
  external_event_id text not null,
  event_type text,
  payload_hash text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received' check (status in ('received', 'processed', 'failed', 'duplicate')),
  unique (integration_account_id, external_event_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index integration_accounts_workspace_id_idx on public.integration_accounts(workspace_id);
create index integration_accounts_provider_id_idx on public.integration_accounts(provider_id);
create index source_of_truth_rules_workspace_id_idx on public.source_of_truth_rules(workspace_id);
create index field_mappings_workspace_id_idx on public.field_mappings(workspace_id);
create index field_mappings_account_id_idx on public.field_mappings(integration_account_id);
create index sync_rules_workspace_id_idx on public.sync_rules(workspace_id);
create index sync_rules_account_id_idx on public.sync_rules(integration_account_id);
create index sync_runs_workspace_id_idx on public.sync_runs(workspace_id);
create index sync_runs_rule_id_idx on public.sync_runs(sync_rule_id);
create index webhook_events_workspace_id_idx on public.webhook_events(workspace_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.integration_accounts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.integration_providers enable row level security;
alter table public.integration_accounts enable row level security;
alter table public.source_of_truth_rules enable row level security;
alter table public.field_mappings enable row level security;
alter table public.sync_rules enable row level security;
alter table public.sync_runs enable row level security;
alter table public.webhook_events enable row level security;

create policy "authenticated users can read integration providers" on public.integration_providers
  for select using (auth.role() = 'authenticated');

create policy "members can manage workspace integration accounts" on public.integration_accounts
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace source of truth rules" on public.source_of_truth_rules
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace field mappings" on public.field_mappings
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace sync rules" on public.sync_rules
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace sync runs" on public.sync_runs
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace webhook events" on public.webhook_events
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

-- ============================================================================
-- Seed a starter integration provider catalog
-- ============================================================================

insert into public.integration_providers (name, adapter_code, capabilities_json, auth_methods) values
  ('Stripe', 'stripe', '{"capabilities": ["payments", "invoices", "subscriptions"]}', 'oauth,api_key'),
  ('Google Calendar', 'google_calendar', '{"capabilities": ["scheduling", "availability"]}', 'oauth'),
  ('QuickBooks', 'quickbooks', '{"capabilities": ["accounting", "expenses", "invoices"]}', 'oauth'),
  ('Zoom', 'zoom', '{"capabilities": ["sessions", "recordings"]}', 'oauth'),
  ('Mailgun', 'mailgun', '{"capabilities": ["email_delivery"]}', 'api_key');
