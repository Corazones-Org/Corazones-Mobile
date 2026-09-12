create table time_slot_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  time_slot_id uuid not null references time_slots(id) on delete restrict,
  day date not null default current_date,
  registered_at timestamptz not null default now(),
  disclaimer_accepted boolean not null default false,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);

-- 1 slot per user per day (resets at 00:00 because `day` changes).
create unique index time_slot_registrations_one_per_user_per_day
  on time_slot_registrations (user_id, day)
  where deleted_at is null;

create trigger time_slot_registrations_set_updated_at
  before update on time_slot_registrations
  for each row
  execute function set_updated_at();

-- Dedicated audit log: disclaimer_accepted has legal consent implications,
-- we need the full history of changes, not just the current state.
create trigger time_slot_registrations_audit
  after insert or update or delete on time_slot_registrations
  for each row
  execute function log_audit_event();

create view active_time_slot_registrations
  with (security_invoker = true) as
  select * from time_slot_registrations where deleted_at is null;
