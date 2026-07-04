-- Phase 4 RLS + trigger test: Revenue Engine objects (Section 10.6).
--
-- Same pattern as business_architecture_rls.sql — wrapped in a transaction
-- that rolls back at the end. Covers a representative cross-section (people/
-- organizations, leads, the opportunities -> pipeline_stages chain, and the
-- proposals -> proposal_versions chain) plus the two real triggers this phase
-- added: opportunity stage-change history logging, and proposal-version
-- immutability once the parent proposal has been sent.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RE Test Tenant A', 're-test-tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'RE Test Tenant B', 're-test-tenant-b');

insert into public.workspace_members (workspace_id, user_id, status, joined_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'active', now());

insert into public.people (id, workspace_id, preferred_name) values
  ('c0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A person'),
  ('c0000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B person');

insert into public.organizations (id, workspace_id, name) values
  ('c0000000-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A org');

insert into public.leads (id, workspace_id, person_id, status) values
  ('c0000000-0000-0000-0000-000000000021', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000001', 'new'),
  ('c0000000-0000-0000-0000-000000000022', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'c0000000-0000-0000-0000-000000000002', 'new');

insert into public.pipeline_definitions (id, workspace_id, name) values
  ('c0000000-0000-0000-0000-000000000031', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A pipeline');

insert into public.pipeline_stages (id, workspace_id, pipeline_id, name, sequence) values
  ('c0000000-0000-0000-0000-000000000041', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000031', 'Discovery', 1),
  ('c0000000-0000-0000-0000-000000000042', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000031', 'Proposal', 2);

insert into public.opportunities (id, workspace_id, name, organization_id, pipeline_id, stage_id) values
  ('c0000000-0000-0000-0000-000000000051', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A opportunity', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000031', 'c0000000-0000-0000-0000-000000000041');

insert into public.proposals (id, workspace_id, opportunity_id, status) values
  ('c0000000-0000-0000-0000-000000000061', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000051', 'draft');

insert into public.proposal_versions (id, workspace_id, proposal_id, version, terms_summary) values
  ('c0000000-0000-0000-0000-000000000071', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000061', 1, 'Draft terms');

-- ============================================================================
-- Trigger test 1: opportunity stage change logs stage_history
--
-- Only the stage_history insert is checked here, not a stage_entered_at
-- "before vs. after" timestamp comparison — the trigger sets stage_entered_at
-- via now(), which is frozen at transaction start for this entire
-- BEGIN;...ROLLBACK; block. Two now()-derived values captured anywhere in the
-- same transaction are always equal regardless of what the trigger does, so
-- that comparison can't distinguish "trigger ran" from "trigger didn't run"
-- inside a single-transaction test. The stage_history row is sufficient proof
-- the trigger fired.
-- ============================================================================

do $$
declare
  v_count int;
begin
  update public.opportunities
  set stage_id = 'c0000000-0000-0000-0000-000000000042'
  where id = 'c0000000-0000-0000-0000-000000000051';

  select count(*) into v_count from public.stage_history
  where opportunity_id = 'c0000000-0000-0000-0000-000000000051'
    and from_stage_id = 'c0000000-0000-0000-0000-000000000041'
    and to_stage_id = 'c0000000-0000-0000-0000-000000000042';
  if v_count <> 1 then raise exception 'FAIL T1: stage change did not log exactly one stage_history row (got %)', v_count; end if;
end $$;

-- ============================================================================
-- Trigger test 2: sent proposal versions are immutable
-- ============================================================================

do $$
begin
  update public.proposals set status = 'sent', sent_at = now()
  where id = 'c0000000-0000-0000-0000-000000000061';

  begin
    update public.proposal_versions set terms_summary = 'HACKED'
    where id = 'c0000000-0000-0000-0000-000000000071';
    raise exception 'FAIL T3: sent proposal version was editable';
  exception
    when others then
      if sqlerrm not like 'Sent proposals are immutable%' then
        raise exception 'FAIL T3b: unexpected error instead of immutability guard: %', sqlerrm;
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
  select count(*) into v_count from public.people;
  if v_count <> 1 then raise exception 'FAIL 1: tenant A sees % people (expected 1)', v_count; end if;

  select count(*) into v_count from public.people where preferred_name = 'Tenant B person';
  if v_count <> 0 then raise exception 'FAIL 2: tenant A can see tenant B person by direct query'; end if;

  select count(*) into v_count from public.opportunities where name = 'Tenant A opportunity';
  if v_count <> 1 then raise exception 'FAIL 3: tenant A cannot see its own opportunity'; end if;

  select count(*) into v_count from public.proposal_versions where terms_summary = 'Draft terms';
  if v_count <> 1 then raise exception 'FAIL 4: tenant A cannot see its own proposal version'; end if;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.people;
  if v_count <> 1 then raise exception 'FAIL 5: tenant B sees % people (expected 1)', v_count; end if;

  select count(*) into v_count from public.leads where id = 'c0000000-0000-0000-0000-000000000021';
  if v_count <> 0 then raise exception 'FAIL 6: tenant B can see tenant A lead by direct query'; end if;

  select count(*) into v_count from public.opportunities;
  if v_count <> 0 then raise exception 'FAIL 7: tenant B can see tenant A opportunities (expected 0, got %)', v_count; end if;
end $$;

reset role;
rollback;
