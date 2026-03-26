import { useState } from 'react'
import { getEffectiveTier, getNextPromoteTier, getTierColor, sortByUrgency } from '../lib/urgency'
import { supabase } from '../lib/supabase'
import { FlameIcon, PlayIcon, PromoteIcon } from './Icons'

/**
 * Filtered task list — shown when a sidebar stat is clicked.
 * Displays tasks matching a filter, grouped with plate name, sorted by urgency.
 * Smart sub-filters: plate/subplate on all lists, task type on all except 'billable'.
 */
export default function FilteredTaskList({ tasks, plates, projects = [], filter, onClose, onFocusTask, onResumeTask, onTaskUpdated }) {
  const [filterPlate, setFilterPlate] = useState('')
  const [filterType, setFilterType] = useState('')

  // Apply primary filter
  let filtered = []
  let title = ''
  // 'billable' filter already locks task type, so hide that sub-filter
  const showTypeFilter = filter !== 'billable'

  switch (filter) {
    case 'overdue':
      filtered = tasks.filter(t => !t.is_complete && getEffectiveTier(t) === 'Overdue')
      title = 'Overdue Tasks'
      break
    case 'today':
      filtered = tasks.filter(t => !t.is_complete && getEffectiveTier(t) === 'Today')
      title = 'Due Today'
      break
    case 'tomorrow':
      filtered = tasks.filter(t => !t.is_complete && getEffectiveTier(t) === 'Tomorrow')
      title = 'Due Tomorrow'
      break
    case 'thisweek':
      filtered = tasks.filter(t => !t.is_complete && getEffectiveTier(t) === 'This Week')
      title = 'Due This Week'
      break
    case 'nextweek':
      filtered = tasks.filter(t => !t.is_complete && getEffectiveTier(t) === 'Next Week')
      title = 'Due Next Week'
      break
    case 'thismonth':
      filtered = tasks.filter(t => !t.is_complete && getEffectiveTier(t) === 'This Month')
      title = 'Due This Month'
      break
    case 'someday':
      filtered = tasks.filter(t => !t.is_complete && getEffectiveTier(t) === 'Someday')
      title = 'Someday'
      break
    case 'billable':
      filtered = tasks.filter(t => !t.is_complete && t.task_type === 'Billable')
      title = 'Billable Tasks'
      break
    case 'putdown':
      filtered = tasks.filter(t => !t.is_complete && t.is_paused)
      title = 'Tasks I\'ve Put Down'
      break
    case 'kicked':
      filtered = tasks.filter(t => !t.is_complete && t.kick_count > 0)
      title = 'Kicked Tasks'
      break
    case 'active':
      filtered = tasks.filter(t => !t.is_complete)
      title = 'Active Tasks'
      break
    default:
      return null
  }

  // Apply sub-filters
  if (filterPlate) {
    filtered = filtered.filter(t => {
      // Match by plate_id or project_id (subplate)
      if (t.plate_id === filterPlate) return true
      if (t.project_id === filterPlate) return true
      return false
    })
  }
  if (filterType && showTypeFilter) {
    filtered = filtered.filter(t => t.task_type === filterType)
  }

  // Sort by urgency (most urgent first)
  const sorted = sortByUrgency(filtered)

  // Map plate IDs to names
  const plateMap = {}
  plates.forEach(p => { plateMap[p.id] = p.name })

  // Map project IDs to names (subplates)
  const projectMap = {}
  projects.forEach(p => { projectMap[p.id] = p.name })

  // Build plate/subplate options for the filter dropdown
  // Group: plate names, then indented subplates under each
  const plateOptions = []
  const activePlates = plates.filter(p => !p.is_set_aside).sort((a, b) => a.name.localeCompare(b.name))
  activePlates.forEach(plate => {
    plateOptions.push({ id: plate.id, label: plate.name })
    const subplates = projects.filter(p => p.plate_id === plate.id && p.status === 'active').sort((a, b) => a.name.localeCompare(b.name))
    subplates.forEach(sub => {
      plateOptions.push({ id: sub.id, label: `  └ ${sub.name}` })
    })
  })

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{title} ({sorted.length})</h3>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>

      {/* Sub-filters */}
      <div style={styles.filterBar}>
        <select
          value={filterPlate}
          onChange={(e) => setFilterPlate(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Plates</option>
          {plateOptions.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>

        {showTypeFilter && (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="">All Types</option>
            <option value="Billable">Billable</option>
            <option value="Operational">Operational</option>
            <option value="Volunteer">Volunteer</option>
          </select>
        )}
      </div>

      {sorted.length === 0 ? (
        <p style={styles.emptyText}>None right now.</p>
      ) : (
        <div style={styles.list}>
          {sorted.map((task) => {
            const tier = getEffectiveTier(task)
            const tierColor = getTierColor(tier)
            const plateName = plateMap[task.plate_id] || 'Unknown'
            const projectName = task.project_id ? projectMap[task.project_id] : null
            const nextPromote = getNextPromoteTier(task.urgency_tier)

            const handlePromote = async () => {
              if (!nextPromote) return
              await supabase
                .from('tasks')
                .update({ urgency_tier: nextPromote, updated_at: new Date().toISOString() })
                .eq('id', task.id)
              if (onTaskUpdated) onTaskUpdated()
            }

            return (
              <div key={task.id} style={{ ...styles.taskRow, borderLeftColor: tierColor }}>
                <div style={styles.taskInfo}>
                  <span style={styles.taskTitle}>{task.title}</span>
                  <div style={styles.taskMeta}>
                    <span style={styles.plateBadge}>{plateName}{projectName ? ` › ${projectName}` : ''}</span>
                    <span style={{
                      ...styles.tierBadge,
                      backgroundColor: tierColor,
                      color: tier === 'Overdue' || tier === 'Today' || tier === 'Tomorrow'
                        ? 'var(--text-on-accent)' : 'var(--text-primary)',
                    }}>
                      {tier}
                    </span>
                    {task.kick_count > 0 && (
                      <span style={styles.kickBadge}>kicked {task.kick_count}x</span>
                    )}
                    {task.is_paused && task.paused_note && (
                      <span style={styles.pauseNote}>"{task.paused_note}"</span>
                    )}
                    {/* Promote button */}
                    {nextPromote && (
                      <button onClick={handlePromote} style={styles.miniPromoteBtn} title={`Promote to ${nextPromote}`}>
                        <PromoteIcon size={9} color="var(--tier-2)" /> {nextPromote}
                      </button>
                    )}
                    {/* Pick Up / Pick Back Up buttons */}
                    {task.is_paused && onResumeTask ? (
                      <button onClick={() => onResumeTask(task)} style={styles.miniPickUpBtn}>
                        <PlayIcon size={9} color="var(--text-on-accent)" /> Pick Back Up
                      </button>
                    ) : !task.is_paused && !task.is_focused && onFocusTask ? (
                      <button onClick={() => onFocusTask(task)} style={styles.miniWorkBtn}>
                        <PlayIcon size={9} color="var(--tier-2)" /> Pick Up
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1rem',
    fontWeight: 700,
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },

  // Filter bar
  filterBar: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '0.75rem',
  },
  filterSelect: {
    fontSize: '0.8125rem',
    padding: '0.375rem 0.625rem',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-base)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    minWidth: '140px',
  },

  emptyText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  taskRow: {
    padding: '0.625rem 0.75rem',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-subtle)',
    borderLeft: '3px solid',
  },
  taskInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  taskTitle: {
    fontSize: '0.9375rem',
    fontWeight: 500,
  },
  taskMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    flexWrap: 'wrap',
  },
  plateBadge: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--border-light)',
    padding: '0.0625rem 0.375rem',
    borderRadius: '3px',
  },
  tierBadge: {
    fontSize: '0.625rem',
    fontWeight: 600,
    padding: '0.0625rem 0.375rem',
    borderRadius: '3px',
  },
  kickBadge: {
    fontSize: '0.625rem',
    color: 'var(--tier-3)',
    fontStyle: 'italic',
  },
  pauseNote: {
    fontSize: '0.6875rem',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  miniPromoteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.125rem',
    fontSize: '0.625rem',
    fontWeight: 500,
    color: 'var(--tier-2)',
    backgroundColor: 'transparent',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    border: '1px solid var(--tier-2)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  miniWorkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.125rem',
    fontSize: '0.625rem',
    fontWeight: 500,
    color: 'var(--tier-2)',
    backgroundColor: 'transparent',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
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
  },
}
