-- Multi-brand scoping test: proves the enforce_business_unit_same_workspace
-- trigger blocks attributing a record to another workspace's business
-- unit, and that a record can be attributed to a business unit in its own
-- workspace. Not an RLS test — no new read-isolation boundary was added
-- (business_unit_id is just a new attribute inside the existing
-- workspace_id tenant boundary) — this proves the data-integrity guard.

begin;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MB Test Tenant A', 'mb-test-tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'MB Test Tenant B', 'mb-test-tenant-b');

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('e1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now());

insert into public.member_roles (workspace_member_id, role_id)
select 'e1000000-0000-0000-0000-000000000001', id from public.roles where workspace_id is null and name = 'Workspace Owner';

insert into public.business_units (id, workspace_id, name, code) values
  ('b0100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A Brand', 'TAB'),
  ('b0100000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B Brand', 'TBB');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  -- A client can be attributed to a business unit belonging to its own
  -- workspace.
  insert into public.clients (id, workspace_id, business_unit_id, status, start_at)
  values ('c0100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b0100000-0000-0000-0000-000000000001', 'onboarding', now());

  select count(*) into v_count from public.clients where id = 'c0100000-0000-0000-0000-000000000001' and business_unit_id = 'b0100000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 1: client could not be attributed to its own workspace''s business unit'; end if;

  -- A client cannot be attributed to another workspace's business unit —
  -- the trigger raises before RLS's own WITH CHECK is even reached.
  begin
    insert into public.clients (id, workspace_id, business_unit_id, status, start_at)
    values ('c0100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b0100000-0000-0000-0000-000000000002', 'onboarding', now());
    raise exception 'FAIL 2: client was attributed to another workspace''s business unit';
  exception
    when others then
      if sqlerrm not like '%must belong to the same workspace%' then
        raise exception 'FAIL 2: unexpected error instead of the same-workspace guard: %', sqlerrm;
      end if;
  end;

  -- Updating an existing client to point at another workspace's business
  -- unit is blocked the same way (the trigger fires on UPDATE too).
  begin
    update public.clients set business_unit_id = 'b0100000-0000-0000-0000-000000000002' where id = 'c0100000-0000-0000-0000-000000000001';
    raise exception 'FAIL 3: client update was attributed to another workspace''s business unit';
  exception
    when others then
      if sqlerrm not like '%must belong to the same workspace%' then
        raise exception 'FAIL 3: unexpected error instead of the same-workspace guard: %', sqlerrm;
      end if;
  end;

  -- business_unit_id can be cleared back to null (unassigning is always fine).
  update public.clients set business_unit_id = null where id = 'c0100000-0000-0000-0000-000000000001';
  select count(*) into v_count from public.clients where id = 'c0100000-0000-0000-0000-000000000001' and business_unit_id is null;
  if v_count <> 1 then raise exception 'FAIL 4: could not clear business_unit_id back to null'; end if;
end $$;

reset role;
rollback;
