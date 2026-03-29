import { useState, useRef, useEffect } from 'react'
import { useDropStore, usePlatesStore, useProjectsStore } from '../lib/store'
import AddTaskForm from './AddTaskForm'

const DROP_CAP = 12

/**
 * Floating "+" button with two modes:
 * 1. "Drop It" — quick text capture to inbox (The Drop)
 * 2. "New Task" — full AddTaskForm with plate picker for direct task creation
 * Mounted at the app level so it's available on every screen.
 */
export default function DropFloatingButton({ onTaskAdded }) {
  const [mode, setMode] = useState(null) // null | 'menu' | 'drop' | 'new'
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [handsFull, setHandsFull] = useState(false)
  const [formError, setFormError] = useState('')
  const inputRef = useRef(null)
  const { items, addDropItem, fetchDropItems } = useDropStore()
  const { plates, fetchPlates } = usePlatesStore()
  const [allProjects, setAllProjects] = useState([])

  // Fetch drop items on mount so we have an accurate count
  useEffect(() => {
    fetchDropItems()
  }, [fetchDropItems])

  // Fetch projects when entering "new" mode
  const fetchProjects = async () => {
    const { supabase } = await import('../lib/supabase')
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true })
    setAllProjects(data || [])
  }

  const handleFabClick = () => {
    if (mode) {
      handleClose()
    } else {
      setMode('menu')
    }
  }

  const handleDropMode = () => {
    if (items.length >= DROP_CAP) {
      setHandsFull(true)
      setMode('drop')
    } else {
      setHandsFull(false)
      setMode('drop')
    }
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleNewMode = () => {
    fetchPlates()
    fetchProjects()
    setMode('new')
  }

  const handleClose = () => {
    setMode(null)
    setText('')
    setHandsFull(false)
    setFormError('')
  }

  const handleSubmitDrop = async (e) => {
    e?.preventDefault()
    setFormError('')
    if (!text.trim()) {
      setFormError('Please type something to drop.')
      return
    }
    if (saving) return
    setSaving(true)
    const result = await addDropItem(text.trim())
    setSaving(false)
    if (result.error === 'hands_full') {
      setHandsFull(true)
    } else if (result.error) {
      setFormError('Failed to save. Please try again.')
    } else {
      setText('')
      handleClose()
    }
  }

  const handleTaskAdded = () => {
    handleClose()
    if (onTaskAdded) onTaskAdded()
  }

  return (
    <>
      {/* Backdrop */}
      {mode && <div style={styles.backdrop} onClick={handleClose} />}

      {/* Sub-menu: Drop / New */}
      {mode === 'menu' && (
        <div style={styles.subMenu}>
          <button onClick={handleDropMode} style={styles.subMenuBtn}>
            <span style={styles.subMenuIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 3v12M8 11l4 4 4-4" />
                <path d="M5 19h14" />
              </svg>
            </span>
            <span>Drop It</span>
          </button>
          <button onClick={handleNewMode} style={styles.subMenuBtn}>
            <span style={styles.subMenuIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
            <span>New Task</span>
          </button>
        </div>
      )}

      {/* Drop capture panel */}
      {mode === 'drop' && (
        <div style={styles.panel}>
          {handsFull ? (
            <div style={styles.handsFullContainer}>
              <div style={styles.handsFullEmoji}>&#9995;</div>
              <h3 style={styles.handsFullTitle}>Hands Full</h3>
              <p style={styles.handsFullText}>
                You have {items.length} unsorted items. Sort through some before adding more.
              </p>
              <button onClick={handleClose} style={styles.handsFullBtn}>Got it</button>
            </div>
          ) : (
            <>
              <div style={styles.panelHeader}>
                <h3 style={styles.panelTitle}>The Drop</h3>
                <p style={styles.panelTagline}>Drop it now. Handle it later.</p>
              </div>
              <form onSubmit={handleSubmitDrop} style={styles.form}>
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => { setText(e.target.value); setFormError('') }}
                  placeholder="What's on your mind?"
                  style={styles.input}
                  maxLength={500}
                  autoComplete="off"
                />
                {formError && <p style={styles.errorText}>{formError}</p>}
                <button
                  type="submit"
                  disabled={!text.trim() || saving}
                  style={{
                    ...styles.dropBtn,
                    opacity: !text.trim() || saving ? 0.5 : 1,
                  }}
                >
                  {saving ? 'Dropping...' : 'Drop It'}
                </button>
              </form>
              <p style={styles.counter}>{items.length}/{DROP_CAP} slots used</p>
            </>
          )}
        </div>
      )}

      {/* New Task panel */}
      {mode === 'new' && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>New Task</h3>
          </div>
          <AddTaskForm
            plates={plates}
            projects={allProjects}
            onTaskAdded={handleTaskAdded}
            onCancel={handleClose}
          />
        </div>
      )}

      {/* Floating + button */}
      <button onClick={handleFabClick} style={styles.fab} aria-label="Add — drop or create task">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            transition: 'transform 0.2s ease',
            transform: mode ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </>
  )
}

const styles = {
  errorText: {
    fontSize: '0.8125rem',
    color: 'var(--tier-1)',
    margin: 0,
  },
  fab: {
    position: 'fixed',
    bottom: '1.5rem',
    right: '1.5rem',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-light)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    zIndex: 1100,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1150,
  },

  // Sub-menu (Drop / New)
  subMenu: {
    position: 'fixed',
    bottom: '6rem',
    right: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    zIndex: 1160,
  },
  subMenuBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.625rem 1rem',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.1s',
  },
  subMenuIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },

  // Slide-up panels
  panel: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'var(--bg-base)',
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px',
    padding: '1.5rem',
    paddingBottom: '2rem',
    zIndex: 1160,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
    maxWidth: '600px',
    margin: '0 auto',
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  panelHeader: {
    marginBottom: '1rem',
  },
  panelTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  panelTagline: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    margin: '0.25rem 0 0 0',
    fontStyle: 'italic',
  },
  form: {
    display: 'flex',
    gap: '0.5rem',
  },
  input: {
    flex: 1,
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  dropBtn: {
    padding: '0.75rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    backgroundColor: 'var(--tier-2)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  counter: {
    fontSize: '0.6875rem',
    color: 'var(--text-secondary)',
    textAlign: 'right',
    margin: '0.5rem 0 0 0',
  },

  // Hands Full state
  handsFullContainer: {
    textAlign: 'center',
    padding: '1rem 0',
  },
  handsFullEmoji: {
    fontSize: '2.5rem',
    marginBottom: '0.5rem',
  },
  handsFullTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: '0 0 0.5rem 0',
  },
  handsFullText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    margin: '0 0 1rem 0',
    lineHeight: 1.5,
  },
  handsFullBtn: {
    padding: '0.625rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    backgroundColor: 'var(--tier-2)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
}
