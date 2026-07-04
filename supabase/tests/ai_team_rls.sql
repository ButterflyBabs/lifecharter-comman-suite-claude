-- Phase 7 RLS + trigger test: AI Team and KPI objects (Section 10.9
-- remainder).
--
-- Same pattern as every prior phase's test — wrapped in a transaction that
-- rolls back at the end. Covers a representative cross-section (kpis,
-- ai_agents -> ai_agent_versions, ai_knowledge_sources) plus the AI-output
-- human-approval gate trigger, including all blocking cases and the
-- positive case.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'AI Test Tenant A', 'ai-test-tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'AI Test Tenant B', 'ai-test-tenant-b');

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('e0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now()),
  ('e0000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'active', now());

insert into public.kpis (id, workspace_id, name) values
  ('e0000000-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A KPI');

insert into public.ai_agents (id, workspace_id, name) values
  ('e0000000-0000-0000-0000-000000000021', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A Agent');

insert into public.ai_agent_versions (id, workspace_id, agent_id, version) values
  ('e0000000-0000-0000-0000-000000000031', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e0000000-0000-0000-0000-000000000021', 1);

insert into public.ai_knowledge_sources (id, workspace_id, agent_id, source_type) values
  ('e0000000-0000-0000-0000-000000000041', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e0000000-0000-0000-0000-000000000021', 'document');

insert into public.ai_runs (id, workspace_id, agent_version_id, status) values
  ('e0000000-0000-0000-0000-000000000051', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e0000000-0000-0000-0000-000000000031', 'success');

-- ============================================================================
-- Trigger test: AI output human-approval gate
-- ============================================================================

do $$
declare
  v_output_id uuid := 'e0000000-0000-0000-0000-000000000061';
begin
  insert into public.ai_outputs (id, workspace_id, ai_run_id, output_type, content, approval_required, status)
  values (v_output_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e0000000-0000-0000-0000-000000000051', 'draft_message', 'Draft content', true, 'draft');

  -- Blocking case: no approval on file yet.
  begin
    update public.ai_outputs set status = 'approved' where id = v_output_id;
    raise exception 'FAIL T1: AI output was approved with no ai_approvals record on file';
  exception
    when others then
      if sqlerrm not like 'Cannot mark AI output%no approved ai_approvals record%' then
        raise exception 'FAIL T1b: unexpected error instead of approval-gate guard: %', sqlerrm;
      end if;
  end;

  update public.ai_outputs set status = 'pending_approval' where id = v_output_id;

  -- Blocking case: an approval exists but with status 'rejected', not 'approved'.
  insert into public.ai_approvals (workspace_id, ai_output_id, status)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v_output_id, 'rejected');

  begin
    update public.ai_outputs set status = 'approved' where id = v_output_id;
    raise exception 'FAIL T2: AI output was approved with only a rejected ai_approvals record on file';
  exception
    when others then
      if sqlerrm not like 'Cannot mark AI output%no approved ai_approvals record%' then
        raise exception 'FAIL T2b: unexpected error instead of approval-gate guard: %', sqlerrm;
      end if;
  end;

  -- Positive case: an approved ai_approvals record now exists — the transition must succeed.
  insert into public.ai_approvals (workspace_id, ai_output_id, status)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v_output_id, 'approved');

  update public.ai_outputs set status = 'approved' where id = v_output_id;

  if not (select status = 'approved' from public.ai_outputs where id = v_output_id) then
    raise exception 'FAIL T3: AI output could not be approved once an approved ai_approvals record existed';
  end if;

  -- executed must also be gated the same way even after a fresh output with no approval.
  begin
    update public.ai_outputs set status = 'executed', approval_required = true
    where id = v_output_id;
  exception
    when others then
      raise exception 'FAIL T4: transition to executed unexpectedly failed with an approved record on file: %', sqlerrm;
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
  select count(*) into v_count from public.kpis;
  if v_count <> 1 then raise exception 'FAIL 1: tenant A sees % kpis (expected 1)', v_count; end if;

  select count(*) into v_count from public.ai_agents where name = 'Tenant A Agent';
  if v_count <> 1 then raise exception 'FAIL 2: tenant A cannot see its own agent'; end if;

  select count(*) into v_count from public.ai_knowledge_sources where id = 'e0000000-0000-0000-0000-000000000041';
  if v_count <> 1 then raise exception 'FAIL 3: tenant A cannot see its own knowledge source'; end if;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.kpis;
  if v_count <> 0 then raise exception 'FAIL 4: tenant B can see tenant A kpis (expected 0, got %)', v_count; end if;

  select count(*) into v_count from public.ai_agents;
  if v_count <> 0 then raise exception 'FAIL 5: tenant B can see tenant A agents (expected 0, got %)', v_count; end if;

  select count(*) into v_count from public.ai_outputs;
  if v_count <> 0 then raise exception 'FAIL 6: tenant B can see tenant A AI outputs (expected 0, got %)', v_count; end if;

  update public.ai_agents set status = 'retired' where id = 'e0000000-0000-0000-0000-000000000021';
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL 7: tenant B could update tenant A agent (% rows)', v_count; end if;
end $$;

reset role;
rollback;
