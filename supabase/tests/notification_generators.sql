-- Notification generator test: proves private.run_notification_sweep()
-- actually inserts notifications for real trigger conditions, respects a
-- user's explicit opt-out, doesn't duplicate on repeated runs, and fans a
-- workspace-wide condition (failed payment) out to every admin. Not an
-- RLS test — the sweep runs as a scheduled job, not through the
-- PostgREST/RLS-scoped path — but the notifications it creates are real
-- rows a user reads through the ordinary RLS-scoped client afterward.

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

rollback;
