-- ============================================================
-- Handle. Migration 004 — Update default seed plates for new users
-- Run this in Supabase SQL Editor
-- DOES NOT affect existing users or existing plates
-- ============================================================

CREATE OR REPLACE FUNCTION seed_default_plates()
RETURNS trigger AS $$
BEGIN
  INSERT INTO plates (user_id, name, is_permanent, sort_order) VALUES
    (NEW.id, 'Work', true, 0),
    (NEW.id, 'Volunteer', false, 1),
    (NEW.id, 'Hobby', false, 2),
    (NEW.id, 'Combat Robotics', false, 3),
    (NEW.id, 'Home', false, 4),
    (NEW.id, 'Personal', false, 5);

  -- Create default user preferences
  INSERT INTO user_preferences (user_id, palette) VALUES (NEW.id, 'ember');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
