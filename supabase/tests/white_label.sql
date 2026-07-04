-- White-label test: workspace_domains follows the standard workspace-
-- isolation pattern (unlike the marketplace/benchmarking, nothing here is
-- meant to be cross-tenant-visible) — proves cross-tenant read isolation,
-- admin-gated writes, and the global domain-uniqueness constraint that
-- prevents two workspaces from claiming the same domain.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'White-Label Tenant A', 'wl-tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'White-Label Tenant B', 'wl-tenant-b');

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('e1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now()),
  ('e1000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'active', now()),
  ('e1000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'active', now());

insert into public.member_roles (workspace_member_id, role_id)
select 'e1000000-0000-0000-0000-000000000001', id from public.roles where workspace_id is null and name = 'Workspace Owner';
insert into public.member_roles (workspace_member_id, role_id)
select 'e1000000-0000-0000-0000-000000000002', id from public.roles where workspace_id is null and name = 'Workspace Owner';

insert into public.workspace_domains (id, workspace_id, domain) values
  ('d1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'portal.tenant-a.example');

-- ============================================================================
-- Tenant B cannot see tenant A's domain (standard isolation, not a
-- marketplace-style cross-tenant read).
-- ============================================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.workspace_domains where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 0 then raise exception 'FAIL 1: tenant B could read tenant A''s domain (% rows)', v_count; end if;

  -- Tenant B also cannot claim tenant A's already-registered domain — the
  -- unique constraint blocks it regardless of which workspace tries.
  begin
    insert into public.workspace_domains (workspace_id, domain) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'portal.tenant-a.example');
    raise exception 'FAIL 2: tenant B claimed a domain already registered to tenant A';
  exception
    when unique_violation then
      null; -- expected
  end;
end $$;

reset role;

-- ============================================================================
-- A plain member of tenant A (not Workspace Owner/Administrator) cannot
-- add a domain — admin-gated, same pattern as business_units.
-- ============================================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  -- A plain member can still read tenant A's own domain (broad read policy).
  select count(*) into v_count from public.workspace_domains where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 1 then raise exception 'FAIL 3: a plain member of tenant A could not read its own domain (% rows)', v_count; end if;

  -- INSERT under RLS raises a policy-violation error rather than silently
  -- affecting 0 rows (unlike UPDATE/DELETE against hidden rows), so this
  -- must be caught, not checked via row_count.
  begin
    insert into public.workspace_domains (workspace_id, domain) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'second.tenant-a.example');
    raise exception 'FAIL 4: a plain member added a domain despite not being an owner/admin';
  exception
    when insufficient_privilege then
      null; -- expected
  end;
end $$;

reset role;

-- ============================================================================
-- The Workspace Owner can add a second domain for their own workspace.
-- ============================================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  insert into public.workspace_domains (workspace_id, domain) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'second.tenant-a.example');
  select count(*) into v_count from public.workspace_domains where workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 2 then raise exception 'FAIL 5: Workspace Owner could not add a second domain for their own workspace (% rows)', v_count; end if;
end $$;

reset role;
rollback;
