-- Business Command Audit — store a client BYOK key (owner/admin only).
--
-- Writes the plaintext key straight into Supabase Vault and records only the
-- vault secret id + last-4 in workspace_ai_credentials. SECURITY DEFINER so it
-- can call vault.create_secret, but it self-checks workspace role inside, so a
-- caller can only set a key for a workspace they own/administer. The plaintext
-- key is never returned or stored outside Vault.
create or replace function public.set_workspace_ai_key(
  p_workspace_id uuid,
  p_api_key text,
  p_provider text default 'anthropic',
  p_model text default null,
  p_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_cred_id uuid;
begin
  if not private.has_workspace_role(p_workspace_id, array['Workspace Owner', 'Administrator']) then
    raise exception 'not authorized for this workspace';
  end if;
  if p_api_key is null or length(btrim(p_api_key)) < 8 then
    raise exception 'invalid api key';
  end if;
  if p_provider not in ('anthropic', 'openai') then
    raise exception 'unsupported provider';
  end if;

  v_secret_id := vault.create_secret(
    btrim(p_api_key),
    'ai_key_' || p_workspace_id::text || '_' || gen_random_uuid()::text,
    'Business Command Audit BYOK'
  );

  -- One active credential per provider; supersede any prior one.
  update public.workspace_ai_credentials
    set status = 'revoked', archived_at = now()
  where workspace_id = p_workspace_id and provider = p_provider and status = 'active';

  insert into public.workspace_ai_credentials
    (workspace_id, provider, model, label, key_last4, vault_secret_id, created_by)
  values
    (p_workspace_id, p_provider, p_model, p_label, right(btrim(p_api_key), 4), v_secret_id, auth.uid())
  returning id into v_cred_id;

  return v_cred_id;
end;
$$;

revoke all on function public.set_workspace_ai_key(uuid, text, text, text, text) from public, anon;
grant execute on function public.set_workspace_ai_key(uuid, text, text, text, text) to authenticated, service_role;
