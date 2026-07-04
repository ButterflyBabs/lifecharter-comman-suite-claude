-- Phase 6: Operations, part 4 — Legal and Risk (Section 10.8 subset, merged
-- with Section 6's fuller field lists).
--
-- risks.backup_plan is named directly in Section 6's field list for this
-- module, beyond 10.8's minimum fields.
--
-- No hard gate is enforced here — Section 6's stated safety rule ("AI may
-- organize and summarize but does not issue legal conclusions") is an AI
-- governance concern, not a database constraint, and is deferred with every
-- other AI-action rule per the standing instruction (human approval / AI
-- action gating lands with the AI Team build in a later phase).

create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  document_type text,
  owner_user_id uuid references auth.users(id),
  current_version_id uuid,
  review_at date,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  legal_document_id uuid not null references public.legal_documents(id) on delete cascade,
  version integer not null,
  asset_id uuid references public.assets(id) on delete set null,
  effective_at timestamptz,
  approved_by uuid references auth.users(id),
  jurisdiction_note text,
  created_at timestamptz not null default now(),
  unique (legal_document_id, version)
);

alter table public.legal_documents
  add constraint legal_documents_current_version_id_fkey
  foreign key (current_version_id) references public.legal_document_versions(id) on delete set null;

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category text,
  title text not null,
  probability text check (probability in ('low', 'medium', 'high')),
  impact text check (impact in ('low', 'medium', 'high')),
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  owner_user_id uuid references auth.users(id),
  response_plan text,
  backup_plan text,
  review_at date,
  status text not null default 'open' check (status in ('open', 'monitoring', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  risk_id uuid references public.risks(id) on delete set null,
  occurred_at timestamptz not null default now(),
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  summary text not null,
  response text,
  resolution text,
  lessons text,
  created_at timestamptz not null default now()
);

create table public.continuity_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  scenario text not null,
  owner_user_id uuid references auth.users(id),
  activation_rule text,
  response_steps text,
  communication_plan text,
  test_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index legal_documents_workspace_id_idx on public.legal_documents(workspace_id);
create index legal_document_versions_workspace_id_idx on public.legal_document_versions(workspace_id);
create index legal_document_versions_document_id_idx on public.legal_document_versions(legal_document_id);
create index risks_workspace_id_idx on public.risks(workspace_id);
create index incidents_workspace_id_idx on public.incidents(workspace_id);
create index continuity_plans_workspace_id_idx on public.continuity_plans(workspace_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.legal_documents
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.risks
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.continuity_plans
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.legal_documents enable row level security;
alter table public.legal_document_versions enable row level security;
alter table public.risks enable row level security;
alter table public.incidents enable row level security;
alter table public.continuity_plans enable row level security;

create policy "members can manage workspace legal documents" on public.legal_documents
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace legal document versions" on public.legal_document_versions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace risks" on public.risks
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace incidents" on public.incidents
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace continuity plans" on public.continuity_plans
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
