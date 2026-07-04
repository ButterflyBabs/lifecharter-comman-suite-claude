-- Settings/Users test: seat-limit trigger (enforce_seat_limit), mirroring
-- Phase 8's automation-enable-gate and ai-run-usage-counter test pattern.
--
-- Covers: no subscription -> unrestricted; an active subscription with a
-- concrete seat limit -> blocked once the limit is reached; and the
-- existing "owners and admins can manage membership" RLS policy already
-- granting a Workspace Owner direct INSERT/UPDATE on workspace_members
-- (confirming the settings/users actions don't need the admin client for
-- anything except the actual auth.users creation step, which this SQL-only
-- test can't exercise).

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Seat Test Tenant A', 'seat-test-tenant-a');

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('e1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now());

insert into public.member_roles (workspace_member_id, role_id)
select 'e1000000-0000-0000-0000-000000000001', id from public.roles where workspace_id is null and name = 'Workspace Owner';

-- ============================================================================
-- No subscription yet: adding members is unrestricted.
-- ============================================================================

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at)
values ('e1000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'active', now());

-- ============================================================================
-- Active subscription with a concrete seat limit of 2: the third member
-- (already 2 active) must be blocked.
-- ============================================================================

do $$
declare
  v_plan_id uuid;
begin
  select id into v_plan_id from public.subscription_plans where code = 'solo';

  insert into public.workspace_subscriptions (workspace_id, plan_id, status)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v_plan_id, 'active');

  -- solo's seed limit_value for 'seats' is 1, but we already have 2 active
  -- members from before the subscription existed — confirm a third insert
  -- is blocked regardless (the gate checks the count at insert time, not
  -- retroactively demoting existing members).
  begin
    insert into public.workspace_members (workspace_id, user_id, status, joined_at)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'active', now());
    raise exception 'FAIL T1: a third member was added despite the plan seat limit being met';
  exception
    when others then
      if sqlerrm not like 'Cannot add member: plan limit of % seats reached' then
        raise exception 'FAIL T1b: unexpected error instead of seat-limit guard: %', sqlerrm;
      end if;
  end;

  -- An invited-status insert is gated the same way as active.
  begin
    insert into public.workspace_members (workspace_id, user_id, status, invited_email)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'invited', 'blocked@example.com');
    raise exception 'FAIL T2: an invited-status member was added despite the plan seat limit being met';
  exception
    when others then
      if sqlerrm not like 'Cannot add member: plan limit of % seats reached' then
        raise exception 'FAIL T2b: unexpected error instead of seat-limit guard: %', sqlerrm;
      end if;
  end;
end $$;

-- ============================================================================
-- RLS: owners/admins can manage membership directly (no admin client needed
-- for anything but auth.users creation).
-- ============================================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  update public.workspace_members set access_review_at = current_date + interval '90 days'
  where id = 'e1000000-0000-0000-0000-000000000002';
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'FAIL 3: Workspace Owner could not set access_review_at directly via RLS (% rows)', v_count; end if;

  select count(*) into v_count from public.workspace_members where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 2 then raise exception 'FAIL 4: expected 2 members visible (both blocked inserts should have rolled back), got %', v_count; end if;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  -- A plain member (not owner/admin) cannot change another member's status.
  update public.workspace_members set status = 'suspended' where id = 'e1000000-0000-0000-0000-000000000001';
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL 5: a plain member could suspend the Workspace Owner (% rows)', v_count; end if;
end $$;

reset role;
rollback;
