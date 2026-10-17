-- DEV ONLY. Loads test data so the app can be tried end to end. Run it by hand in the Supabase SQL
-- editor (or through the MCP), after reset_dev_data.sql. It is NOT a migration and must never be
-- run against a project with real users.
--
-- Safe to run again: it first removes the users it created before (same ids) and loads them again,
-- with the times moved to "now".
--
-- What it creates
--   * 9 test people, one for each gender x who they look for (men / women / everyone), with a name,
--     age, bio, a photo row, interests and outing types. They cannot sign in: they are only "the
--     others" that share turns with you. Their email ends in @seed.corazones.dev.
--         Juan (male, men)   -> women       Mateo (male, men)   -> men      Lucas (male)   -> everyone
--         Sofia (female)     -> men         Valentina (female)  -> women    Lucia (female) -> everyone
--         Alex (other)       -> men         Sol (other)         -> women    Ale (other)    -> everyone
--   * Their registrations, relative to now() in the default zone's clock:
--         Juan, Sofia, Lucia      signed up for the NEXT turn (starts at the next hour on the dot)
--         Mateo, Valentina        signed up for the turn that started this hour (in progress)
--         Lucas, Alex             signed up for the turn that started one hour ago (still running)
--         Sol, Ale                not signed up
--   * Optionally, YOUR account's situation (see "Your account" below), to see each state of the
--     "Proximo turno" card on the Main screen.
--
-- Not here yet: positions and "entered the turn" check-ins. Those tables arrive with the ticket
-- that adds entering a turn, and this seed grows with it. The photo rows point to files that do not
-- exist (the images will not load); nobody needs the real pictures yet.

-- ---------------------------------------------------------------------------------------------
-- Your account. Edit these two lines, then run the whole file.
--   my_email    the Google account you sign in to the app with (it must have signed in once).
--   my_scenario 'none'         no registration (the card shows the countdown and "Anotarme")
--               'waiting'      you are signed up for the next turn ("Anotado", countdown to start)
--               'in_progress'  you are in a turn that started 1 hour ago (turn "en curso"; whether
--                              the card also says "ya usaste tu turno" depends on the day, as
--                              the quota is per day of the turn start)
--               'used_today'   you already used today's turn earlier ("Ya usaste tu turno, garpa
--                              para mas" and the countdown to 00:00). Between 23:00 and 24:00
--                              there is no earlier slot left today, so nothing is created.
-- ---------------------------------------------------------------------------------------------
do $seed$
declare
  my_email text := 'corazones.arg@gmail.com';
  my_scenario text := 'none';

  v_zone_id uuid;
  v_tz text;
  v_hour0 timestamp; -- local start of the current hour
  v_me uuid;
  v_ids uuid[] := array(
    select ('5eed0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid from generate_series(1, 9) n
  );
  v_names text[] := array['Juan', 'Mateo', 'Lucas', 'Sofia', 'Valentina', 'Lucia', 'Alex', 'Sol', 'Ale'];
  v_ages int[] := array[28, 31, 26, 27, 29, 25, 24, 30, 33];
  v_genders text[] := array['male', 'male', 'male', 'female', 'female', 'female', 'other', 'other', 'other'];
  v_prefs text[] := array['women', 'men', 'everyone', 'men', 'women', 'everyone', 'men', 'women', 'everyone'];
  -- Hours from the current hour on the dot; null = not signed up. 1 = next turn, 0 = this hour's, -1 = one hour ago.
  v_offsets int[] := array[1, 0, -1, 1, 0, 1, -1, null, null]::int[];
  n int;
begin
  assert my_scenario in ('none', 'waiting', 'in_progress', 'used_today'), 'my_scenario: none | waiting | in_progress | used_today';

  select z.id, z.timezone into v_zone_id, v_tz from zones z where z.is_default;
  assert v_zone_id is not null, 'there is no default zone';
  v_hour0 := date_trunc('hour', now() at time zone v_tz);

  -- Remove a previous run (children first, as the reset does).
  delete from time_slot_registrations where user_id = any (v_ids);
  delete from profile_interests where user_id = any (v_ids);
  delete from profile_outing_types where user_id = any (v_ids);
  delete from profile_photos where user_id = any (v_ids);
  delete from profiles where user_id = any (v_ids);
  delete from auth.users where id = any (v_ids);

  for n in 1..9 loop
    -- The trigger on auth.users creates the profile and copies the name from full_name.
    insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (
      '00000000-0000-0000-0000-000000000000', v_ids[n], 'authenticated', 'authenticated',
      lower(v_names[n]) || '@seed.corazones.dev',
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('full_name', v_names[n]),
      now(), now()
    );

    update profiles
    set age = v_ages[n],
        bio = 'Seed: ' || v_genders[n] || ' que busca ' || v_prefs[n],
        gender_id = (select id from genders where code = v_genders[n]),
        partner_preference_id = (select id from partner_preferences where code = v_prefs[n])
    where user_id = v_ids[n];

    -- A photo row makes the onboarding count as done (the file itself does not exist).
    insert into profile_photos (user_id, storage_path, sort_order)
    values (v_ids[n], 'users/' || v_ids[n] || '/profile/seed.webp', 0);

    insert into profile_interests (user_id, interest_id)
    select v_ids[n], i.id from interests i
    where i.active and i.id in ((n - 1) % 16 + 1, n % 16 + 1, (n + 1) % 16 + 1);

    insert into profile_outing_types (user_id, outing_type_id)
    select v_ids[n], o.id from outing_types o
    where o.active and o.id in ((n - 1) % 17 + 1, (n + 3) % 17 + 1);

    if v_offsets[n] is not null then
      insert into time_slot_registrations (
        user_id, time_slot_id, zone_id, day, starts_at, ends_at, registered_at, disclaimer_accepted_at
      )
      select
        v_ids[n], ts.id, v_zone_id,
        (v_hour0 + v_offsets[n] * interval '1 hour')::date,
        (v_hour0 + v_offsets[n] * interval '1 hour') at time zone v_tz,
        (v_hour0 + v_offsets[n] * interval '1 hour') at time zone v_tz + ts.duration_minutes * interval '1 minute',
        now(),
        now()
      from time_slots ts
      where ts.start_time = (v_hour0 + v_offsets[n] * interval '1 hour')::time;
    end if;
  end loop;

  -- Your account.
  select id into v_me from auth.users where email = my_email;
  if v_me is null then
    raise notice 'No user with email % yet: sign in to the app once with it and run this file again to set a scenario.', my_email;
  else
    delete from time_slot_registrations where user_id = v_me;

    if my_scenario in ('waiting', 'in_progress') then
      insert into time_slot_registrations (
        user_id, time_slot_id, zone_id, day, starts_at, ends_at, registered_at, disclaimer_accepted_at
      )
      select
        v_me, ts.id, v_zone_id,
        (v_hour0 + s.off * interval '1 hour')::date,
        (v_hour0 + s.off * interval '1 hour') at time zone v_tz,
        (v_hour0 + s.off * interval '1 hour') at time zone v_tz + ts.duration_minutes * interval '1 minute',
        now(),
        now()
      from (select case my_scenario when 'waiting' then 1 else -1 end as off) s
      join time_slots ts on ts.start_time = (v_hour0 + s.off * interval '1 hour')::time;
    elsif my_scenario = 'used_today' then
      -- Today's quota is spent by the slot that starts at 00:00 of the day the next turn belongs to.
      if (v_hour0 + interval '1 hour')::date::timestamp < v_hour0 + interval '1 hour' then
        insert into time_slot_registrations (
          user_id, time_slot_id, zone_id, day, starts_at, ends_at, registered_at, disclaimer_accepted_at
        )
        select
          v_me, ts.id, v_zone_id,
          (v_hour0 + interval '1 hour')::date,
          (v_hour0 + interval '1 hour')::date::timestamp at time zone v_tz,
          (v_hour0 + interval '1 hour')::date::timestamp at time zone v_tz + ts.duration_minutes * interval '1 minute',
          now(),
          now()
        from time_slots ts
        where ts.start_time = '00:00';
      else
        raise notice 'Between 23:00 and 24:00 local there is no earlier slot today: no registration created for used_today.';
      end if;
    end if;
  end if;
end
$seed$;

-- What is loaded (9 seed users, their registrations, and yours if the scenario created one).
select
  (select count(*) from auth.users where email like '%@seed.corazones.dev') as seed_users,
  (select count(*) from time_slot_registrations r join auth.users u on u.id = r.user_id
     where u.email like '%@seed.corazones.dev') as seed_registrations,
  (select count(*) from time_slot_registrations r join auth.users u on u.id = r.user_id
     where u.email not like '%@seed.corazones.dev') as other_users_registrations;
