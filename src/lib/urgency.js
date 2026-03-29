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

  // No due date: trust the database tier (cron job handles escalation)
  return task.urgency_tier
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
 * Within each urgency tier:
 *   1. Kicked tasks first (highest kick count)
 *   2. Scheduled tasks with times (by time, earliest first)
 *   3. Tasks with due dates (soonest first)
 *   4. Everything else by creation date (oldest first)
 *   5. sort_position as final tiebreaker (if both have one)
 */
export function sortByUrgency(tasks) {
  return [...tasks].sort((a, b) => {
    const tierA = getTierSortOrder(getEffectiveTier(a))
    const tierB = getTierSortOrder(getEffectiveTier(b))
    if (tierA !== tierB) return tierA - tierB

    // Same tier: kicked tasks float to the top (higher kick count first)
    const aKicked = (a.kick_count || 0) > 0
    const bKicked = (b.kick_count || 0) > 0
    if (aKicked && !bKicked) return -1
    if (!aKicked && bKicked) return 1
    if (aKicked && bKicked) {
      const kickDiff = (b.kick_count || 0) - (a.kick_count || 0)
      if (kickDiff !== 0) return kickDiff
    }

    // Scheduled tasks with times sort by time (earliest first)
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

    // Sort by due date (soonest first)
    if (a.due_date && b.due_date) {
      const dateA = parseDateLocal(a.due_date)
      const dateB = parseDateLocal(b.due_date)
      if (dateA.getTime() !== dateB.getTime()) return dateA - dateB
    }
    if (a.due_date && !b.due_date) return -1
    if (!a.due_date && b.due_date) return 1

    // sort_position tiebreaker (from drag-and-drop in plates)
    if (a.sort_position != null && b.sort_position != null) {
      const posDiff = a.sort_position - b.sort_position
      if (posDiff !== 0) return posDiff
    }

    // Otherwise: older tasks first
    return new Date(a.created_at) - new Date(b.created_at)
  })
}

/**
 * Sort tasks with plate grouping for dashboard filtered lists.
 * Within each urgency tier, tasks are grouped by plate (most urgent plate first),
 * then within each plate group sorted by the standard rules (kicked, time, due date, oldest).
 *
 * @param tasks - the tasks to sort
 * @param plates - array of plate objects (need id, name for grouping)
 * @param projects - array of project/sub-plate objects (need id, plate_id for sub-plate grouping)
 * @param calcPlateScore - function(plateId) that returns an urgency score for a plate (lower = more urgent)
 * @param groupBySubPlate - if true, group by sub-plate within plate (for PlateSubDashboard "All Tasks")
 */
export function sortByUrgencyWithPlateGrouping(tasks, plates = [], projects = [], calcPlateScore = null, groupBySubPlate = false) {
  // Build plate score map
  const plateScoreMap = {}
  if (calcPlateScore) {
    plates.forEach(p => {
      plateScoreMap[p.id] = calcPlateScore(p.id)
    })
  }

  // Build sub-plate (project) score map using same urgency scoring
  const subPlateScoreMap = {}
  if (groupBySubPlate) {
    projects.forEach(proj => {
      const projTasks = tasks.filter(t => t.project_id === proj.id)
      let score = 0
      projTasks.forEach(t => {
        const tier = getEffectiveTier(t)
        if (tier === 'Overdue') score += 100
        else if (tier === 'Today') score += 50
        else if (tier === 'Tomorrow') score += 25
        else if (tier === 'This Week') score += 10
        else if (tier === 'Next Week') score += 5
        else if (tier === 'This Month') score += 2
        else score += 1
      })
      subPlateScoreMap[proj.id] = -score // negate so higher urgency sorts first
    })
  }

  // Build project-to-plate map
  const projectPlateMap = {}
  projects.forEach(p => {
    projectPlateMap[p.id] = p.plate_id
  })

  return [...tasks].sort((a, b) => {
    // 1. Urgency tier is always the top-level sort
    const tierA = getTierSortOrder(getEffectiveTier(a))
    const tierB = getTierSortOrder(getEffectiveTier(b))
    if (tierA !== tierB) return tierA - tierB

    // 2. Within the same tier, group by plate (most urgent plate first)
    const plateIdA = a.plate_id || ''
    const plateIdB = b.plate_id || ''
    if (plateIdA !== plateIdB) {
      const scoreA = plateScoreMap[plateIdA] ?? 999
      const scoreB = plateScoreMap[plateIdB] ?? 999
      if (scoreA !== scoreB) return scoreA - scoreB
      // Same score — alphabetical by plate name as tiebreaker
      const plateA = plates.find(p => p.id === plateIdA)
      const plateB = plates.find(p => p.id === plateIdB)
      const nameA = plateA ? plateA.name : ''
      const nameB = plateB ? plateB.name : ''
      return nameA.localeCompare(nameB)
    }

    // 3. Within the same plate, group by sub-plate if requested (most urgent sub-plate first)
    if (groupBySubPlate) {
      const subA = a.project_id || ''
      const subB = b.project_id || ''
      if (subA !== subB) {
        // Tasks without a sub-plate (free-floating) go after sub-plate tasks
        if (!subA && subB) return 1
        if (subA && !subB) return -1
        // Sort sub-plates by urgency score (most urgent first)
        const scoreA = subPlateScoreMap[subA] ?? 999
        const scoreB = subPlateScoreMap[subB] ?? 999
        if (scoreA !== scoreB) return scoreA - scoreB
        // Alphabetical tiebreaker
        const projA = projects.find(p => p.id === subA)
        const projB = projects.find(p => p.id === subB)
        const pNameA = projA ? projA.name : ''
        const pNameB = projB ? projB.name : ''
        return pNameA.localeCompare(pNameB)
      }
    }

    // 4. Within same plate (and sub-plate): standard sort rules
    // Kicked tasks first
    const aKicked = (a.kick_count || 0) > 0
    const bKicked = (b.kick_count || 0) > 0
    if (aKicked && !bKicked) return -1
    if (!aKicked && bKicked) return 1
    if (aKicked && bKicked) {
      const kickDiff = (b.kick_count || 0) - (a.kick_count || 0)
      if (kickDiff !== 0) return kickDiff
    }

    // Scheduled tasks with times
    const aTimeMatch = a.title.match(/^\[(\d{2}:\d{2})\]/)
    const bTimeMatch = b.title.match(/^\[(\d{2}:\d{2})\]/)
    if (aTimeMatch && bTimeMatch) return aTimeMatch[1].localeCompare(bTimeMatch[1])
    if (aTimeMatch && !bTimeMatch) return -1
    if (!aTimeMatch && bTimeMatch) return 1

    // Due date
    if (a.due_date && b.due_date) {
      const dateA = parseDateLocal(a.due_date)
      const dateB = parseDateLocal(b.due_date)
      if (dateA.getTime() !== dateB.getTime()) return dateA - dateB
    }
    if (a.due_date && !b.due_date) return -1
    if (!a.due_date && b.due_date) return 1

    // sort_position tiebreaker
    if (a.sort_position != null && b.sort_position != null) {
      const posDiff = a.sort_position - b.sort_position
      if (posDiff !== 0) return posDiff
    }

    // Oldest first
    return new Date(a.created_at) - new Date(b.created_at)
  })
}

export { TIER_ORDER, KICK_MAP, PROMOTE_MAP, parseDateLocal }
