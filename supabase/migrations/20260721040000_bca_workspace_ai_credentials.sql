-- Business Command Audit — client BYOK AI credentials.
--
-- Clients bring their own API key. The plaintext key is NEVER stored here; it is
-- written to Supabase Vault (supabase_vault ext, already installed) and only its
-- vault secret id is referenced. Decryption happens server-side only, inside the
-- edge functions, via the service role reading vault.decrypted_secrets. Clients
-- can see that a key exists (row metadata + last-4) but can never read it back.
-- ai_runs records which credential/model was used.

create table public.workspace_ai_credentials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null default 'anthropic' check (provider in ('anthropic', 'openai')),
  model text,
  label text,
  key_last4 text,                    -- non-sensitive display hint only
  vault_secret_id uuid not null,     -- FK-in-spirit to vault.secrets(id); never the key itself
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index workspace_ai_credentials_workspace_idx on public.workspace_ai_credentials(workspace_id);

create trigger set_updated_at before update on public.workspace_ai_credentials
  for each row execute function public.set_updated_at();

grant all on table public.workspace_ai_credentials to authenticated, service_role;

alter table public.workspace_ai_credentials enable row level security;

-- Members can SEE a credential exists (metadata only — the key lives in Vault).
create policy "members can read workspace ai credentials" on public.workspace_ai_credentials
  for select
  using (workspace_id in (select private.active_workspace_ids()));

-- Only workspace owners/admins may create, rotate, or revoke credentials.
create policy "admins can manage workspace ai credentials" on public.workspace_ai_credentials
  for all
  using (private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator']))
  with check (private.has_workspace_role(workspace_id, array['Workspace Owner', 'Administrator']));
