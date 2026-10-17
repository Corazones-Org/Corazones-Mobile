-- COR-17: index for the foreign key added in 0021 (the Supabase performance advisor flags a foreign
-- key without a covering index). Deleting or joining by zone no longer scans the whole table.
create index time_slot_registrations_zone_id_idx on time_slot_registrations (zone_id);
