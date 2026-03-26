-- ============================================================
-- Handle. Database Schema — Version 1.1
-- Run this entire file in Supabase SQL Editor (see SETUP.md)
-- ============================================================

-- ============================================================
-- 1. PLATES (top-level life areas)
-- ============================================================
CREATE TABLE plates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color_tag TEXT,  -- reserved for future use
  is_permanent BOOLEAN DEFAULT false,
  is_set_aside BOOLEAN DEFAULT false,
  set_aside_until TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. PROJECTS (sub-chips inside Architecture, Phase 1)
-- ============================================================
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plate_id UUID REFERENCES plates(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'waiting', 'someday')),
  next_action TEXT,
  where_i_left_off TEXT,
  is_billable BOOLEAN DEFAULT true,
  is_set_aside BOOLEAN DEFAULT false,
  set_aside_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. TASKS (the atomic unit of work)
-- ============================================================
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plate_id UUID REFERENCES plates(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  task_type TEXT DEFAULT 'Operational' CHECK (task_type IN ('Billable', 'Operational', 'Volunteer')),
  urgency_tier TEXT DEFAULT 'This Week' CHECK (urgency_tier IN ('Today', 'Tomorrow', 'This Week', 'Next Week', 'This Month', 'Someday')),
  due_date TIMESTAMPTZ,  -- optional hard deadline
  kick_count INTEGER DEFAULT 0,
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  -- Pause / Resume fields
  is_paused BOOLEAN DEFAULT false,
  paused_note TEXT,
  paused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. DROP ITEMS (The Drop / inbox)
-- ============================================================
CREATE TABLE drop_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  raw_text TEXT NOT NULL,
  ai_suggested_title TEXT,
  ai_suggested_area_id UUID REFERENCES plates(id) ON DELETE SET NULL,
  ai_suggested_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ai_suggested_urgency_tier TEXT,
  ai_suggested_task_type TEXT,
  ai_confidence_note TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'converted')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. USER PREFERENCES (theme, settings)
-- ============================================================
CREATE TABLE user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  palette TEXT DEFAULT 'ember' CHECK (palette IN ('ember', 'tide', 'grove', 'dusk')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- Each user can only see/edit their own data
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE plates ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Plates policies
CREATE POLICY "Users can view own plates" ON plates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plates" ON plates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plates" ON plates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plates" ON plates
  FOR DELETE USING (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Drop items policies
CREATE POLICY "Users can view own drop items" ON drop_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own drop items" ON drop_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drop items" ON drop_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own drop items" ON drop_items
  FOR DELETE USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 7. FUNCTION: Seed default plates for a new user
-- Called after signup to create the 8 starter plates
-- ============================================================
CREATE OR REPLACE FUNCTION seed_default_plates(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO plates (user_id, name, is_permanent, sort_order) VALUES
    (p_user_id, 'Work', true, 0),
    (p_user_id, 'Volunteer', false, 1),
    (p_user_id, 'Hobby', false, 2),
    (p_user_id, 'Combat Robotics', false, 3),
    (p_user_id, 'Home', false, 4),
    (p_user_id, 'Personal', false, 5);

  -- Create default user preferences
  INSERT INTO user_preferences (user_id, palette) VALUES (p_user_id, 'ember');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. TRIGGER: Auto-seed plates when a new user signs up
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  PERFORM seed_default_plates(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists (safe for re-runs)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 9. INDEXES for performance
-- ============================================================
CREATE INDEX idx_plates_user ON plates(user_id);
CREATE INDEX idx_projects_plate ON projects(plate_id);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_tasks_plate ON tasks(plate_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_urgency ON tasks(urgency_tier);
CREATE INDEX idx_tasks_complete ON tasks(is_complete);
CREATE INDEX idx_drop_items_user ON drop_items(user_id);
CREATE INDEX idx_drop_items_status ON drop_items(status);

-- ============================================================
-- 10. REALTIME: Enable real-time subscriptions
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE plates;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE drop_items;
ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;
