-- time_slot_registrations_select_same_time_slot_today referenced
-- time_slot_registrations from within its own policy, forcing Postgres to
-- re-evaluate every SELECT policy on that same table for the subquery —
-- including itself — causing "infinite recursion detected in policy for
-- relation time_slot_registrations" (42P17) on any profiles/registrations
-- read. Moving the "my active registrations" lookup into a SECURITY DEFINER
-- function bypasses RLS for that internal lookup and breaks the cycle.
create or replace function my_active_time_slot_registrations()
returns table (time_slot_id uuid, day date)
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  select time_slot_id, day
  from time_slot_registrations
  where user_id = auth.uid()
    and deleted_at is null
$$;

drop policy "profiles_select_same_time_slot_today" on profiles;
create policy "profiles_select_same_time_slot_today"
  on profiles for select
  to authenticated
  using (
    exists (
      select 1
      from time_slot_registrations theirs
      join my_active_time_slot_registrations() mine
        on theirs.time_slot_id = mine.time_slot_id
       and theirs.day = mine.day
      where theirs.user_id = profiles.user_id
        and theirs.deleted_at is null
    )
  );

drop policy "time_slot_registrations_select_same_time_slot_today" on time_slot_registrations;
create policy "time_slot_registrations_select_same_time_slot_today"
  on time_slot_registrations for select
  to authenticated
  using (
    exists (
      select 1
      from my_active_time_slot_registrations() mine
      where mine.time_slot_id = time_slot_registrations.time_slot_id
        and mine.day = time_slot_registrations.day
    )
  );
