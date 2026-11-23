-- COR-17: sign up for the next time slot.
--
-- Business rules (Confluence > Business Decisions > Turnos):
--   * One slot per person per day. The day is the zone-local date on which the slot STARTS, and the
--     quota renews at 00:00 zone time (signing up at 23:30 for the 00:00 slot uses tomorrow's slot).
--   * A person can only sign up for the next slot (the one starting at the next hour on the dot).
--     Never a slot in progress, never a past one. The client never sends a slot: the server decides.
--   * Signing up needs a complete onboarding and a name, an accepted disclaimer, and being inside an
--     enabled zone (the position is only checked, never stored).
--   * Every time is the server's. The device clock is never used.
--
-- Writes to time_slot_registrations go through register_for_next_time_slot() only.

-- 1. PostGIS ------------------------------------------------------------------------------------
-- In the `extensions` schema so its tables (spatial_ref_sys) are not exposed through the API.
create extension if not exists postgis with schema extensions;

-- 2. Zones --------------------------------------------------------------------------------------
-- A zone is a launched city: its official time zone, its centre and the radii. Launching a city is
-- inserting a row here, no app release needed.
create table zones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  timezone text not null,
  center extensions.geography(Point, 4326) not null,
  -- Inside this radius a person counts as "in the city" and can sign up.
  coverage_radius_km numeric not null check (coverage_radius_km > 0),
  -- Two people see each other when they are at most this far apart (used when entering a slot).
  match_radius_km numeric not null check (match_radius_km > 0),
  -- The zone whose clock is shown before the person has any registration.
  is_default boolean not null default false,
  active boolean not null default true
);

create unique index zones_one_default on zones (is_default) where is_default;

alter table zones enable row level security;

create policy "zones_select_authenticated"
  on zones for select
  to authenticated
  using (true);

insert into zones (code, timezone, center, coverage_radius_km, match_radius_km, is_default)
values (
  'buenos_aires',
  'America/Argentina/Buenos_Aires',
  extensions.st_setsrid(extensions.st_point(-58.3816, -34.6037), 4326)::extensions.geography, -- Obelisco
  60,
  50,
  true
);

-- 3. Slots can be switched off (open only the strong hours at launch) ---------------------------
alter table time_slots add column active boolean not null default true;

-- 4. Registrations ------------------------------------------------------------------------------
alter table time_slot_registrations
  add column zone_id uuid references zones(id) on delete restrict,
  add column starts_at timestamptz,
  add column ends_at timestamptz,
  add column disclaimer_accepted_at timestamptz;

-- Rows from before this migration (none expected) are moved to the default zone.
update time_slot_registrations r
set zone_id = z.id,
    starts_at = (r.day + ts.start_time) at time zone z.timezone,
    ends_at = (r.day + ts.start_time) at time zone z.timezone + ts.duration_minutes * interval '1 minute',
    disclaimer_accepted_at = coalesce(r.registered_at, now())
from zones z, time_slots ts
where z.is_default and ts.id = r.time_slot_id;

alter table time_slot_registrations
  alter column zone_id set not null,
  alter column starts_at set not null,
  alter column ends_at set not null,
  alter column disclaimer_accepted_at set not null,
  add constraint time_slot_registrations_ends_after_start check (ends_at > starts_at),
  -- `day` is the zone-local date of starts_at, written by the RPC. A UTC default put the 21:00-23:59
  -- (Argentina) registrations on the next day.
  alter column day drop default;

-- The consent is now a timestamp: when it was accepted. (The view selects *, so it goes first.)
drop view active_time_slot_registrations;
alter table time_slot_registrations drop column disclaimer_accepted;
create view active_time_slot_registrations
  with (security_invoker = true) as
  select * from time_slot_registrations where deleted_at is null;

-- The client never writes registrations directly (nor changes them): only the RPC below does.
drop policy "time_slot_registrations_insert_own" on time_slot_registrations;
drop policy "time_slot_registrations_update_own" on time_slot_registrations;

-- 5. Internal helpers (not callable from the client) --------------------------------------------
-- The hour-on-the-dot slots that follow `p_now` in the zone's local time, the first one that is
-- enabled. `hours_ahead = 1` means it is the very next hour (the only one that can be signed up).
create or replace function next_active_time_slot(p_zone_id uuid, p_now timestamptz)
returns table (
  time_slot_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  hours_ahead int,
  local_day date
)
language sql
stable
set search_path = pg_catalog, public
as $$
  with candidates as (
    select
      h,
      z.timezone,
      date_trunc('hour', p_now at time zone z.timezone) + h * interval '1 hour' as local_start
    from zones z, generate_series(1, 24) as h
    where z.id = p_zone_id
  )
  select
    ts.id,
    c.local_start at time zone c.timezone,
    c.local_start at time zone c.timezone + ts.duration_minutes * interval '1 minute',
    c.h,
    c.local_start::date
  from candidates c
  join time_slots ts on ts.start_time = c.local_start::time and ts.active
  order by c.h
  limit 1
$$;

-- Everything the Main screen needs, as of `p_now` (a parameter so tests can pick the time).
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
      'quota_resets_at', (v_next.local_day + 1)::timestamp at time zone v_zone.timezone
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

-- Signs `p_user` up for the next slot as of `p_now`. Errors are raised with the code as message.
create or replace function register_time_slot_at(
  p_user uuid,
  p_now timestamptz,
  p_lat double precision,
  p_lng double precision,
  p_disclaimer boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile profiles;
  v_zone zones;
  v_next record;
  v_point extensions.geography;
begin
  -- 1. Onboarding complete and a name.
  select * into v_profile from profiles where user_id = p_user and deleted_at is null;
  if not found
     or v_profile.onboarding_completed_at is null
     or btrim(coalesce(v_profile.name, '')) = '' then
    raise exception 'profile_incomplete';
  end if;

  -- 2. Disclaimer.
  if p_disclaimer is distinct from true then
    raise exception 'disclaimer_required';
  end if;

  -- 3. Enabled zone. The position is only used here, it is not stored.
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid_location';
  end if;
  v_point := extensions.st_setsrid(extensions.st_point(p_lng, p_lat), 4326)::extensions.geography;
  select z.* into v_zone
  from zones z
  where z.active and extensions.st_dwithin(z.center, v_point, z.coverage_radius_km * 1000)
  order by extensions.st_distance(z.center, v_point)
  limit 1;
  if not found then
    raise exception 'out_of_zone';
  end if;

  -- 4. The slot: the very next hour, and it has to be enabled.
  select * into v_next from next_active_time_slot(v_zone.id, p_now);
  if not found or v_next.hours_ahead <> 1 then
    raise exception 'slot_inactive';
  end if;

  -- 5. One slot per day (the day the slot starts, in the zone).
  if exists (
    select 1 from time_slot_registrations r
    where r.user_id = p_user and r.deleted_at is null and r.day = v_next.local_day
  ) then
    raise exception 'already_used_today';
  end if;

  begin
    insert into time_slot_registrations (
      user_id, time_slot_id, zone_id, day, starts_at, ends_at, registered_at, disclaimer_accepted_at
    ) values (
      p_user, v_next.time_slot_id, v_zone.id, v_next.local_day, v_next.starts_at, v_next.ends_at, p_now, p_now
    );
  exception when unique_violation then
    -- Two requests at the same time: the unique index (user, day) has the last word.
    raise exception 'already_used_today';
  end;

  return compute_time_slot_status(p_user, p_now);
end;
$$;

-- 6. RPCs the app calls ------------------------------------------------------------------------
create or replace function get_time_slot_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  return compute_time_slot_status(auth.uid(), clock_timestamp());
end;
$$;

create or replace function register_for_next_time_slot(
  p_lat double precision,
  p_lng double precision,
  p_disclaimer boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  return register_time_slot_at(auth.uid(), clock_timestamp(), p_lat, p_lng, p_disclaimer);
end;
$$;

-- Supabase grants EXECUTE on new functions to anon and authenticated by default: take it back from
-- the helpers, and leave the two RPCs to signed-in users only.
revoke execute on function next_active_time_slot(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function compute_time_slot_status(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function register_time_slot_at(uuid, timestamptz, double precision, double precision, boolean)
  from public, anon, authenticated;
revoke execute on function get_time_slot_status() from public, anon;
revoke execute on function register_for_next_time_slot(double precision, double precision, boolean)
  from public, anon;
grant execute on function get_time_slot_status() to authenticated;
grant execute on function register_for_next_time_slot(double precision, double precision, boolean) to authenticated;
