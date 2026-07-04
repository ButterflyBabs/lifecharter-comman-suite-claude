-- Settings: Users and Roles — real invite flow (Section 6's "Invitations,
-- Membership status, Role and permission assignment, ... Access review,
-- Suspension and offboarding, Audit history").
--
-- workspace_members.status already covers invited/active/suspended/removed
-- (Phase 1), and member_roles/roles/audit_events already cover role
-- assignment and audit history — this migration only adds the two fields
-- Section 6 names that 10.3's minimum fields didn't: access_review_at, and
-- invited_email (captured at invite time, before the invitee necessarily
-- has a user_profiles row to display a name from).
--
-- enforce_seat_limit mirrors Phase 8's enforce_automation_enable_gate
-- pattern exactly: a real trigger, not an app-layer check, so it applies
-- even to the service-role admin client the invite action uses (triggers
-- fire regardless of role; only RLS is bypassed by service-role). Only
-- restricts when the workspace has an active/trialing subscription with a
-- concrete (non-null) seats entitlement limit — no subscription or an
-- unlimited/enterprise entitlement is not restricted.

alter table public.workspace_members
  add column access_review_at date,
  add column invited_email text;

create or replace function public.enforce_seat_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.status in ('invited', 'active') and (tg_op = 'INSERT' or old.status not in ('invited', 'active')) then
    select pe.limit_value into v_limit
    from public.workspace_subscriptions ws
    join public.plan_entitlements pe on pe.plan_id = ws.plan_id and pe.entitlement_key = 'seats'
    where ws.workspace_id = new.workspace_id and ws.status in ('active', 'trialing');

    if v_limit is not null then
      select count(*) into v_count
      from public.workspace_members
      where workspace_id = new.workspace_id
        and status in ('invited', 'active')
        and id <> new.id;

      if v_count >= v_limit then
        raise exception 'Cannot add member: plan limit of % seats reached', v_limit;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_seat_limit
  before insert or update on public.workspace_members
  for each row execute function public.enforce_seat_limit();
