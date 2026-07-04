-- Phase 8, part 4 — increment_usage_counter RPC.
--
-- usage_counters has only a SELECT policy for authenticated members (Phase
-- 8's original migration) — the actual counting is meant to happen
-- server-side, not via arbitrary client writes. This SECURITY DEFINER
-- function is the one sanctioned way to bump a counter: it self-enforces
-- that the calling user is an active member of the workspace it's writing
-- to (since SECURITY DEFINER bypasses RLS entirely, the same "must check
-- membership itself" discipline as private.has_workspace_role and every
-- other SECURITY DEFINER function in this codebase), then upserts.

create or replace function public.increment_usage_counter(
  p_workspace_id uuid,
  p_entitlement_key text,
  p_period_start date,
  p_period_end date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'Not an active member of this workspace';
  end if;

  insert into public.usage_counters (workspace_id, entitlement_key, period_start, period_end, current_value)
  values (p_workspace_id, p_entitlement_key, p_period_start, p_period_end, 1)
  on conflict (workspace_id, entitlement_key, period_start)
  do update set current_value = public.usage_counters.current_value + 1, updated_at = now();
end;
$$;

revoke execute on function public.increment_usage_counter(uuid, text, date, date) from public, anon;
grant execute on function public.increment_usage_counter(uuid, text, date, date) to authenticated;
