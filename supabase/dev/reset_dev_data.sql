-- DEV ONLY. Erases user data so the app can be tested again, as many times as needed. Run it by
-- hand in the Supabase SQL editor (or through the MCP). It is NOT a migration (it lives outside
-- supabase/migrations on purpose) and must never be run against a project with real users.
--
-- ---------------------------------------------------------------------------------------------
-- Pick what to erase. Edit these two lines, then run the whole file.
--   mode      'everything'  every account and everything they created: start from scratch
--                           (sign in with Google -> new account -> full onboarding again).
--             'keep_me'     every account except my_email, and my_email's time slot
--                           registrations. Your profile, photos and onboarding stay.
--             'turns_only'  only the time slot registrations, of everyone. Accounts and profiles
--                           stay. The quickest way to sign up for a turn again today.
--   my_email  only used by 'keep_me': the Google account to keep (it must have signed in once).
-- ---------------------------------------------------------------------------------------------
--
-- Erased ('everything'): users and their Google identities and sessions (auth), profiles, photo
--          rows, interests and outing types picked, time slot registrations, the audit log, and
--          the photo files under users/ in the develop bucket.
-- Kept (always): the catalogs (genders, partner_preferences, partner_preference_genders,
--          interests, outing_types, time_slots, zones), the schema, the production bucket and the
--          dashboard's .emptyFolderPlaceholder files.
--
-- Safety check: after erasing, every table in public that is not a catalog must be empty (with
-- 'keep_me': hold only my_email's rows). If someone adds a table with user data and forgets to add
-- it here, the script stops with an error naming the table, and nothing is erased (the whole block
-- runs as one transaction). When that happens, add the table below and to the seed, and, if it is
-- a catalog, to v_catalogs.
--
-- Files: deleting rows in storage.objects removes the files from the app and the dashboard, but
-- Supabase warns that SQL does not always free the space in the underlying storage. For a thorough
-- wipe use the dashboard: Storage -> develop -> users -> select the user folders -> Delete. If the
-- file delete fails, the data is still erased and a warning says so.
--
-- To load test people and turns afterwards, run seed_dev_data.sql.

do $reset$
declare
  mode text := 'everything';
  my_email text := 'corazones.arg@gmail.com';

  v_catalogs text[] := array[
    'genders', 'partner_preferences', 'partner_preference_genders', 'interests', 'outing_types',
    'time_slots', 'zones'
  ];
  v_me uuid;
  v_table text;
  v_has_user_id boolean;
  v_left bigint;
  v_files bigint;
begin
  assert mode in ('everything', 'keep_me', 'turns_only'), 'mode: everything | keep_me | turns_only';

  if mode = 'keep_me' then
    select id into v_me from auth.users where email = my_email;
    if v_me is null then
      raise exception 'keep_me: no user with email % (sign in to the app once with it first)', my_email;
    end if;
  end if;

  -- The registrations of everyone go in every mode.
  delete from time_slot_registrations;

  if mode = 'turns_only' then
    -- The delete above fired the audit trigger: drop those rows and the older ones of that table.
    delete from audit_log where table_name = 'time_slot_registrations';
  else
    -- Children first. The foreign keys to auth.users have no cascade on created_by / updated_by /
    -- deleted_by / changed_by, so those rows must be gone before the users are.
    delete from profile_interests where user_id is distinct from v_me;
    delete from profile_outing_types where user_id is distinct from v_me;
    delete from profile_photos where user_id is distinct from v_me;
    delete from profiles where user_id is distinct from v_me;
    -- The deletes above fire the audit trigger, so the audit log is cleared after them.
    delete from audit_log;

    -- Cascades to auth.identities, auth.sessions and auth.refresh_tokens.
    delete from auth.users where id is distinct from v_me;

    -- Photo files of the develop bucket (with 'keep_me', those under users/<my id>/ stay).
    begin
      perform set_config('storage.allow_delete_query', 'true', true);
      delete from storage.objects
      where bucket_id = 'develop'
        and name like 'users/%'
        and name <> 'users/.emptyFolderPlaceholder'
        and (v_me is null or name not like 'users/' || v_me || '/%');
      get diagnostics v_files = row_count;
      raise notice 'develop bucket: % files deleted', v_files;
    exception when others then
      raise warning 'The data is erased, but the develop files were not: %. Delete them from the dashboard.', sqlerrm;
    end;
  end if;

  -- Safety check: no user data left in any table that is not a catalog.
  for v_table in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname <> all (v_catalogs)
      -- Tables that belong to an extension are not ours.
      and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
    order by c.relname
  loop
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = v_table and column_name = 'user_id'
    ) into v_has_user_id;

    if mode = 'turns_only' then
      continue when v_table <> 'time_slot_registrations';
      execute format('select count(*) from public.%I', v_table) into v_left;
    elsif mode = 'keep_me' and v_has_user_id then
      execute format('select count(*) from public.%I where user_id is distinct from $1', v_table)
        into v_left using v_me;
    else
      execute format('select count(*) from public.%I', v_table) into v_left;
    end if;

    if v_left > 0 then
      raise exception 'Reset incomplete: public.% still has % rows of user data. Add it to reset_dev_data.sql (or to v_catalogs if it is a catalog).', v_table, v_left;
    end if;
  end loop;

  if mode = 'everything' then
    select count(*) into v_left from auth.users;
  elsif mode = 'keep_me' then
    select count(*) into v_left from auth.users where id <> v_me;
  else
    v_left := 0;
  end if;
  if v_left > 0 then
    raise exception 'Reset incomplete: auth.users still has % users that should be gone.', v_left;
  end if;

  raise notice 'Reset done (mode %).', mode;
end
$reset$;

-- What is left. User tables: 0 after 'everything'; only your rows after 'keep_me'; only
-- time_slot_registrations at 0 after 'turns_only'. Catalogs: untouched.
select
  (select count(*) from auth.users)                  as users,
  (select count(*) from profiles)                    as profiles,
  (select count(*) from profile_photos)              as profile_photos,
  (select count(*) from profile_interests)           as profile_interests,
  (select count(*) from profile_outing_types)        as profile_outing_types,
  (select count(*) from time_slot_registrations)     as time_slot_registrations,
  (select count(*) from audit_log)                   as audit_log,
  (select count(*) from storage.objects
     where bucket_id = 'develop' and name <> 'users/.emptyFolderPlaceholder') as develop_files_left,
  (select count(*) from genders)                     as genders_kept,
  (select count(*) from partner_preferences)         as partner_preferences_kept,
  (select count(*) from partner_preference_genders)  as partner_preference_genders_kept,
  (select count(*) from interests)                   as interests_kept,
  (select count(*) from outing_types)                as outing_types_kept,
  (select count(*) from time_slots)                  as time_slots_kept,
  (select count(*) from zones)                       as zones_kept;
