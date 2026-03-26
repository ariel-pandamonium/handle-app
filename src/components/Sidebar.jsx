import { getEffectiveTier, getTierColor, sortByUrgency } from '../lib/urgency'
import { FlameIcon, PlayIcon } from './Icons'

/**
 * Analytics sidebar — left panel on desktop, collapsible on mobile.
 * Each stat is clickable and opens a filtered drill-down view.
 * Also shows paused ("put down") tasks with Pick Back Up buttons.
 */
export default function Sidebar({ tasks, plates, projects, activeFilter, onFilterClick, collapsed, onToggleCollapse, onResumeTask, onShowCompleted, completedCount = 0, unsortedCount = 0, onShowUnsorted }) {
  // Calculate stats
  const activeTasks = tasks.filter(t => !t.is_complete)
  const overdueCount = activeTasks.filter(t => getEffectiveTier(t) === 'Overdue').length
  const todayCount = activeTasks.filter(t => getEffectiveTier(t) === 'Today').length
  const billableCount = activeTasks.filter(t => t.task_type === 'Billable').length
  const putDownCount = activeTasks.filter(t => t.is_paused).length
  const kickedCount = activeTasks.filter(t => t.kick_count > 0).length
  const focusedTask = activeTasks.find(t => t.is_focused)

  // Map plate IDs to names for put-down task context
  const plateMap = {}
  plates.forEach(p => { plateMap[p.id] = p.name })

  const tomorrowCount = activeTasks.filter(t => getEffectiveTier(t) === 'Tomorrow').length
  const thisWeekCount = activeTasks.filter(t => getEffectiveTier(t) === 'This Week').length
  const nextWeekCount = activeTasks.filter(t => getEffectiveTier(t) === 'Next Week').length
  const thisMonthCount = activeTasks.filter(t => getEffectiveTier(t) === 'This Month').length
  const somedayCount = activeTasks.filter(t => getEffectiveTier(t) === 'Someday').length

  // Urgency breakdown tiers (inside the box) — includes Billable
  const urgencyTiers = [
    { key: 'overdue', label: 'Overdue', count: overdueCount, color: 'var(--tier-1)', icon: true },
    { key: 'today', label: 'Due Today', count: todayCount, color: 'var(--tier-2)', icon: false },
    { key: 'tomorrow', label: 'Due Tomorrow', count: tomorrowCount, color: 'var(--tier-2)', icon: false },
    { key: 'thisweek', label: 'Due This Week', count: thisWeekCount, color: 'var(--tier-3)', icon: false },
    { key: 'nextweek', label: 'Due Next Week', count: nextWeekCount, color: 'var(--tier-4)', icon: false },
    { key: 'thismonth', label: 'Due This Month', count: thisMonthCount, color: 'var(--text-secondary)', icon: false },
    { key: 'someday', label: 'Someday', count: somedayCount, color: 'var(--text-secondary)', icon: false },
    { key: 'billable', label: 'Billable', count: billableCount, color: 'var(--tier-2)', icon: false },
  ]


  // Mobile: show toggle button
  if (collapsed) {
    return (
      <button onClick={onToggleCollapse} style={styles.mobileToggle}>
        {overdueCount > 0 ? (
          <span style={styles.mobileToggleAlert}>
            <FlameIcon size={12} /> {overdueCount} overdue
          </span>
        ) : (
          <span>Dashboard</span>
        )}
      </button>
    )
  }

  return (
    <aside className="dashboard-sidebar" style={styles.sidebar}>
      <div style={styles.sidebarInner}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>Dashboard</h2>
          {/* Mobile close button */}
          <button onClick={onToggleCollapse} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        {/* In Hand indicator */}
        {focusedTask && (
          <div style={styles.focusedCard}>
            <span style={styles.focusedLabel}>In Hand</span>
            <span style={styles.focusedTitle}>{focusedTask.title}</span>
          </div>
        )}

        {/* Active Tasks heading */}
        <button
          onClick={() => {
            const isActive = activeFilter === 'active'
            onFilterClick(isActive ? null : 'active')
          }}
          style={{
            ...styles.statRow,
            ...styles.statRowHeading,
            ...(activeFilter === 'active' ? styles.statRowActive : {}),
          }}
        >
          <span style={styles.statCountHeading}>{activeTasks.length}</span>
          <span style={styles.statLabelHeading}>Active Tasks</span>
        </button>

        {/* Urgency breakdown box */}
        <div style={styles.urgencyBox}>
          {urgencyTiers.map((stat) => {
            if (stat.count === 0) return null
            const isActive = activeFilter === stat.key
            return (
              <button
                key={stat.key}
                onClick={() => onFilterClick(isActive ? null : stat.key)}
                style={{
                  ...styles.tierRow,
                  ...(isActive ? styles.statRowActive : {}),
                }}
              >
                <span style={styles.tierCount}>{stat.count}</span>
                <span style={styles.tierLabel}>
                  {stat.icon && <FlameIcon size={11} />}
                  {stat.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Kicked, Put Down, Unsorted, Completed — heading size, separated by dividers */}
        {[
          { key: 'kicked', label: 'Kicked', count: kickedCount, onClick: null },
          { key: 'putdown', label: 'Put Down', count: putDownCount, onClick: null },
          { key: 'unsorted', label: 'Unsorted', count: unsortedCount, onClick: onShowUnsorted },
          { key: 'completed', label: 'Completed', count: completedCount, onClick: onShowCompleted },
        ].map((stat, i) => {
          const isActive = activeFilter === stat.key
          const handleClick = stat.onClick
            ? stat.onClick
            : () => onFilterClick(isActive ? null : stat.key)
          return (
            <div key={stat.key}>
              {i > 0 && <div style={styles.statDivider} />}
              <button
                onClick={handleClick}
                style={{
                  ...styles.statRow,
                  ...styles.statRowHeading,
                  ...(isActive ? styles.statRowActive : {}),
                }}
              >
                <span style={styles.statCountHeading}>{stat.count}</span>
                <span style={styles.statLabelHeading}>{stat.label}</span>
              </button>
            </div>
          )
        })}

        {/* Tasks I've Put Down */}
        {(() => {
          const pausedTasks = sortByUrgency(activeTasks.filter(t => t.is_paused))
          if (pausedTasks.length === 0) return null
          return (
            <div style={styles.putDownSection}>
              <h3 style={styles.putDownHeading}>Tasks I've Put Down ({pausedTasks.length}/10)</h3>
              <div style={styles.putDownList}>
                {pausedTasks.map((task) => {
                  const tier = getEffectiveTier(task)
                  const tierColor = getTierColor(tier)
                  const plateName = plateMap[task.plate_id] || ''
                  return (
                    <div key={task.id} style={{ ...styles.putDownItem, borderLeftColor: tierColor }}>
                      <div style={styles.putDownInfo}>
                        <span style={styles.putDownTitle}>{task.title}</span>
                        <div style={styles.putDownMeta}>
                          {plateName && <span style={styles.putDownPlate}>{plateName}</span>}
                          <span style={{ ...styles.putDownTier, backgroundColor: tierColor, color: tier === 'Overdue' || tier === 'Today' || tier === 'Tomorrow' ? 'var(--text-on-accent)' : 'var(--text-primary)' }}>{tier}</span>
                        </div>
                      </div>
                      {onResumeTask && (
                        <button
                          onClick={() => onResumeTask(task)}
                          style={styles.miniPickUpBtn}
                        >
                          <PlayIcon size={9} color="var(--text-on-accent)" /> Pick Back Up
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: '280px',
    flexShrink: 0,
    backgroundColor: 'var(--bg-base)',
    borderRight: '1px solid var(--border-light)',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarInner: {
    position: 'sticky',
    top: '1rem',
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  sidebarTitle: {
    fontSize: '0.875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-secondary)',
  },
  closeBtn: {
    display: 'none', // hidden on desktop, shown via media query override
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },

  // Focused task card
  focusedCard: {
    backgroundColor: 'var(--bg-subtle)',
    border: '1px solid var(--tier-2)',
    borderRadius: '8px',
    padding: '0.625rem',
    marginBottom: '1rem',
  },
  focusedLabel: {
    fontSize: '0.5625rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--tier-2)',
    display: 'block',
    marginBottom: '0.125rem',
  },
  focusedTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  statRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.625rem',
    borderRadius: '6px',
    borderLeft: '3px solid',
    background: 'none',
    border: 'none',
    borderLeft: '3px solid',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s',
    width: '100%',
  },
  statRowActive: {
    backgroundColor: 'var(--bg-subtle)',
  },
  statRowHeading: {
    borderLeft: 'none',
    padding: '0.375rem 0.625rem',
    marginBottom: '0.25rem',
  },
  statCount: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    minWidth: '24px',
  },
  statCountHeading: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    minWidth: '28px',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  statLabelHeading: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },

  // Urgency breakdown box
  urgencyBox: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '0.75rem',
  },
  tierRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.75rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s',
    width: '100%',
  },
  tierCount: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    minWidth: '22px',
  },
  tierLabel: {
    fontSize: '0.6875rem',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },

  // Stat divider
  statDivider: {
    height: '1px',
    backgroundColor: 'var(--border-light)',
    margin: '0.5rem 0.625rem',
  },

  // Bottom standalone stats
  bottomStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    marginBottom: '0.25rem',
  },


  // Put Down tasks
  putDownSection: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid var(--border-light)',
  },
  putDownHeading: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--tier-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  },
  putDownList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  putDownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.625rem',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-subtle)',
    borderLeft: '3px solid',
  },
  putDownInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
  },
  putDownTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  putDownMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  putDownPlate: {
    fontSize: '0.625rem',
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  putDownTier: {
    fontSize: '0.5625rem',
    fontWeight: 600,
    padding: '0.0625rem 0.25rem',
    borderRadius: '3px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  miniPickUpBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.125rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    color: 'var(--text-on-accent)',
    backgroundColor: 'var(--tier-2)',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  // Mobile toggle
  mobileToggle: {
    display: 'none', // shown via CSS media query
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    margin: '0.75rem 1.25rem',
    width: 'calc(100% - 2.5rem)',
  },
  mobileToggleAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    color: 'var(--tier-1)',
    fontWeight: 600,
  },
}
