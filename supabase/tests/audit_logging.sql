-- Audit logging test (Section 11.6: membership and role changes must be
-- audited). Wrapped in a transaction that rolls back — no state persists.

begin;

insert into auth.users (id) values ('55555555-5555-5555-5555-555555555555');
insert into public.workspaces (id, name, slug) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Audit Test WS', 'audit-test-ws');
insert into public.workspace_members (id, workspace_id, user_id, status) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'active');
update public.workspace_members set status = 'suspended' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.audit_events
  where resource_type = 'workspace_members' and resource_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  if v_count <> 2 then
    raise exception 'FAIL: expected 2 audit_events (insert+update), got %', v_count;
  end if;
end $$;

rollback;
