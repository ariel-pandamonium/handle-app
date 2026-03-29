import { useState } from 'react'
import { useDropStore } from '../lib/store'
import AddTaskForm from './AddTaskForm'

/**
 * Unsorted list — triage view for pending Drop items.
 * Opens from the dashboard sidebar "Unsorted" stat.
 * Each item can be converted to a real task (via AddTaskForm) or dismissed.
 * Convert uses the same AddTaskForm with plate picker — includes Scheduled, all types.
 */
export default function UnsortedList({ plates, projects, onClose, onTaskConverted }) {
  const { items, dismissDropItem } = useDropStore()
  const [expandedItem, setExpandedItem] = useState(null)
  const [saving, setSaving] = useState(null)

  const handleExpand = (item) => {
    setExpandedItem(expandedItem === item.id ? null : item.id)
  }

  const handleDismiss = async (itemId) => {
    setSaving(itemId)
    await dismissDropItem(itemId)
    setSaving(null)
  }

  const handleConverted = async (itemId) => {
    // Mark the drop item as converted after the task was created by AddTaskForm
    const { supabase } = await import('../lib/supabase')
    await supabase
      .from('drop_items')
      .update({ status: 'converted' })
      .eq('id', itemId)

    // Remove from local store
    useDropStore.getState().fetchDropItems()
    setExpandedItem(null)
    if (onTaskConverted) onTaskConverted()
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZone: 'America/New_York',
    })
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onClose} style={styles.backBtn}>&#8592; Back</button>
        <h2 style={styles.title}>Unsorted ({items.length})</h2>
      </div>

      {items.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>Nothing to sort — you're all caught up!</p>
        </div>
      ) : (
        <div style={styles.list}>
          {items.map((item) => {
            const isExpanded = expandedItem === item.id
            const isSaving = saving === item.id

            return (
              <div key={item.id} style={styles.item}>
                {/* Raw text row */}
                <div style={styles.itemRow} onClick={() => handleExpand(item)}>
                  <div style={styles.itemContent}>
                    <p style={styles.rawText}>{item.raw_text}</p>
                    <span style={styles.timestamp}>{formatDate(item.created_at)}</span>
                  </div>
                  <div style={styles.itemActions}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDismiss(item.id) }}
                      disabled={isSaving}
                      style={styles.dismissBtn}
                      title="Dismiss — not a real task"
                    >
                      &#10005;
                    </button>
                  </div>
                </div>

                {/* Expanded: AddTaskForm with plate picker, pre-filled title */}
                {isExpanded && (
                  <div style={styles.convertSection}>
                    <AddTaskForm
                      plates={plates}
                      projects={projects}
                      defaultTitle={item.raw_text}
                      onTaskAdded={() => handleConverted(item.id)}
                      onCancel={() => setExpandedItem(null)}
                    />
                  </div>
                )}
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
    maxWidth: '700px',
    width: '100%',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.25rem',
  },
  backBtn: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem 0',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  empty: {
    textAlign: 'center',
    padding: '3rem 1rem',
  },
  emptyText: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  item: {
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  rawText: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    margin: 0,
    wordBreak: 'break-word',
  },
  timestamp: {
    fontSize: '0.6875rem',
    color: 'var(--text-secondary)',
    marginTop: '0.125rem',
    display: 'block',
  },
  itemActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    flexShrink: 0,
  },
  dismissBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid var(--border-light)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertSection: {
    padding: '0 0.5rem 0.5rem 0.5rem',
    borderTop: '1px solid var(--border-light)',
  },
}
