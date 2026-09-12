alter table partner_preferences enable row level security;
alter table time_slots enable row level security;
alter table profiles enable row level security;
alter table time_slot_registrations enable row level security;
alter table audit_log enable row level security;

-- Catalogs: public read for any authenticated user, no client-side writes.
create policy "partner_preferences_select_authenticated"
  on partner_preferences for select
  to authenticated
  using (true);

create policy "time_slots_select_authenticated"
  on time_slots for select
  to authenticated
  using (true);

-- profiles: each user manages their own row.
create policy "profiles_select_own"
  on profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy "profiles_insert_own"
  on profiles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- profiles: read profiles of other users who share the same time_slot_id AND day
-- (exact equality, not a time-range overlap).
create policy "profiles_select_same_time_slot_today"
  on profiles for select
  to authenticated
  using (
    exists (
      select 1
      from time_slot_registrations mine
      join time_slot_registrations theirs
        on theirs.time_slot_id = mine.time_slot_id
       and theirs.day = mine.day
      where mine.user_id = auth.uid()
        and mine.deleted_at is null
        and theirs.user_id = profiles.user_id
        and theirs.deleted_at is null
    )
  );

-- time_slot_registrations: each user manages their own row.
create policy "time_slot_registrations_select_own"
  on time_slot_registrations for select
  to authenticated
  using (user_id = auth.uid());

create policy "time_slot_registrations_insert_own"
  on time_slot_registrations for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "time_slot_registrations_update_own"
  on time_slot_registrations for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- time_slot_registrations: read registrations of other users sharing time_slot_id and day.
create policy "time_slot_registrations_select_same_time_slot_today"
  on time_slot_registrations for select
  to authenticated
  using (
    exists (
      select 1
      from time_slot_registrations mine
      where mine.user_id = auth.uid()
        and mine.deleted_at is null
        and mine.time_slot_id = time_slot_registrations.time_slot_id
        and mine.day = time_slot_registrations.day
    )
  );

-- audit_log: no client access; administrative reads only via service role.
