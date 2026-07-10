-- Business Command Audit — evidence storage bucket + storage RLS.
--
-- Private bucket. Evidence files are laid out per-workspace as
--   audit-evidence/{workspace_id}/{audit_instance_id}/{question_id}/<file>
-- so the first path segment is the tenant key. Only the URL/ref is stored in the
-- DB (audit_responses.evidence_refs); the bytes live in Storage. Storage RLS is
-- separate from table RLS, so these policies mirror the same workspace-membership
-- predicate used by audit_responses / audit_instances.

-- storage.buckets/storage.objects are created by the Storage service's own
-- startup, not by our migrations. On `supabase start`, our migrations are
-- applied as part of the Postgres container's own init sequence, which runs
-- before the Storage service has even connected -- neither removing
-- --ignore-health-check nor any other start-order flag changes this,
-- because Postgres has to finish initializing (running these scripts)
-- before any dependent service can start in the first place. Two prior CI
-- runs on this branch failed with "relation storage.buckets does not
-- exist" for exactly this reason. Waiting here (rather than assuming
-- ordering) is what actually closes the race, locally and in CI alike.
do $$
declare
  waited int := 0;
begin
  while to_regclass('storage.buckets') is null and waited < 60 loop
    perform pg_sleep(1);
    waited := waited + 1;
  end loop;

  if to_regclass('storage.buckets') is null then
    raise exception 'storage.buckets did not appear after waiting 60s -- the Storage service has not initialized its schema yet';
  end if;
end $$;

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
