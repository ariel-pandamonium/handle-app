import { getEffectiveTier } from '../lib/urgency'

export default function BillableNudgeBar({ tasks }) {
  // Count billable tasks that are Today or Overdue
  const billableCount = tasks.filter((task) => {
    if (task.is_complete) return false
    if (task.task_type !== 'Billable') return false
    const tier = getEffectiveTier(task)
    return tier === 'Today' || tier === 'Overdue'
  }).length

  if (billableCount === 0) return null

  return (
    <div style={styles.bar}>
      <span style={styles.text}>
        {billableCount} billable item{billableCount !== 1 ? 's' : ''} need{billableCount === 1 ? 's' : ''} handling today
      </span>
    </div>
  )
}

const styles = {
  bar: {
    backgroundColor: 'var(--nudge-bar)',
    padding: '0.5rem 1.25rem',
    textAlign: 'center',
  },
  text: {
    color: 'var(--text-on-accent)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    letterSpacing: '0.01em',
  },
}
