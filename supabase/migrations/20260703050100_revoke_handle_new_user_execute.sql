-- handle_new_user is trigger-only plumbing, not an API endpoint. Trigger
-- firing doesn't require EXECUTE grants on the function for the invoking
-- role, so revoking public/anon/authenticated access only closes the
-- unintended /rest/v1/rpc/handle_new_user surface the advisor flagged.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
