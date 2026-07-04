-- Phase 8, part 3 — Extend the existing automation-enable gate (Phase 6)
-- to also enforce the workspace's plan entitlement limit for
-- 'automations_enabled', now that plan_entitlements exists. This is the
-- concrete enforcement point for "usage limits and billing controls" —
-- chosen because the enabling UI and trigger already exist
-- (app/(app)/operations/automations, enforce_automation_enable_gate),
-- unlike seats/business_units, whose settings pages
-- (/settings/users, /settings/business-units) are still unbuilt
-- placeholders with no creation flow to hook a limit into yet.
--
-- A workspace with no active subscription (or an unlimited/enterprise
-- entitlement, i.e. limit_value is null) is not restricted — the gate only
-- fires when a concrete numeric limit exists and is already met.

create or replace function public.enforce_automation_enable_gate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_limit integer;
  v_enabled_count integer;
begin
  if new.enabled and (tg_op = 'INSERT' or not old.enabled) then
    if new.owner_user_id is null then
      raise exception 'Cannot enable automation "%": no owner assigned', new.name;
    end if;
    if new.idempotency_strategy is null or new.idempotency_strategy = '' then
      raise exception 'Cannot enable automation "%": no idempotency strategy documented', new.name;
    end if;
    if not exists (
      select 1 from public.automation_runs
      where automation_id = new.id and status = 'test_passed'
    ) then
      raise exception 'Cannot enable automation "%": no passing test run on record', new.name;
    end if;

    v_workspace_id := new.workspace_id;

    select pe.limit_value into v_limit
    from public.workspace_subscriptions ws
    join public.plan_entitlements pe on pe.plan_id = ws.plan_id and pe.entitlement_key = 'automations_enabled'
    where ws.workspace_id = v_workspace_id and ws.status in ('active', 'trialing');

    if v_limit is not null then
      select count(*) into v_enabled_count
      from public.automation_definitions
      where workspace_id = v_workspace_id and enabled = true and id <> new.id;

      if v_enabled_count >= v_limit then
        raise exception 'Cannot enable automation "%": plan limit of % enabled automations reached', new.name, v_limit;
      end if;
    end if;
  end if;
  return new;
end;
$$;
