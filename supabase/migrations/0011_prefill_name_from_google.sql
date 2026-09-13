-- Prefill profiles.name from the OAuth provider's full_name (Google sends
-- this in raw_user_meta_data on signup), so the user doesn't retype
-- something we already know. Falls back to empty if a future provider
-- doesn't send it.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into profiles (user_id, name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
