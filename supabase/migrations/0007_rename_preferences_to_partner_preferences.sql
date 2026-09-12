-- "preferences" was ambiguous (could read as app settings). Renamed to
-- partner_preferences to make explicit this is about who the user wants to see.
alter table preferences rename to partner_preferences;
alter table profiles rename column preference_id to partner_preference_id;
alter policy "preferences_select_authenticated" on partner_preferences
  rename to "partner_preferences_select_authenticated";
