import { supabase } from '../lib/supabase'
import { getEffectiveTier, getTierColor, sortByUrgency } from '../lib/urgency'
import { PlayIcon } from './Icons'

export default function InHandPanel({ tasks, onUpdate }) {
  const pausedTasks = sortByUrgency(tasks.filter(t => t.is_paused && !t.is_complete))

  if (pausedTasks.length === 0) return null

  // Pick Back Up — resume and enter focus mode directly (no overlay)
  const handlePickBackUp = async (task) => {
    const history = task.pause_history || []

    const { error } = await supabase
      .from('tasks')
      .update({
        is_paused: false,
        paused_note: null,
        paused_at: null,
        is_focused: true,
        focused_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pause_history: [...history, {
          action: 'resumed',
          prev_paused_note: task.paused_note || null,
          timestamp: new Date().toISOString(),
        }],
      })
      .eq('id', task.id)

    if (!error && onUpdate) onUpdate()
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Tasks I've Put Down ({pausedTasks.length}/10)</h3>
      <div style={styles.cards}>
        {pausedTasks.map((task) => {
          const effectiveTier = getEffectiveTier(task)
          const tierColor = getTierColor(effectiveTier)

          return (
            <div key={task.id} style={{ ...styles.card, borderTopColor: tierColor, borderTopWidth: '3px', borderTopStyle: 'solid' }}>
              <div style={styles.cardTop}>
                <span style={styles.taskTitle}>{task.title}</span>
                <span style={{
                  ...styles.tierBadge,
                  backgroundColor: tierColor,
                  color: effectiveTier === 'Overdue' || effectiveTier === 'Today' || effectiveTier === 'Tomorrow'
                    ? 'var(--text-on-accent)' : 'var(--text-primary)',
                }}>
                  {effectiveTier}
                </span>
              </div>
              {task.paused_note && (
                <p style={styles.note}>"{task.paused_note}"</p>
              )}
              <div style={styles.cardBottom}>
                <span style={styles.timestamp}>
                  Paused {task.paused_at
                    ? new Date(task.paused_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        timeZone: 'America/New_York'
                      })
                    : ''}
                </span>
                <button onClick={() => handlePickBackUp(task)} style={styles.pickUpBtn}>
                  <PlayIcon size={10} color="var(--text-on-accent)" /> Pick Back Up
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  container: {
    marginBottom: '1rem',
  },
  heading: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--tier-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  },
  cards: {
    display: 'flex',
    gap: '0.75rem',
    overflowX: 'auto',
    paddingBottom: '0.25rem',
  },
  card: {
    flex: '0 0 260px',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    padding: '0.75rem',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem',
    marginBottom: '0.375rem',
  },
  taskTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tierBadge: {
    fontSize: '0.625rem',
    fontWeight: 600,
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  note: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    marginBottom: '0.5rem',
    lineHeight: 1.4,
  },
  cardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: '0.6875rem',
    color: 'var(--text-secondary)',
  },
  pickUpBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-on-accent)',
    backgroundColor: 'var(--tier-2)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
}
