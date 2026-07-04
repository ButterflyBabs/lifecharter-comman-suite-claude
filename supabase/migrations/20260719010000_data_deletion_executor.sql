-- Scheduled data-deletion executor: data_deletion_requests has supported
-- a 30-day scheduled, cancellable deletion request since Phase 8 (an
-- admin-gated insert, matching the workspaces-bootstrap admin-only
-- precedent), but actually purging a workspace on its scheduled date
-- needed a recurring job that didn't exist in this build until pg_cron
-- was enabled for the notification-generators build.
--
-- Every foreign key in this schema that references workspaces(id) uses
-- ON DELETE CASCADE except billing_webhook_events (ON DELETE SET NULL,
-- a deliberate exception so historical billing/webhook audit rows
-- outlive the workspace, per Phase 8) — so deleting the workspaces row
-- itself is sufficient to purge everything else. But
-- data_deletion_requests.workspace_id is *also* ON DELETE CASCADE, which
-- means the request row that authorized the deletion would itself
-- disappear along with the workspace, leaving no record the deletion
-- ever happened. deletion_execution_log exists specifically to survive
-- that cascade: it carries no foreign key to workspaces at all, just a
-- plain uuid captured before the delete.

create table if not exists public.deletion_execution_log (
  id uuid primary key default gen_random_uuid(),
  original_request_id uuid not null,
  workspace_id uuid not null,
  workspace_name text,
  workspace_slug text,
  requested_by uuid,
  scheduled_for date,
  executed_at timestamptz not null default now()
);

-- Service-role only, same "RLS enabled, zero policies" pattern as
-- billing_webhook_events — this is an internal execution record, not
-- something any workspace member (the workspace no longer exists by the
-- time this row exists) or portal user should ever read via the API.
alter table public.deletion_execution_log enable row level security;

create or replace function private.run_data_deletion_executor()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select ddr.id, ddr.workspace_id, ddr.requested_by, ddr.scheduled_for, w.name, w.slug
    from data_deletion_requests ddr
    join workspaces w on w.id = ddr.workspace_id
    where ddr.status in ('pending', 'scheduled')
    and ddr.canceled_at is null
    and ddr.scheduled_for is not null
    and ddr.scheduled_for <= current_date
  loop
    begin
      insert into deletion_execution_log (
        original_request_id, workspace_id, workspace_name, workspace_slug, requested_by, scheduled_for
      ) values (
        r.id, r.workspace_id, r.name, r.slug, r.requested_by, r.scheduled_for
      );

      -- Cascades through every table referencing workspace_id, including
      -- the data_deletion_requests row itself — deletion_execution_log
      -- above is the surviving record that this happened.
      delete from workspaces where id = r.workspace_id;
    exception
      when others then
        -- One workspace's deletion failing (an unexpected FK this
        -- migration didn't anticipate, a lock, etc.) must not block
        -- every other scheduled deletion in the same run.
        continue;
    end;
  end loop;
end;
$$;

revoke execute on function private.run_data_deletion_executor() from anon, authenticated, public;

-- Once daily, off-peak — a 30-day-scheduled deletion has no reason to
-- run on the same 15-minute cadence as notifications.
select cron.schedule('data-deletion-executor', '0 3 * * *', 'select private.run_data_deletion_executor();');
