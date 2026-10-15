-- profile_complete is derived, not client-supplied: it must not depend on
-- the app remembering to set it correctly on every update (matches the
-- handle_new_user() pattern from COR-3 — critical state lives in the DB).
create or replace function update_profile_complete()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.profile_complete := (
    new.name is not null and new.name <> ''
    and new.main_photo is not null and new.main_photo <> ''
  );
  return new;
end;
$$;

create trigger profiles_update_profile_complete
  before insert or update on profiles
  for each row
  execute function update_profile_complete();
