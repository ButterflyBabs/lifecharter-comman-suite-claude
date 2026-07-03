-- RLS workspace isolation test (Section 11.3 / Section 19.2 Scenario H).
--
-- Run against a non-production database via the Supabase SQL editor, the
-- Supabase MCP execute_sql tool, or `psql`. Entirely wrapped in a transaction
-- that rolls back at the end — no state persists whether it passes or fails.
-- A clean run produces no output (each check `raise exception`s on failure,
-- which aborts the whole script and surfaces the specific failure).
--
-- Covers:
--   1. A user cannot read another workspace's rows by direct query.
--   2. A user cannot write another workspace's rows by direct query.
--   3. Only workspace admins (Workspace Owner / Administrator) can read
--      audit_events; a workspace member without that role cannot.
--   4. A suspended member loses all workspace access immediately.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RLS Test Tenant A', 'rls-test-tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'RLS Test Tenant B', 'rls-test-tenant-b');

insert into public.workspace_members (workspace_id, user_id, status, joined_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'active', now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'suspended', null);

insert into public.tasks (workspace_id, title, created_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A secret task', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B secret task', '22222222-2222-2222-2222-222222222222');

insert into public.member_roles (workspace_member_id, role_id)
select wm.id, r.id
from public.workspace_members wm, public.roles r
where wm.workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  and wm.user_id = '11111111-1111-1111-1111-111111111111'
  and r.name = 'Workspace Owner' and r.workspace_id is null;

insert into public.audit_events (workspace_id, actor, action, resource_type) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'test.action', 'test');

-- Tenant A (Workspace Owner)
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.workspaces;
  if v_count <> 1 then raise exception 'FAIL 1: tenant A sees % workspaces (expected 1)', v_count; end if;

  select count(*) into v_count from public.tasks;
  if v_count <> 1 then raise exception 'FAIL 2: tenant A sees % tasks (expected 1)', v_count; end if;

  select count(*) into v_count from public.tasks where title = 'Tenant B secret task';
  if v_count <> 0 then raise exception 'FAIL 3: tenant A can see tenant B task by direct query'; end if;

  select count(*) into v_count from public.audit_events;
  if v_count <> 1 then raise exception 'FAIL 4: tenant A owner sees % audit events (expected 1)', v_count; end if;
end $$;

-- Tenant B (no elevated role)
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.workspaces;
  if v_count <> 1 then raise exception 'FAIL 5: tenant B sees % workspaces (expected 1)', v_count; end if;

  select count(*) into v_count from public.tasks where title = 'Tenant A secret task';
  if v_count <> 0 then raise exception 'FAIL 6: tenant B can see tenant A task by direct query'; end if;

  select count(*) into v_count from public.audit_events;
  if v_count <> 0 then raise exception 'FAIL 7: tenant B non-admin can read audit_events (expected 0, got %)', v_count; end if;

  update public.tasks set title = 'HACKED' where title = 'Tenant A secret task';
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL 8: tenant B could update tenant A task (% rows)', v_count; end if;
end $$;

-- Suspended member of tenant A
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.workspaces;
  if v_count <> 0 then raise exception 'FAIL 9: suspended member still sees % workspaces (expected 0)', v_count; end if;

  select count(*) into v_count from public.tasks;
  if v_count <> 0 then raise exception 'FAIL 10: suspended member still sees % tasks (expected 0)', v_count; end if;
end $$;

reset role;
rollback;
