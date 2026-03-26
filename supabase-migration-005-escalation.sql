-- ============================================================
-- Migration 005: Automatic Tier Escalation
-- Adds tier_deadline column and pg_cron escalation job
-- ============================================================

-- 1. Update the urgency_tier CHECK constraint to include 'Overdue'
-- (The original schema didn't allow 'Overdue' as a stored value)
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_urgency_tier_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_urgency_tier_check
  CHECK (urgency_tier IN ('Overdue', 'Today', 'Tomorrow', 'This Week', 'Next Week', 'This Month', 'Someday'));

-- 2. Add tier_assigned_date column to tasks table
-- This stores the date the task was assigned to its current tier,
-- so the cron job knows when to escalate it.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tier_assigned_date DATE;

-- 2. Backfill existing tasks with today's date
-- (Existing tasks will start escalating from today forward)
UPDATE public.tasks
SET tier_assigned_date = CURRENT_DATE
WHERE tier_assigned_date IS NULL AND is_complete = false;

-- 3. Create the escalation function
-- Runs nightly at 12:01 AM ET and bumps tiers based on your rules:
--   Today (not done by midnight) → Overdue
--   Tomorrow (at midnight) → Today
--   This Week → Tomorrow on Wednesday midnight, Today on Thursday midnight,
--               Overdue on Friday midnight
--   Next Week → This Week on Friday midnight
--   This Month → This Week when entering the last week of the month
--   Someday → never escalates
CREATE OR REPLACE FUNCTION public.escalate_tiers()
RETURNS void AS $$
DECLARE
  today_dow INTEGER;       -- 0=Sun, 1=Mon, ... 5=Fri, 6=Sat
  days_in_month INTEGER;
  last_monday DATE;
BEGIN
  -- Get day of week (0=Sunday in Postgres extract(dow ...))
  today_dow := EXTRACT(DOW FROM CURRENT_DATE);

  -- Get total days in current month
  days_in_month := EXTRACT(DAY FROM
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')
  );

  -- Calculate the Monday that starts the last week of the month
  -- Last week = the last 7 days of the month, starting from the Monday on or before the 25th-ish
  last_monday := (DATE_TRUNC('month', CURRENT_DATE) + (days_in_month - 1) * INTERVAL '1 day')::DATE;
  -- Walk back to Monday
  WHILE EXTRACT(DOW FROM last_monday) != 1 LOOP
    last_monday := last_monday - INTERVAL '1 day';
  END LOOP;

  -- ========================================
  -- RULE 1: Today → Overdue
  -- Any "Today" task that survived past midnight becomes Overdue
  -- ========================================
  UPDATE public.tasks
  SET urgency_tier = 'Overdue',
      updated_at = NOW()
  WHERE urgency_tier = 'Today'
    AND is_complete = false
    AND is_paused = false;

  -- ========================================
  -- RULE 2: Tomorrow → Today
  -- At midnight, tomorrow has arrived
  -- ========================================
  UPDATE public.tasks
  SET urgency_tier = 'Today',
      tier_assigned_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE urgency_tier = 'Tomorrow'
    AND is_complete = false
    AND is_paused = false;

  -- ========================================
  -- RULE 3: This Week escalation
  -- Wednesday midnight → Tomorrow
  -- Thursday midnight → Today
  -- Friday midnight → Overdue
  -- (Wed=3, Thu=4, Fri=5)
  -- ========================================

  -- Friday midnight: This Week → Overdue
  IF today_dow = 5 THEN
    UPDATE public.tasks
    SET urgency_tier = 'Overdue',
        updated_at = NOW()
    WHERE urgency_tier = 'This Week'
      AND is_complete = false
      AND is_paused = false;

  -- Thursday midnight: This Week → Today
  ELSIF today_dow = 4 THEN
    UPDATE public.tasks
    SET urgency_tier = 'Today',
        tier_assigned_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE urgency_tier = 'This Week'
      AND is_complete = false
      AND is_paused = false;

  -- Wednesday midnight: This Week → Tomorrow
  ELSIF today_dow = 3 THEN
    UPDATE public.tasks
    SET urgency_tier = 'Tomorrow',
        tier_assigned_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE urgency_tier = 'This Week'
      AND is_complete = false
      AND is_paused = false;
  END IF;

  -- ========================================
  -- RULE 4: Next Week → This Week
  -- On Friday midnight (start of weekend), next week items
  -- become this week items
  -- ========================================
  IF today_dow = 5 THEN
    UPDATE public.tasks
    SET urgency_tier = 'This Week',
        tier_assigned_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE urgency_tier = 'Next Week'
      AND is_complete = false
      AND is_paused = false;
  END IF;

  -- ========================================
  -- RULE 5: This Month → This Week
  -- When we enter the last week of the month
  -- ========================================
  IF CURRENT_DATE = last_monday THEN
    UPDATE public.tasks
    SET urgency_tier = 'This Week',
        tier_assigned_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE urgency_tier = 'This Month'
      AND is_complete = false
      AND is_paused = false;
  END IF;

  -- Someday: never escalates (no rule needed)

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 5. Schedule the job to run at 12:01 AM Eastern Time every day
-- Supabase pg_cron uses UTC. 5:01 AM UTC = 12:01 AM EST (winter) / 1:01 AM EDT (summer)
-- This ensures escalation always happens after midnight ET year-round.
SELECT cron.schedule(
  'nightly-tier-escalation',
  '1 5 * * *',
  'SELECT public.escalate_tiers()'
);
