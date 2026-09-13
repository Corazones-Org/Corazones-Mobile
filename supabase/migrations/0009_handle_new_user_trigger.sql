-- Creates an empty/incomplete profile row automatically on first sign-in.
-- Done as a DB trigger (not from the client) so it can't be skipped by a
-- failed request or a client bug — every auth.users row gets a profile.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into profiles (user_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();
