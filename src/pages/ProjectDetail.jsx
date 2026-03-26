import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { sortByUrgency } from '../lib/urgency'
import TaskCard from '../components/TaskCard'
import AddTaskForm from '../components/AddTaskForm'
import { BackIcon, PlusIcon } from '../components/Icons'

export default function ProjectDetail({ project, plate, onBack, onTaskFocused, dataVersion }) {
  const [tasks, setTasks] = useState([])
  const [showCompleted, setShowCompleted] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [nextAction, setNextAction] = useState(project.next_action || '')
  const [whereILeftOff, setWhereILeftOff] = useState(project.where_i_left_off || '')
  const [editingNextAction, setEditingNextAction] = useState(false)
  const [editingLeftOff, setEditingLeftOff] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSetAside, setShowSetAside] = useState(false)

  // Set aside (archive) this sub-plate
  const handleSetAside = async () => {
    const { error } = await supabase
      .from('projects')
      .update({ status: 'archived' })
      .eq('id', project.id)
    if (!error && onBack) onBack()
  }

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true })

    if (!error) {
      setTasks(data || [])
    }
    setLoading(false)
  }, [project.id])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Re-fetch when parent signals data changed (e.g. task put down from global overlay)
  useEffect(() => {
    if (dataVersion > 0) fetchTasks()
  }, [dataVersion])

  const activeTasks = sortByUrgency(tasks.filter(t => !t.is_complete))
  const completedTasks = tasks.filter(t => t.is_complete)

  // Save next action
  const saveNextAction = async () => {
    await supabase
      .from('projects')
      .update({ next_action: nextAction.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', project.id)
    setEditingNextAction(false)
  }

  // Save where I left off
  const saveWhereILeftOff = async () => {
    await supabase
      .from('projects')
      .update({ where_i_left_off: whereILeftOff.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', project.id)
    setEditingLeftOff(false)
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <BackIcon size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={styles.title}>{project.name}</h1>
          <span style={styles.subtitle}>
            {plate.name} &bull; {project.is_billable ? 'Billable' : 'Non-billable'} &bull; {activeTasks.length} active tasks
          </span>
        </div>
        {showSetAside ? (
          <div style={styles.setAsidePopup}>
            <button onClick={handleSetAside} style={styles.setAsideConfirmBtn}>Set Aside</button>
            <button onClick={() => setShowSetAside(false)} style={styles.setAsideCancelBtn}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowSetAside(true)} style={styles.setAsideBtn}>Set Aside</button>
        )}
      </div>

      {/* Next Action */}
      <div style={styles.scratchpad}>
        <label style={styles.scratchLabel}>Next Action</label>
        {editingNextAction ? (
          <div style={styles.scratchEditRow}>
            <input
              className="input"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveNextAction()}
              placeholder="What's the next thing to do on this project?"
              autoFocus
              style={{ fontSize: '0.875rem' }}
            />
            <button className="btn-primary" onClick={saveNextAction} style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}>Save</button>
            <button className="btn-secondary" onClick={() => { setEditingNextAction(false); setNextAction(project.next_action || '') }} style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}>Cancel</button>
          </div>
        ) : (
          <p
            style={styles.scratchText}
            onClick={() => setEditingNextAction(true)}
          >
            {nextAction || 'Click to set next action...'}
          </p>
        )}
      </div>

      {/* Where I Left Off */}
      <div style={styles.scratchpad}>
        <label style={styles.scratchLabel}>Where I Left Off</label>
        {editingLeftOff ? (
          <div style={styles.scratchEditRow}>
            <input
              className="input"
              value={whereILeftOff}
              onChange={(e) => setWhereILeftOff(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveWhereILeftOff()}
              placeholder="Where did you stop last time?"
              autoFocus
              style={{ fontSize: '0.875rem' }}
            />
            <button className="btn-primary" onClick={saveWhereILeftOff} style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}>Save</button>
            <button className="btn-secondary" onClick={() => { setEditingLeftOff(false); setWhereILeftOff(project.where_i_left_off || '') }} style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}>Cancel</button>
          </div>
        ) : (
          <p
            style={styles.scratchText}
            onClick={() => setEditingLeftOff(true)}
          >
            {whereILeftOff || 'Click to note where you left off...'}
          </p>
        )}
      </div>

      {/* Add Task */}
      {showAddForm ? (
        <AddTaskForm
          plateId={plate.id}
          projectId={project.id}
          onTaskAdded={() => { fetchTasks(); setShowAddForm(false) }}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <button onClick={() => setShowAddForm(true)} style={styles.addBtn}>
          <PlusIcon size={16} color="var(--tier-2)" />
          <span>Add Task</span>
        </button>
      )}

      {/* Active tasks */}
      {loading ? (
        <p style={styles.loadingText}>Loading tasks...</p>
      ) : activeTasks.length === 0 ? (
        <p style={styles.emptyText}>No tasks yet. Add one above!</p>
      ) : (
        <div style={styles.taskList}>
          {activeTasks.map((task) => (
            <TaskCard key={task.id} task={task} onUpdate={fetchTasks} onDelete={fetchTasks} onTaskFocused={onTaskFocused} />
          ))}
        </div>
      )}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <div style={styles.completedSection}>
          <button onClick={() => setShowCompleted(!showCompleted)} style={styles.completedToggle}>
            {showCompleted ? 'Hide' : 'Show'} {completedTasks.length} completed task{completedTasks.length !== 1 ? 's' : ''}
          </button>
          {showCompleted && (
            <div style={styles.taskList}>
              {completedTasks.map((task) => (
                <div key={task.id} style={styles.completedTask}>
                  <span style={styles.completedTitle}>{task.title}</span>
                  <span style={styles.completedDate}>
                    {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}
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
  subtitle: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
  },
  scratchpad: {
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    borderRadius: '8px',
    padding: '0.75rem',
    marginBottom: '0.75rem',
  },
  scratchLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.25rem',
    display: 'block',
  },
  scratchText: {
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    lineHeight: 1.4,
    margin: 0,
  },
  scratchEditRow: {
    display: 'flex',
    gap: '0.375rem',
    alignItems: 'center',
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
    background: 'none',
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
  setAsideBtn: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--set-aside)',
    background: 'none',
    border: '1px solid var(--set-aside)',
    borderRadius: '6px',
    padding: '0.25rem 0.75rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  setAsidePopup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    flexShrink: 0,
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
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
}
