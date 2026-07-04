-- Setup-wizard bootstrap test (Phase 2 acceptance criterion "a new workspace
-- can complete setup"). Proves the workspace + workspace_members +
-- member_roles(Workspace Owner) chain created by
-- app/(app)/roadmap/setup/actions.ts actually grants the new user
-- RLS-recognized ownership — not just that the rows exist, but that the
-- admin-gated "owners and admins can update their workspace" policy accepts
-- them. Wrapped in a transaction that rolls back.

begin;

insert into auth.users (id) values ('77777777-7777-7777-7777-777777777777');

insert into public.workspaces (id, name, slug, created_by, updated_by) values
  ('88888888-8888-8888-8888-888888888888', 'Setup Test Co', 'setup-test-co', '77777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777');

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('99999999-9999-9999-9999-999999999999', '88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', 'active', now());

insert into public.member_roles (workspace_member_id, role_id)
select '99999999-9999-9999-9999-999999999999', r.id from public.roles r where r.workspace_id is null and r.name = 'Workspace Owner';

set local role authenticated;
set local request.jwt.claims to '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}';

do $$
declare
  v_ws_visible int;
  v_update_count int;
begin
  select count(*) into v_ws_visible from public.workspaces where id = '88888888-8888-8888-8888-888888888888';
  if v_ws_visible <> 1 then
    raise exception 'FAIL: new owner cannot see their own just-created workspace via RLS (count=%)', v_ws_visible;
  end if;

  update public.workspaces set name = 'Renamed Co' where id = '88888888-8888-8888-8888-888888888888';
  get diagnostics v_update_count = row_count;
  if v_update_count <> 1 then
    raise exception 'FAIL: new owner could not update their own workspace (admin-gated policy), rows affected=%', v_update_count;
  end if;
end $$;

reset role;
rollback;
