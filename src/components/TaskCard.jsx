import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { getEffectiveTier, getNextKickTier, getNextPromoteTier, getTierColor, isOverdueTwoPlusDays, TIER_ORDER } from '../lib/urgency'
import { FlameIcon, BootIcon, CheckIcon, TrashIcon, PauseIcon, PlayIcon, PromoteIcon, GripIcon, NoteIcon, ChevronDownIcon, ChevronUpIcon } from './Icons'

export default function TaskCard({ task, onUpdate, onDelete, pausedCount = 0, onTaskFocused, contextLabel, onContextClick, showDragHandle = false, dragHandleProps = {}, dragHandleRef = null }) {
  // Parse time prefix from title: "[HH:MM]Title" → time + display title
  const timeMatch = task.title.match(/^\[(\d{2}:\d{2})\](.*)/)
  const scheduledTimeRaw = timeMatch ? timeMatch[1] : null  // "14:30"
  const displayTitle = timeMatch ? timeMatch[2] : task.title

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(displayTitle)
  const [editTier, setEditTier] = useState(task.urgency_tier)
  const [editType, setEditType] = useState(task.task_type)
  const [editDueDate, setEditDueDate] = useState(task.due_date ? task.due_date.split('T')[0] : '')
  const [editNotes, setEditNotes] = useState(task.notes || '')
  const [showEditNotes, setShowEditNotes] = useState(false)
  const [showPauseInput, setShowPauseInput] = useState(false)
  const [pauseNote, setPauseNote] = useState('')
  const [formError, setFormError] = useState('')

  const effectiveTier = getEffectiveTier(task)
  const isOverdue = effectiveTier === 'Overdue'
  const showFlame = isOverdue && isOverdueTwoPlusDays(task)
  const tierColor = getTierColor(effectiveTier)
  const nextKick = getNextKickTier(task.urgency_tier)
  const canKick = nextKick !== null
  const nextPromote = getNextPromoteTier(task.urgency_tier)
  const canPromote = nextPromote !== null

  // Time helpers for scheduled tasks with a time
  const getTimeFormatted = () => {
    if (!scheduledTimeRaw) return null
    const [h, m] = scheduledTimeRaw.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${hour12}:${m} ${ampm}`
  }

  const getTimeStatus = () => {
    if (!scheduledTimeRaw || !task.due_date) return null
    const datePart = task.due_date.split('T')[0]
    const scheduled = new Date(`${datePart}T${scheduledTimeRaw}:00`)
    const now = new Date()
    const diffMinutes = (scheduled - now) / (1000 * 60)
    if (diffMinutes < -30) return 'past'
    if (diffMinutes <= 5) return 'now'
    if (diffMinutes <= 60) return 'soon'
    return null
  }

  const timeStr = getTimeFormatted()
  const timeStatus = getTimeStatus()

  // Complete task
  const handleComplete = async () => {
    const { error } = await supabase
      .from('tasks')
      .update({
        is_complete: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)
    if (!error && onUpdate) onUpdate()
  }

  // Kick the Can
  const handleKick = async () => {
    if (!canKick) return
    const { error } = await supabase
      .from('tasks')
      .update({
        urgency_tier: nextKick,
        kick_count: task.kick_count + 1,
        tier_assigned_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)
    if (!error && onUpdate) onUpdate()
  }

  // Promote (make more urgent)
  const handlePromote = async () => {
    if (!canPromote) return
    const { error } = await supabase
      .from('tasks')
      .update({
        urgency_tier: nextPromote,
        tier_assigned_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)
    if (!error && onUpdate) onUpdate()
  }

  // Delete task
  const handleDelete = async () => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)
    if (!error && onDelete) onDelete()
  }

  // Save full edit (title + urgency + type + due date)
  const handleSaveEdit = async () => {
    setFormError('')
    if (!editTitle.trim()) {
      setFormError('Task needs a title.')
      return
    }

    // Check if tier was moved later (increment kick count per spec)
    const tierIndex = TIER_ORDER.indexOf(editTier)
    const oldTierIndex = TIER_ORDER.indexOf(task.urgency_tier)
    const movedLater = tierIndex > oldTierIndex
    const newKickCount = movedLater ? task.kick_count + 1 : task.kick_count

    // Preserve the time prefix if it exists
    let finalTitle = editTitle.trim()
    if (scheduledTimeRaw) {
      finalTitle = `[${scheduledTimeRaw}]${finalTitle}`
    }

    const tierChanged = editTier !== task.urgency_tier
    const { error } = await supabase
      .from('tasks')
      .update({
        title: finalTitle,
        urgency_tier: editTier,
        task_type: editType,
        due_date: editDueDate || null,
        kick_count: newKickCount,
        notes: editNotes.trim() || null,
        ...(tierChanged ? { tier_assigned_date: new Date().toISOString().split('T')[0] } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    if (!error) {
      setIsEditing(false)
      setFormError('')
      if (onUpdate) onUpdate()
    } else {
      setFormError('Failed to save. Please try again.')
    }
  }

  // Cancel edit — reset all fields
  const handleCancelEdit = () => {
    setIsEditing(false)
    setFormError('')
    setEditTitle(displayTitle)
    setEditTier(task.urgency_tier)
    setEditType(task.task_type)
    setEditDueDate(task.due_date ? task.due_date.split('T')[0] : '')
    setEditNotes(task.notes || '')
    setShowEditNotes(false)
  }

  // Pause task (with history logging and 10-task limit)
  const handlePause = async () => {
    setFormError('')
    if (!pauseNote.trim()) {
      setFormError('Please note where you are on this task.')
      return
    }

    if (pausedCount >= 10) {
      alert('You already have 10 tasks put down — finish or clear one first.')
      return
    }

    const history = task.pause_history || []

    const { error } = await supabase
      .from('tasks')
      .update({
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

  // Resume (Pick Back Up) task — with history logging
  const handleResume = async () => {
    const history = task.pause_history || []
    const updatedTask = { ...task, is_paused: false, paused_note: null, paused_at: null, is_focused: true, focused_at: new Date().toISOString(), pause_history: [...history, { action: 'resumed', prev_paused_note: task.paused_note || null, timestamp: new Date().toISOString() }] }
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
    if (!error && onUpdate) onUpdate()
  }

  // Start working on this task (enter In Hand / focus mode directly)
  const handleFocus = async () => {
    const history = task.pause_history || []
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
    if (!error && onUpdate) onUpdate()
  }

  // Task type badge colors
  const typeStyles = {
    'Billable': { color: 'var(--tier-2)', bg: 'var(--tier-5)' },
    'Operational': { color: 'var(--text-secondary)', bg: 'var(--border-light)' },
    'Volunteer': { color: 'var(--tier-3)', bg: 'var(--tier-5)' },
  }
  const typeStyle = typeStyles[task.task_type] || typeStyles['Operational']

  // ===== FULL EDIT MODE =====
  // Auto-expand notes section if task already has notes
  const editNotesVisible = showEditNotes || (isEditing && !!task.notes)
  if (isEditing) {
    return (
      <div style={{
        ...styles.card,
        borderLeftColor: tierColor,
        borderLeftWidth: '4px',
        borderLeftStyle: 'solid',
        backgroundColor: 'var(--bg-subtle)',
      }}>
        <div style={styles.editForm}>
          <div style={styles.editField}>
            <label style={styles.editLabel}>Title</label>
            <div style={styles.titleRow}>
              <input
                className="input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Task title"
                autoFocus
                style={{ fontSize: '0.9375rem', flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setShowEditNotes(!showEditNotes)}
                style={styles.notesToggleBtn}
                title={editNotesVisible ? 'Hide notes' : 'Add notes'}
              >
                {editNotesVisible
                  ? <ChevronUpIcon size={12} color="var(--text-secondary)" />
                  : <ChevronDownIcon size={12} color="var(--text-secondary)" />
                }
              </button>
            </div>
          </div>

          {editNotesVisible && (
            <textarea
              className="input"
              placeholder="Add context, links, details... (optional)"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              style={{ resize: 'vertical', minHeight: '60px', fontFamily: 'inherit', fontSize: '0.8125rem' }}
            />
          )}

          <div style={styles.editField}>
            <label style={styles.editLabel}>Urgency</label>
            <div style={styles.editPicker}>
              {TIER_ORDER.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setEditTier(tier)}
                  style={{
                    ...styles.editOption,
                    backgroundColor: editTier === tier ? getTierColor(tier) : 'transparent',
                    color: editTier === tier ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    borderColor: editTier === tier ? getTierColor(tier) : 'var(--border)',
                  }}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.editField}>
            <label style={styles.editLabel}>Type</label>
            <div style={styles.editPicker}>
              {['Billable', 'Operational', 'Volunteer'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEditType(type)}
                  style={{
                    ...styles.editOption,
                    backgroundColor: editType === type ? 'var(--text-primary)' : 'transparent',
                    color: editType === type ? 'var(--bg-base)' : 'var(--text-secondary)',
                    borderColor: editType === type ? 'var(--text-primary)' : 'var(--border)',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.editField}>
            <label style={styles.editLabel}>Hard deadline (optional)</label>
            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
              <input
                className="input"
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                style={{ maxWidth: '180px', fontSize: '0.8125rem' }}
              />
              {editDueDate && (
                <button
                  onClick={() => setEditDueDate('')}
                  style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {formError && <p style={styles.errorText}>{formError}</p>}
          <div style={styles.editActions}>
            <button className="btn-primary" onClick={handleSaveEdit} style={{ fontSize: '0.8125rem' }}>
              Save Changes
            </button>
            <button className="btn-secondary" onClick={handleCancelEdit} style={{ fontSize: '0.8125rem' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== NORMAL VIEW =====
  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      gap: 0,
      borderTop: '1px solid var(--border-light)',
      borderRight: '1px solid var(--border-light)',
      borderBottom: '1px solid var(--border-light)',
      borderLeft: `4px solid ${tierColor}`,
      borderRadius: '8px',
      backgroundColor: isOverdue ? 'rgba(139, 37, 0, 0.03)' : 'var(--bg-base)',
      overflow: 'hidden',
    }}>
      {showDragHandle && (
        <div
          ref={dragHandleRef}
          {...dragHandleProps}
          style={styles.dragHandle}
          title="Drag to reorder"
        >
          <GripIcon size={16} color="var(--text-secondary)" />
        </div>
      )}
      <div style={{
        ...styles.card,
        backgroundColor: 'transparent',
        flex: 1,
        border: 'none',
        borderRadius: 0,
      }}>
      <div style={styles.topRow}>
        <button onClick={handleComplete} style={styles.completeBtn} title="Mark complete">
          <CheckIcon color="var(--text-secondary)" size={16} />
        </button>

        <div style={styles.content}>
          <span
            style={styles.title}
            onClick={() => setIsEditing(true)}
            title="Click to edit"
          >
            {showFlame && <FlameIcon size={14} />}
            {' '}{displayTitle}
          </span>

          <div style={styles.badges}>
            {/* Context label (Plate → Sub-plate) — first in row when present */}
            {contextLabel && (
              <span
                style={styles.contextLink}
                onClick={(e) => { e.stopPropagation(); if (onContextClick) onContextClick() }}
              >
                {contextLabel}
              </span>
            )}

            <span style={{
              ...styles.tierBadge,
              backgroundColor: tierColor,
              color: isOverdue || effectiveTier === 'Today' || effectiveTier === 'Tomorrow'
                ? 'var(--text-on-accent)' : 'var(--text-primary)',
            }}>
              {task.due_date
                ? (() => {
                    const parts = task.due_date.split('T')[0].split('-')
                    const d = new Date(parts[0], parts[1] - 1, parts[2])
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  })()
                : effectiveTier}
            </span>

            <span style={{
              ...styles.typeBadge,
              color: typeStyle.color,
              backgroundColor: typeStyle.bg,
            }}>
              {task.task_type}
            </span>

            {/* Notes indicator */}
            {task.notes && (
              <span style={styles.noteIndicator} title="Has notes">
                <NoteIcon size={11} color="var(--text-secondary)" />
              </span>
            )}

            {/* Scheduled time badge + Soon/Now — shown for any task with a time */}
            {timeStr && (
              <span style={styles.timeBadge}>{timeStr}</span>
            )}
            {timeStatus === 'now' && (
              <span style={styles.nowBadge}>Now</span>
            )}
            {timeStatus === 'soon' && (
              <span style={styles.soonBadge}>Soon</span>
            )}

            {/* Pick Back Up — inline with badges for paused tasks */}
            {task.is_paused && (
              <button onClick={handleResume} style={styles.pickBackUpBtn} title="Pick Back Up">
                <PlayIcon size={10} color="var(--text-on-accent)" /> Pick Back Up
              </button>
            )}
          </div>

          {task.is_paused && task.paused_note && (
            <p style={styles.pauseNoteText}>
              "{task.paused_note}"
              <span style={styles.pauseTimestamp}>
                {task.paused_at && ` — ${new Date(task.paused_at).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  timeZone: 'America/New_York'
                })}`}
              </span>
            </p>
          )}
        </div>

        <div style={styles.actions}>
          {/* Non-paused tasks: Pick Up icon + Put Down icon */}
          {!task.is_paused && !task.is_focused && (
            <button
              onClick={handleFocus}
              style={styles.actionBtn}
              title="Pick Up"
            >
              <PlayIcon size={14} color="var(--tier-2)" />
            </button>
          )}

          {!task.is_paused && (
            <button
              onClick={() => setShowPauseInput(true)}
              style={styles.actionBtn}
              title="Put Down"
            >
              <PauseIcon color="var(--text-secondary)" size={14} />
            </button>
          )}

          <button
            onClick={handlePromote}
            disabled={!canPromote}
            style={styles.actionBtn}
            title={canPromote ? `Promote to ${nextPromote}` : 'Already highest urgency'}
          >
            <PromoteIcon color="var(--tier-2)" size={16} disabled={!canPromote} />
          </button>

          <button
            onClick={handleKick}
            disabled={!canKick}
            style={styles.actionBtn}
            title={canKick ? `Kick to ${nextKick}` : 'No more kicks'}
          >
            <BootIcon color="var(--tier-3)" size={16} disabled={!canKick} />
            {task.kick_count > 0 && (
              <span style={styles.kickBadge}>{task.kick_count}</span>
            )}
          </button>

          <button onClick={handleDelete} style={styles.actionBtn} title="Delete task">
            <TrashIcon color="var(--text-secondary)" size={14} />
          </button>
        </div>
      </div>

      {showPauseInput && (
        <div style={styles.pauseRow}>
          <input
            className="input"
            placeholder="Where are you right now? (e.g. halfway through east elevation check)"
            value={pauseNote}
            onChange={(e) => { setPauseNote(e.target.value); setFormError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handlePause()}
            autoFocus
            style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
          />
          <button className="btn-primary" onClick={handlePause} style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
            Put Down
          </button>
          <button className="btn-secondary" onClick={() => { setShowPauseInput(false); setFormError('') }} style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
            Cancel
          </button>
          {formError && !isEditing && <p style={styles.errorText}>{formError}</p>}
        </div>
      )}
      </div>
    </div>
  )
}

const styles = {
  errorText: { fontSize: '0.8125rem', color: 'var(--tier-1)', margin: 0, width: '100%' },
  card: { padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', transition: 'box-shadow 0.15s ease' },
  topRow: { display: 'flex', alignItems: 'flex-start', gap: '0.625rem' },
  completeBtn: { flexShrink: 0, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '1.5px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer', transition: 'border-color 0.15s, background-color 0.15s', marginTop: '2px' },
  content: { flex: 1, minWidth: 0 },
  title: { fontSize: '0.9375rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', lineHeight: 1.3 },
  contextLink: { fontSize: '0.6875rem', fontWeight: 500, color: 'var(--tier-2)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.15s' },
  badges: { display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.375rem', flexWrap: 'wrap' },
  tierBadge: { fontSize: '0.6875rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '4px', letterSpacing: '0.01em' },
  typeBadge: { fontSize: '0.6875rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '4px' },
  pickBackUpBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.1875rem', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-on-accent)', backgroundColor: 'var(--tier-2)', padding: '0.125rem 0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' },
  pauseNoteText: { fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.375rem', lineHeight: 1.4 },
  pauseTimestamp: { fontSize: '0.6875rem', color: 'var(--set-aside)' },
  actions: { display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 },
  actionBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', position: 'relative', transition: 'background-color 0.15s' },
  kickBadge: { position: 'absolute', top: '0px', right: '0px', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-on-accent)', backgroundColor: 'var(--tier-3)', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
  dragHandle: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', flexShrink: 0, cursor: 'grab', backgroundColor: 'transparent', touchAction: 'none' },
  pauseRow: { display: 'flex', gap: '0.375rem', alignItems: 'center', marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: '1px solid var(--border-light)' },
  editForm: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  editField: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  editLabel: { fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  editPicker: { display: 'flex', gap: '0.25rem', flexWrap: 'wrap' },
  editOption: { fontSize: '0.6875rem', fontWeight: 500, padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap' },
  editActions: { display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' },
  // Scheduled time badges
  timeBadge: { fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', backgroundColor: 'var(--border-light)', padding: '0.125rem 0.5rem', borderRadius: '4px' },
  nowBadge: { fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-on-accent)', backgroundColor: 'var(--tier-1)', padding: '0.125rem 0.5rem', borderRadius: '4px' },
  soonBadge: { fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-on-accent)', backgroundColor: 'var(--tier-2)', padding: '0.125rem 0.5rem', borderRadius: '4px' },
  noteIndicator: { display: 'inline-flex', alignItems: 'center', opacity: 0.6 },
  titleRow: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  notesToggleBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.15s' },
}
