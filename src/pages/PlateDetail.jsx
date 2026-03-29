import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { sortByUrgency } from '../lib/urgency'
import TaskCard from '../components/TaskCard'
import SortableTaskList from '../components/SortableTaskList'
import AddTaskForm from '../components/AddTaskForm'
import AddProjectForm from '../components/AddProjectForm'
import { BackIcon, PlusIcon } from '../components/Icons'

export default function PlateDetail({ plate, onBack, pausedCount = 0, onTaskFocused, dataVersion }) {
  const [tasks, setTasks] = useState([])
  const [showCompleted, setShowCompleted] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSetAside, setShowSetAside] = useState(false)
  const [setAsideDate, setSetAsideDate] = useState('')

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('plate_id', plate.id)
      .is('project_id', null)
      .order('created_at', { ascending: true })

    if (!error) {
      setTasks(data || [])
    }
    setLoading(false)
  }, [plate.id])

  // Quiet refresh — same fetch but without the loading spinner (used after drag-and-drop)
  const quietFetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('plate_id', plate.id)
      .is('project_id', null)
      .order('created_at', { ascending: true })

    if (!error) {
      setTasks(data || [])
    }
  }, [plate.id])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Re-fetch when parent signals data changed (e.g. task put down from global overlay)
  useEffect(() => {
    if (dataVersion > 0) fetchTasks()
  }, [dataVersion])

  const activeTasks = sortByUrgency(tasks.filter(t => !t.is_complete))
  const completedTasks = tasks.filter(t => t.is_complete)

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
          <span style={styles.taskCount}>
            {activeTasks.length} active task{activeTasks.length !== 1 ? 's' : ''}
          </span>
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

      {/* Add Task button / form */}
      {showAddForm ? (
        <AddTaskForm
          plateId={plate.id}
          defaultTaskType={plate.default_task_type || 'Operational'}
          onTaskAdded={() => { fetchTasks(); setShowAddForm(false) }}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          style={styles.addBtn}
        >
          <PlusIcon size={16} color="var(--tier-2)" />
          <span>Add Task</span>
        </button>
      )}

      {/* Add Project (sub-plate) — creates the first project for this plate */}
      {showAddProject ? (
        <div style={{ marginBottom: '1rem' }}>
          <AddProjectForm
            plateId={plate.id}
            onProjectAdded={() => {
              setShowAddProject(false)
              // Reload page — Dashboard will now route to PlateSubDashboard since plate has projects
              if (onBack) onBack()
            }}
            onCancel={() => setShowAddProject(false)}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowAddProject(true)}
          style={styles.addProjectBtn}
        >
          <PlusIcon size={14} color="var(--text-secondary)" />
          <span>Add Plate</span>
        </button>
      )}

      {/* Active tasks */}
      {loading && tasks.length === 0 ? (
        <p style={styles.loadingText}>Loading tasks...</p>
      ) : activeTasks.length === 0 ? (
        <p style={styles.emptyText}>No tasks yet. Add one above!</p>
      ) : (
        <SortableTaskList
          tasks={activeTasks}
          onUpdate={fetchTasks}
          onReorder={quietFetchTasks}
          onDelete={fetchTasks}
          pausedCount={pausedCount}
          onTaskFocused={onTaskFocused}
        />
      )}

      {/* Completed tasks toggle */}
      {completedTasks.length > 0 && (
        <div style={styles.completedSection}>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            style={styles.completedToggle}
          >
            {showCompleted ? 'Hide' : 'Show'} {completedTasks.length} completed task{completedTasks.length !== 1 ? 's' : ''}
          </button>

          {showCompleted && (
            <div style={styles.taskList}>
              {completedTasks.map((task) => (
                <div key={task.id} style={styles.completedTask}>
                  <span style={styles.completedTitle}>{task.title}</span>
                  <span style={styles.completedDate}>
                    {new Date(task.completed_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', timeZone: 'America/New_York'
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: '1.25rem',
    maxWidth: '720px',
    width: '100%',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg-base)',
    cursor: 'pointer',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  taskCount: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1rem',
    border: '1px dashed var(--border)',
    borderRadius: '8px',
    background: 'var(--bg-base)',
    cursor: 'pointer',
    color: 'var(--tier-2)',
    fontWeight: 500,
    fontSize: '0.875rem',
    width: '100%',
    marginBottom: '1rem',
    transition: 'border-color 0.15s',
  },
  addProjectBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.5rem 1rem',
    border: '1px dashed var(--border-light)',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontSize: '0.8125rem',
    width: '100%',
    marginBottom: '1rem',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  loadingText: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    marginTop: '2rem',
  },
  emptyText: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    marginTop: '2rem',
    fontSize: '0.9375rem',
  },
  completedSection: {
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border-light)',
  },
  completedToggle: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    marginBottom: '0.75rem',
  },
  completedTask: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-subtle)',
  },
  completedTitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    textDecoration: 'line-through',
  },
  completedDate: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  // Set Aside
  setAsideBtn: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--set-aside)',
    backgroundColor: 'transparent',
    border: '1px solid var(--set-aside)',
    borderRadius: '6px',
    padding: '0.25rem 0.75rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  setAsidePopup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  setAsideConfirmBtn: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--text-on-accent)',
    backgroundColor: 'var(--set-aside)',
    border: 'none',
    borderRadius: '4px',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  setAsideCancelBtn: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
}
