-- Phase 4: Revenue Engine, part 4 — Proposals and Contracts (Section 10.6
-- subset, merged with Section 6's fuller field lists for each module).
--
-- "Sent proposals are immutable. Revisions create new versions." is
-- implemented as a real trigger (enforce_proposal_version_immutability), not
-- just a stated rule — once the parent proposal's status has moved past
-- 'draft', its proposal_versions rows can no longer be updated; a revision
-- must insert a new version and point proposals.current_version_id at it.
-- Same rigor as Phase 2's gate-enforcement triggers and Phase 3's singleton
-- versioning pattern.

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  current_version_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'accepted', 'declined', 'revised', 'expired')),
  sent_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  version integer not null,
  scope_json jsonb,
  price_json jsonb,
  terms_summary text,
  asset_id uuid references public.assets(id) on delete set null,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (proposal_id, version)
);

alter table public.proposals
  add constraint proposals_current_version_id_fkey
  foreign key (current_version_id) references public.proposal_versions(id) on delete set null;

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  current_version_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'signed', 'void', 'expired')),
  signatory text,
  effective_at timestamptz,
  end_at timestamptz,
  renewal_rule text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  version integer not null,
  template_id uuid references public.templates(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  terms_hash text,
  commercial_terms_snapshot jsonb,
  signatories jsonb,
  payment_terms text,
  obligations text,
  signature_status text not null default 'unsigned'
    check (signature_status in ('unsigned', 'partially_signed', 'signed')),
  sent_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (contract_id, version)
);

alter table public.contracts
  add constraint contracts_current_version_id_fkey
  foreign key (current_version_id) references public.contract_versions(id) on delete set null;

-- ============================================================================
-- Proposal immutability trigger
-- ============================================================================

create or replace function public.enforce_proposal_version_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status from public.proposals where id = old.proposal_id;
  if v_status is distinct from 'draft' then
    raise exception 'Sent proposals are immutable — create a new version instead of editing version %', old.version;
  end if;
  return new;
end;
$$;

create trigger enforce_proposal_version_immutability
  before update on public.proposal_versions
  for each row execute function public.enforce_proposal_version_immutability();

-- ============================================================================
-- Indexes
-- ============================================================================

create index proposals_workspace_id_idx on public.proposals(workspace_id);
create index proposals_opportunity_id_idx on public.proposals(opportunity_id);
create index proposal_versions_workspace_id_idx on public.proposal_versions(workspace_id);
create index proposal_versions_proposal_id_idx on public.proposal_versions(proposal_id);
create index contracts_workspace_id_idx on public.contracts(workspace_id);
create index contracts_opportunity_id_idx on public.contracts(opportunity_id);
create index contract_versions_workspace_id_idx on public.contract_versions(workspace_id);
create index contract_versions_contract_id_idx on public.contract_versions(contract_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.proposals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.proposals enable row level security;
alter table public.proposal_versions enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_versions enable row level security;

create policy "members can manage workspace proposals" on public.proposals
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace proposal versions" on public.proposal_versions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace contracts" on public.contracts
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace contract versions" on public.contract_versions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
