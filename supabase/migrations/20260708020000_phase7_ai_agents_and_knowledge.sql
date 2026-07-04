-- Phase 7: AI Team and KPIs, part 2 — Agent Roster and Knowledge Sources
-- (Section 10.9 subset, merged with Section 6's fuller AI Team field lists).
--
-- ai_agent_versions is enriched with capabilities, allowed_data,
-- prohibited_actions, provider, and retention_policy — all named directly
-- in Section 6's "Agent fields" list ("Capabilities", "Allowed data",
-- "Prohibited actions", "Model and provider restrictions", "Retention
-- policy"), richer than 10.9's minimum fields.
--
-- permission_level reuses Section 6's stated permission ladder verbatim
-- (read_and_analyze / draft / prepare_actions / execute_low_risk_internal /
-- human_approval_required) as its check constraint, rather than a free-text
-- field — this is the same ladder Appendix C's Human Approval Matrix maps
-- onto, and the concrete value this build's approval gate (part 3 of this
-- phase) reads to decide whether an output needs review.
--
-- ai_knowledge_sources.source_id is a polymorphic reference (source_type +
-- source_id, no FK), the same pattern already used by activity_events and
-- comments — a knowledge source can point at almost any object type in the
-- system (a document, an asset, a structured record, an integration, or a
-- collection), so no single foreign key table fits.

create table public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  purpose text,
  owner_user_id uuid references auth.users(id),
  current_version_id uuid,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_agent_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  version integer not null,
  model text,
  provider text,
  system_prompt text,
  tools_json jsonb,
  capabilities text,
  allowed_data text,
  prohibited_actions text,
  permission_level text not null default 'read_and_analyze' check (permission_level in (
    'read_and_analyze', 'draft', 'prepare_actions', 'execute_low_risk_internal', 'human_approval_required'
  )),
  retention_policy text,
  effective_at timestamptz,
  created_at timestamptz not null default now(),
  unique (agent_id, version)
);

alter table public.ai_agents
  add constraint ai_agents_current_version_id_fkey
  foreign key (current_version_id) references public.ai_agent_versions(id) on delete set null;

create table public.ai_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_id uuid references public.ai_agents(id) on delete cascade,
  source_type text not null check (source_type in (
    'structured_record', 'document', 'url', 'asset', 'integration', 'collection'
  )),
  source_id uuid,
  source_url text,
  owner_user_id uuid references auth.users(id),
  visibility text not null default 'internal' check (visibility in ('internal', 'client_visible', 'public')),
  access_scope text,
  freshness_rule text,
  freshness_at timestamptz,
  version_or_checksum text,
  ingestion_status text not null default 'pending' check (ingestion_status in ('pending', 'ingested', 'failed')),
  conflict_status text not null default 'none' check (conflict_status in ('none', 'flagged', 'resolved')),
  retention_rule text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index ai_agents_workspace_id_idx on public.ai_agents(workspace_id);
create index ai_agent_versions_workspace_id_idx on public.ai_agent_versions(workspace_id);
create index ai_agent_versions_agent_id_idx on public.ai_agent_versions(agent_id);
create index ai_knowledge_sources_workspace_id_idx on public.ai_knowledge_sources(workspace_id);
create index ai_knowledge_sources_agent_id_idx on public.ai_knowledge_sources(agent_id);
create index ai_knowledge_sources_subject_idx on public.ai_knowledge_sources(source_type, source_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.ai_agents
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.ai_knowledge_sources
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.ai_agents enable row level security;
alter table public.ai_agent_versions enable row level security;
alter table public.ai_knowledge_sources enable row level security;

create policy "members can manage workspace ai agents" on public.ai_agents
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace ai agent versions" on public.ai_agent_versions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace ai knowledge sources" on public.ai_knowledge_sources
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
