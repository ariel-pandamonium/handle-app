import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getEffectiveTier, sortByUrgency, getTierColor } from '../lib/urgency'
import AddProjectForm from '../components/AddProjectForm'
import AddTaskForm from '../components/AddTaskForm'
import { BackIcon, PlusIcon, FlameIcon, PlayIcon } from '../components/Icons'

/**
 * Sub-dashboard view for a plate that has sub-plates (projects).
 * Shows: combined urgency list at top (expand/collapse), sub-plate cards, free-floating tasks.
 */
export default function PlateSubDashboard({ plate, onBack, onSelectProject, onFocusTask, onTaskFocused, dataVersion }) {
  const [projects, setProjects] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [showAddPlate, setShowAddPlate] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [urgencyExpanded, setUrgencyExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSetAside, setShowSetAside] = useState(false)
  const [setAsideDate, setSetAsideDate] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [projRes, taskRes] = await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .eq('plate_id', plate.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('tasks')
        .select('*')
        .eq('plate_id', plate.id)
        .eq('is_complete', false),
    ])
    setProjects(projRes.data || [])
    setAllTasks(taskRes.data || [])
    setLoading(false)
  }, [plate.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Re-fetch when parent signals data changed (e.g. task put down from overlay)
  useEffect(() => {
    if (dataVersion > 0) fetchData()
  }, [dataVersion])

  // Focus a task directly (Pick Up)
  const handleFocusTask = async (task) => {
    const history = task.pause_history || []
    // Immediately tell Dashboard to show the overlay (no waiting for re-fetch)
    const updatedTask = { ...task, is_focused: true, focused_at: new Date().toISOString(), pause_history: [...history, { action: 'resumed', timestamp: new Date().toISOString() }] }
    if (onTaskFocused) onTaskFocused(updatedTask)
    const { error } = await supabase
      .from('tasks')
      .update({
        is_focused: true,
        focused_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pause_history: updatedTask.pause_history,
      })
      .eq('id', task.id)
    if (!error) fetchData()
  }

  // Resume a paused task (Pick Back Up)
  const handleResume = async (task) => {
    const history = task.pause_history || []
    // Immediately tell Dashboard to show the overlay
    const updatedTask = { ...task, is_paused: false, paused_note: null, paused_at: null, is_focused: true, focused_at: new Date().toISOString(), pause_history: [...history, { action: 'resumed', note: task.paused_note || null, prev_paused_note: task.paused_note || null, timestamp: new Date().toISOString() }] }
    if (onTaskFocused) onTaskFocused(updatedTask)
    const { error } = await supabase
      .from('tasks')
      .update({
        is_paused: false,
        paused_note: null,
        paused_at: null,
        is_focused: true,
        focused_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pause_history: updatedTask.pause_history,
      })
      .eq('id', task.id)
    if (!error) fetchData()
  }

  // Calculate urgency score for a project (for sorting)
  const getProjectUrgencyScore = (project) => {
    const projTasks = allTasks.filter(t => t.project_id === project.id)
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
    return score
  }

  // Sort sub-plates by urgency
  const activeProjects = projects
    .filter(p => p.status === 'active' && !p.is_set_aside)
    .sort((a, b) => getProjectUrgencyScore(b) - getProjectUrgencyScore(a))

  // Combined urgency list — ALL tasks across all sub-plates + free-floating
  const allSorted = sortByUrgency(allTasks)
  const urgencyPreview = urgencyExpanded ? allSorted : allSorted.slice(0, 3)

  // Free-floating tasks (not assigned to any sub-plate)
  const freeFloatingTasks = sortByUrgency(allTasks.filter(t => !t.project_id))

  // Stats
  const totalTasks = allTasks.length
  const overdueCount = allTasks.filter(t => getEffectiveTier(t) === 'Overdue').length
  const todayCount = allTasks.filter(t => getEffectiveTier(t) === 'Today').length
  const billableCount = allTasks.filter(t => t.task_type === 'Billable').length

  // Set Aside this plate
  const handleSetAside = async () => {
    const { error } = await supabase
      .from('plates')
      .update({
        is_set_aside: true,
        set_aside_until: setAsideDate || null,
      })
      .eq('id', plate.id)
    if (!error && onBack) onBack()
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <BackIcon size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={styles.title}>{plate.name}</h1>
          <div style={styles.statsRow}>
            {overdueCount > 0 && (
              <span style={styles.statOverdue}>
                <FlameIcon size={11} /> {overdueCount} overdue
              </span>
            )}
            {todayCount > 0 && (
              <span style={styles.statToday}>{todayCount} due today</span>
            )}
            {billableCount > 0 && (
              <span style={styles.statBillable}>{billableCount} billable</span>
            )}
            <span style={styles.statTotal}>
              {totalTasks} tasks &bull; {activeProjects.length} plate{activeProjects.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        {!plate.is_permanent && (
          <div>
            {showSetAside ? (
              <div style={styles.setAsidePopup}>
                <input
                  type="date"
                  className="input"
                  value={setAsideDate}
                  onChange={(e) => setSetAsideDate(e.target.value)}
                  style={{ fontSize: '0.75rem', maxWidth: '140px' }}
                />
                <button onClick={handleSetAside} style={styles.setAsideConfirmBtn}>
                  {setAsideDate ? 'Set Aside' : 'Indefinitely'}
                </button>
                <button onClick={() => setShowSetAside(false)} style={styles.setAsideCancelBtn}>✕</button>
              </div>
            ) : (
              <button onClick={() => setShowSetAside(true)} style={styles.setAsideBtn}>
                Set Aside
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <p style={styles.loadingText}>Loading...</p>
      ) : (
        <>
          {/* Combined urgency list — top tasks across everything */}
          {allSorted.length > 0 && (
            <div style={styles.urgencySection}>
              <div style={styles.urgencyHeader}>
                <h3 style={styles.urgencyTitle}>All Tasks by Urgency</h3>
                {allSorted.length > 3 && (
                  <button onClick={() => setUrgencyExpanded(!urgencyExpanded)} style={styles.expandBtn}>
                    {urgencyExpanded ? 'Collapse' : `Show all ${allSorted.length}`}
                  </button>
                )}
              </div>
              <div style={urgencyExpanded ? styles.urgencyListExpanded : styles.urgencyList}>
                {urgencyPreview.map((task) => {
                  const tier = getEffectiveTier(task)
                  const tierColor = getTierColor(tier)
                  // Find which sub-plate this task belongs to
                  const proj = task.project_id ? projects.find(p => p.id === task.project_id) : null

                  return (
                    <div key={task.id} style={{ ...styles.urgencyRow, borderLeftColor: tierColor }}>
                      <span style={{ ...styles.urgencyDot, backgroundColor: tierColor }} />
                      <div style={styles.urgencyInfo}>
                        <span style={styles.urgencyTaskTitle}>{task.title}</span>
                        <span style={styles.urgencyMeta}>
                          {tier}{proj ? ` · ${proj.name}` : ' · General'}
                        </span>
                      </div>
                      {task.is_paused ? (
                        <button onClick={() => handleResume(task)} style={styles.miniPickUpBtn}><PlayIcon size={9} color="var(--text-on-accent)" /> Pick Back Up</button>
                      ) : !task.is_focused ? (
                        <button onClick={() => handleFocusTask(task)} style={styles.miniWorkBtn}>
                          <PlayIcon size={9} color="var(--tier-2)" /> Pick Up
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add Task (free-floating, directly on this plate) */}
          {showAddTask ? (
            <div style={{ marginBottom: '1rem' }}>
              <AddTaskForm
                plateId={plate.id}
                defaultTaskType={plate.default_task_type || 'Operational'}
                onTaskAdded={() => { fetchData(); setShowAddTask(false) }}
                onCancel={() => setShowAddTask(false)}
              />
            </div>
          ) : (
            <button onClick={() => setShowAddTask(true)} style={styles.addTaskBtn}>
              <PlusIcon size={14} color="var(--tier-2)" /> Add Task
            </button>
          )}

          {/* Sub-plate grid */}
          <h3 style={styles.sectionLabel}>Plates</h3>
          <div style={styles.grid}>
            {activeProjects.map((project) => {
              const projTasks = allTasks.filter(t => t.project_id === project.id)
              const sorted = sortByUrgency(projTasks)
              const top3 = sorted.slice(0, 3)
              const projOverdue = projTasks.filter(t => getEffectiveTier(t) === 'Overdue').length

              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  style={styles.projectCard}
                >
                  <div style={styles.projectHeader}>
                    <h3 style={styles.projectName}>{project.name}</h3>
                    <div style={styles.projectBadges}>
                      {project.is_billable && <span style={styles.billableBadge}>$</span>}
                      {projOverdue > 0 && (
                        <span style={styles.overdueBadge}>
                          <FlameIcon size={10} /> {projOverdue}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={styles.projectStats}>
                    <span>{projTasks.length} task{projTasks.length !== 1 ? 's' : ''}</span>
                  </div>
                  {top3.length > 0 ? (
                    <div style={styles.taskPreviews}>
                      {top3.map((task) => {
                        const tierColor = getTierColor(getEffectiveTier(task))
                        return (
                          <div key={task.id} style={styles.taskPreview}>
                            <span style={{ ...styles.previewDot, backgroundColor: tierColor }} />
                            <span style={styles.previewTitle}>{task.title}</span>
                            {task.is_paused ? (
                              <button onClick={(e) => { e.stopPropagation(); handleResume(task) }} style={styles.miniPickUpBtn}>
                                <PlayIcon size={9} color="var(--text-on-accent)" /> Pick Back Up
                              </button>
                            ) : !task.is_focused ? (
                              <button onClick={(e) => { e.stopPropagation(); handleFocusTask(task) }} style={styles.miniWorkBtn}>
                                <PlayIcon size={9} color="var(--tier-2)" /> Pick Up
                              </button>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p style={styles.noTasksText}>No tasks yet</p>
                  )}
                  {project.next_action && (
                    <p style={styles.nextAction}>Next: {project.next_action}</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Free-floating tasks */}
          {freeFloatingTasks.length > 0 && (
            <div style={styles.freeFloatingSection}>
              <h3 style={styles.sectionLabel}>General Tasks</h3>
              <div style={styles.freeFloatingList}>
                {freeFloatingTasks.map((task) => {
                  const tier = getEffectiveTier(task)
                  const tierColor = getTierColor(tier)
                  return (
                    <div key={task.id} style={{ ...styles.urgencyRow, borderLeftColor: tierColor }}>
                      <span style={{ ...styles.urgencyDot, backgroundColor: tierColor }} />
                      <div style={styles.urgencyInfo}>
                        <span style={styles.urgencyTaskTitle}>{task.title}</span>
                        <span style={styles.urgencyMeta}>{tier}</span>
                      </div>
                      {task.is_paused ? (
                        <button onClick={() => handleResume(task)} style={styles.miniPickUpBtn}><PlayIcon size={9} color="var(--text-on-accent)" /> Pick Back Up</button>
                      ) : !task.is_focused ? (
                        <button onClick={() => handleFocusTask(task)} style={styles.miniWorkBtn}>
                          <PlayIcon size={9} color="var(--tier-2)" /> Pick Up
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add sub-plate */}
          {showAddPlate ? (
            <div style={{ maxWidth: '400px', marginTop: '1rem' }}>
              <AddProjectForm
                plateId={plate.id}
                onProjectAdded={() => { fetchData(); setShowAddPlate(false) }}
                onCancel={() => setShowAddPlate(false)}
              />
            </div>
          ) : (
            <button onClick={() => setShowAddPlate(true)} style={styles.addBtn}>
              <PlusIcon size={16} color="var(--tier-2)" /> Add Plate
            </button>
          )}
        </>
      )}
    </div>
  )
}

const styles = {
  container: { padding: '1.25rem', maxWidth: '960px', width: '100%', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' },
  backBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-base)', cursor: 'pointer', flexShrink: 0 },
  title: { fontSize: '1.5rem', fontWeight: 700 },
  statsRow: { display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.125rem' },
  statOverdue: { display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--tier-1)' },
  statToday: { fontSize: '0.75rem', fontWeight: 500, color: 'var(--tier-2)' },
  statBillable: { fontSize: '0.75rem', fontWeight: 500, color: 'var(--tier-2)' },
  statTotal: { fontSize: '0.75rem', color: 'var(--text-secondary)' },

  // Combined urgency list
  urgencySection: { backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' },
  urgencyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' },
  urgencyTitle: { fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' },
  expandBtn: { fontSize: '0.75rem', color: 'var(--tier-2)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' },
  urgencyList: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  urgencyListExpanded: { display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '400px', overflowY: 'auto' },
  urgencyRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', borderRadius: '6px', backgroundColor: 'var(--bg-subtle)', borderLeft: '3px solid' },
  urgencyDot: { width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0 },
  urgencyInfo: { flex: 1, minWidth: 0 },
  urgencyTaskTitle: { fontSize: '0.875rem', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  urgencyMeta: { fontSize: '0.6875rem', color: 'var(--text-secondary)' },
  miniWorkBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.125rem', fontSize: '0.625rem', fontWeight: 500, color: 'var(--tier-2)', backgroundColor: 'transparent', padding: '0.125rem 0.375rem', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  miniPickUpBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.125rem', fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-on-accent)', backgroundColor: 'var(--tier-2)', padding: '0.125rem 0.375rem', borderRadius: '4px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },

  // Add task / add plate buttons
  addTaskBtn: { display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', border: '1px dashed var(--border)', borderRadius: '8px', background: 'none', cursor: 'pointer', color: 'var(--tier-2)', fontWeight: 500, fontSize: '0.8125rem', marginBottom: '1rem' },
  sectionLabel: { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '0.5rem' },

  // Sub-plate grid
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '1rem' },
  projectCard: { backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1rem', cursor: 'pointer', transition: 'box-shadow 0.15s ease, border-color 0.15s ease' },
  projectHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' },
  projectName: { fontSize: '1.0625rem', fontWeight: 600 },
  projectBadges: { display: 'flex', alignItems: 'center', gap: '0.375rem' },
  billableBadge: { fontSize: '0.6875rem', fontWeight: 700, color: 'var(--tier-2)' },
  overdueBadge: { display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--tier-1)' },
  projectStats: { display: 'flex', gap: '0.5rem', fontSize: '0.6875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' },
  taskPreviews: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  taskPreview: { display: 'flex', alignItems: 'center', gap: '0.375rem', width: '100%' },
  previewDot: { width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0 },
  previewTitle: { fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 },
  noTasksText: { fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' },
  nextAction: { fontSize: '0.75rem', color: 'var(--tier-2)', marginTop: '0.5rem', fontStyle: 'italic' },

  // Free-floating
  freeFloatingSection: { marginBottom: '1rem' },
  freeFloatingList: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },

  // Add plate button
  addBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: '1px dashed var(--border)', borderRadius: '10px', background: 'var(--bg-base)', cursor: 'pointer', color: 'var(--tier-2)', fontWeight: 500, fontSize: '0.875rem', maxWidth: '300px' },
  loadingText: { textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' },

  // Set Aside
  setAsideBtn: { fontSize: '0.75rem', fontWeight: 500, color: 'var(--set-aside)', background: 'none', border: '1px solid var(--set-aside)', borderRadius: '6px', padding: '0.25rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  setAsidePopup: { display: 'flex', alignItems: 'center', gap: '0.375rem' },
  setAsideConfirmBtn: { fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-on-accent)', backgroundColor: 'var(--set-aside)', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  setAsideCancelBtn: { fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' },
}
