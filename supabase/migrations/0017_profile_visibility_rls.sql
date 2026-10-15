-- Who can see a profile (and its photos / interests): the owner, or someone
-- registered in the same time slot on the same day. SECURITY DEFINER so the
-- lookup bypasses RLS and cannot recurse (see 0013).
create or replace function can_view_profile(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1
      from time_slot_registrations theirs
      join my_active_time_slot_registrations() mine
        on theirs.time_slot_id = mine.time_slot_id
       and theirs.day = mine.day
      where theirs.user_id = target_user_id
        and theirs.deleted_at is null
    )
$$;

revoke execute on function can_view_profile(uuid) from public, anon;
grant execute on function can_view_profile(uuid) to authenticated;

-- profiles: one visibility rule instead of the inline same-slot subquery.
drop policy "profiles_select_same_time_slot_today" on profiles;
create policy "profiles_select_visible"
  on profiles for select
  to authenticated
  using (can_view_profile(user_id));

-- profile_photos
create policy "profile_photos_select_visible"
  on profile_photos for select
  to authenticated
  using (can_view_profile(user_id));

create policy "profile_photos_insert_own"
  on profile_photos for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "profile_photos_update_own"
  on profile_photos for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "profile_photos_delete_own"
  on profile_photos for delete
  to authenticated
  using (user_id = auth.uid());

-- profile_interests
create policy "profile_interests_select_visible"
  on profile_interests for select
  to authenticated
  using (can_view_profile(user_id));

create policy "profile_interests_insert_own"
  on profile_interests for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "profile_interests_delete_own"
  on profile_interests for delete
  to authenticated
  using (user_id = auth.uid());

-- Storage: users in the same slot can read each other's photos (the own-folder
-- policies from 0006 still cover the owner). CASE guards the uuid cast.
create policy "profile_photos_select_visible"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then can_view_profile(((storage.foldername(name))[1])::uuid)
      else false
    end
  );
