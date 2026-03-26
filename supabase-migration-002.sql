-- ============================================================
-- Handle. Migration 002 — Pause history + Plate defaults + Focus mode
-- Run this in Supabase SQL Editor after the initial schema
-- ============================================================

-- Add pause/resume history log (JSON array of timestamped entries)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pause_history JSONB DEFAULT '[]'::jsonb;

-- Add "active focus" flag — the task currently being worked on
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_focused BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS focused_at TIMESTAMPTZ;

-- Add plate default settings
ALTER TABLE plates ADD COLUMN IF NOT EXISTS default_task_type TEXT DEFAULT 'Operational' CHECK (default_task_type IN ('Billable', 'Operational', 'Volunteer'));
