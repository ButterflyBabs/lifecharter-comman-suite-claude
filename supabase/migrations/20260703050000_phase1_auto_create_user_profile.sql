-- Every signed-up user needs a user_profiles row to hold accessibility
-- preferences (Section 16) and display settings, independent of workspace
-- membership. Created automatically on auth.users insert rather than relying
-- on the app to remember to do it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (auth_user_id)
  values (new.id)
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
