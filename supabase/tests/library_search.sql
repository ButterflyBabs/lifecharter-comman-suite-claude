-- Library/Search test: cross-tenant isolation on the one new table this
-- build adds (knowledge_entries), plus the new templates.template_type
-- check constraint actually rejecting an out-of-list value. Assets,
-- asset_versions, folders, tags, and templates already have their RLS
-- proven by earlier phases' isolation coverage (Phase 1) — not repeated
-- here, only what's new.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Library Tenant A', 'library-tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Library Tenant B', 'library-tenant-b');

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('e1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now()),
  ('e1000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'active', now());

insert into public.knowledge_entries (id, workspace_id, knowledge_type, title, structured_content)
values ('11110000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'policy', 'Tenant A Refund Policy', '{"body": "a"}'::jsonb);

-- ============================================================================
-- Cross-tenant isolation on knowledge_entries.
-- ============================================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.knowledge_entries where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 0 then raise exception 'FAIL 1: tenant B read tenant A''s knowledge_entries (% rows)', v_count; end if;

  update public.knowledge_entries set status = 'retired' where id = '11110000-0000-0000-0000-000000000001';
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL 2: tenant B updated tenant A''s knowledge_entries (% rows)', v_count; end if;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.knowledge_entries where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 1 then raise exception 'FAIL 3: tenant A could not read its own knowledge_entries (% rows)', v_count; end if;
end $$;

reset role;

-- ============================================================================
-- templates.template_type check constraint rejects an out-of-list value.
-- ============================================================================

do $$
begin
  begin
    insert into public.templates (workspace_id, name, template_type)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bad Template', 'not_a_real_type');
    raise exception 'FAIL 4: an invalid template_type was accepted';
  exception
    when check_violation then
      null; -- expected
  end;

  -- A valid type from the list succeeds.
  insert into public.templates (workspace_id, name, template_type)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Welcome Email', 'email_sms');
end $$;

rollback;
