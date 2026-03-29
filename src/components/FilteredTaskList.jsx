import { useState } from 'react'
import { getEffectiveTier, sortByUrgency, sortByUrgencyWithPlateGrouping } from '../lib/urgency'
import TaskCard from './TaskCard'

/**
 * Filtered task list — shown when a sidebar stat is clicked.
 * Displays tasks matching a filter, using the standard TaskCard component.
 * Shows Plate → Sub-plate context below each task title.
 */
export default function FilteredTaskList({ tasks, plates, projects = [], filter, onClose, onTaskFocused, onTaskUpdated, pausedCount = 0, onNavigateToPlate, onNavigateToProject }) {
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
      if (t.plate_id === filterPlate) return true
      if (t.project_id === filterPlate) return true
      return false
    })
  }
  if (filterType && showTypeFilter) {
    filtered = filtered.filter(t => t.task_type === filterType)
  }

  // Calculate plate urgency score (higher = more urgent, inverted for sort)
  const calcPlateScore = (plateId) => {
    const plateTasks = tasks.filter(t => t.plate_id === plateId && !t.is_complete)
    let score = 0
    plateTasks.forEach(t => {
      const tier = getEffectiveTier(t)
      if (tier === 'Overdue') score += 100
      else if (tier === 'Today') score += 50
      else if (tier === 'Tomorrow') score += 25
      else if (tier === 'This Week') score += 10
      else if (tier === 'Next Week') score += 5
      else if (tier === 'This Month') score += 2
      else score += 1
    })
    return -score // negate so higher urgency sorts first
  }

  // Sort by urgency with plate grouping (most urgent plate first, then sub-plate within plate)
  const sorted = sortByUrgencyWithPlateGrouping(filtered, plates, projects, calcPlateScore, true)

  // Map plate IDs to plate objects
  const plateMap = {}
  plates.forEach(p => { plateMap[p.id] = p })

  // Map project IDs to project objects
  const projectMap = {}
  projects.forEach(p => { projectMap[p.id] = p })

  // Build plate/subplate options for the filter dropdown
  const plateOptions = []
  const activePlates = plates.filter(p => !p.is_set_aside).sort((a, b) => a.name.localeCompare(b.name))
  activePlates.forEach(plate => {
    plateOptions.push({ id: plate.id, label: plate.name })
    const subplates = projects.filter(p => p.plate_id === plate.id && p.status === 'active').sort((a, b) => a.name.localeCompare(b.name))
    subplates.forEach(sub => {
      plateOptions.push({ id: sub.id, label: `  └ ${sub.name}` })
    })
  })

  // Build context label and click handler for a task
  const getContext = (task) => {
    const plate = plateMap[task.plate_id]
    const project = task.project_id ? projectMap[task.project_id] : null
    const plateName = plate ? plate.name : 'Unknown'
    const projectName = project ? project.name : null

    const label = projectName ? `${plateName} → ${projectName}` : plateName

    const handleClick = () => {
      if (project && onNavigateToProject) {
        onNavigateToProject(project, plate)
      } else if (plate && onNavigateToPlate) {
        onNavigateToPlate(plate)
      }
    }

    return { label, handleClick }
  }

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
            const ctx = getContext(task)
            return (
              <div key={task.id} style={{ flexShrink: 0 }}>
                <TaskCard
                  task={task}
                  onUpdate={onTaskUpdated}
                  onDelete={onTaskUpdated}
                  pausedCount={pausedCount}
                  onTaskFocused={onTaskFocused}
                  contextLabel={ctx.label}
                  onContextClick={ctx.handleClick}
                />
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
    backgroundColor: 'transparent',
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
    gap: '0.5rem',
    maxHeight: '70vh',
    overflowY: 'auto',
  },
}
