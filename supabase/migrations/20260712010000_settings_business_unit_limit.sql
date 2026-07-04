-- Settings: Business Units — closes the "business-unit limits are not
-- enforced" gap Phase 8 and the Settings/Users build both documented.
--
-- enforce_business_unit_limit mirrors enforce_seat_limit exactly (itself
-- mirroring Phase 6/8's enforce_automation_enable_gate pattern): a real
-- trigger, not an app-layer check, only restricting when the workspace has
-- an active/trialing subscription with a concrete (non-null)
-- business_units entitlement limit. No subscription or an
-- unlimited/enterprise entitlement is unrestricted.

create or replace function public.enforce_business_unit_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    select pe.limit_value into v_limit
    from public.workspace_subscriptions ws
    join public.plan_entitlements pe on pe.plan_id = ws.plan_id and pe.entitlement_key = 'business_units'
    where ws.workspace_id = new.workspace_id and ws.status in ('active', 'trialing');

    if v_limit is not null then
      select count(*) into v_count
      from public.business_units
      where workspace_id = new.workspace_id
        and status = 'active'
        and id <> new.id;

      if v_count >= v_limit then
        raise exception 'Cannot add business unit: plan limit of % business units reached', v_limit;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_business_unit_limit
  before insert or update on public.business_units
  for each row execute function public.enforce_business_unit_limit();
