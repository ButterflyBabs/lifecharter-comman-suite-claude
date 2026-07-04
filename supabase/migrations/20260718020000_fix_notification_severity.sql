-- Fix: notifications.severity's check constraint only allows
-- 'info'/'warning'/'critical', not 'error' — caught immediately by
-- actually running supabase/tests/notification_generators.sql rather than
-- by inspection. Six of the sweep's thirteen conditions used 'error'.
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

  for r in
    select id, owner, title
    from tasks
    where status not in ('done', 'cancelled')
    and due_at is not null
    and due_at < now()
    and archived_at is null
  loop
    perform private.create_notification_if_enabled(
      r.owner, 'task_overdue', 'critical', 'task', r.id,
      'Task overdue: ' || coalesce(r.title, 'Untitled task'), '/work'
    );
  end loop;

  for r in
    select distinct on (che.client_id) che.client_id, che.status, c.owner_user_id
    from client_health_events che
    join clients c on c.id = che.client_id
    order by che.client_id, che.calculated_at desc
  loop
    if r.status = 'at_risk' then
      perform private.create_notification_if_enabled(
        r.owner_user_id, 'client_at_risk', 'critical', 'client', r.client_id,
        'Client health flagged at-risk', '/clients/health'
      );
    end if;
  end loop;

  for r in
    select id, workspace_id from payments where status = 'failed'
  loop
    for admin_id in select private.workspace_admin_user_ids(r.workspace_id) loop
      perform private.create_notification_if_enabled(
        admin_id, 'payment_failed_or_overdue', 'critical', 'payment', r.id,
        'Payment failed', '/revenue/payments'
      );
    end loop;
  end loop;

  for r in
    select id, workspace_id from invoices where status = 'overdue'
  loop
    for admin_id in select private.workspace_admin_user_ids(r.workspace_id) loop
      perform private.create_notification_if_enabled(
        admin_id, 'payment_failed_or_overdue', 'critical', 'invoice', r.id,
        'Invoice overdue', '/revenue/payments'
      );
    end loop;
  end loop;

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

  for r in
    select ar.id, ad.owner_user_id
    from automation_runs ar
    join automation_definitions ad on ad.id = ar.automation_id
    where ar.status = 'failed'
  loop
    perform private.create_notification_if_enabled(
      r.owner_user_id, 'automation_failed', 'critical', 'automation_run', r.id,
      'Automation run failed', '/operations/automations'
    );
  end loop;

  for r in
    select id, workspace_id from integration_accounts where status = 'error'
  loop
    for admin_id in select private.workspace_admin_user_ids(r.workspace_id) loop
      perform private.create_notification_if_enabled(
        admin_id, 'integration_disconnected', 'critical', 'integration_account', r.id,
        'Integration disconnected', '/operations/integrations'
      );
    end loop;
  end loop;

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
