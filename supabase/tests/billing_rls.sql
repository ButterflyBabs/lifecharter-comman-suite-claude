-- Phase 8 RLS test: Billing, Entitlements, and Data Governance objects.
--
-- Same pattern as every prior phase's test — wrapped in a transaction that
-- rolls back at the end. Covers cross-tenant isolation, the "no
-- authenticated write" restriction on workspace_subscriptions (mirroring
-- the workspaces table itself), the admin-only insert restriction on
-- data_deletion_requests, the open-to-all-members insert on
-- data_export_requests, the global readability of plan reference data, and
-- confirms billing_webhook_events is completely inaccessible to the
-- authenticated role (service-role only, by design).

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Billing Test Tenant A', 'billing-test-tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Billing Test Tenant B', 'billing-test-tenant-b');

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('f0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now()),
  ('f0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'active', now()),
  ('f0000000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'active', now());

-- Tenant A's user 1 (11111111...) is Workspace Owner; user 3 (33333333...) is a plain member.
insert into public.member_roles (workspace_member_id, role_id)
select 'f0000000-0000-0000-0000-000000000001', id from public.roles where workspace_id is null and name = 'Workspace Owner';

insert into public.workspace_subscriptions (id, workspace_id, status)
values ('f0000000-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active');

insert into public.usage_counters (workspace_id, entitlement_key, period_start, period_end, current_value)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'seats', '2026-07-01', '2026-07-31', 2);

-- ============================================================================
-- RLS isolation and write-restriction checks
-- ============================================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  -- Global plan reference data is readable regardless of tenant.
  select count(*) into v_count from public.subscription_plans;
  if v_count <> 3 then raise exception 'FAIL 1: expected 3 seeded plans visible, got %', v_count; end if;

  select count(*) into v_count from public.plan_entitlements;
  if v_count <> 12 then raise exception 'FAIL 2: expected 12 seeded entitlements visible, got %', v_count; end if;

  -- Tenant A owner can read its own subscription and usage.
  select count(*) into v_count from public.workspace_subscriptions where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 1 then raise exception 'FAIL 3: tenant A cannot read its own subscription'; end if;

  select count(*) into v_count from public.usage_counters where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 1 then raise exception 'FAIL 4: tenant A cannot read its own usage counter'; end if;

  -- No authenticated role can write workspace_subscriptions directly, even the
  -- owner — there is no UPDATE policy at all, so RLS's implicit USING(false)
  -- means the row is simply not matched (0 rows), not an exception.
  update public.workspace_subscriptions set status = 'canceled' where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL 5: an authenticated user (even Workspace Owner) could write workspace_subscriptions directly (% rows)', v_count; end if;

  -- billing_webhook_events is completely inaccessible to authenticated users.
  select count(*) into v_count from public.billing_webhook_events;
  if v_count <> 0 then raise exception 'FAIL 6: authenticated role can read billing_webhook_events (expected 0 rows via RLS)'; end if;

  -- Owner CAN request a workspace export.
  insert into public.data_export_requests (workspace_id, requested_by)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111');

  -- Owner CAN request workspace deletion (admin-gated insert).
  insert into public.data_deletion_requests (workspace_id, requested_by, reason, status, scheduled_for)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'test', 'scheduled', current_date + interval '30 days');
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  -- A plain member (not owner/admin) CAN request an export...
  insert into public.data_export_requests (workspace_id, requested_by)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333');

  -- ...but CANNOT request a deletion (admin-gated).
  begin
    insert into public.data_deletion_requests (workspace_id, requested_by, status)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'pending');
    raise exception 'FAIL 7: a plain member was able to request workspace deletion (admin-only action)';
  exception
    when insufficient_privilege then null; -- expected: WITH CHECK fails for non-owner/admin
  end;

  select count(*) into v_count from public.data_export_requests where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 2 then raise exception 'FAIL 8: expected 2 export requests on tenant A, got %', v_count; end if;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.workspace_subscriptions where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 0 then raise exception 'FAIL 9: tenant B can see tenant A subscription (expected 0, got %)', v_count; end if;

  select count(*) into v_count from public.usage_counters where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 0 then raise exception 'FAIL 10: tenant B can see tenant A usage counters (expected 0, got %)', v_count; end if;

  select count(*) into v_count from public.data_export_requests where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 0 then raise exception 'FAIL 11: tenant B can see tenant A export requests (expected 0, got %)', v_count; end if;

  select count(*) into v_count from public.data_deletion_requests where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 0 then raise exception 'FAIL 12: tenant B can see tenant A deletion requests (expected 0, got %)', v_count; end if;
end $$;

reset role;
rollback;
