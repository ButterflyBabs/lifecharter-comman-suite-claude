-- Settings test: enforce_business_unit_limit trigger, mirroring
-- Settings/Users' enforce_seat_limit test pattern exactly, plus a basic
-- cross-tenant isolation check on business_units (never had a dedicated
-- test before now that /settings/business-units actually writes to it).

begin;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BU Test Tenant A', 'bu-test-tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'BU Test Tenant B', 'bu-test-tenant-b');

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('e1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now());

insert into public.business_units (id, workspace_id, name, code) values
  ('b0100000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B Unit', 'TBU');

-- ============================================================================
-- Cross-tenant isolation.
-- ============================================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.business_units where workspace_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if v_count <> 0 then raise exception 'FAIL 1: tenant A read tenant B''s business_units (% rows)', v_count; end if;
end $$;

reset role;

-- ============================================================================
-- No subscription yet: adding business units is unrestricted.
-- ============================================================================

insert into public.business_units (id, workspace_id, name, code) values
  ('b0100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Core', 'CORE');

-- ============================================================================
-- Active subscription with a concrete business_units limit of 1: a second
-- active unit must be blocked.
-- ============================================================================

do $$
declare
  v_plan_id uuid;
begin
  select id into v_plan_id from public.subscription_plans where code = 'solo';

  insert into public.workspace_subscriptions (workspace_id, plan_id, status)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v_plan_id, 'active');

  begin
    insert into public.business_units (workspace_id, name, code)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Second Brand', 'SECOND');
    raise exception 'FAIL 2: a second business unit was added despite the plan limit being met';
  exception
    when others then
      if sqlerrm not like 'Cannot add business unit: plan limit of % business units reached' then
        raise exception 'FAIL 2b: unexpected error instead of the business-unit limit guard: %', sqlerrm;
      end if;
  end;

  -- Archiving the existing unit and adding a new one is unaffected by the
  -- guard (only active-status transitions are gated) — this new insert
  -- starts archived, so it must succeed.
  insert into public.business_units (workspace_id, name, code, status)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Future Brand', 'FUTURE', 'archived');
end $$;

rollback;
