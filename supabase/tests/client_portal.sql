-- Client portal test: proves a portal user (no workspace_members row at
-- all) can read only their own client's client_visible data, nothing from
-- a sibling client in the same workspace, nothing from another workspace,
-- and — critically — cannot read the base sessions/workspaces tables
-- directly (only through the client_portal_sessions/client_portal_branding
-- views), which is what makes the security-definer views safe: there is no
-- policy at all granting a portal user rows on those two base tables.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'), -- workspace A owner
  ('22222222-2222-2222-2222-222222222222'), -- portal user for client A1
  ('33333333-3333-3333-3333-333333333333'); -- portal user for client B1 (other workspace)

insert into public.workspaces (id, name, slug, client_portal_display_name, client_portal_primary_color) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Portal Test Tenant A', 'portal-test-tenant-a', 'Coach A Brand', '#112233'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Portal Test Tenant B', 'portal-test-tenant-b', null, null);

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('e1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now());

insert into public.clients (id, workspace_id, status, start_at) values
  ('c0100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active', now()), -- A1
  ('c0100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active', now()), -- A2 (sibling client, same workspace)
  ('c0100000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'active', now()); -- B1 (other workspace)

insert into public.client_portal_access (id, workspace_id, client_id, user_id, status) values
  ('d0100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'active'),
  ('d0100000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'c0100000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'active');

insert into public.client_actions (id, workspace_id, client_id, title, status, client_visible) values
  ('e0100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000001', 'Visible action for A1', 'open', true),
  ('e0100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000001', 'Coach-only action for A1', 'open', false),
  ('e0100000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000002', 'Visible action for A2', 'open', true);

insert into public.deliverables (id, workspace_id, client_id, title, status) values
  ('f0100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000001', 'Deliverable for A1', 'pending'),
  ('f0100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000002', 'Deliverable for A2', 'pending');

insert into public.client_milestones (id, workspace_id, client_id, title, status) values
  ('10100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000001', 'Milestone for A1', 'planned'),
  ('10100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000002', 'Milestone for A2', 'planned');

insert into public.metrics (id, workspace_id, name, unit, direction, collection_method, client_visible) values
  ('20100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Visible Metric', 'count', 'increase', 'manual', true),
  ('20100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Internal Metric', 'count', 'increase', 'manual', false);

insert into public.client_metric_values (id, workspace_id, client_id, metric_id, measured_at, value) values
  ('30100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000001', '20100000-0000-0000-0000-000000000001', now(), 5),
  ('30100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000001', '20100000-0000-0000-0000-000000000002', now(), 9),
  ('30100000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000002', '20100000-0000-0000-0000-000000000001', now(), 7);

insert into public.sessions (id, workspace_id, client_id, scheduled_at, status, client_summary) values
  ('40100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000001', now(), 'completed', 'Great progress this week!'),
  ('40100000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000001', now(), 'completed', null),
  ('40100000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000002', now(), 'completed', 'Summary for A2');

set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  -- Own access row is readable.
  select count(*) into v_count from public.client_portal_access where user_id = '22222222-2222-2222-2222-222222222222';
  if v_count <> 1 then raise exception 'FAIL 1: portal user could not read their own access row (% rows)', v_count; end if;

  -- Visible action for own client: 1 row. Non-visible action for own
  -- client: 0 rows. Sibling client A2's action: 0 rows regardless of
  -- client_visible.
  select count(*) into v_count from public.client_actions where id = 'e0100000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 2: portal user could not read their own visible action'; end if;
  select count(*) into v_count from public.client_actions where client_id = 'c0100000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 3: portal user saw % actions for their own client, expected exactly 1 (non-visible one leaked)', v_count; end if;
  select count(*) into v_count from public.client_actions where client_id = 'c0100000-0000-0000-0000-000000000002';
  if v_count <> 0 then raise exception 'FAIL 4: portal user read sibling client A2''s actions (% rows)', v_count; end if;

  -- Deliverables and milestones: own client visible, sibling client not.
  select count(*) into v_count from public.deliverables where client_id = 'c0100000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 5: portal user could not read their own deliverable'; end if;
  select count(*) into v_count from public.deliverables where client_id = 'c0100000-0000-0000-0000-000000000002';
  if v_count <> 0 then raise exception 'FAIL 6: portal user read sibling client A2''s deliverables (% rows)', v_count; end if;

  select count(*) into v_count from public.client_milestones where client_id = 'c0100000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 7: portal user could not read their own milestone'; end if;
  select count(*) into v_count from public.client_milestones where client_id = 'c0100000-0000-0000-0000-000000000002';
  if v_count <> 0 then raise exception 'FAIL 8: portal user read sibling client A2''s milestones (% rows)', v_count; end if;

  -- Metric values: only the client_visible metric's value for their own
  -- client (2 rows exist for A1, only 1 has a client_visible metric).
  select count(*) into v_count from public.client_metric_values where client_id = 'c0100000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 9: portal user saw % metric values for their own client, expected exactly 1 (internal metric leaked)', v_count; end if;
  select count(*) into v_count from public.client_metric_values where client_id = 'c0100000-0000-0000-0000-000000000002';
  if v_count <> 0 then raise exception 'FAIL 10: portal user read sibling client A2''s metric values (% rows)', v_count; end if;

  -- Session summaries via the view: only their own client's session that
  -- actually has a client_summary (1 of 2 for A1; A2's is invisible).
  select count(*) into v_count from public.client_portal_sessions where client_id = 'c0100000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 11: portal user saw % session summaries for their own client, expected exactly 1', v_count; end if;
  select count(*) into v_count from public.client_portal_sessions where client_id = 'c0100000-0000-0000-0000-000000000002';
  if v_count <> 0 then raise exception 'FAIL 12: portal user read sibling client A2''s session summary (% rows)', v_count; end if;

  -- The base sessions table is not readable at all by a portal user —
  -- this is what makes exposing internal_notes/agenda impossible even via
  -- a direct API call bypassing the view.
  select count(*) into v_count from public.sessions where client_id = 'c0100000-0000-0000-0000-000000000001';
  if v_count <> 0 then raise exception 'FAIL 13: portal user read the base sessions table directly (% rows) — internal_notes would leak', v_count; end if;

  -- Branding view: their own workspace only.
  select count(*) into v_count from public.client_portal_branding where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 1 then raise exception 'FAIL 14: portal user could not read their own workspace''s branding'; end if;
  select count(*) into v_count from public.client_portal_branding where workspace_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if v_count <> 0 then raise exception 'FAIL 15: portal user read another workspace''s branding (% rows)', v_count; end if;

  -- The base workspaces table is not readable directly either.
  select count(*) into v_count from public.workspaces where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 0 then raise exception 'FAIL 16: portal user read the base workspaces table directly (% rows)', v_count; end if;

  -- record_portal_login() only touches the caller's own row.
  perform public.record_portal_login();
  select count(*) into v_count from public.client_portal_access where id = 'd0100000-0000-0000-0000-000000000001' and last_login_at is not null;
  if v_count <> 1 then raise exception 'FAIL 17: record_portal_login() did not update the caller''s own last_login_at'; end if;
  select count(*) into v_count from public.client_portal_access where id = 'd0100000-0000-0000-0000-000000000002' and last_login_at is not null;
  if v_count <> 0 then raise exception 'FAIL 18: record_portal_login() updated a different portal user''s row'; end if;
end $$;

reset role;
rollback;
