-- No blanket UPDATE policy on client_portal_access for portal users: that
-- would let a client rewrite their own row's client_id to point at a
-- different client in the same workspace, pivoting into that client's
-- actions/deliverables/sessions/milestones through the policies just
-- added (all of which trust client_portal_access.client_id). A narrow
-- SECURITY DEFINER RPC that can only ever touch last_login_at for the
-- caller's own row is the same "controlled, narrow write" pattern already
-- used by increment_usage_counter and increment_marketplace_install_count.
create or replace function public.record_portal_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.client_portal_access
  set last_login_at = now()
  where user_id = auth.uid();
end;
$$;

revoke execute on function public.record_portal_login() from anon, public;
grant execute on function public.record_portal_login() to authenticated;
