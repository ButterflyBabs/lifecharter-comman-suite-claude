-- Business Command Audit — server-side BYOK key retrieval.
--
-- The vault schema is not exposed to PostgREST, so edge functions can't read
-- vault.decrypted_secrets directly. This SECURITY DEFINER RPC resolves the
-- workspace's active credential and returns the decrypted key — but EXECUTE is
-- granted ONLY to service_role (revoked from anon/authenticated), so the key can
-- never be pulled by a client. Edge functions call it with the service role.
create or replace function public.get_workspace_ai_key(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cred record;
  v_secret text;
begin
  select id, provider, model, vault_secret_id
    into v_cred
  from public.workspace_ai_credentials
  where workspace_id = p_workspace_id
    and status = 'active'
    and archived_at is null
  order by created_at desc
  limit 1;

  if v_cred.id is null then
    return null;
  end if;

  select decrypted_secret
    into v_secret
  from vault.decrypted_secrets
  where id = v_cred.vault_secret_id;

  if v_secret is null then
    return null;
  end if;

  return jsonb_build_object(
    'credential_id', v_cred.id,
    'provider', v_cred.provider,
    'model', v_cred.model,
    'api_key', v_secret
  );
end;
$$;

revoke all on function public.get_workspace_ai_key(uuid) from public, anon, authenticated;
grant execute on function public.get_workspace_ai_key(uuid) to service_role;
