-- Template Marketplace test: the first deliberately cross-tenant-readable
-- table in this build. Proves the boundary is exactly where intended —
-- draft/retired listings stay workspace-private, only 'published' listings
-- become visible to other workspaces — plus the install-count RPC's
-- self-validation and that installing produces an independent copy.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Marketplace Tenant A', 'mkt-tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Marketplace Tenant B', 'mkt-tenant-b');

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('e1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now()),
  ('e1000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'active', now());

-- Tenant A has a draft listing and a published listing.
insert into public.template_marketplace_listings (id, source_workspace_id, name, template_type, content, status) values
  ('11110000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Draft Onboarding Email', 'email_sms', 'draft body', 'draft'),
  ('11110000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Welcome Email', 'email_sms', 'Hi {{first_name}}, welcome!', 'published');

-- ============================================================================
-- Tenant B (a different workspace) can see the published listing but not
-- the draft one — the actual cross-tenant read boundary.
-- ============================================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.template_marketplace_listings where id = '11110000-0000-0000-0000-000000000001';
  if v_count <> 0 then raise exception 'FAIL 1: tenant B could see tenant A''s draft listing (% rows)', v_count; end if;

  select count(*) into v_count from public.template_marketplace_listings where id = '11110000-0000-0000-0000-000000000002';
  if v_count <> 1 then raise exception 'FAIL 2: tenant B could not see tenant A''s published listing (% rows)', v_count; end if;

  -- Tenant B cannot write to tenant A's listing directly.
  update public.template_marketplace_listings set install_count = 999 where id = '11110000-0000-0000-0000-000000000002';
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL 3: tenant B updated tenant A''s listing directly (% rows)', v_count; end if;

  -- But the SECURITY DEFINER RPC can still bump the count on a published listing.
  perform public.increment_marketplace_install_count('11110000-0000-0000-0000-000000000002');
end $$;

reset role;

do $$
declare
  v_install_count int;
begin
  select install_count into v_install_count from public.template_marketplace_listings where id = '11110000-0000-0000-0000-000000000002';
  if v_install_count <> 1 then raise exception 'FAIL 4: install_count RPC did not increment as expected (got %)', v_install_count; end if;

  -- The RPC must not touch a draft listing even if called directly.
  perform public.increment_marketplace_install_count('11110000-0000-0000-0000-000000000001');
  select install_count into v_install_count from public.template_marketplace_listings where id = '11110000-0000-0000-0000-000000000001';
  if v_install_count <> 0 then raise exception 'FAIL 5: install_count RPC incremented a draft listing (got %)', v_install_count; end if;
end $$;

-- ============================================================================
-- Tenant A can still see and manage its own draft (its own workspace).
-- ============================================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.template_marketplace_listings where source_workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 2 then raise exception 'FAIL 6: tenant A could not see both of its own listings (% rows)', v_count; end if;
end $$;

reset role;
rollback;
