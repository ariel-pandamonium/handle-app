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
-- Runs nightly at 12:01 AM ET and bumps tiers based on these rules:
--
-- EVERY NIGHT (7 days a week):
--   Rule 1: Today → Overdue
--   Rule 2: Tomorrow → Today
--
-- WEEKLY CYCLE (This Week):
--   Thursday 12:01 AM (dow=4): This Week → Tomorrow
--   Friday 12:01 AM (dow=5):   This Week → Today
--   Saturday 12:01 AM (dow=6): This Week → Overdue
--
-- WEEKLY CYCLE (Next Week):
--   Saturday 12:01 AM (dow=6): Next Week → This Week
--
-- MONTHLY:
--   At or past the last Monday of the month: This Month → This Week
--
-- NEVER: Someday stays put
--
-- ORDER MATTERS: Rules 1 & 2 clear Today/Tomorrow BEFORE
-- Rules 3-5 refill those buckets. This prevents double-escalation.
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
  last_monday := (DATE_TRUNC('month', CURRENT_DATE) + (days_in_month - 1) * INTERVAL '1 day')::DATE;
  -- Walk back to Monday
  WHILE EXTRACT(DOW FROM last_monday) != 1 LOOP
    last_monday := last_monday - INTERVAL '1 day';
  END LOOP;

  -- ========================================
  -- RULE 1: Today → Overdue (every night)
  -- Any "Today" task that survived past midnight becomes Overdue
  -- ========================================
  UPDATE public.tasks
  SET urgency_tier = 'Overdue',
      updated_at = NOW()
  WHERE urgency_tier = 'Today'
    AND is_complete = false
    AND is_paused = false;

  -- ========================================
  -- RULE 2: Tomorrow → Today (every night)
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
  -- Saturday 12:01 AM (dow=6): This Week → Overdue (week is over)
  -- Friday 12:01 AM (dow=5):   This Week → Today (last day)
  -- Thursday 12:01 AM (dow=4): This Week → Tomorrow (2 days left)
  -- ========================================
  IF today_dow = 6 THEN
    UPDATE public.tasks
    SET urgency_tier = 'Overdue',
        updated_at = NOW()
    WHERE urgency_tier = 'This Week'
      AND is_complete = false
      AND is_paused = false;

  ELSIF today_dow = 5 THEN
    UPDATE public.tasks
    SET urgency_tier = 'Today',
        tier_assigned_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE urgency_tier = 'This Week'
      AND is_complete = false
      AND is_paused = false;

  ELSIF today_dow = 4 THEN
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
  -- Saturday 12:01 AM (dow=6): weekend starts, next week's
  -- work slides into This Week for the coming Monday
  -- Runs AFTER Rule 3, so new This Week items won't get
  -- caught by the This Week escalation in the same run.
  -- ========================================
  IF today_dow = 6 THEN
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
  -- When we are at or past the last Monday of the month.
  -- Uses >= so tasks added to "This Month" mid-last-week
  -- still get caught.
  -- ========================================
  IF CURRENT_DATE >= last_monday THEN
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
