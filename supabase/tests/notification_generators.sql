-- Notification generator test: proves private.run_notification_sweep()
-- actually inserts notifications for real trigger conditions, respects a
-- user's explicit opt-out, doesn't duplicate on repeated runs, and fans a
-- workspace-wide condition (failed payment) out to every admin. Not an
-- RLS test — the sweep runs as a scheduled job, not through the
-- PostgREST/RLS-scoped path — but the notifications it creates are real
-- rows a user reads through the ordinary RLS-scoped client afterward.
--
-- Originally only exercised 2 of the 13 named trigger types directly
-- (task_overdue, payment_failed_or_overdue), with the other 11 "reviewed,
-- not proven" against real seeded data (see docs/testing.md's Notification
-- Generators Test Status). The setup and checks below add real seeded
-- data for the remaining 11, closing that gap.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'), -- Workspace Owner (opted out of task_overdue)
  ('22222222-2222-2222-2222-222222222222'), -- Administrator (default prefs)
  ('33333333-3333-3333-3333-333333333333'); -- task owner

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Notify Test Tenant', 'notify-test-tenant');

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('e1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now()),
  ('e1000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'active', now()),
  ('e1000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'active', now());

insert into public.member_roles (workspace_member_id, role_id)
select 'e1000000-0000-0000-0000-000000000001', id from public.roles where workspace_id is null and name = 'Workspace Owner';
insert into public.member_roles (workspace_member_id, role_id)
select 'e1000000-0000-0000-0000-000000000002', id from public.roles where workspace_id is null and name = 'Administrator';

-- User 33333333 (task owner) explicitly opts out of in_app task_overdue.
insert into public.notification_preferences (user_id, notification_type, channel, cadence, enabled) values
  ('33333333-3333-3333-3333-333333333333', 'task_overdue', 'in_app', 'immediate', false);

insert into public.tasks (id, workspace_id, title, owner, status, due_at) values
  ('a0100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Overdue task', '33333333-3333-3333-3333-333333333333', 'open', now() - interval '2 days');

-- payments.invoice_id is NOT NULL, and invoices.order_id is NOT NULL, so
-- a failed payment needs a real order + invoice underneath it.
insert into public.orders (id, workspace_id, total, currency, status) values
  ('c0100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100, 'usd', 'invoiced');

insert into public.invoices (id, workspace_id, order_id, amount_due, status) values
  ('d0100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0100000-0000-0000-0000-000000000001', 100, 'open');

insert into public.payments (id, workspace_id, invoice_id, amount, currency, status) values
  ('b0100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd0100000-0000-0000-0000-000000000001', 100, 'usd', 'failed');

-- 1. decision_due: open, due now (within the 24h window).
insert into public.decisions (id, workspace_id, question, owner, status, due_at) values
  ('a1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Should we raise prices?', '33333333-3333-3333-3333-333333333333', 'open', now());

-- 2. approval_requested: pending, requested from the task owner. subject_id
-- has no FK (subject_type/subject_id is a polymorphic pair, not enforced by
-- a constraint), so reusing the approval's own id is fine.
insert into public.approvals (id, workspace_id, subject_type, subject_id, approval_type, status, requested_from) values
  ('a2000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'refunds', 'a2000000-0000-0000-0000-000000000001', 'refund', 'pending', '33333333-3333-3333-3333-333333333333');

-- 4. client_at_risk: a client whose latest health event is at_risk.
insert into public.clients (id, workspace_id, owner_user_id, status, start_at) values
  ('a3000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'active', now());
insert into public.client_health_events (id, workspace_id, client_id, score, status, calculated_at) values
  ('a3000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a3000000-0000-0000-0000-000000000001', 40, 'at_risk', now());

-- 6. contract_awaiting_signature: sent, joined through its opportunity's owner.
insert into public.opportunities (id, workspace_id, name, owner_user_id, status) values
  ('a4000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Contract Test Opportunity', '33333333-3333-3333-3333-333333333333', 'open');
insert into public.contracts (id, workspace_id, opportunity_id, status) values
  ('a4000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a4000000-0000-0000-0000-000000000001', 'sent');

-- 7. lead_no_next_action: no next_action set, acquired 5 days ago (past the 3-day threshold).
insert into public.leads (id, workspace_id, owner_user_id, pathway, acquired_at) values
  ('a5000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'b2b', now() - interval '5 days');

-- 8. stage_aging_exceeded: open, in its current stage for 20 days (past the 14-day threshold).
insert into public.opportunities (id, workspace_id, name, owner_user_id, status, stage_entered_at) values
  ('a6000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Aging Test Opportunity', '33333333-3333-3333-3333-333333333333', 'open', now() - interval '20 days');

-- 9. automation_failed.
insert into public.automation_definitions (id, workspace_id, name, owner_user_id) values
  ('a7000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Automation', '33333333-3333-3333-3333-333333333333');
insert into public.automation_runs (id, workspace_id, automation_id, status) values
  ('a7000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a7000000-0000-0000-0000-000000000001', 'failed');

-- 10. integration_disconnected: no specific owner, fans out to admins —
-- reuses the existing 'stripe' adapter row every integration test relies on.
insert into public.integration_accounts (id, workspace_id, provider_id, status)
select 'a8000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, 'error'
from public.integration_providers where adapter_code = 'stripe';

-- 11. data_conflict_review.
insert into public.ai_knowledge_sources (id, workspace_id, source_type, owner_user_id, conflict_status, active) values
  ('a9000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'document', '33333333-3333-3333-3333-333333333333', 'flagged', true);

-- 12. review_due: in progress, period already ended.
insert into public.review_instances (id, workspace_id, template_id, period_end, owner, status)
select 'aa000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, current_date - 1, '33333333-3333-3333-3333-333333333333', 'in_progress'
from public.review_templates where cadence = 'daily';

-- 13. capacity_threshold_exceeded: no specific owner, fans out to admins —
-- actual (15h) exceeds 120% of planned (10h -> 12h threshold).
insert into public.capacity_profiles (id, workspace_id, workspace_member_id) values
  ('ab000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e1000000-0000-0000-0000-000000000003');
insert into public.capacity_allocations (id, workspace_id, capacity_profile_id, period, category, planned_hours, actual_hours) values
  ('ab000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ab000000-0000-0000-0000-000000000001', '2026-W29', 'coaching', 10, 15);

do $$
declare
  v_count int;
begin
  -- First sweep.
  perform private.run_notification_sweep();

  -- The task owner opted out — no notification for them despite the
  -- overdue task matching the condition.
  select count(*) into v_count from public.notifications
  where recipient_id = '33333333-3333-3333-3333-333333333333' and type = 'task_overdue';
  if v_count <> 0 then raise exception 'FAIL 1: notification created for a user who opted out (% rows)', v_count; end if;

  -- The failed payment fans out to both the Owner and the Administrator
  -- (the only two roles workspace_admin_user_ids returns), not the task
  -- owner (a plain member).
  select count(*) into v_count from public.notifications
  where recipient_id = '11111111-1111-1111-1111-111111111111' and type = 'payment_failed_or_overdue' and subject_id = 'b0100000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 2: Workspace Owner did not get the failed-payment notification (% rows)', v_count; end if;

  select count(*) into v_count from public.notifications
  where recipient_id = '22222222-2222-2222-2222-222222222222' and type = 'payment_failed_or_overdue' and subject_id = 'b0100000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 3: Administrator did not get the failed-payment notification (% rows)', v_count; end if;

  select count(*) into v_count from public.notifications
  where recipient_id = '33333333-3333-3333-3333-333333333333' and type = 'payment_failed_or_overdue';
  if v_count <> 0 then raise exception 'FAIL 4: a plain member (not admin) got the failed-payment notification (% rows)', v_count; end if;

  -- Second sweep: no duplicates for the still-unread, still-failed payment.
  perform private.run_notification_sweep();
  select count(*) into v_count from public.notifications
  where recipient_id = '11111111-1111-1111-1111-111111111111' and type = 'payment_failed_or_overdue' and subject_id = 'b0100000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 5: repeated sweep duplicated the notification (% rows, expected 1)', v_count; end if;

  -- Marking it read and re-sweeping creates a fresh one — dedup only
  -- suppresses while unread, it doesn't permanently silence a real
  -- ongoing condition.
  update public.notifications set read_at = now()
  where recipient_id = '11111111-1111-1111-1111-111111111111' and type = 'payment_failed_or_overdue' and subject_id = 'b0100000-0000-0000-0000-000000000001';
  perform private.run_notification_sweep();
  select count(*) into v_count from public.notifications
  where recipient_id = '11111111-1111-1111-1111-111111111111' and type = 'payment_failed_or_overdue' and subject_id = 'b0100000-0000-0000-0000-000000000001';
  if v_count <> 2 then raise exception 'FAIL 6: expected a fresh notification after the prior one was read (% rows, expected 2)', v_count; end if;
end $$;

-- The remaining 11 of 13 trigger types, each proven against real seeded
-- data rather than just a reviewed WHERE clause. All fired on the very
-- first sweep call above (the seed data was inserted before it), so this
-- just asserts the notifications rows it should have already created.
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.notifications
  where recipient_id = '33333333-3333-3333-3333-333333333333' and type = 'decision_due' and subject_id = 'a1000000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 7: decision_due did not notify the decision owner (% rows)', v_count; end if;

  select count(*) into v_count from public.notifications
  where recipient_id = '33333333-3333-3333-3333-333333333333' and type = 'approval_requested' and subject_id = 'a2000000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 8: approval_requested did not notify the requested approver (% rows)', v_count; end if;

  select count(*) into v_count from public.notifications
  where recipient_id = '33333333-3333-3333-3333-333333333333' and type = 'client_at_risk' and subject_id = 'a3000000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 9: client_at_risk did not notify the client owner (% rows)', v_count; end if;

  select count(*) into v_count from public.notifications
  where recipient_id = '33333333-3333-3333-3333-333333333333' and type = 'contract_awaiting_signature' and subject_id = 'a4000000-0000-0000-0000-000000000002';
  if v_count <> 1 then raise exception 'FAIL 10: contract_awaiting_signature did not notify the opportunity owner (% rows)', v_count; end if;

  select count(*) into v_count from public.notifications
  where recipient_id = '33333333-3333-3333-3333-333333333333' and type = 'lead_no_next_action' and subject_id = 'a5000000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 11: lead_no_next_action did not notify the lead owner (% rows)', v_count; end if;

  select count(*) into v_count from public.notifications
  where recipient_id = '33333333-3333-3333-3333-333333333333' and type = 'stage_aging_exceeded' and subject_id = 'a6000000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 12: stage_aging_exceeded did not notify the opportunity owner (% rows)', v_count; end if;

  select count(*) into v_count from public.notifications
  where recipient_id = '33333333-3333-3333-3333-333333333333' and type = 'automation_failed' and subject_id = 'a7000000-0000-0000-0000-000000000002';
  if v_count <> 1 then raise exception 'FAIL 13: automation_failed did not notify the automation owner (% rows)', v_count; end if;

  -- integration_disconnected fans out to both admins, not the plain member.
  select count(*) into v_count from public.notifications
  where recipient_id = '11111111-1111-1111-1111-111111111111' and type = 'integration_disconnected' and subject_id = 'a8000000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 14: integration_disconnected did not notify the Workspace Owner (% rows)', v_count; end if;

  select count(*) into v_count from public.notifications
  where recipient_id = '22222222-2222-2222-2222-222222222222' and type = 'integration_disconnected' and subject_id = 'a8000000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 15: integration_disconnected did not notify the Administrator (% rows)', v_count; end if;

  select count(*) into v_count from public.notifications
  where recipient_id = '33333333-3333-3333-3333-333333333333' and type = 'data_conflict_review' and subject_id = 'a9000000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 16: data_conflict_review did not notify the knowledge source owner (% rows)', v_count; end if;

  select count(*) into v_count from public.notifications
  where recipient_id = '33333333-3333-3333-3333-333333333333' and type = 'review_due' and subject_id = 'aa000000-0000-0000-0000-000000000001';
  if v_count <> 1 then raise exception 'FAIL 17: review_due did not notify the review owner (% rows)', v_count; end if;

  -- capacity_threshold_exceeded fans out to both admins, subject is the
  -- workspace itself (neither allocation nor profile has a specific owner).
  select count(*) into v_count from public.notifications
  where recipient_id = '11111111-1111-1111-1111-111111111111' and type = 'capacity_threshold_exceeded' and subject_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 1 then raise exception 'FAIL 18: capacity_threshold_exceeded did not notify the Workspace Owner (% rows)', v_count; end if;

  select count(*) into v_count from public.notifications
  where recipient_id = '22222222-2222-2222-2222-222222222222' and type = 'capacity_threshold_exceeded' and subject_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if v_count <> 1 then raise exception 'FAIL 19: capacity_threshold_exceeded did not notify the Administrator (% rows)', v_count; end if;
end $$;

rollback;
