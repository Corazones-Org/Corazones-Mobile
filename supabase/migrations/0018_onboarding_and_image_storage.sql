-- Onboarding completeness (separate from profile_complete, which stays as the future "how filled
-- in is the profile" metric) and Storage setup for profile photos.

-- 1. Onboarding completeness -------------------------------------------------------------------
-- null = onboarding not done. Derived in the database (never trust the client): set once when the
-- profile has a gender, a partner preference and at least one photo, never cleared afterwards, and
-- any value the client tries to write is ignored.
alter table profiles add column onboarding_completed_at timestamptz;

create or replace function update_onboarding_completed()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.onboarding_completed_at is not null then
      new.onboarding_completed_at := old.onboarding_completed_at;
      return new;
    end if;
  end if;

  if new.gender_id is not null
     and new.partner_preference_id is not null
     and exists (select 1 from profile_photos where user_id = new.user_id) then
    new.onboarding_completed_at := now();
  else
    new.onboarding_completed_at := null;
  end if;
  return new;
end;
$$;

revoke execute on function update_onboarding_completed() from public;

create trigger profiles_update_onboarding_completed
  before insert or update on profiles
  for each row
  execute function update_onboarding_completed();

-- Adding or removing a photo already touches the profile row (profile_photos_refresh_profile_complete,
-- migration 0015), so the first photo re-evaluates this too. Re-evaluate existing rows now.
update profiles set profile_complete = profile_complete;

-- 2. Buckets -----------------------------------------------------------------------------------
-- One bucket per environment (develop, production), same layout: users/<user id>/profile/<file>.
-- Both stay public (cheaper and faster through the CDN; no signed URLs). Safety net on what can be
-- uploaded: small WebP/JPEG files only.
update storage.buckets
set public = true,
    file_size_limit = 204800, -- 200 KB; the app uploads ~25 KB photos and ~4 KB thumbnails
    allowed_mime_types = array['image/webp', 'image/jpeg']
where id in ('develop', 'production');

-- 3. Storage policies --------------------------------------------------------------------------
-- Reads of a public bucket need no policy. A user can only touch files under their own folder.
drop policy if exists "profile_photos_select_own" on storage.objects;
drop policy if exists "profile_photos_select_visible" on storage.objects;
drop policy if exists "profile_photos_insert_own" on storage.objects;
drop policy if exists "profile_photos_update_own" on storage.objects;
drop policy if exists "profile_photos_delete_own" on storage.objects;

create policy "profile_images_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('develop', 'production')
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'profile'
  );

create policy "profile_images_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('develop', 'production')
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'profile'
  );

create policy "profile_images_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('develop', 'production')
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'profile'
  )
  with check (
    bucket_id in ('develop', 'production')
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'profile'
  );

create policy "profile_images_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('develop', 'production')
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'profile'
  );
