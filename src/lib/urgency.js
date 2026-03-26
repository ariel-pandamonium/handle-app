// ============================================================
// Urgency tier logic — all times in America/New_York
// ============================================================

const TIER_ORDER = ['Today', 'Tomorrow', 'This Week', 'Next Week', 'This Month', 'Someday']

// Kick ladder: each tier kicks to the next one in line
const KICK_MAP = {
  'Today': 'Tomorrow',
  'Tomorrow': 'This Week',
  'This Week': 'Next Week',
  'Next Week': 'This Month',
  'This Month': 'Someday',
  'Someday': null,  // no more kicks
}

// Promote ladder: opposite of kick — move one tier more urgent
const PROMOTE_MAP = {
  'Someday': 'This Month',
  'This Month': 'Next Week',
  'Next Week': 'This Week',
  'This Week': 'Tomorrow',
  'Tomorrow': 'Today',
  'Today': null,     // already most urgent
  'Overdue': null,   // already past due
}

// CSS variable for each tier's color
const TIER_COLORS = {
  'Overdue': 'var(--tier-1)',
  'Today': 'var(--tier-2)',
  'Tomorrow': 'var(--tier-2)',  // Same visual weight as Today
  'This Week': 'var(--tier-3)',
  'Next Week': 'var(--tier-4)',
  'This Month': 'var(--tier-4)',
  'Someday': 'var(--tier-5)',
}

// Background (lighter) version for cards
const TIER_BG_COLORS = {
  'Overdue': 'var(--tier-1)',
  'Today': 'var(--tier-2)',
  'Tomorrow': 'var(--tier-2)',
  'This Week': 'var(--tier-3)',
  'Next Week': 'var(--tier-4)',
  'This Month': 'var(--tier-4)',
  'Someday': 'var(--tier-5)',
}

/**
 * Get the current time in ET
 */
function nowET() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
}

/**
 * Get end of today (11:59:59 PM ET)
 */
function endOfTodayET() {
  const now = nowET()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
}

/**
 * Get end of tomorrow (11:59:59 PM ET)
 */
function endOfTomorrowET() {
  const end = endOfTodayET()
  end.setDate(end.getDate() + 1)
  return end
}

/**
 * Get end of current week (Sunday 11:59:59 PM ET)
 */
function endOfWeekET() {
  const now = nowET()
  const dayOfWeek = now.getDay() // 0 = Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59, 999)
  return end
}

/**
 * Get end of next week (next Sunday 11:59:59 PM ET)
 */
function endOfNextWeekET() {
  const end = endOfWeekET()
  end.setDate(end.getDate() + 7)
  return end
}

/**
 * Get end of current month
 */
function endOfMonthET() {
  const now = nowET()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
}

/**
 * Parse a date string (YYYY-MM-DD) as local midnight, avoiding UTC shift.
 * new Date("2026-03-24") = midnight UTC = wrong day in ET.
 * new Date("2026-03-24T00:00:00") = midnight local = correct day.
 */
function parseDateLocal(dateStr) {
  if (!dateStr) return null
  // Strip any time/timezone info, take just YYYY-MM-DD
  const clean = dateStr.split('T')[0]
  return new Date(clean + 'T00:00:00')
}

/**
 * Recalculate a task's effective urgency tier based on current time.
 * If a hard due_date is set, use that. Otherwise use the stored tier.
 * Returns the display tier (may be 'Overdue').
 */
export function getEffectiveTier(task) {
  const now = nowET()

  // If task has a hard due date, calculate tier from date
  if (task.due_date) {
    const dueDate = parseDateLocal(task.due_date)
    // Due date is "end of that day" — overdue only after midnight
    dueDate.setHours(23, 59, 59, 999)
    if (now > dueDate) {
      return 'Overdue'
    }
    // Use due date to determine the most accurate current tier
    const dueDateStart = parseDateLocal(task.due_date)
    if (dueDateStart <= endOfTodayET()) return 'Today'
    if (dueDateStart <= endOfTomorrowET()) return 'Tomorrow'
    if (dueDateStart <= endOfWeekET()) return 'This Week'
    if (dueDateStart <= endOfNextWeekET()) return 'Next Week'
    if (dueDateStart <= endOfMonthET()) return 'This Month'
    return 'Someday'
  }

  // No due date: check if the stored tier should escalate
  const tier = task.urgency_tier
  switch (tier) {
    case 'Today':
      if (now > endOfTodayET()) return 'Overdue'
      break
    case 'Tomorrow':
      if (now > endOfTomorrowET()) return 'Overdue'
      // If tomorrow has arrived, it's now Today
      if (now > endOfTodayET()) return 'Today'
      break
    case 'This Week':
      if (now > endOfWeekET()) return 'Overdue'
      break
    case 'Next Week': {
      const weekEnd = endOfWeekET()
      if (now > endOfNextWeekET()) return 'Overdue'
      // If next week has started, it's now This Week
      if (now > weekEnd) return 'This Week'
      break
    }
    case 'This Month':
      if (now > endOfMonthET()) return 'Overdue'
      break
    case 'Someday':
      // Never escalates
      break
  }

  return tier
}

/**
 * Check if a task has been overdue for 2+ days (show flame icon)
 */
export function isOverdueTwoPlusDays(task) {
  const now = nowET()

  if (task.due_date) {
    const dueDate = parseDateLocal(task.due_date)
    dueDate.setHours(23, 59, 59, 999)
    const diffMs = now - dueDate
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays >= 2
  }

  // For tier-based: estimate based on tier deadlines
  const tier = task.urgency_tier
  let deadline
  switch (tier) {
    case 'Today':
      deadline = endOfTodayET()
      deadline.setDate(deadline.getDate() - 0) // already today
      break
    case 'Tomorrow':
      deadline = endOfTomorrowET()
      break
    case 'This Week':
      deadline = endOfWeekET()
      break
    case 'This Month':
      deadline = endOfMonthET()
      break
    default:
      return false
  }

  if (deadline) {
    const diffMs = now - deadline
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays >= 2
  }

  return false
}

/**
 * Get the next tier when kicking a task
 * Returns null if no more kicks available
 */
export function getNextKickTier(currentTier) {
  // Use the stored tier, not the effective/display tier
  const actualTier = currentTier === 'Overdue' ? 'Today' : currentTier
  return KICK_MAP[actualTier] || null
}

/**
 * Get the next tier when promoting a task (making it more urgent)
 * Returns null if already at highest urgency
 */
export function getNextPromoteTier(currentTier) {
  const actualTier = currentTier === 'Overdue' ? 'Today' : currentTier
  return PROMOTE_MAP[actualTier] || null
}

/**
 * Get the color for a tier
 */
export function getTierColor(tier) {
  return TIER_COLORS[tier] || 'var(--text-secondary)'
}

/**
 * Get sort priority (lower = more urgent = appears first)
 */
export function getTierSortOrder(effectiveTier) {
  const order = {
    'Overdue': 0,
    'Today': 1,
    'Tomorrow': 2,
    'This Week': 3,
    'Next Week': 4,
    'This Month': 5,
    'Someday': 6,
  }
  return order[effectiveTier] ?? 7
}

/**
 * Sort tasks by urgency (most urgent first)
 */
export function sortByUrgency(tasks) {
  return [...tasks].sort((a, b) => {
    const tierA = getTierSortOrder(getEffectiveTier(a))
    const tierB = getTierSortOrder(getEffectiveTier(b))
    if (tierA !== tierB) return tierA - tierB
    // Same tier: scheduled tasks with times sort by time (earliest first)
    const aTimeMatch = a.title.match(/^\[(\d{2}:\d{2})\]/)
    const bTimeMatch = b.title.match(/^\[(\d{2}:\d{2})\]/)
    const aHasTime = !!aTimeMatch
    const bHasTime = !!bTimeMatch
    if (aHasTime && bHasTime) {
      return aTimeMatch[1].localeCompare(bTimeMatch[1])
    }
    // Tasks with scheduled times float above non-timed tasks in the same tier
    if (aHasTime && !bHasTime) return -1
    if (!aHasTime && bHasTime) return 1
    // Same tier: sort by due date first (soonest first), then by created_at
    if (a.due_date && b.due_date) {
      const dateA = parseDateLocal(a.due_date)
      const dateB = parseDateLocal(b.due_date)
      if (dateA.getTime() !== dateB.getTime()) return dateA - dateB
    }
    // Tasks with due dates come before tasks without
    if (a.due_date && !b.due_date) return -1
    if (!a.due_date && b.due_date) return 1
    // Otherwise: older tasks first
    return new Date(a.created_at) - new Date(b.created_at)
  })
}

export { TIER_ORDER, KICK_MAP, PROMOTE_MAP, parseDateLocal }
