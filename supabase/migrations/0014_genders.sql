-- Gender catalog. Fixed set, so like partner_preferences it exposes only a
-- stable `code`; the client resolves the label via i18n.
create table genders (
  id smallint primary key,
  code text not null unique,
  active boolean not null default true,
  sort_order smallint not null default 0
);

insert into genders (id, code, sort_order) values
  (1, 'male', 1),
  (2, 'female', 2),
  (3, 'other', 3);

-- Which genders each partner preference includes. Two users can see each
-- other only if each one's preference includes the other's gender (mutual
-- match). Enforcing that rule when listing users belongs to COR-7; this
-- mapping keeps the rule as data instead of hardcoded logic.
create table partner_preference_genders (
  partner_preference_id smallint not null references partner_preferences(id) on delete cascade,
  gender_id smallint not null references genders(id) on delete cascade,
  primary key (partner_preference_id, gender_id)
);

insert into partner_preference_genders (partner_preference_id, gender_id)
select p.id, g.id
from partner_preferences p
join genders g
  on (p.code = 'men' and g.code = 'male')
  or (p.code = 'women' and g.code = 'female')
  or p.code = 'everyone';

alter table genders enable row level security;
alter table partner_preference_genders enable row level security;

create policy "genders_select_authenticated"
  on genders for select
  to authenticated
  using (true);

create policy "partner_preference_genders_select_authenticated"
  on partner_preference_genders for select
  to authenticated
  using (true);
