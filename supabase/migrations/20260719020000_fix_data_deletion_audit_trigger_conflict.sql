-- Fix: no workspace hard-delete had ever actually been exercised in this
-- project before the test for this build ran one for the first time —
-- every prior RLS test uses rollback and never really deletes a
-- workspace. It immediately surfaced a real, previously-latent bug: the
-- Phase 1 audit triggers (audit_workspace_members, audit_member_roles)
-- fire during the cascade and try to INSERT a new audit_events row
-- referencing the workspace_id that is disappearing in the very same
-- statement — audit_events.workspace_id is also ON DELETE CASCADE, but
-- that only protects *existing* rows, not a brand-new INSERT racing the
-- parent's own deletion. Any workspace delete failed with a foreign-key
-- violation on audit_events before this fix, regardless of pg_cron.
--
-- Fix: disable just those two audit triggers for the duration of each
-- workspace's delete, re-enabling immediately after (success or
-- failure) so other workspaces' ongoing audit logging is unaffected.
-- deletion_execution_log remains the permanent record that the deletion
-- happened; losing the final audit_events rows for a workspace that no
-- longer exists at all is an acceptable, deliberate tradeoff.
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

      alter table workspace_members disable trigger audit_workspace_members;
      alter table member_roles disable trigger audit_member_roles;

      delete from workspaces where id = r.workspace_id;

      alter table workspace_members enable trigger audit_workspace_members;
      alter table member_roles enable trigger audit_member_roles;
    exception
      when others then
        begin
          alter table workspace_members enable trigger audit_workspace_members;
          alter table member_roles enable trigger audit_member_roles;
        exception
          when others then null;
        end;
        continue;
    end;
  end loop;
end;
$$;
