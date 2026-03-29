import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../lib/store'
import { TIER_ORDER, getTierColor } from '../lib/urgency'
import { ChevronDownIcon, ChevronUpIcon } from './Icons'

// Urgency buttons: Scheduled first, then the standard tiers
const URGENCY_OPTIONS = ['Scheduled', ...TIER_ORDER]

/**
 * Calculate the correct urgency tier from a date string (YYYY-MM-DD).
 * Uses the same boundary logic as urgency.js so the task lands in the right tier.
 */
function tierFromDate(dateStr) {
  if (!dateStr) return 'This Week'
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))

  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  if (d <= endOfToday) return 'Today'

  const endOfTomorrow = new Date(endOfToday)
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)
  if (d <= endOfTomorrow) return 'Tomorrow'

  const dayOfWeek = now.getDay()
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
  const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59, 999)
  if (d <= endOfWeek) return 'This Week'

  const endOfNextWeek = new Date(endOfWeek)
  endOfNextWeek.setDate(endOfNextWeek.getDate() + 7)
  if (d <= endOfNextWeek) return 'Next Week'

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  if (d <= endOfMonth) return 'This Month'

  return 'Someday'
}

/**
 * AddTaskForm — universal task creation form.
 * When plateId is provided (inside a plate): works as before, no plate picker.
 * When plateId is omitted (The Drop / New Task): shows plate + sub-plate dropdowns.
 * Optional defaultTitle prop for pre-filling (used by Unsorted convert flow).
 */
export default function AddTaskForm({ plateId, projectId = null, plates = [], projects = [], defaultTitle = '', defaultTaskType = 'Operational', onTaskAdded, onCancel }) {
  const { user } = useAuthStore()
  const [title, setTitle] = useState(defaultTitle)
  const [selectedPlateId, setSelectedPlateId] = useState(plateId || '')
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '')
  const [urgencyMode, setUrgencyMode] = useState('This Week') // 'Scheduled' or a tier name
  const [taskType, setTaskType] = useState(defaultTaskType)
  const [dueDate, setDueDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Whether we need to show the plate picker (no plateId prop = standalone mode)
  const needsPlatePicker = !plateId

  // Resolve which plate/project to use
  const resolvedPlateId = plateId || selectedPlateId
  const resolvedProjectId = projectId || selectedProjectId

  // Get sub-plates for the selected plate
  const plateProjects = needsPlatePicker && resolvedPlateId
    ? projects.filter(p => p.plate_id === resolvedPlateId && p.status === 'active')
    : []

  // Active (non-set-aside) plates for the dropdown
  const activePlates = plates.filter(p => !p.is_set_aside)

  const isScheduled = urgencyMode === 'Scheduled'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !user) return
    setFormError('')

    // Must have a plate selected
    if (!resolvedPlateId) {
      setFormError('Please select a plate.')
      return
    }

    // Scheduled tasks require a date
    if (isScheduled && !dueDate) {
      setFormError('Please set a date for the scheduled task.')
      return
    }

    setSaving(true)

    // If there's a time, encode it as [HH:MM] prefix in the title
    let finalTitle = title.trim()
    if (isScheduled && scheduledTime) {
      finalTitle = `[${scheduledTime}]${title.trim()}`
    }

    // Calculate the real urgency tier
    // Scheduled → derive from the date; otherwise use the selected tier directly
    const resolvedTier = isScheduled ? tierFromDate(dueDate) : urgencyMode

    const taskData = {
      user_id: user.id,
      plate_id: resolvedPlateId,
      project_id: resolvedProjectId || null,
      title: finalTitle,
      urgency_tier: resolvedTier,
      task_type: taskType,
      due_date: dueDate || null,
      tier_assigned_date: new Date().toISOString().split('T')[0],
      notes: notes.trim() || null,
    }

    const { error } = await supabase.from('tasks').insert(taskData)

    if (!error) {
      setTitle('')
      setNotes('')
      setShowNotes(false)
      setSelectedPlateId(plateId || '')
      setSelectedProjectId(projectId || '')
      setUrgencyMode('This Week')
      setTaskType(defaultTaskType)
      setDueDate('')
      setScheduledTime('')
      setFormError('')
      if (onTaskAdded) onTaskAdded()
    } else {
      setFormError('Failed to save task. Please try again.')
    }

    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {/* Plate picker (only in standalone mode) */}
      {needsPlatePicker && (
        <div style={styles.field}>
          <label style={styles.label}>Plate</label>
          <select
            value={selectedPlateId}
            onChange={(e) => {
              setSelectedPlateId(e.target.value)
              setSelectedProjectId('') // reset sub-plate when plate changes
            }}
            style={{
              ...styles.selectInput,
              color: selectedPlateId ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <option value="">Select Plate...</option>
            {activePlates.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Sub-plate picker (only when plate has projects and in standalone mode) */}
      {needsPlatePicker && plateProjects.length > 0 && (
        <div style={styles.field}>
          <label style={styles.label}>Sub-plate</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={styles.selectInput}
          >
            <option value="">None</option>
            {plateProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div style={styles.field}>
        <label style={styles.label}>Title</label>
        <div style={styles.titleRow}>
          <input
            className="input"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            style={styles.notesToggleBtn}
            title={showNotes ? 'Hide notes' : 'Add notes'}
          >
            {showNotes
              ? <ChevronUpIcon size={12} color="var(--text-secondary)" />
              : <ChevronDownIcon size={12} color="var(--text-secondary)" />
            }
          </button>
        </div>
      </div>

      {/* Notes (collapsible) */}
      {showNotes && (
        <textarea
          className="input"
          placeholder="Add context, links, details... (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={styles.notesInput}
        />
      )}

      <div style={styles.row}>
        {/* Urgency selector */}
        <div style={styles.field}>
          <label style={styles.label}>Urgency</label>
          <div style={styles.tierPicker}>
            {URGENCY_OPTIONS.map((opt) => {
              const isActive = urgencyMode === opt
              // Scheduled gets its own accent color; tiers use their tier color
              const activeColor = opt === 'Scheduled' ? 'var(--text-primary)' : getTierColor(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setUrgencyMode(opt)
                    // When switching away from Scheduled, clear the date/time
                    if (opt !== 'Scheduled') {
                      setDueDate('')
                      setScheduledTime('')
                    }
                  }}
                  style={{
                    ...styles.tierOption,
                    backgroundColor: isActive ? activeColor : 'transparent',
                    color: isActive ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    borderColor: isActive ? activeColor : 'var(--border)',
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>

        {/* Task type selector */}
        <div style={styles.field}>
          <label style={styles.label}>Type</label>
          <div style={styles.typePicker}>
            {['Billable', 'Operational', 'Volunteer'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTaskType(type)}
                style={{
                  ...styles.typeOption,
                  backgroundColor: taskType === type ? 'var(--text-primary)' : 'transparent',
                  color: taskType === type ? 'var(--bg-base)' : 'var(--text-secondary)',
                  borderColor: taskType === type ? 'var(--text-primary)' : 'var(--border)',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scheduled: date + optional time */}
      {isScheduled && (
        <div style={styles.field}>
          <label style={styles.label}>Date & time (time optional)</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              className="input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ maxWidth: '180px' }}
            />
            <input
              className="input"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              style={{ maxWidth: '140px' }}
              placeholder="Time (optional)"
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {formError && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--tier-1)', margin: 0 }}>{formError}</p>
      )}

      {/* Submit row */}
      <div style={styles.submitRow}>
        <button className="btn-primary" type="submit" disabled={saving || !title.trim()}>
          {saving ? 'Adding...' : 'Add Task'}
        </button>
        {onCancel && (
          <button className="btn-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
    padding: '1rem',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
  },
  row: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tierPicker: {
    display: 'flex',
    gap: '0.25rem',
    flexWrap: 'wrap',
  },
  tierOption: {
    fontSize: '0.75rem',
    fontWeight: 500,
    padding: '0.25rem 0.625rem',
    borderRadius: '6px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  typePicker: {
    display: 'flex',
    gap: '0.25rem',
  },
  typeOption: {
    fontSize: '0.75rem',
    fontWeight: 500,
    padding: '0.25rem 0.625rem',
    borderRadius: '6px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  selectInput: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  titleRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  notesToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'border-color 0.15s',
  },
  notesInput: {
    resize: 'vertical',
    minHeight: '60px',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
  },
  submitRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
}
