-- New profile fields: gender and bio, plus up to 20 photos in their own table
-- (replaces profiles.main_photo; sort_order 0 is the main photo).
alter table profiles
  add column gender_id smallint references genders(id),
  add column bio text check (char_length(bio) <= 500);

create table profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  storage_path text not null, -- path inside the "profile-photos" bucket, not a full URL
  sort_order smallint not null check (sort_order between 0 and 19),
  created_at timestamptz not null default now(),
  unique (user_id, sort_order)
);

alter table profile_photos enable row level security;

insert into profile_photos (user_id, storage_path, sort_order)
select user_id, main_photo, 0
from profiles
where main_photo is not null and main_photo <> '';

-- profile_complete stays derived in the DB. It now also depends on the
-- photos table, so it is recomputed when photos change (see below).
create or replace function update_profile_complete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.profile_complete := (
    new.name is not null and new.name <> ''
    and new.age is not null
    and new.gender_id is not null
    and new.partner_preference_id is not null
    and exists (select 1 from profile_photos where user_id = new.user_id)
  );
  return new;
end;
$$;

revoke execute on function update_profile_complete() from public;

-- Touching the profile row fires profiles_update_profile_complete, which
-- recomputes the flag.
create or replace function refresh_profile_complete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update profiles
  set profile_complete = profile_complete
  where user_id = coalesce(new.user_id, old.user_id);
  return null;
end;
$$;

revoke execute on function refresh_profile_complete() from public;

create trigger profile_photos_refresh_profile_complete
  after insert or update or delete on profile_photos
  for each row
  execute function refresh_profile_complete();

-- The view lists columns as of creation time and depends on main_photo.
drop view active_profiles;
alter table profiles drop column main_photo;

create view active_profiles
  with (security_invoker = true) as
  select * from profiles where deleted_at is null;

-- Recompute the flag for existing rows with the new rule.
update profiles set profile_complete = profile_complete;
