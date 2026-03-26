import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { BackIcon, CheckIcon } from '../components/Icons'

/**
 * CompletedTasksView — paginated history of completed tasks,
 * grouped by the date they were marked complete (most recent first).
 *
 * Loads one page of date-groups at a time (PAGE_SIZE tasks per fetch).
 * Filters by plate and/or task type.
 */

const PAGE_SIZE = 50 // number of tasks per fetch

export default function CompletedTasksView({ plates, onBack }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  // Filters
  const [filterPlate, setFilterPlate] = useState('') // plate id or ''
  const [filterType, setFilterType] = useState('')   // task type or ''

  // Which date groups are expanded (keyed by date string like '2026-03-24')
  const [expandedDates, setExpandedDates] = useState({})

  // Build a lookup for plate names (including subplates via projects)
  const plateMap = {}
  plates.forEach(p => { plateMap[p.id] = p.name })

  // Fetch a page of completed tasks from Supabase
  const fetchPage = useCallback(async (pageNum, append = false) => {
    if (pageNum === 0) setLoading(true)
    else setLoadingMore(true)

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('is_complete', true)
      .order('completed_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    if (filterPlate) {
      query = query.eq('plate_id', filterPlate)
    }
    if (filterType) {
      query = query.eq('task_type', filterType)
    }

    const { data, error } = await query

    if (!error && data) {
      if (append) {
        setTasks(prev => [...prev, ...data])
      } else {
        setTasks(data)
      }
      setHasMore(data.length === PAGE_SIZE)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [filterPlate, filterType])

  // Reset and reload when filters change
  useEffect(() => {
    setPage(0)
    setExpandedDates({})
    fetchPage(0, false)
  }, [fetchPage])

  // Load more
  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPage(nextPage, true)
  }

  // Un-complete a task
  const handleUncomplete = async (taskId) => {
    const { error } = await supabase
      .from('tasks')
      .update({
        is_complete: false,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (!error) {
      // Remove it from the local list immediately
      setTasks(prev => prev.filter(t => t.id !== taskId))
    }
  }

  // Toggle a date group open/closed
  const toggleDate = (dateKey) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }))
  }

  // Group tasks by completion date (local timezone)
  const groupByDate = (taskList) => {
    const groups = {}
    taskList.forEach(task => {
      if (!task.completed_at) return
      const d = new Date(task.completed_at)
      // Format as local date key
      const dateKey = d.toLocaleDateString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/New_York'
      })
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(task)
    })
    // Return as array of { dateKey, displayDate, tasks } sorted most recent first
    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .map(dateKey => {
        const sampleDate = new Date(groups[dateKey][0].completed_at)
        const displayDate = sampleDate.toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', timeZone: 'America/New_York'
        })
        return { dateKey, displayDate, tasks: groups[dateKey] }
      })
  }

  const dateGroups = groupByDate(tasks)

  // Strip [HH:MM] prefix for display
  const displayTitle = (title) => {
    const match = title.match(/^\[\d{2}:\d{2}\](.*)/)
    return match ? match[1] : title
  }

  // Get all plates that have completed tasks to populate the filter dropdown
  // (use the plates prop — simpler, always available)
  const activePlates = plates.filter(p => !p.is_set_aside).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <BackIcon size={18} color="var(--text-secondary)" />
        </button>
        <h2 style={styles.title}>Completed Tasks</h2>
      </div>

      {/* Filter bar */}
      <div style={styles.filterBar}>
        <select
          value={filterPlate}
          onChange={(e) => setFilterPlate(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Plates</option>
          {activePlates.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

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
      </div>

      {/* Task list grouped by date */}
      {loading ? (
        <p style={styles.loadingText}>Loading completed tasks...</p>
      ) : dateGroups.length === 0 ? (
        <p style={styles.emptyText}>No completed tasks found.</p>
      ) : (
        <div style={styles.groupList}>
          {dateGroups.map(({ dateKey, displayDate, tasks: groupTasks }) => {
            const isOpen = expandedDates[dateKey]
            return (
              <div key={dateKey} style={styles.dateGroup}>
                {/* Collapsible date header */}
                <button
                  onClick={() => toggleDate(dateKey)}
                  style={styles.dateHeader}
                >
                  <span style={styles.dateHeaderArrow}>{isOpen ? '▾' : '▸'}</span>
                  <span style={styles.dateHeaderText}>
                    {displayDate} — {groupTasks.length} task{groupTasks.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {/* Expanded task list */}
                {isOpen && (
                  <div style={styles.taskList}>
                    {groupTasks.map(task => (
                      <div key={task.id} style={styles.taskRow}>
                        <div style={styles.taskInfo}>
                          <span style={styles.taskTitle}>{displayTitle(task.title)}</span>
                          <div style={styles.taskMeta}>
                            <span style={styles.metaChip}>{plateMap[task.plate_id] || 'Unknown plate'}</span>
                            <span style={{
                              ...styles.metaChip,
                              ...styles.typeChip,
                              backgroundColor: task.task_type === 'Billable' ? 'rgba(76, 175, 80, 0.12)' : task.task_type === 'Volunteer' ? 'rgba(156, 39, 176, 0.10)' : 'rgba(158, 158, 158, 0.12)',
                              color: task.task_type === 'Billable' ? '#388e3c' : task.task_type === 'Volunteer' ? '#7b1fa2' : 'var(--text-secondary)',
                            }}>{task.task_type}</span>
                          </div>
                        </div>
                        {/* Un-complete button */}
                        <button
                          onClick={() => handleUncomplete(task.id)}
                          style={styles.uncompleteBtn}
                          title="Undo completion"
                        >
                          Undo
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={styles.loadMoreBtn}
            >
              {loadingMore ? 'Loading...' : 'Load older tasks'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    padding: '1.25rem',
    maxWidth: '720px',
    width: '100%',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    border: '1px solid var(--border-light)',
    background: 'var(--bg-base)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    margin: 0,
  },

  // Filter bar
  filterBar: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
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

  // Loading / empty
  loadingText: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    marginTop: '2rem',
  },
  emptyText: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    marginTop: '2rem',
    fontStyle: 'italic',
  },

  // Date groups
  groupList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  dateGroup: {
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  dateHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  dateHeaderArrow: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    width: '14px',
    flexShrink: 0,
  },
  dateHeaderText: {
    flex: 1,
  },

  // Task list inside a date group
  taskList: {
    borderTop: '1px solid var(--border-light)',
  },
  taskRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    padding: '0.625rem 1rem 0.625rem 2rem',
    borderBottom: '1px solid var(--border-light)',
  },
  taskInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  taskMeta: {
    display: 'flex',
    gap: '0.375rem',
    flexWrap: 'wrap',
  },
  metaChip: {
    fontSize: '0.6875rem',
    color: 'var(--text-secondary)',
    padding: '0.0625rem 0.375rem',
    borderRadius: '4px',
    backgroundColor: 'var(--bg-subtle)',
  },
  typeChip: {
    fontWeight: 600,
  },

  // Un-complete button
  uncompleteBtn: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'border-color 0.15s',
  },

  // Load more
  loadMoreBtn: {
    display: 'block',
    width: '100%',
    padding: '0.75rem',
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'border-color 0.15s',
  },
}
