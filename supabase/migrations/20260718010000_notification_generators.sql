-- Wires real notification generation for Section 14.4's 13 named trigger
-- types. Until now, notification_preferences was fully built (Settings
-- completion phase) but nothing ever inserted a notifications row for any
-- of them — a known, honestly-flagged gap.
--
-- Delivery is in_app only: notification_preferences also models email/sms
-- channels, but this build has no email/SMS provider integrated, so there
-- is nothing to actually send through those channels yet. A row only ever
-- gets inserted into `notifications` (the in-app inbox); the channel
-- check below only looks at the 'in_app' preference row.
--
-- Mechanism: a single periodic sweep (private.run_notification_sweep(),
-- scheduled via pg_cron) rather than a mix of per-table triggers for the
-- "genuinely event-driven" types and a sweep for the "genuinely
-- time-based" ones. A handful of these 13 (approval_requested,
-- automation_failed, integration_disconnected, data_conflict_review,
-- client_at_risk) could be pure insert/update triggers, but most
-- (decision_due, task_overdue, stage_aging_exceeded, review_due,
-- capacity_threshold_exceeded, lead_no_next_action) are inherently
-- time-based — "due" or "aging" is a function of the current moment, not
-- a row event. One sweep for all 13 is simpler to reason about, test, and
-- extend than two different mechanisms, at the cost of "immediate"
-- cadence really meaning "within one sweep interval" rather than
-- instantaneous.

create extension if not exists pg_cron;

-- ============================================================================
-- Shared helpers
-- ============================================================================

create or replace function private.workspace_admin_user_ids(p_workspace_id uuid)
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select distinct wm.user_id
  from workspace_members wm
  join member_roles mr on mr.workspace_member_id = wm.id
  join roles r on r.id = mr.role_id
  where wm.workspace_id = p_workspace_id
  and wm.status = 'active'
  and r.name in ('Workspace Owner', 'Administrator');
$$;

-- Inserts a notifications row only if: the recipient exists, they haven't
-- explicitly disabled this trigger type's in_app channel (no preference
-- row, or enabled=true, both mean "on" — Settings' own stated default),
-- and there isn't already an unread notification for the same
-- type+subject (the sweep runs repeatedly; without this a still-overdue
-- task would get a new row every single run).
create or replace function private.create_notification_if_enabled(
  p_recipient_id uuid,
  p_type text,
  p_severity text,
  p_subject_type text,
  p_subject_id uuid,
  p_message text,
  p_action_url text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
  v_exists boolean;
begin
  if p_recipient_id is null then
    return;
  end if;

  select enabled into v_enabled
  from notification_preferences
  where user_id = p_recipient_id
  and notification_type = p_type
  and channel = 'in_app';

  if v_enabled is not null and v_enabled = false then
    return;
  end if;

  select exists(
    select 1 from notifications
    where recipient_id = p_recipient_id
    and type = p_type
    and subject_type = p_subject_type
    and subject_id = p_subject_id
    and read_at is null
  ) into v_exists;

  if v_exists then
    return;
  end if;

  insert into notifications (recipient_id, type, severity, subject_type, subject_id, message, action_url)
  values (p_recipient_id, p_type, p_severity, p_subject_type, p_subject_id, p_message, p_action_url);
end;
$$;

revoke execute on function private.create_notification_if_enabled(uuid, text, text, text, uuid, text, text) from anon, authenticated, public;
revoke execute on function private.workspace_admin_user_ids(uuid) from anon, authenticated, public;

-- ============================================================================
-- The sweep itself
-- ============================================================================

create or replace function private.run_notification_sweep()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  admin_id uuid;
begin
  -- 1. decision_due: open decisions due within 24h or already overdue.
  for r in
    select id, owner, question
    from decisions
    where status = 'open'
    and due_at is not null
    and due_at <= now() + interval '24 hours'
    and archived_at is null
  loop
    perform private.create_notification_if_enabled(
      r.owner, 'decision_due', 'warning', 'decision', r.id,
      'Decision due: ' || coalesce(r.question, 'Untitled decision'), '/decisions'
    );
  end loop;

  -- 2. approval_requested: pending approvals awaiting the requested approver.
  for r in
    select id, requested_from, approval_type, subject_type
    from approvals
    where status = 'pending'
  loop
    perform private.create_notification_if_enabled(
      r.requested_from, 'approval_requested', 'warning', 'approval', r.id,
      'Approval requested: ' || coalesce(r.approval_type, 'item') || ' for ' || coalesce(r.subject_type, 'a record'), '/approvals'
    );
  end loop;

  -- 3. task_overdue.
  for r in
    select id, owner, title
    from tasks
    where status not in ('done', 'cancelled')
    and due_at is not null
    and due_at < now()
    and archived_at is null
  loop
    perform private.create_notification_if_enabled(
      r.owner, 'task_overdue', 'error', 'task', r.id,
      'Task overdue: ' || coalesce(r.title, 'Untitled task'), '/work'
    );
  end loop;

  -- 4. client_at_risk: latest health status per client is at_risk.
  for r in
    select distinct on (che.client_id) che.client_id, che.status, c.owner_user_id
    from client_health_events che
    join clients c on c.id = che.client_id
    order by che.client_id, che.calculated_at desc
  loop
    if r.status = 'at_risk' then
      perform private.create_notification_if_enabled(
        r.owner_user_id, 'client_at_risk', 'error', 'client', r.client_id,
        'Client health flagged at-risk', '/clients/health'
      );
    end if;
  end loop;

  -- 5. payment_failed_or_overdue: failed payments and overdue invoices,
  -- notifying every workspace admin (neither table has a specific owner).
  for r in
    select id, workspace_id from payments where status = 'failed'
  loop
    for admin_id in select private.workspace_admin_user_ids(r.workspace_id) loop
      perform private.create_notification_if_enabled(
        admin_id, 'payment_failed_or_overdue', 'error', 'payment', r.id,
        'Payment failed', '/revenue/payments'
      );
    end loop;
  end loop;

  for r in
    select id, workspace_id from invoices where status = 'overdue'
  loop
    for admin_id in select private.workspace_admin_user_ids(r.workspace_id) loop
      perform private.create_notification_if_enabled(
        admin_id, 'payment_failed_or_overdue', 'error', 'invoice', r.id,
        'Invoice overdue', '/revenue/payments'
      );
    end loop;
  end loop;

  -- 6. contract_awaiting_signature: sent, not yet effective.
  for r in
    select c.id, o.owner_user_id
    from contracts c
    left join opportunities o on o.id = c.opportunity_id
    where c.status = 'sent'
  loop
    perform private.create_notification_if_enabled(
      r.owner_user_id, 'contract_awaiting_signature', 'warning', 'contract', r.id,
      'Contract awaiting signature', '/revenue/contracts'
    );
  end loop;

  -- 7. lead_no_next_action: open leads with no next action, aged 3+ days.
  for r in
    select id, owner_user_id
    from leads
    where next_action is null
    and status not in ('disqualified', 'converted')
    and acquired_at is not null
    and acquired_at < now() - interval '3 days'
    and archived_at is null
  loop
    perform private.create_notification_if_enabled(
      r.owner_user_id, 'lead_no_next_action', 'warning', 'lead', r.id,
      'Lead has no next action set', '/revenue/outreach'
    );
  end loop;

  -- 8. stage_aging_exceeded: open opportunities sitting in their current
  -- stage for 14+ days.
  for r in
    select id, owner_user_id
    from opportunities
    where status = 'open'
    and stage_entered_at is not null
    and stage_entered_at < now() - interval '14 days'
    and archived_at is null
  loop
    perform private.create_notification_if_enabled(
      r.owner_user_id, 'stage_aging_exceeded', 'warning', 'opportunity', r.id,
      'Opportunity has been in its current stage for over 14 days', '/revenue/pipeline'
    );
  end loop;

  -- 9. automation_failed.
  for r in
    select ar.id, ad.owner_user_id
    from automation_runs ar
    join automation_definitions ad on ad.id = ar.automation_id
    where ar.status = 'failed'
  loop
    perform private.create_notification_if_enabled(
      r.owner_user_id, 'automation_failed', 'error', 'automation_run', r.id,
      'Automation run failed', '/operations/automations'
    );
  end loop;

  -- 10. integration_disconnected: no specific owner, notify workspace admins.
  for r in
    select id, workspace_id from integration_accounts where status = 'error'
  loop
    for admin_id in select private.workspace_admin_user_ids(r.workspace_id) loop
      perform private.create_notification_if_enabled(
        admin_id, 'integration_disconnected', 'error', 'integration_account', r.id,
        'Integration disconnected', '/operations/integrations'
      );
    end loop;
  end loop;

  -- 11. data_conflict_review.
  for r in
    select id, owner_user_id
    from ai_knowledge_sources
    where conflict_status = 'flagged'
    and active = true
  loop
    perform private.create_notification_if_enabled(
      r.owner_user_id, 'data_conflict_review', 'warning', 'ai_knowledge_source', r.id,
      'Knowledge source has a flagged data conflict', '/ai/knowledge'
    );
  end loop;

  -- 12. review_due: not completed, period already ended.
  for r in
    select id, owner
    from review_instances
    where status <> 'completed'
    and period_end <= now()::date
  loop
    perform private.create_notification_if_enabled(
      r.owner, 'review_due', 'warning', 'review_instance', r.id,
      'Review is due', '/reviews/daily'
    );
  end loop;

  -- 13. capacity_threshold_exceeded: notify workspace admins once per
  -- workspace where actual hours exceed 120% of planned for any category.
  for r in
    select distinct workspace_id
    from capacity_allocations
    where planned_hours > 0
    and actual_hours > planned_hours * 1.2
  loop
    for admin_id in select private.workspace_admin_user_ids(r.workspace_id) loop
      perform private.create_notification_if_enabled(
        admin_id, 'capacity_threshold_exceeded', 'warning', 'workspace', r.workspace_id,
        'Capacity threshold exceeded', '/operations/capacity'
      );
    end loop;
  end loop;
end;
$$;

revoke execute on function private.run_notification_sweep() from anon, authenticated, public;

-- Runs every 15 minutes — "immediate" cadence in Settings -> Notifications
-- means "within one sweep interval," not instantaneous, since there is no
-- event-driven worker in this build to react the instant a row changes.
select cron.schedule('notification-sweep', '*/15 * * * *', 'select private.run_notification_sweep();');
