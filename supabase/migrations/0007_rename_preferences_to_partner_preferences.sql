-- "preferences" was ambiguous (could read as app settings), so it became
-- partner_preferences (and profiles.preference_id became
-- partner_preference_id). 0002, 0003 and 0005 were rewritten with the final
-- names, so a clean replay already has them and there is nothing to rename.
-- Kept as a no-op to preserve the migration numbering.
select 1;
