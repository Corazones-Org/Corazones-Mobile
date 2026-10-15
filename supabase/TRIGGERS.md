# Database triggers and functions catalog

Triggers run inside Postgres, so nothing in the app code points to them. This file is the index. **Update it in the same PR as any migration that creates, changes or drops a trigger or function.**

Source of truth is `supabase/migrations/`. To check what is really installed in the Supabase project, run in the SQL editor:

```sql
select event_object_table as "table", trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where trigger_schema in ('public', 'auth')
order by event_object_table, trigger_name;
```

## Triggers

| Trigger | Table | When | Function | What it does | Created in |
| --- | --- | --- | --- | --- | --- |
| `on_auth_user_created` | `auth.users` | after insert | `handle_new_user()` | Creates the user's `profiles` row and pre-fills `name` from the Google `full_name`. Runs on first sign-in only. | 0009 (function body replaced in 0011) |
| `profiles_set_updated_at` | `profiles` | before update | `set_updated_at()` | Stamps `updated_at` and `updated_by`. | 0003 |
| `profiles_update_profile_complete` | `profiles` | before insert or update | `update_profile_complete()` | Recomputes `profile_complete` (name, age, gender, partner preference and at least one photo). The client never sets this flag. | 0012 (function replaced in 0015) |
| `profile_photos_refresh_profile_complete` | `profile_photos` | after insert, update or delete | `refresh_profile_complete()` | Touches the owner's `profiles` row so the trigger above recomputes `profile_complete`. | 0015 |
| `profile_interests_check` | `profile_interests` | before insert | `check_profile_interest()` | Rejects inactive interests and more than 10 interests per profile. | 0016 |
| `time_slot_registrations_set_updated_at` | `time_slot_registrations` | before update | `set_updated_at()` | Stamps `updated_at` and `updated_by`. | 0004 |
| `time_slot_registrations_audit` | `time_slot_registrations` | after insert, update or delete | `log_audit_event()` | Writes the full old and new row to `audit_log` (consent history). | 0004 |

Chains to keep in mind:

- Updating a profile: `profiles_set_updated_at`, then `profiles_update_profile_complete` (before triggers fire in alphabetical order by name).
- Adding or removing a photo: `profile_photos_refresh_profile_complete` updates `profiles`, which fires `profiles_update_profile_complete`.
- A failing trigger rolls back the statement that fired it. If `handle_new_user()` throws, the sign-in fails.

## Functions used by policies (not triggers)

| Function | Purpose | Created in |
| --- | --- | --- |
| `my_active_time_slot_registrations()` | The caller's active slot and day pairs. `security definer` so RLS policies can use it without recursion. | 0013 |
| `can_view_profile(target_user_id)` | Visibility rule: the owner, or a user registered in the same slot on the same day. Used by the `profiles`, `profile_photos`, `profile_interests` and storage policies. | 0017 |

## Notes

- `handle_new_user()`, `update_profile_complete()` and `refresh_profile_complete()` are `security definer`, with EXECUTE revoked from `public`, so they run only as triggers and cannot be called as an RPC from the client.
- Applied to the Supabase project as of 2026-10-15: 0001 to 0017. 0013 and 0015 to 0017 were run by hand in the SQL editor, so Supabase's migration history table does not list them.
