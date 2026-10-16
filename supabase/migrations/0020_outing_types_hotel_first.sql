-- "Hotel encounter" is the main reason people use the app, so it goes first in the list
-- (0019 had it last). Explicit positions instead of "shift everything by one", so running it
-- twice, or on any environment that has 0019, always ends in the same order.
update outing_types as o
set sort_order = v.sort_order
from (values
  ('hotel_encounter',  1),
  ('breakfast',        2),
  ('brunch',           3),
  ('lunch',            4),
  ('coffee',           5),
  ('dinner',           6),
  ('drinks',           7),
  ('club',             8),
  ('cinema',           9),
  ('concert',         10),
  ('park',            11),
  ('beach',           12),
  ('shopping',        13),
  ('bowling',         14),
  ('mini_golf',       15),
  ('spa',             16),
  ('getaway',         17)
) as v(code, sort_order)
where o.code = v.code;
