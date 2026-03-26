import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { getEffectiveTier, getTierColor } from '../lib/urgency'
import { CheckIcon, PauseIcon } from '../components/Icons'

/**
 * In Hand — full screen view for the one task you're actively working on.
 * Replaces the floating FocusBar with a dedicated, distraction-free screen.
 * Shows: task title, plate, tier, pause history, and action buttons.
 */
export default function InHandView({ task, plateName, onUpdate }) {
  const [showPauseInput, setShowPauseInput] = useState(false)
  const [pauseNote, setPauseNote] = useState('')

  const effectiveTier = getEffectiveTier(task)
  const tierColor = getTierColor(effectiveTier)
  const history = task.pause_history || []

  // Complete the task
  const handleComplete = async () => {
    const { error } = await supabase
      .from('tasks')
      .update({
        is_complete: true,
        is_focused: false,
        focused_at: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pause_history: [...history, {
          action: 'completed',
          timestamp: new Date().toISOString(),
        }],
      })
      .eq('id', task.id)

    if (!error && onUpdate) onUpdate()
  }

  // Put Down (pause with note)
  const handlePause = async () => {
    if (!pauseNote.trim()) return

    const { error } = await supabase
      .from('tasks')
      .update({
        is_focused: false,
        focused_at: null,
        is_paused: true,
        paused_note: pauseNote.trim(),
        paused_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pause_history: [...history, {
          action: 'paused',
          note: pauseNote.trim(),
          timestamp: new Date().toISOString(),
        }],
      })
      .eq('id', task.id)

    if (!error) {
      setShowPauseInput(false)
      setPauseNote('')
      if (onUpdate) onUpdate()
    }
  }

  // Stop focusing — if task was picked back up (last history = resumed),
  // restore its paused state so it doesn't lose its "Pick Back Up" status
  const handleStopFocus = async () => {
    // Check if this focus session came from a Pick Back Up
    const lastEntry = history.length > 0 ? history[history.length - 1] : null
    const wasPickedBackUp = lastEntry && lastEntry.action === 'resumed'

    if (wasPickedBackUp) {
      // Restore paused state with the previous note
      const prevNote = lastEntry.prev_paused_note || lastEntry.note || null
      const { error } = await supabase
        .from('tasks')
        .update({
          is_focused: false,
          focused_at: null,
          is_paused: true,
          paused_note: prevNote,
          paused_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          pause_history: [...history, {
            action: 'paused',
            note: prevNote,
            timestamp: new Date().toISOString(),
          }],
        })
        .eq('id', task.id)
      if (!error && onUpdate) onUpdate()
    } else {
      // Normal exit — just unfocus
      const { error } = await supabase
        .from('tasks')
        .update({
          is_focused: false,
          focused_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)
      if (!error && onUpdate) onUpdate()
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Tier color bar */}
        <div style={{ ...styles.tierBar, backgroundColor: tierColor }} />

        {/* Header */}
        <div style={styles.header}>
          <span style={styles.label}>In Hand</span>
          <button onClick={handleStopFocus} style={styles.exitBtn} title="Exit focus (keeps task active)">
            ✕ Exit Focus
          </button>
        </div>

        {/* Task title */}
        <h1 style={styles.title}>{task.title}</h1>

        {/* Meta info */}
        <div style={styles.meta}>
          <span style={styles.plateBadge}>{plateName}</span>
          <span style={{
            ...styles.tierBadge,
            backgroundColor: tierColor,
            color: effectiveTier === 'Overdue' || effectiveTier === 'Today' || effectiveTier === 'Tomorrow'
              ? 'var(--text-on-accent)' : 'var(--text-primary)',
          }}>
            {effectiveTier}
          </span>
          <span style={styles.typeBadge}>{task.task_type}</span>
          {task.kick_count > 0 && (
            <span style={styles.kickBadge}>Kicked {task.kick_count}x</span>
          )}
        </div>

        {/* Due date if present */}
        {task.due_date && (
          <p style={styles.dueDate}>
            Due: {new Date(task.due_date).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
              timeZone: 'America/New_York'
            })}
          </p>
        )}

        {/* Pause history */}
        {history.length > 0 && (
          <div style={styles.historySection}>
            <p style={styles.historyLabel}>History</p>
            <div style={styles.historyList}>
              {history.slice().reverse().slice(0, 5).map((entry, i) => (
                <div key={i} style={styles.historyEntry}>
                  <span style={{
                    ...styles.historyAction,
                    color: entry.action === 'paused' ? 'var(--tier-3)'
                      : entry.action === 'completed' ? 'var(--tier-2)'
                      : 'var(--tier-2)',
                  }}>
                    {entry.action === 'paused' ? 'Put Down'
                      : entry.action === 'resumed' ? 'Picked Back Up'
                      : entry.action === 'completed' ? 'Completed'
                      : entry.action}
                  </span>
                  {entry.note && <span style={styles.historyNote}> — "{entry.note}"</span>}
                  <span style={styles.historyTime}>
                    {new Date(entry.timestamp).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      timeZone: 'America/New_York'
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {showPauseInput ? (
          <div style={styles.pauseSection}>
            <p style={styles.pausePrompt}>Where are you right now?</p>
            <div style={styles.pauseInputRow}>
              <input
                className="input"
                placeholder="e.g. halfway through east elevation check"
                value={pauseNote}
                onChange={(e) => setPauseNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePause()}
                autoFocus
                style={{ fontSize: '0.9375rem' }}
              />
            </div>
            <div style={styles.pauseActions}>
              <button className="btn-primary" onClick={handlePause} disabled={!pauseNote.trim()}>
                Put Down
              </button>
              <button className="btn-secondary" onClick={() => setShowPauseInput(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.actions}>
            <button onClick={handleComplete} style={styles.completeBtn}>
              <CheckIcon color="var(--text-on-accent)" size={20} />
              Done
            </button>
            <button onClick={() => setShowPauseInput(true)} style={styles.putDownBtn}>
              <PauseIcon color="var(--tier-2)" size={16} />
              Put Down
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '560px',
  },
  card: {
    backgroundColor: 'var(--bg-base)',
    borderRadius: '16px',
    border: '1px solid var(--border-light)',
    padding: '0',
    maxWidth: '520px',
    width: '100%',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
  tierBar: {
    height: '4px',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem 0',
  },
  label: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--tier-2)',
  },
  exitBtn: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    padding: '0.5rem 1.5rem 0',
    lineHeight: 1.3,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    flexWrap: 'wrap',
    padding: '0.625rem 1.5rem',
  },
  plateBadge: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--border-light)',
    padding: '0.125rem 0.5rem',
    borderRadius: '4px',
  },
  tierBadge: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    padding: '0.125rem 0.5rem',
    borderRadius: '4px',
  },
  typeBadge: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--border-light)',
    padding: '0.125rem 0.5rem',
    borderRadius: '4px',
  },
  kickBadge: {
    fontSize: '0.6875rem',
    color: 'var(--tier-3)',
    fontStyle: 'italic',
  },
  dueDate: {
    fontSize: '0.875rem',
    color: 'var(--tier-1)',
    fontWeight: 500,
    padding: '0 1.5rem 0.5rem',
  },

  // History
  historySection: {
    padding: '0 1.5rem 0.75rem',
  },
  historyLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '0.375rem',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  historyEntry: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    paddingLeft: '0.5rem',
    borderLeft: '2px solid var(--border-light)',
  },
  historyAction: {
    fontWeight: 600,
  },
  historyNote: {
    fontStyle: 'italic',
  },
  historyTime: {
    display: 'block',
    fontSize: '0.6875rem',
    color: 'var(--set-aside)',
  },

  // Actions
  actions: {
    display: 'flex',
    gap: '0.75rem',
    padding: '1.25rem 1.5rem',
    borderTop: '1px solid var(--border-light)',
  },
  completeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    flex: 1,
    justifyContent: 'center',
    padding: '0.875rem 1.25rem',
    backgroundColor: 'var(--tier-2)',
    color: 'var(--text-on-accent)',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '1rem',
    transition: 'background-color 0.15s',
  },
  putDownBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    flex: 1,
    justifyContent: 'center',
    padding: '0.875rem 1.25rem',
    backgroundColor: 'transparent',
    color: 'var(--tier-2)',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '1rem',
  },

  // Pause input
  pauseSection: {
    padding: '1.25rem 1.5rem',
    borderTop: '1px solid var(--border-light)',
  },
  pausePrompt: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '0.5rem',
  },
  pauseInputRow: {
    marginBottom: '0.75rem',
  },
  pauseActions: {
    display: 'flex',
    gap: '0.5rem',
  },
}
