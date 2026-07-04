-- Roadmap stage-gate enforcement test (Section 3 "Stage gates have meaning" /
-- Phase 2 acceptance criterion "the system prevents progression when a
-- blocking gate is incomplete"). Wrapped in a transaction that rolls back.
--
-- Covers:
--   1. A milestone with a blocking evidence-required gate cannot be marked
--      done without approved completion_evidence.
--   2. A phase cannot be marked complete while any of its milestones aren't done.
--   3. Once evidence is attached, the milestone CAN be marked done (gate
--      doesn't over-block).
--   4. Once all milestones are done, the phase CAN be marked complete.

begin;

insert into auth.users (id) values ('66666666-6666-6666-6666-666666666666');
insert into public.workspaces (id, name, slug) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Gate Test WS', 'gate-test-ws');
insert into public.workspace_members (workspace_id, user_id, status) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '66666666-6666-6666-6666-666666666666', 'active');

insert into public.roadmap_instances (id, workspace_id) values
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
insert into public.roadmap_phases (id, workspace_id, roadmap_instance_id, name, sequence) values
  ('11110000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Phase 1', 1);
insert into public.roadmap_milestones (id, workspace_id, phase_id, title, status) values
  ('22220000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11110000-0000-0000-0000-000000000001', 'Milestone A', 'in_progress'),
  ('22220000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11110000-0000-0000-0000-000000000001', 'Milestone B', 'in_progress');

insert into public.stage_gates (id, workspace_id, name, context_type, context_id, rule_mode) values
  ('33330000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Milestone A evidence gate', 'roadmap_milestone', '22220000-0000-0000-0000-000000000001', 'blocking');
insert into public.gate_requirements (workspace_id, stage_gate_id, requirement_type, blocking) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33330000-0000-0000-0000-000000000001', 'evidence_required', true);

do $$
begin
  begin
    update public.roadmap_milestones set status = 'done' where id = '22220000-0000-0000-0000-000000000001';
    raise exception 'FAIL 1: milestone A was marked done without evidence (gate did not block)';
  exception
    when sqlstate 'P0001' then
      if sqlerrm not like 'Blocking gate incomplete%' then
        raise;
      end if;
  end;
end $$;

do $$
begin
  begin
    update public.roadmap_phases set status = 'complete' where id = '11110000-0000-0000-0000-000000000001';
    raise exception 'FAIL 2: phase was marked complete with incomplete milestones (gate did not block)';
  exception
    when sqlstate 'P0001' then
      if sqlerrm not like 'Blocking gate incomplete%' then
        raise;
      end if;
  end;
end $$;

insert into public.completion_evidence (workspace_id, subject_type, subject_id, evidence_type, approved_by) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'roadmap_milestone', '22220000-0000-0000-0000-000000000001', 'note', '66666666-6666-6666-6666-666666666666');

update public.roadmap_milestones set status = 'done' where id = '22220000-0000-0000-0000-000000000001';
update public.roadmap_milestones set status = 'done' where id = '22220000-0000-0000-0000-000000000002';

do $$
declare
  v_status text;
begin
  select status into v_status from public.roadmap_milestones where id = '22220000-0000-0000-0000-000000000001';
  if v_status <> 'done' then
    raise exception 'FAIL 3: milestone A should now be done with evidence attached, got %', v_status;
  end if;
end $$;

update public.roadmap_phases set status = 'complete' where id = '11110000-0000-0000-0000-000000000001';

do $$
declare
  v_status text;
begin
  select status into v_status from public.roadmap_phases where id = '11110000-0000-0000-0000-000000000001';
  if v_status <> 'complete' then
    raise exception 'FAIL 4: phase should now be complete, got %', v_status;
  end if;
end $$;

rollback;
