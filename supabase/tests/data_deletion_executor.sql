-- Data deletion executor test: proves private.run_data_deletion_executor()
-- only purges a workspace whose deletion request is due today (or
-- overdue) and not canceled, that a future-scheduled or canceled request
-- is left untouched, that the workspace's data actually cascades away
-- (not just the workspaces row), and that deletion_execution_log
-- survives the cascade as the permanent record deletion happened — the
-- entire reason that table exists with no FK to workspaces at all.
--
-- Always run inside begin/rollback. This function is destructive by
-- design; it must never be invoked outside a transaction that gets
-- rolled back, in this test file or anywhere else.

begin;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');

-- Tenant A: deletion due today (scheduled_for = current_date) — should
-- be executed.
insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Deletion Test Tenant A', 'deletion-test-tenant-a');
insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('e1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now());
insert into public.data_deletion_requests (id, workspace_id, requested_by, status, scheduled_for) values
  ('f0100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'scheduled', current_date);

-- Tenant B: deletion scheduled for the future — should NOT be executed.
insert into public.workspaces (id, name, slug) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Deletion Test Tenant B', 'deletion-test-tenant-b');
insert into public.data_deletion_requests (id, workspace_id, requested_by, status, scheduled_for) values
  ('f0100000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'scheduled', current_date + interval '10 days');

-- Tenant C: deletion was due today but canceled — should NOT be executed.
insert into public.workspaces (id, name, slug) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Deletion Test Tenant C', 'deletion-test-tenant-c');
insert into public.data_deletion_requests (id, workspace_id, requested_by, status, scheduled_for, canceled_at) values
  ('f0100000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'canceled', current_date, now());

do $$
declare
  v_count int;
begin
  perform private.run_data_deletion_executor();

  -- Tenant A: the workspace and its member row are both gone (cascade
  -- actually reached child tables, not just the workspaces row).
  select count(*) into v_count from public.workspaces where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 0 then raise exception 'FAIL 1: tenant A workspace was not deleted (% rows)', v_count; end if;

  select count(*) into v_count from public.workspace_members where id = 'e1000000-0000-0000-0000-000000000001';
  if v_count <> 0 then raise exception 'FAIL 2: tenant A workspace_members row survived the cascade (% rows)', v_count; end if;

  -- The original request row is gone too (cascaded with the workspace),
  -- but deletion_execution_log survives as the permanent record.
  select count(*) into v_count from public.data_deletion_requests where id = 'f0100000-0000-0000-0000-000000000001';
  if v_count <> 0 then raise exception 'FAIL 3: the original deletion request row survived (should have cascaded, % rows)', v_count; end if;

  select count(*) into v_count from public.deletion_execution_log
  where original_request_id = 'f0100000-0000-0000-0000-000000000001'
  and workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  and workspace_name = 'Deletion Test Tenant A';
  if v_count <> 1 then raise exception 'FAIL 4: deletion_execution_log did not record tenant A''s deletion (% rows)', v_count; end if;

  -- Tenant B: untouched — scheduled for the future.
  select count(*) into v_count from public.workspaces where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if v_count <> 1 then raise exception 'FAIL 5: tenant B (future-scheduled) was deleted early'; end if;

  -- Tenant C: untouched — canceled, even though scheduled_for was today.
  select count(*) into v_count from public.workspaces where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  if v_count <> 1 then raise exception 'FAIL 6: tenant C (canceled request) was deleted anyway'; end if;

  -- Second run is a no-op — no new log rows for tenant A (already gone,
  -- nothing left to match the executor's query).
  perform private.run_data_deletion_executor();
  select count(*) into v_count from public.deletion_execution_log where original_request_id = 'f0100000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 7: a second run duplicated the log entry (% rows, expected 1)', v_count; end if;

  raise notice 'ALL TESTS PASSED';
end $$;

rollback;
