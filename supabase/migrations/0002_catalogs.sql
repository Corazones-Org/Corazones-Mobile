-- Partner preference catalog (who the user wants to see/be shown to): table
-- instead of enum/hardcoded strings, so values can be added without a deploy.
-- No display label here on purpose — the client resolves display text via
-- i18n, keyed by `code` (see src/i18n). This keeps the DB free of
-- presentation concerns and ready for future locales.
create table partner_preferences (
  id smallint primary key,
  code text not null unique,
  active boolean not null default true,
  sort_order smallint not null default 0
);

insert into partner_preferences (id, code, sort_order) values
  (1, 'men', 1),
  (2, 'women', 2),
  (3, 'everyone', 3);

-- Static catalog of time slots: 24 fixed slots that exist every day
-- (2h long, one starting every hour, they overlap but never merge).
create table time_slots (
  id uuid primary key default gen_random_uuid(),
  start_time time not null unique,
  duration_minutes smallint not null default 120,
  sort_order smallint not null
);

insert into time_slots (start_time, sort_order)
select (make_time(h, 0, 0)), h
from generate_series(0, 23) as h;
