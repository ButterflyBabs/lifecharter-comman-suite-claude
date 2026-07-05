-- Business Command Audit — evidence storage bucket + storage RLS.
--
-- Private bucket. Evidence files are laid out per-workspace as
--   audit-evidence/{workspace_id}/{audit_instance_id}/{question_id}/<file>
-- so the first path segment is the tenant key. Only the URL/ref is stored in the
-- DB (audit_responses.evidence_refs); the bytes live in Storage. Storage RLS is
-- separate from table RLS, so these policies mirror the same workspace-membership
-- predicate used by audit_responses / audit_instances.

insert into storage.buckets (id, name, public)
values ('audit-evidence', 'audit-evidence', false)
on conflict (id) do nothing;

create policy "members read audit evidence" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'audit-evidence'
    and ((storage.foldername(name))[1])::uuid in (select private.active_workspace_ids())
  );

create policy "members upload audit evidence" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'audit-evidence'
    and ((storage.foldername(name))[1])::uuid in (select private.active_workspace_ids())
  );

create policy "members update audit evidence" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'audit-evidence'
    and ((storage.foldername(name))[1])::uuid in (select private.active_workspace_ids())
  )
  with check (
    bucket_id = 'audit-evidence'
    and ((storage.foldername(name))[1])::uuid in (select private.active_workspace_ids())
  );

create policy "members delete audit evidence" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'audit-evidence'
    and ((storage.foldername(name))[1])::uuid in (select private.active_workspace_ids())
  );
