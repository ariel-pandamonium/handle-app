-- ============================================================
-- Handle. Migration 003 — Rename Architecture to 88 Studio LLC
-- Run this in Supabase SQL Editor
-- ============================================================

-- Rename the permanent plate
UPDATE plates SET name = '88 Studio LLC' WHERE is_permanent = true;

-- Also update the seed function for future users
CREATE OR REPLACE FUNCTION seed_default_plates()
RETURNS trigger AS $$
BEGIN
  INSERT INTO plates (user_id, name, is_permanent, sort_order) VALUES
    (NEW.id, '88 Studio LLC', true, 0),
    (NEW.id, 'Planning Board', false, 1),
    (NEW.id, 'Artist Collective', false, 2),
    (NEW.id, '3D Printing', false, 3),
    (NEW.id, 'Combat Robotics', false, 4),
    (NEW.id, 'Caregiving', false, 5),
    (NEW.id, 'Home', false, 6),
    (NEW.id, 'Personal', false, 7);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
