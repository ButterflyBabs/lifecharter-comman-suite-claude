-- Phase 6 RLS + trigger test: Operations objects (Section 10.8).
--
-- Same pattern as business_architecture_rls.sql / revenue_engine_rls.sql /
-- client_experience_rls.sql — wrapped in a transaction that rolls back at
-- the end. Covers a representative cross-section (teams -> team_memberships
-- -> responsibilities, sops -> sop_versions, vendors -> technology_items,
-- integration_accounts) plus the automation-enable gate trigger, including
-- both the blocking cases and the positive (successfully-enabled) case.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ops Test Tenant A', 'ops-test-tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Ops Test Tenant B', 'ops-test-tenant-b');

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('d0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now()),
  ('d0000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'active', now());

insert into public.teams (id, workspace_id, name) values
  ('d0000000-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A Delivery Team');

insert into public.team_memberships (id, workspace_id, team_id, workspace_member_id) values
  ('d0000000-0000-0000-0000-000000000021', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000001');

insert into public.responsibilities (id, workspace_id, business_area, responsibility, owner_member_id, criticality) values
  ('d0000000-0000-0000-0000-000000000031', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Delivery', 'Client onboarding', 'd0000000-0000-0000-0000-000000000001', 'critical');

insert into public.sops (id, workspace_id, name) values
  ('d0000000-0000-0000-0000-000000000041', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A SOP');

insert into public.vendors (id, workspace_id, name) values
  ('d0000000-0000-0000-0000-000000000051', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A Vendor');

insert into public.technology_items (id, workspace_id, vendor_id, product) values
  ('d0000000-0000-0000-0000-000000000061', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd0000000-0000-0000-0000-000000000051', 'Tenant A Tool');

insert into public.integration_accounts (id, workspace_id, provider_id, status)
select 'd0000000-0000-0000-0000-000000000071', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, 'connected'
from public.integration_providers where adapter_code = 'stripe';

-- ============================================================================
-- Trigger test: automation enable gate
-- ============================================================================

do $$
declare
  v_automation_id uuid := 'd0000000-0000-0000-0000-000000000081';
begin
  insert into public.automation_definitions (id, workspace_id, name)
  values (v_automation_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A Automation');

  -- Blocking case 1: no owner, no idempotency strategy, no test run.
  begin
    update public.automation_definitions set enabled = true where id = v_automation_id;
    raise exception 'FAIL T1: automation was enabled with no owner/idempotency/test run';
  exception
    when others then
      if sqlerrm not like 'Cannot enable automation%no owner assigned%' then
        raise exception 'FAIL T1b: unexpected error instead of owner guard: %', sqlerrm;
      end if;
  end;

  -- Blocking case 2: owner set, but no idempotency strategy or test run.
  update public.automation_definitions set owner_user_id = '11111111-1111-1111-1111-111111111111' where id = v_automation_id;
  begin
    update public.automation_definitions set enabled = true where id = v_automation_id;
    raise exception 'FAIL T2: automation was enabled with no idempotency strategy';
  exception
    when others then
      if sqlerrm not like 'Cannot enable automation%idempotency strategy%' then
        raise exception 'FAIL T2b: unexpected error instead of idempotency guard: %', sqlerrm;
      end if;
  end;

  -- Blocking case 3: owner + idempotency strategy set, but no passing test run.
  update public.automation_definitions set idempotency_strategy = 'dedupe by external_event_id' where id = v_automation_id;
  begin
    update public.automation_definitions set enabled = true where id = v_automation_id;
    raise exception 'FAIL T3: automation was enabled with no passing test run';
  exception
    when others then
      if sqlerrm not like 'Cannot enable automation%passing test run%' then
        raise exception 'FAIL T3b: unexpected error instead of test-run guard: %', sqlerrm;
      end if;
  end;

  -- Positive case: all three conditions satisfied — enabling must succeed.
  insert into public.automation_runs (workspace_id, automation_id, status)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v_automation_id, 'test_passed');

  update public.automation_definitions set enabled = true where id = v_automation_id;

  if not (select enabled from public.automation_definitions where id = v_automation_id) then
    raise exception 'FAIL T4: automation could not be enabled once owner, idempotency strategy, and a passing test run were all present';
  end if;

  -- Audit coverage: enabling the automation must have written an audit_events row.
  if not exists (
    select 1 from public.audit_events
    where resource_type = 'automation_definitions' and resource_id = v_automation_id
  ) then
    raise exception 'FAIL T5: enabling the automation did not write an audit_events row';
  end if;
end $$;

-- ============================================================================
-- RLS isolation
-- ============================================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.teams;
  if v_count <> 1 then raise exception 'FAIL 1: tenant A sees % teams (expected 1)', v_count; end if;

  select count(*) into v_count from public.responsibilities where business_area = 'Delivery';
  if v_count <> 1 then raise exception 'FAIL 2: tenant A cannot see its own responsibility'; end if;

  select count(*) into v_count from public.vendors where name = 'Tenant A Vendor';
  if v_count <> 1 then raise exception 'FAIL 3: tenant A cannot see its own vendor'; end if;

  select count(*) into v_count from public.integration_accounts where id = 'd0000000-0000-0000-0000-000000000071';
  if v_count <> 1 then raise exception 'FAIL 4: tenant A cannot see its own integration account'; end if;

  -- Global reference data must remain readable regardless of tenant.
  select count(*) into v_count from public.integration_providers where adapter_code = 'stripe';
  if v_count <> 1 then raise exception 'FAIL 5: tenant A cannot read the global integration provider catalog'; end if;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.teams;
  if v_count <> 0 then raise exception 'FAIL 6: tenant B can see tenant A teams (expected 0, got %)', v_count; end if;

  select count(*) into v_count from public.sops;
  if v_count <> 0 then raise exception 'FAIL 7: tenant B can see tenant A SOPs (expected 0, got %)', v_count; end if;

  select count(*) into v_count from public.technology_items;
  if v_count <> 0 then raise exception 'FAIL 8: tenant B can see tenant A technology items (expected 0, got %)', v_count; end if;

  update public.vendors set status = 'terminated' where id = 'd0000000-0000-0000-0000-000000000051';
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL 9: tenant B could update tenant A vendor (% rows)', v_count; end if;
end $$;

reset role;
rollback;
