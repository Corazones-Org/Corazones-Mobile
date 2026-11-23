-- COR-21: shorter slots, a wider match radius, and how many people signed up for the next slot.
--
-- 1. A slot lasts 55 minutes: it starts on the hour and ends at :55. The last 5 minutes of the hour
--    are free, so slots never overlap, and a person whose slot just ended can sign up for the next
--    one (when the day's quota allows it) and keep using the app. Before this, slots lasted 2 hours
--    and ran into each other.
-- 2. Two people in a zone see each other up to 80 km apart (it was 50 km).
-- 3. get_time_slot_status() tells how many people signed up for the next slot, so the Main screen
--    can show it before the person signs up. Only the number: never who.

-- 1. Slot length ------------------------------------------------------------------------------
update time_slots set duration_minutes = 55;
alter table time_slots
  alter column duration_minutes set default 55,
  -- A slot ends before the next hour starts: one slot at a time.
  add constraint time_slots_duration_within_hour check (duration_minutes between 1 and 60);

-- Registrations keep the end they were given; move the ones that have not ended yet to 55 minutes.
update time_slot_registrations
set ends_at = starts_at + interval '55 minutes'
where ends_at > now() and ends_at > starts_at + interval '55 minutes';

-- 2. Match radius -----------------------------------------------------------------------------
update zones set match_radius_km = 80 where code = 'buenos_aires';

-- 3. Status with the number of people signed up for the next slot -----------------------------
-- Same as in 0021, plus next_slot.registered_count.
create or replace function compute_time_slot_status(p_user uuid, p_now timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_zone zones;
  v_next record;
  v_registrations jsonb;
  v_next_json jsonb := null;
begin
  -- The zone of the person's latest registration, otherwise the default zone.
  select z.* into v_zone
  from zones z
  where z.id = coalesce(
    (select r.zone_id from time_slot_registrations r
      where r.user_id = p_user and r.deleted_at is null
      order by r.starts_at desc limit 1),
    (select d.id from zones d where d.is_default and d.active limit 1)
  );
  if not found then
    raise exception 'no_zone';
  end if;

  -- Registrations that have not ended: at most the one in progress and the ones about to start.
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'time_slot_id', r.time_slot_id,
      'starts_at', r.starts_at,
      'ends_at', r.ends_at,
      'local_time', to_char(r.starts_at at time zone z.timezone, 'HH24:MI')
    ) order by r.starts_at), '[]'::jsonb)
  into v_registrations
  from time_slot_registrations r
  join zones z on z.id = r.zone_id
  where r.user_id = p_user and r.deleted_at is null and r.ends_at > p_now;

  select * into v_next from next_active_time_slot(v_zone.id, p_now);
  if found then
    v_next_json := jsonb_build_object(
      'time_slot_id', v_next.time_slot_id,
      'starts_at', v_next.starts_at,
      'ends_at', v_next.ends_at,
      'local_time', to_char(v_next.starts_at at time zone v_zone.timezone, 'HH24:MI'),
      -- Can be signed up now: it is the very next hour (otherwise the hours in between are switched off).
      'registrable_from', v_next.starts_at - interval '1 hour',
      -- Has the person already used the quota of the day this slot belongs to?
      'quota_used', exists (
        select 1 from time_slot_registrations r
        where r.user_id = p_user and r.deleted_at is null and r.day = v_next.local_day
      ),
      -- When that day's quota renews: 00:00 zone time of the following day.
      'quota_resets_at', (v_next.local_day + 1)::timestamp at time zone v_zone.timezone,
      -- People signed up for this slot in this zone (the person included, if signed up).
      'registered_count', (
        select count(*) from time_slot_registrations r
        where r.zone_id = v_zone.id and r.deleted_at is null and r.starts_at = v_next.starts_at
      )
    );
  end if;

  return jsonb_build_object(
    'server_now', p_now,
    'zone', jsonb_build_object('code', v_zone.code, 'timezone', v_zone.timezone),
    'next_slot', v_next_json,
    'registrations', v_registrations
  );
end;
$$;

-- create or replace keeps the grants, but be explicit: the helper is never callable from the client.
revoke execute on function compute_time_slot_status(uuid, timestamptz) from public, anon, authenticated;

-- Counting by slot start and zone, for every status request.
create index time_slot_registrations_zone_starts_at_idx
  on time_slot_registrations (zone_id, starts_at)
  where deleted_at is null;
