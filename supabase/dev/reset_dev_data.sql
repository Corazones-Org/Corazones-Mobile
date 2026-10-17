-- DEV ONLY. Erases every user and everything they created, so the app can be tested from a clean
-- slate as many times as needed (sign in with Google -> new account -> full onboarding again).
-- Run it by hand in the Supabase SQL editor. It is NOT a migration (it lives outside
-- supabase/migrations on purpose) and must never be run against a project with real users.
--
-- Erased:  users and their Google identities and sessions (auth), profiles, photos rows,
--          interests picked, time slot registrations, audit log, and the photo files of the
--          develop bucket (step 2).
-- Kept:    the catalogs (genders, partner_preferences, interests, outing_types, time_slots, zones), the schema, the
--          production bucket and the dashboard's .emptyFolderPlaceholder files.
--
-- Step 1 (data) and step 2 (files) are separate transactions: if step 2 fails, the data is
-- already clean. Step 2 deletes the files' rows in storage.objects, which Supabase only allows
-- with the setting below. That removes the files from the app and the dashboard, but Supabase
-- warns that SQL does not always free the space in the underlying storage. For a thorough wipe
-- use the dashboard instead: Storage -> develop -> users -> select the user folders -> Delete.

-- Step 1: the data.
begin;

-- Children first. The foreign keys to auth.users have no cascade on created_by / updated_by /
-- deleted_by / changed_by, so those rows must be gone before the users are.
delete from time_slot_registrations;
delete from profile_interests;
delete from profile_outing_types;
delete from profile_photos;
delete from profiles;
-- The registrations delete above fires the audit trigger, so the audit log is cleared after it.
delete from audit_log;

-- Cascades to auth.identities, auth.sessions and auth.refresh_tokens.
delete from auth.users;

commit;

-- Step 2: the photo files of the develop bucket.
begin;
set local storage.allow_delete_query = 'true';
delete from storage.objects
where bucket_id = 'develop'
  and name like 'users/%'
  and name <> 'users/.emptyFolderPlaceholder';
commit;

-- What is left (all users/profile tables should be 0, catalogs untouched):
select
  (select count(*) from auth.users)                as users,
  (select count(*) from profiles)                  as profiles,
  (select count(*) from profile_photos)            as profile_photos,
  (select count(*) from profile_interests)         as profile_interests,
  (select count(*) from profile_outing_types)      as profile_outing_types,
  (select count(*) from time_slot_registrations)   as time_slot_registrations,
  (select count(*) from audit_log)                 as audit_log,
  (select count(*) from genders)                   as genders_kept,
  (select count(*) from partner_preferences)       as partner_preferences_kept,
  (select count(*) from interests)                 as interests_kept,
  (select count(*) from time_slots)                as time_slots_kept,
  (select count(*) from zones)                     as zones_kept,
  (select count(*) from storage.objects
     where bucket_id = 'develop' and name <> 'users/.emptyFolderPlaceholder') as develop_files_left;
