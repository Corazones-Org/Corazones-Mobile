create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text,
  age integer check (age >= 18),
  main_photo text, -- path inside the "profile-photos" bucket, not a full URL
  partner_preference_id smallint references partner_preferences(id),
  instagram text,
  profile_complete boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row
  execute function set_updated_at();

create view active_profiles
  with (security_invoker = true) as
  select * from profiles where deleted_at is null;

-- Storage: private profile photos bucket. Third-party access is resolved with
-- signed URLs generated server-side/by the authenticated client, never a public bucket.
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;
