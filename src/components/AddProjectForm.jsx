import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../lib/store'

export default function AddProjectForm({ plateId, onProjectAdded, onCancel }) {
  const { user } = useAuthStore()
  const [name, setName] = useState('')
  const [isBillable, setIsBillable] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !user) return

    setSaving(true)

    const { error } = await supabase.from('projects').insert({
      user_id: user.id,
      plate_id: plateId,
      name: name.trim(),
      is_billable: isBillable,
      status: 'active',
    })

    if (!error) {
      setName('')
      setIsBillable(true)
      if (onProjectAdded) onProjectAdded()
    }

    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <input
        className="input"
        placeholder="Plate name (e.g. Henderson, Riverside)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        required
      />

      <div style={styles.row}>
        <label style={styles.checkLabel}>
          <input
            type="checkbox"
            checked={isBillable}
            onChange={(e) => setIsBillable(e.target.checked)}
            style={styles.checkbox}
          />
          Billable plate
        </label>
      </div>

      <div style={styles.actions}>
        <button className="btn-primary" type="submit" disabled={saving || !name.trim()} style={{ fontSize: '0.8125rem' }}>
          {saving ? 'Adding...' : 'Add Plate'}
        </button>
        {onCancel && (
          <button className="btn-secondary" type="button" onClick={onCancel} style={{ fontSize: '0.8125rem' }}>
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
    gap: '0.625rem',
    padding: '0.75rem',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    width: '100%',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: '0.375rem',
  },
}
