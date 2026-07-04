-- Phase 5 RLS + trigger test: Client Experience objects (Section 10.7).
--
-- Same pattern as business_architecture_rls.sql / revenue_engine_rls.sql —
-- wrapped in a transaction that rolls back at the end. Covers a
-- representative cross-section (clients -> client_offer_enrollments ->
-- onboarding_instances chain, the programs -> program_versions ->
-- program_phases chain, and sessions/client_actions) plus the new
-- program-version immutability trigger.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CE Test Tenant A', 'ce-test-tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'CE Test Tenant B', 'ce-test-tenant-b');

insert into public.workspace_members (workspace_id, user_id, status, joined_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'active', now());

insert into public.clients (id, workspace_id, status) values
  ('c0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active'),
  ('c0000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'active');

insert into public.client_offer_enrollments (id, workspace_id, client_id) values
  ('c0000000-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000001');

insert into public.onboarding_instances (id, workspace_id, client_enrollment_id) values
  ('c0000000-0000-0000-0000-000000000021', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000011');

insert into public.programs (id, workspace_id, name) values
  ('c0000000-0000-0000-0000-000000000031', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A program');

insert into public.program_versions (id, workspace_id, program_id, version, outcome) values
  ('c0000000-0000-0000-0000-000000000041', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000031', 1, 'Draft outcome');

insert into public.program_phases (id, workspace_id, program_version_id, name, sequence) values
  ('c0000000-0000-0000-0000-000000000051', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000041', 'Phase 1', 1);

insert into public.sessions (id, workspace_id, client_id, program_phase_id) values
  ('c0000000-0000-0000-0000-000000000061', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000051');

insert into public.client_actions (id, workspace_id, client_id, session_id, title) values
  ('c0000000-0000-0000-0000-000000000071', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000061', 'Tenant A action');

-- ============================================================================
-- Trigger test: published program versions are immutable
-- ============================================================================

do $$
begin
  update public.program_versions set status = 'published'
  where id = 'c0000000-0000-0000-0000-000000000041';

  begin
    update public.program_versions set outcome = 'HACKED'
    where id = 'c0000000-0000-0000-0000-000000000041';
    raise exception 'FAIL T1: published program version was editable';
  exception
    when others then
      if sqlerrm not like 'Published program versions are immutable%' then
        raise exception 'FAIL T1b: unexpected error instead of immutability guard: %', sqlerrm;
      end if;
  end;
end $$;

-- ============================================================================
-- RLS isolation
-- ============================================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.clients;
  if v_count <> 1 then raise exception 'FAIL 1: tenant A sees % clients (expected 1)', v_count; end if;

  select count(*) into v_count from public.clients where id = 'c0000000-0000-0000-0000-000000000002';
  if v_count <> 0 then raise exception 'FAIL 2: tenant A can see tenant B client by direct query'; end if;

  select count(*) into v_count from public.onboarding_instances where id = 'c0000000-0000-0000-0000-000000000021';
  if v_count <> 1 then raise exception 'FAIL 3: tenant A cannot see its own onboarding instance'; end if;

  select count(*) into v_count from public.program_versions where outcome = 'Draft outcome';
  if v_count <> 1 then raise exception 'FAIL 4: tenant A cannot see its own program version'; end if;

  select count(*) into v_count from public.client_actions where title = 'Tenant A action';
  if v_count <> 1 then raise exception 'FAIL 5: tenant A cannot see its own client action'; end if;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.clients;
  if v_count <> 1 then raise exception 'FAIL 6: tenant B sees % clients (expected 1)', v_count; end if;

  select count(*) into v_count from public.sessions;
  if v_count <> 0 then raise exception 'FAIL 7: tenant B can see tenant A sessions (expected 0, got %)', v_count; end if;

  select count(*) into v_count from public.program_versions;
  if v_count <> 0 then raise exception 'FAIL 8: tenant B can see tenant A program versions (expected 0, got %)', v_count; end if;

  update public.clients set status = 'former' where id = 'c0000000-0000-0000-0000-000000000001';
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL 9: tenant B could update tenant A client (% rows)', v_count; end if;
end $$;

reset role;
rollback;
