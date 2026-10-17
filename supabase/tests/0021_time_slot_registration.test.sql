-- Checks for migration 0021 (time slot registration). Not a migration: run it by hand, in the SQL
-- editor or through the Supabase MCP, AFTER 0021 is applied (or pasted right after the migration's
-- text, to try it before applying it).
--
-- It ends by raising an exception on purpose, so everything it creates (users, profiles,
-- registrations) is rolled back and nothing stays in the database. Read the result in the error:
--   "ALL OK: n checks passed"      -> every check passed
--   anything else                  -> the first check that failed
--
-- Times are Argentina (UTC-3, no daylight saving). 2026-10-16 is a Friday.

do $test$
declare
  v_checks int := 0;
  v_user uuid := '00000000-0000-4000-8000-0000000000a1';
  v_user_b uuid := '00000000-0000-4000-8000-0000000000b2';
  v_user_c uuid := '00000000-0000-4000-8000-0000000000c3';
  v_user_d uuid := '00000000-0000-4000-8000-0000000000d4';
  v_status jsonb;
  v_slot_21 uuid;
  v_message text;
  -- Obelisco, La Plata (~55 km, inside the 60 km coverage), Cordoba (~650 km, outside).
  c_obelisco_lat constant double precision := -34.6037;
  c_obelisco_lng constant double precision := -58.3816;
  c_la_plata_lat constant double precision := -34.9214;
  c_la_plata_lng constant double precision := -57.9545;
  c_cordoba_lat constant double precision := -31.4201;
  c_cordoba_lng constant double precision := -64.1888;

  v_paris_start timestamptz;
  v_rows int;
begin
  -- Fixtures -------------------------------------------------------------------------------------
  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    (v_user,   'authenticated', 'authenticated', 'a@test.local', '{"full_name": "Ana"}'),
    (v_user_b, 'authenticated', 'authenticated', 'b@test.local', '{"full_name": "Beto"}'),
    (v_user_c, 'authenticated', 'authenticated', 'c@test.local', '{"full_name": "Cami"}'),
    (v_user_d, 'authenticated', 'authenticated', 'd@test.local', '{}');

  -- A, B and C finish onboarding. D keeps an empty name and no photo.
  update profiles set gender_id = 1, partner_preference_id = 2 where user_id in (v_user, v_user_b, v_user_c);
  insert into profile_photos (user_id, storage_path, sort_order)
  select u, 'users/' || u || '/profile/x.webp', 0 from unnest(array[v_user, v_user_b, v_user_c]) u;

  perform 1 from profiles where user_id = v_user and onboarding_completed_at is not null;
  assert found, 'fixture: user A should have finished onboarding';

  -- Structure ------------------------------------------------------------------------------------
  assert (select count(*) from zones where is_default) = 1, 'one default zone';
  assert (select timezone from zones where code = 'buenos_aires') = 'America/Argentina/Buenos_Aires', 'BA timezone';
  assert (select count(*) from time_slots where active) = 24, 'all 24 slots start active';
  v_checks := v_checks + 3;

  -- Status: next slot is the next hour on the dot --------------------------------------------------
  -- 20:37 Argentina = 23:37 UTC -> next slot 21:00 Argentina.
  v_status := compute_time_slot_status(v_user, '2026-10-16 23:37:00+00');
  assert v_status #>> '{next_slot,local_time}' = '21:00', 'next slot at 20:37 is 21:00, got ' || (v_status #>> '{next_slot,local_time}');
  assert (v_status #>> '{next_slot,starts_at}')::timestamptz = '2026-10-17 00:00:00+00', 'starts_at is 21:00 ART in UTC';
  assert (v_status #>> '{next_slot,ends_at}')::timestamptz = '2026-10-17 02:00:00+00', 'a slot lasts 2 hours';
  assert (v_status #>> '{next_slot,quota_used}')::boolean = false, 'quota is free';
  assert (v_status #>> '{next_slot,quota_resets_at}')::timestamptz = '2026-10-17 03:00:00+00', 'quota renews 00:00 ART';
  assert (v_status #>> '{next_slot,registrable_from}')::timestamptz = '2026-10-16 23:00:00+00', 'registrable from 1 h before';
  assert jsonb_array_length(v_status -> 'registrations') = 0, 'no registrations yet';
  assert v_status #>> '{zone,code}' = 'buenos_aires', 'default zone before any registration';
  v_checks := v_checks + 8;

  -- Exactly on the hour: the slot starting right now is not the next one (sign up closes at start).
  v_status := compute_time_slot_status(v_user, '2026-10-17 00:00:00+00');
  assert v_status #>> '{next_slot,local_time}' = '22:00', 'at 21:00:00 sharp the next slot is 22:00';
  v_checks := v_checks + 1;

  -- Sign up: errors, in the documented order ---------------------------------------------------------
  begin
    perform register_time_slot_at(v_user_d, '2026-10-16 23:37:00+00', c_obelisco_lat, c_obelisco_lng, true);
    assert false, 'profile_incomplete should have been raised';
  exception when others then
    get stacked diagnostics v_message = message_text;
    assert v_message = 'profile_incomplete', 'user without onboarding: ' || v_message;
  end;

  -- Onboarded but empty name is incomplete too.
  update profiles set name = '  ' where user_id = v_user_c;
  begin
    perform register_time_slot_at(v_user_c, '2026-10-16 23:37:00+00', c_obelisco_lat, c_obelisco_lng, true);
    assert false, 'profile_incomplete (blank name) should have been raised';
  exception when others then
    get stacked diagnostics v_message = message_text;
    assert v_message = 'profile_incomplete', 'blank name: ' || v_message;
  end;
  update profiles set name = 'Cami' where user_id = v_user_c;

  begin
    perform register_time_slot_at(v_user, '2026-10-16 23:37:00+00', c_obelisco_lat, c_obelisco_lng, false);
    assert false, 'disclaimer_required should have been raised';
  exception when others then
    get stacked diagnostics v_message = message_text;
    assert v_message = 'disclaimer_required', 'no disclaimer: ' || v_message;
  end;

  begin
    perform register_time_slot_at(v_user, '2026-10-16 23:37:00+00', c_cordoba_lat, c_cordoba_lng, true);
    assert false, 'out_of_zone should have been raised';
  exception when others then
    get stacked diagnostics v_message = message_text;
    assert v_message = 'out_of_zone', 'Cordoba: ' || v_message;
  end;

  begin
    perform register_time_slot_at(v_user, '2026-10-16 23:37:00+00', null, null, true);
    assert false, 'invalid_location should have been raised';
  exception when others then
    get stacked diagnostics v_message = message_text;
    assert v_message = 'invalid_location', 'null location: ' || v_message;
  end;
  v_checks := v_checks + 5;

  -- Nothing was written by the failures.
  assert (select count(*) from time_slot_registrations
          where user_id in (v_user, v_user_b, v_user_c, v_user_d)) = 0, 'failed attempts write nothing';
  v_checks := v_checks + 1;

  -- Sign up: success, and the position is not stored -----------------------------------------------
  v_status := register_time_slot_at(v_user, '2026-10-16 23:37:00+00', c_la_plata_lat, c_la_plata_lng, true);
  assert jsonb_array_length(v_status -> 'registrations') = 1, 'registered';
  assert v_status #>> '{registrations,0,local_time}' = '21:00', 'registered for 21:00';
  assert (v_status #>> '{next_slot,quota_used}')::boolean, 'quota used after registering';

  select id into v_slot_21 from time_slots where start_time = '21:00';
  assert exists (
    select 1 from time_slot_registrations
    where user_id = v_user and time_slot_id = v_slot_21 and day = '2026-10-16'
      and starts_at = '2026-10-17 00:00:00+00' and ends_at = '2026-10-17 02:00:00+00'
      and disclaimer_accepted_at = '2026-10-16 23:37:00+00'
      and zone_id = (select id from zones where code = 'buenos_aires')
  ), 'registration row has slot, day, times, consent and zone';
  assert not exists (
    select 1 from information_schema.columns
    where table_name = 'time_slot_registrations' and (column_name ilike '%lat%' or column_name ilike '%lng%' or column_name ilike '%location%')
  ), 'no column can hold the position';
  v_checks := v_checks + 4;

  -- The audit log kept the consent.
  assert exists (select 1 from audit_log where table_name = 'time_slot_registrations' and action = 'INSERT'), 'audit row';
  v_checks := v_checks + 1;

  -- One per day ------------------------------------------------------------------------------------
  begin
    perform register_time_slot_at(v_user, '2026-10-16 23:40:00+00', c_obelisco_lat, c_obelisco_lng, true);
    assert false, 'already_used_today should have been raised';
  exception when others then
    get stacked diagnostics v_message = message_text;
    assert v_message = 'already_used_today', 'second try at 20:40, same 21:00 slot and day: ' || v_message;
  end;
  v_checks := v_checks + 1;

  -- Status while the person is signed up but the slot has not started: nothing in progress yet.
  v_status := compute_time_slot_status(v_user, '2026-10-16 23:50:00+00');
  assert (v_status #>> '{registrations,0,starts_at}')::timestamptz > '2026-10-16 23:50:00+00', 'registration still upcoming';
  v_checks := v_checks + 1;

  -- 23:30 -> the 00:00 slot belongs to TOMORROW (day = the day the slot starts) -----------------------
  -- B signs up at 23:30 Argentina (02:30 UTC the 17th) for the 00:00 slot.
  v_status := register_time_slot_at(v_user_b, '2026-10-17 02:30:00+00', c_obelisco_lat, c_obelisco_lng, true);
  assert v_status #>> '{registrations,0,local_time}' = '00:00', 'B registered for 00:00';
  assert exists (
    select 1 from time_slot_registrations where user_id = v_user_b and day = '2026-10-17'
  ), '23:30 -> 00:00 slot is tomorrow''s (day 2026-10-17), not the day of the sign up';
  v_checks := v_checks + 2;

  -- ...and B can still sign up for TODAY'S last slots? No: it is one per day, and 01:00 is also the 17th.
  begin
    perform register_time_slot_at(v_user_b, '2026-10-17 03:10:00+00', c_obelisco_lat, c_obelisco_lng, true);
    assert false, 'B: 00:00 slot already used the 17th';
  exception when others then
    get stacked diagnostics v_message = message_text;
    assert v_message = 'already_used_today', 'B at 00:10 for 01:00 (same day as 00:00): ' || v_message;
  end;
  v_checks := v_checks + 1;

  -- A slot from yesterday still running after midnight does NOT block the new day --------------------
  -- A registered the 21:00 slot (16th, ends 23:00 ART). Use C: register the 23:00 slot at 22:30 ART
  -- (day = 16th, ends 01:00 ART on the 17th), then at 00:30 ART (17th) sign up for 01:00.
  v_status := register_time_slot_at(v_user_c, '2026-10-17 01:30:00+00', c_obelisco_lat, c_obelisco_lng, true);
  assert v_status #>> '{registrations,0,local_time}' = '23:00', 'C registered for 23:00 at 22:30';
  v_status := compute_time_slot_status(v_user_c, '2026-10-17 03:30:00+00');
  assert jsonb_array_length(v_status -> 'registrations') = 1, 'C: the 23:00 slot is still running at 00:30';
  assert (v_status #>> '{registrations,0,starts_at}')::timestamptz <= '2026-10-17 03:30:00+00'
     and (v_status #>> '{registrations,0,ends_at}')::timestamptz > '2026-10-17 03:30:00+00', 'it is in progress';
  assert (v_status #>> '{next_slot,quota_used}')::boolean = false, 'new day: quota is free again';
  v_status := register_time_slot_at(v_user_c, '2026-10-17 03:30:00+00', c_obelisco_lat, c_obelisco_lng, true);
  assert jsonb_array_length(v_status -> 'registrations') = 2, 'C: in progress + the new one';
  -- Once that one is used, no more until the next 00:00.
  begin
    perform register_time_slot_at(v_user_c, '2026-10-17 04:10:00+00', c_obelisco_lat, c_obelisco_lng, true);
    assert false, 'C: second of the 17th should fail';
  exception when others then
    get stacked diagnostics v_message = message_text;
    assert v_message = 'already_used_today', 'C second of the day: ' || v_message;
  end;
  v_checks := v_checks + 6;

  -- Switched-off slots -----------------------------------------------------------------------------
  -- Only 19:00 to 02:00 enabled. At 10:00 ART the next enabled slot is 19:00, 9 hours ahead.
  update time_slots set active = false where start_time between '02:01' and '18:59';
  v_status := compute_time_slot_status(v_user_b, '2026-10-17 13:00:00+00'); -- 10:00 ART
  assert v_status #>> '{next_slot,local_time}' = '19:00', 'next ENABLED slot at 10:00 is 19:00, got ' || (v_status #>> '{next_slot,local_time}');
  assert (v_status #>> '{next_slot,registrable_from}')::timestamptz = '2026-10-17 21:00:00+00', 'registrable from 18:00 ART';
  begin
    perform register_time_slot_at(v_user_b, '2026-10-17 13:00:00+00', c_obelisco_lat, c_obelisco_lng, true);
    assert false, 'slot_inactive should have been raised';
  exception when others then
    get stacked diagnostics v_message = message_text;
    -- B used the 17th at 00:00, so day check would fire first if the slot were found: slot_inactive wins (checked before).
    assert v_message = 'slot_inactive', 'next hour (11:00) is off: ' || v_message;
  end;
  update time_slots set active = false;
  v_status := compute_time_slot_status(v_user_b, '2026-10-17 13:00:00+00');
  assert v_status -> 'next_slot' = 'null'::jsonb, 'no active slot at all -> next_slot null';
  update time_slots set active = true;
  v_checks := v_checks + 4;

  -- Another zone, another clock: Paris, 22:37 summer time (CEST, UTC+2) -> next slot 23:00 local.
  insert into zones (code, timezone, center, coverage_radius_km, match_radius_km)
  values ('paris', 'Europe/Paris',
          extensions.st_setsrid(extensions.st_point(2.3522, 48.8566), 4326)::extensions.geography, 30, 25);
  select starts_at into v_paris_start
  from next_active_time_slot((select id from zones where code = 'paris'), '2026-10-16 20:37:00+00');
  assert v_paris_start = '2026-10-16 21:00:00+00', 'Paris 23:00 CEST is 21:00 UTC, got ' || v_paris_start;
  v_checks := v_checks + 1;

  -- Privileges: the helpers are not callable by the app, the two RPCs are for signed-in users only -------
  assert not has_function_privilege('authenticated', 'compute_time_slot_status(uuid, timestamptz)', 'execute'), 'helper closed to authenticated';
  assert not has_function_privilege('authenticated', 'register_time_slot_at(uuid, timestamptz, double precision, double precision, boolean)', 'execute'), 'helper closed to authenticated (2)';
  assert not has_function_privilege('anon', 'get_time_slot_status()', 'execute'), 'RPC closed to anon';
  assert not has_function_privilege('anon', 'register_for_next_time_slot(double precision, double precision, boolean)', 'execute'), 'RPC closed to anon (2)';
  assert has_function_privilege('authenticated', 'get_time_slot_status()', 'execute'), 'RPC open to authenticated';
  assert has_function_privilege('authenticated', 'register_for_next_time_slot(double precision, double precision, boolean)', 'execute'), 'RPC open to authenticated (2)';
  v_checks := v_checks + 6;

  -- As the app would call it: role authenticated + a JWT --------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_user_d, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- The Main screen status works for a signed-in user, even before onboarding.
  v_status := get_time_slot_status();
  assert v_status -> 'next_slot' <> 'null'::jsonb, 'RPC status has a next slot';
  assert abs(extract(epoch from ((v_status ->> 'server_now')::timestamptz - clock_timestamp()))) < 5, 'server_now is the server clock';

  -- The RPC checks the profile first.
  begin
    perform register_for_next_time_slot(c_obelisco_lat, c_obelisco_lng, true);
    assert false, 'RPC should reject an incomplete profile';
  exception when others then
    get stacked diagnostics v_message = message_text;
    assert v_message = 'profile_incomplete', 'RPC profile_incomplete: ' || v_message;
  end;

  -- A direct insert from the client is rejected (no insert policy), as is an update of a registration.
  begin
    insert into time_slot_registrations (user_id, time_slot_id, zone_id, day, starts_at, ends_at, disclaimer_accepted_at)
    select v_user_d, ts.id, z.id, '2026-10-20', '2026-10-20 00:00:00+00', '2026-10-20 02:00:00+00', now()
    from time_slots ts, zones z where ts.start_time = '21:00' and z.is_default;
    assert false, 'direct insert should be rejected';
  exception when insufficient_privilege then
    null; -- row-level security: expected
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  update time_slot_registrations set ends_at = ends_at + interval '1 day' where user_id = v_user;
  get diagnostics v_rows = row_count;
  assert v_rows = 0, 'a client update changes no registration';
  assert (select count(*) from time_slot_registrations where user_id = v_user) = 1, 'a user reads their own registration (A)';
  reset role;
  v_checks := v_checks + 6;

  raise exception 'ALL OK: % checks passed', v_checks;
end
$test$;
