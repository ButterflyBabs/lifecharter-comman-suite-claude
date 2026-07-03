-- Section 11.6 requires audit history for, at minimum, membership changes and
-- role/permission changes. Phase 1 wires this automatically via triggers
-- rather than relying on application code remembering to log it — insert,
-- update, and delete on workspace_members and member_roles all write an
-- audit_events row. Wider coverage (stage changes, financial changes, etc.)
-- is added as those tables are built in later phases.

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  if tg_table_name = 'workspace_members' then
    v_workspace_id := coalesce(new.workspace_id, old.workspace_id);
  elsif tg_table_name = 'member_roles' then
    select wm.workspace_id into v_workspace_id
    from public.workspace_members wm
    where wm.id = coalesce(new.workspace_member_id, old.workspace_member_id);
  end if;

  insert into public.audit_events (workspace_id, actor, action, resource_type, resource_id, before_json, after_json)
  values (
    v_workspace_id,
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

revoke execute on function public.log_audit_event() from public, anon, authenticated;

create trigger audit_workspace_members
  after insert or update or delete on public.workspace_members
  for each row execute function public.log_audit_event();

create trigger audit_member_roles
  after insert or update or delete on public.member_roles
  for each row execute function public.log_audit_event();
