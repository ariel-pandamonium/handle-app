import { useState, useMemo, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import { getEffectiveTier, getTierSortOrder, getTierColor } from '../lib/urgency'
import TaskCard from './TaskCard'

/**
 * A single sortable task item — wraps TaskCard with dnd-kit sortable behavior.
 */
function SortableTask({ task, onUpdate, onDelete, pausedCount, onTaskFocused, contextLabel, onContextClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
    position: 'relative',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCard
        task={task}
        onUpdate={onUpdate}
        onDelete={onDelete}
        pausedCount={pausedCount}
        onTaskFocused={onTaskFocused}
        contextLabel={contextLabel}
        onContextClick={onContextClick}
        showDragHandle={true}
        dragHandleProps={listeners}
        dragHandleRef={setActivatorNodeRef}
      />
    </div>
  )
}

/**
 * Groups tasks by urgency tier, renders each tier as a droppable zone.
 * Drag-and-drop is constrained to within each tier.
 * Saves sort_position to database on drop.
 * Implements Option B: scheduled tasks with times auto-reposition to maintain time order.
 */
export default function SortableTaskList({
  tasks,
  onUpdate,
  onReorder,
  onDelete,
  pausedCount = 0,
  onTaskFocused,
  contextLabel,
  onContextClick,
}) {
  const [localTasks, setLocalTasks] = useState(null) // override during optimistic reorder
  const savingRef = useRef(false) // track if we're in the middle of saving

  // When parent delivers fresh tasks (after re-fetch), clear the optimistic override
  useEffect(() => {
    if (localTasks && !savingRef.current) {
      setLocalTasks(null)
    }
  }, [tasks])

  // Group tasks by effective tier
  const tierGroups = useMemo(() => {
    const source = localTasks || tasks
    const groups = {}
    source.forEach(task => {
      const tier = getEffectiveTier(task)
      if (!groups[tier]) groups[tier] = []
      groups[tier].push(task)
    })

    // Sort each tier by sort_position (if set), then by the default rules
    Object.keys(groups).forEach(tier => {
      groups[tier].sort((a, b) => {
        // If both have sort_position, use that
        if (a.sort_position != null && b.sort_position != null) {
          return a.sort_position - b.sort_position
        }
        // Tasks with sort_position come before those without
        if (a.sort_position != null && b.sort_position == null) return -1
        if (a.sort_position == null && b.sort_position != null) return 1
        // Default: kicked first, then time, then due date, then oldest
        if ((a.kick_count || 0) !== (b.kick_count || 0)) {
          return (b.kick_count || 0) - (a.kick_count || 0)
        }
        const aTime = a.title.match(/^\[(\d{2}:\d{2})\]/)
        const bTime = b.title.match(/^\[(\d{2}:\d{2})\]/)
        if (aTime && bTime) return aTime[1].localeCompare(bTime[1])
        if (aTime && !bTime) return -1
        if (!aTime && bTime) return 1
        if (a.due_date && b.due_date) {
          const da = new Date(a.due_date.split('T')[0] + 'T00:00:00')
          const db = new Date(b.due_date.split('T')[0] + 'T00:00:00')
          if (da.getTime() !== db.getTime()) return da - db
        }
        if (a.due_date && !b.due_date) return -1
        if (!a.due_date && b.due_date) return 1
        return new Date(a.created_at) - new Date(b.created_at)
      })

      // Option B enforcement: scheduled time tasks must be in time order
      // relative to each other, even if non-time tasks sit between them.
      // Strategy: extract scheduled tasks, sort by time, re-insert at same positions.
      const scheduledIndices = []
      const scheduledTasks = []
      groups[tier].forEach((task, idx) => {
        const match = task.title.match(/^\[(\d{2}:\d{2})\]/)
        if (match) {
          scheduledIndices.push(idx)
          scheduledTasks.push({ task, time: match[1] })
        }
      })
      if (scheduledTasks.length > 1) {
        scheduledTasks.sort((a, b) => a.time.localeCompare(b.time))
        scheduledIndices.forEach((pos, i) => {
          groups[tier][pos] = scheduledTasks[i].task
        })
      }
    })

    // Sort tiers by urgency order
    const tierOrder = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Next Week', 'This Month', 'Someday']
    const sorted = tierOrder
      .filter(tier => groups[tier] && groups[tier].length > 0)
      .map(tier => ({ tier, tasks: groups[tier] }))

    return sorted
  }, [tasks, localTasks])

  // Sensors: pointer for desktop, touch for mobile (with slight delay to avoid scroll conflicts)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  /**
   * Get scheduled time from a task title, or null
   */
  const getScheduledTime = (task) => {
    const match = task.title.match(/^\[(\d{2}:\d{2})\]/)
    return match ? match[1] : null
  }

  /**
   * Option B: after a drag, ensure scheduled tasks maintain time order.
   * The dragged task is the anchor — it stays where the user put it.
   * Other scheduled tasks reposition around it: earlier times just above, later times just below.
   */
  const enforceTimeOrder = (tierTasks, draggedId) => {
    const result = [...tierTasks]

    // Find the dragged task and its time
    const draggedIdx = result.findIndex(t => t.id === draggedId)
    const draggedTime = draggedIdx >= 0 ? getScheduledTime(result[draggedIdx]) : null

    // If the dragged task isn't a scheduled task, fall back to simple sort enforcement
    if (!draggedTime) {
      const scheduledIndices = []
      const scheduledItems = []
      result.forEach((task, idx) => {
        const time = getScheduledTime(task)
        if (time) {
          scheduledIndices.push(idx)
          scheduledItems.push({ task, time })
        }
      })
      if (scheduledItems.length > 1) {
        scheduledItems.sort((a, b) => a.time.localeCompare(b.time))
        scheduledIndices.forEach((pos, i) => {
          result[pos] = scheduledItems[i].task
        })
      }
      return result
    }

    // Collect other scheduled tasks (not the dragged one)
    const others = []
    result.forEach((task, idx) => {
      if (idx !== draggedIdx) {
        const time = getScheduledTime(task)
        if (time) others.push({ task, time, idx })
      }
    })

    if (others.length === 0) return result

    // Remove other scheduled tasks from the array (reverse order to keep indices valid)
    others.sort((a, b) => b.idx - a.idx)
    others.forEach(({ idx }) => result.splice(idx, 1))

    // Find where the dragged task is now (index shifted after removals)
    const anchorIdx = result.findIndex(t => t.id === draggedId)

    // Split others into before (earlier time) and after (same or later time)
    const before = others.filter(s => s.time < draggedTime).sort((a, b) => a.time.localeCompare(b.time))
    const after = others.filter(s => s.time >= draggedTime).sort((a, b) => a.time.localeCompare(b.time))

    // Insert earlier-time tasks just before the dragged task
    before.forEach((s, i) => {
      result.splice(anchorIdx + i, 0, s.task)
    })

    // Insert later-time tasks just after the dragged task
    const newAnchorIdx = result.findIndex(t => t.id === draggedId)
    after.forEach((s, i) => {
      result.splice(newAnchorIdx + 1 + i, 0, s.task)
    })

    return result
  }

  /**
   * Handle drag end: reorder within the tier, apply Option B, save to database
   */
  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!active || !over || active.id === over.id) return

    // Find which tier both tasks belong to
    const activeTier = getEffectiveTier(tasks.find(t => t.id === active.id) || localTasks?.find(t => t.id === active.id))
    const overTier = getEffectiveTier(tasks.find(t => t.id === over.id) || localTasks?.find(t => t.id === over.id))

    // Don't allow cross-tier drag
    if (activeTier !== overTier) return

    // Find the tier group
    const group = tierGroups.find(g => g.tier === activeTier)
    if (!group) return

    const oldIndex = group.tasks.findIndex(t => t.id === active.id)
    const newIndex = group.tasks.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // Reorder
    const reordered = [...group.tasks]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    // Apply Option B: enforce time order for scheduled tasks (anchored to dragged task)
    const final = enforceTimeOrder(reordered, active.id)

    // Assign sort_position values (1, 2, 3, ...)
    const updates = final.map((task, index) => ({
      id: task.id,
      sort_position: index + 1,
    }))

    // Optimistic update: apply locally immediately
    const allTasks = tasks.map(t => {
      const upd = updates.find(u => u.id === t.id)
      return upd ? { ...t, sort_position: upd.sort_position } : t
    })
    savingRef.current = true
    setLocalTasks(allTasks)

    // Save to database
    for (const { id, sort_position } of updates) {
      await supabase
        .from('tasks')
        .update({ sort_position })
        .eq('id', id)
    }

    // Quietly sync with database — uses onReorder (no loading spinner) if available
    savingRef.current = false
    if (onReorder) {
      onReorder()
    } else if (onUpdate) {
      onUpdate()
    }
  }

  if (tierGroups.length === 0) {
    return null
  }

  return (
    <div style={styles.container}>
      {tierGroups.map(({ tier, tasks: tierTasks }) => (
        <div key={tier} style={styles.tierSection}>
          <div style={{ ...styles.tierHeader, borderBottomColor: getTierColor(tier) }}>
            <span style={{ ...styles.tierLabel, color: getTierColor(tier) }}>{tier}</span>
            <span style={styles.tierCount}>{tierTasks.length}</span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tierTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div style={styles.taskList}>
                {tierTasks.map((task) => (
                  <SortableTask
                    key={task.id}
                    task={task}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    pausedCount={pausedCount}
                    onTaskFocused={onTaskFocused}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ))}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  tierSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  tierHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '0.375rem',
    borderBottom: '2px solid',
  },
  tierLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tierCount: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
}
