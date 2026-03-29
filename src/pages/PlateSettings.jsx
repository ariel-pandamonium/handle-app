import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../lib/store'
import { BackIcon, PlusIcon, TrashIcon } from '../components/Icons'

export default function PlateSettings({ plates, onBack, onUpdate }) {
  const { user } = useAuthStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPlateName, setNewPlateName] = useState('')
  const [editingPlate, setEditingPlate] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDefaultType, setEditDefaultType] = useState('Operational')
  const [projects, setProjects] = useState([])
  const [expandedPlate, setExpandedPlate] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [editProjectName, setEditProjectName] = useState('')
  const [formError, setFormError] = useState('')

  // Fetch all projects (sub-plates)
  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true })
    setProjects(data || [])
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  // Get sub-plates for a given plate
  const getSubPlates = (plateId) => projects.filter(p => p.plate_id === plateId && p.status === 'active')

  // Rename a sub-plate
  const handleRenameProject = async (projectId) => {
    setFormError('')
    if (!editProjectName.trim()) {
      setFormError('Please enter a plate name.')
      return
    }
    const { error } = await supabase
      .from('projects')
      .update({ name: editProjectName.trim() })
      .eq('id', projectId)
    if (!error) {
      setEditingProject(null)
      fetchProjects()
      if (onUpdate) onUpdate()
    } else {
      setFormError('Failed to rename. Please try again.')
    }
  }

  // Delete a sub-plate
  const handleDeleteProject = async (project) => {
    const confirmed = window.confirm(`Delete sub-plate "${project.name}" and all its tasks? This cannot be undone.`)
    if (!confirmed) return
    const { error } = await supabase.from('projects').delete().eq('id', project.id)
    if (!error) {
      fetchProjects()
      if (onUpdate) onUpdate()
    }
  }

  // Archive (set aside) a sub-plate
  const handleArchiveProject = async (project) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: 'archived' })
      .eq('id', project.id)
    if (!error) {
      fetchProjects()
      if (onUpdate) onUpdate()
    }
  }

  // Bring back an archived sub-plate
  const handleUnarchiveProject = async (project) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: 'active' })
      .eq('id', project.id)
    if (!error) {
      fetchProjects()
      if (onUpdate) onUpdate()
    }
  }

  // Add new plate
  const handleAddPlate = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!newPlateName.trim()) {
      setFormError('Please enter a plate name.')
      return
    }

    const maxSort = Math.max(...plates.map(p => p.sort_order || 0), 0)
    const { error } = await supabase.from('plates').insert({
      user_id: user.id,
      name: newPlateName.trim(),
      sort_order: maxSort + 1,
      default_task_type: 'Operational',
    })

    if (!error) {
      setNewPlateName('')
      setShowAddForm(false)
      if (onUpdate) onUpdate()
    } else {
      setFormError('Failed to add plate. Please try again.')
    }
  }

  // Delete plate
  const handleDelete = async (plate) => {
    if (plate.is_permanent) return
    const confirmed = window.confirm(`Delete "${plate.name}" and all its tasks? This cannot be undone.`)
    if (!confirmed) return

    const { error } = await supabase.from('plates').delete().eq('id', plate.id)
    if (!error && onUpdate) onUpdate()
  }

  // Start editing a plate
  const startEditing = (plate) => {
    setEditingPlate(plate.id)
    setEditName(plate.name)
    setEditDefaultType(plate.default_task_type || 'Operational')
  }

  // Save plate edits
  const saveEdit = async (plateId) => {
    setFormError('')

    if (!editName.trim()) {
      setFormError('Plate name cannot be empty.')
      return
    }

    const { error } = await supabase
      .from('plates')
      .update({
        name: editName.trim(),
        default_task_type: editDefaultType,
      })
      .eq('id', plateId)

    if (!error) {
      setEditingPlate(null)
      if (onUpdate) onUpdate()
    } else {
      setFormError('Failed to save changes. Please try again.')
    }
  }

  // Set Aside a plate
  const handleSetAside = async (plate, untilDate = null) => {
    const { error } = await supabase
      .from('plates')
      .update({
        is_set_aside: true,
        set_aside_until: untilDate || null,
      })
      .eq('id', plate.id)
    if (!error && onUpdate) onUpdate()
  }

  // Bring Back a set-aside plate
  const handleBringBack = async (plate) => {
    const { error } = await supabase
      .from('plates')
      .update({
        is_set_aside: false,
        set_aside_until: null,
      })
      .eq('id', plate.id)
    if (!error && onUpdate) onUpdate()
  }

  // Sort: active plates first, then set-aside plates
  const activePlates = plates.filter(p => !p.is_set_aside)
  const setAsidePlates = plates.filter(p => p.is_set_aside)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <BackIcon size={20} />
        </button>
        <h1 style={styles.title}>Manage Plates</h1>
      </div>

      <p style={styles.description}>
        Set default task types for each plate. You can also set plates aside to temporarily hide them from your active view.
      </p>

      {/* Active plates */}
      <div style={styles.plateList}>
        {activePlates.map((plate) => {
          const subPlates = getSubPlates(plate.id)
          const archivedSubPlates = projects.filter(p => p.plate_id === plate.id && p.status === 'archived')
          const isExpanded = expandedPlate === plate.id

          return (
            <div key={plate.id} style={styles.plateGroup}>
              <div style={styles.plateRow}>
                {editingPlate === plate.id ? (
                  /* Edit mode */
                  <div style={styles.editMode}>
                    <input
                      className="input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      style={{ fontSize: '0.9375rem' }}
                    />

                    <div style={styles.editField}>
                      <label style={styles.fieldLabel}>Default task type</label>
                      <div style={styles.typePicker}>
                        {['Billable', 'Operational', 'Volunteer'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setEditDefaultType(type)}
                            style={{
                              ...styles.typeOption,
                              backgroundColor: editDefaultType === type ? 'var(--text-primary)' : 'transparent',
                              color: editDefaultType === type ? 'var(--bg-base)' : 'var(--text-secondary)',
                              borderColor: editDefaultType === type ? 'var(--text-primary)' : 'var(--border)',
                            }}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {formError && <p style={styles.errorText}>{formError}</p>}
                    <div style={styles.editActions}>
                      <button className="btn-primary" onClick={() => saveEdit(plate.id)} style={{ fontSize: '0.8125rem' }}>Save</button>
                      <button className="btn-secondary" onClick={() => { setEditingPlate(null); setFormError('') }} style={{ fontSize: '0.8125rem' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    <div style={styles.plateInfo} onClick={() => startEditing(plate)}>
                      <span style={styles.plateName}>
                        {plate.name}
                        {plate.is_permanent && <span style={styles.permanentBadge}>permanent</span>}
                      </span>
                      <span style={styles.plateDefault}>
                        Default: {plate.default_task_type || 'Operational'}
                        {subPlates.length > 0 && ` · ${subPlates.length} sub-plate${subPlates.length !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <div style={styles.plateActions}>
                      {(subPlates.length > 0 || archivedSubPlates.length > 0) && (
                        <button
                          onClick={() => setExpandedPlate(isExpanded ? null : plate.id)}
                          style={styles.editBtn}
                        >
                          {isExpanded ? 'Hide' : 'Sub-plates'}
                        </button>
                      )}
                      <button onClick={() => startEditing(plate)} style={styles.editBtn}>
                        Edit
                      </button>
                      {!plate.is_permanent && (
                        <SetAsideButton plate={plate} onSetAside={handleSetAside} />
                      )}
                      {!plate.is_permanent && (
                        <button onClick={() => handleDelete(plate)} style={styles.deleteBtn} title="Delete plate">
                          <TrashIcon size={14} color="var(--tier-1)" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Expanded sub-plates */}
              {isExpanded && (
                <div style={styles.subPlateList}>
                  {subPlates.map((proj) => (
                    <div key={proj.id} style={styles.subPlateRow}>
                      {editingProject === proj.id ? (
                        <div style={styles.subPlateEditMode}>
                          <input
                            className="input"
                            value={editProjectName}
                            onChange={(e) => setEditProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameProject(proj.id)}
                            autoFocus
                            style={{ fontSize: '0.8125rem', flex: 1 }}
                          />
                          <button className="btn-primary" onClick={() => handleRenameProject(proj.id)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>Save</button>
                          <button className="btn-secondary" onClick={() => { setEditingProject(null); setFormError('') }} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>Cancel</button>
                          {formError && editingProject === proj.id && <p style={styles.errorText}>{formError}</p>}
                        </div>
                      ) : (
                        <>
                          <span style={styles.subPlateName}>{proj.name}</span>
                          <div style={styles.subPlateActions}>
                            <button onClick={() => { setEditingProject(proj.id); setEditProjectName(proj.name) }} style={styles.editBtn}>Rename</button>
                            <button onClick={() => handleArchiveProject(proj)} style={styles.subSetAsideBtn}>Set Aside</button>
                            <button onClick={() => handleDeleteProject(proj)} style={styles.deleteBtn} title="Delete sub-plate">
                              <TrashIcon size={12} color="var(--tier-1)" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Archived sub-plates */}
                  {archivedSubPlates.length > 0 && (
                    <>
                      <div style={styles.subSectionLabel}>Set Aside</div>
                      {archivedSubPlates.map((proj) => (
                        <div key={proj.id} style={{ ...styles.subPlateRow, opacity: 0.6 }}>
                          <span style={{ ...styles.subPlateName, color: 'var(--set-aside)' }}>{proj.name}</span>
                          <button onClick={() => handleUnarchiveProject(proj)} style={styles.subBringBackBtn}>Bring Back</button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Set Aside plates section */}
      {setAsidePlates.length > 0 && (
        <>
          <h3 style={styles.sectionLabel}>Set Aside</h3>
          <div style={styles.plateList}>
            {setAsidePlates.map((plate) => (
              <div key={plate.id} style={{ ...styles.plateRow, ...styles.setAsideRow }}>
                <div style={styles.plateInfo}>
                  <span style={{ ...styles.plateName, color: 'var(--set-aside)' }}>
                    {plate.name}
                  </span>
                  <span style={styles.plateDefault}>
                    {plate.set_aside_until
                      ? `Until ${new Date(plate.set_aside_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}`
                      : 'Indefinitely'}
                  </span>
                </div>
                <button onClick={() => handleBringBack(plate)} style={styles.bringBackBtn}>
                  Bring Back
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add plate */}
      {showAddForm ? (
        <form onSubmit={handleAddPlate} style={styles.addForm}>
          <input
            className="input"
            placeholder="New plate name"
            value={newPlateName}
            onChange={(e) => setNewPlateName(e.target.value)}
            autoFocus
            required
          />
          {formError && <p style={styles.errorText}>{formError}</p>}
          <div style={styles.addActions}>
            <button className="btn-primary" type="submit" disabled={!newPlateName.trim()} style={{ fontSize: '0.8125rem' }}>
              Add Plate
            </button>
            <button className="btn-secondary" type="button" onClick={() => { setShowAddForm(false); setNewPlateName(''); setFormError('') }} style={{ fontSize: '0.8125rem' }}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowAddForm(true)} style={styles.addBtn}>
          <PlusIcon size={16} color="var(--tier-2)" /> Add New Plate
        </button>
      )}

    </div>
  )
}

/**
 * Inline Set Aside button with optional date picker.
 * Click once to set aside indefinitely, or pick a date.
 */
function SetAsideButton({ plate, onSetAside }) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [untilDate, setUntilDate] = useState('')

  if (showDatePicker) {
    return (
      <div style={styles.setAsidePopup}>
        <span style={styles.setAsidePopupLabel}>Set aside until:</span>
        <input
          type="date"
          className="input"
          value={untilDate}
          onChange={(e) => setUntilDate(e.target.value)}
          style={{ fontSize: '0.75rem', maxWidth: '150px' }}
          autoFocus
        />
        <button
          onClick={() => { onSetAside(plate, untilDate || null); setShowDatePicker(false) }}
          style={styles.setAsideConfirmBtn}
        >
          {untilDate ? 'Set Aside' : 'Indefinitely'}
        </button>
        <button onClick={() => setShowDatePicker(false)} style={styles.setAsideCancelBtn}>
          ✕
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setShowDatePicker(true)} style={styles.setAsideBtn} title="Set this plate aside">
      Set Aside
    </button>
  )
}

const styles = {
  errorText: {
    fontSize: '0.8125rem',
    color: 'var(--tier-1)',
    margin: 0,
  },
  container: {
    padding: '1.25rem',
    maxWidth: '600px',
    width: '100%',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
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
    fontSize: '1.375rem',
    fontWeight: 700,
  },
  description: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    marginBottom: '1.25rem',
    lineHeight: 1.4,
  },
  sectionLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--set-aside)',
    marginBottom: '0.5rem',
    marginTop: '0.5rem',
  },
  plateList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  plateRow: {
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    padding: '0.875rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setAsideRow: {
    opacity: 0.7,
    borderColor: 'var(--set-aside)',
  },
  plateInfo: {
    flex: 1,
    cursor: 'pointer',
  },
  plateName: {
    fontSize: '1rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  permanentBadge: {
    fontSize: '0.625rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--border-light)',
    padding: '0.0625rem 0.375rem',
    borderRadius: '3px',
  },
  plateDefault: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    marginTop: '0.125rem',
    display: 'block',
  },
  plateActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    flexWrap: 'wrap',
  },
  editBtn: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },

  // Plate group (plate + expandable sub-plates)
  plateGroup: {
    display: 'flex',
    flexDirection: 'column',
  },

  // Sub-plate list (nested under a plate)
  subPlateList: {
    marginLeft: '1.25rem',
    paddingLeft: '0.75rem',
    borderLeft: '2px solid var(--border-light)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    paddingTop: '0.375rem',
    paddingBottom: '0.25rem',
  },
  subPlateRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0.625rem',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-subtle)',
  },
  subPlateName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  subPlateActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    flexShrink: 0,
  },
  subPlateEditMode: {
    display: 'flex',
    gap: '0.375rem',
    alignItems: 'center',
    width: '100%',
  },
  subSetAsideBtn: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: 'var(--set-aside)',
    backgroundColor: 'transparent',
    border: '1px solid var(--set-aside)',
    borderRadius: '4px',
    padding: '0.125rem 0.375rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  subBringBackBtn: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--tier-2)',
    backgroundColor: 'transparent',
    border: '1px solid var(--tier-2)',
    borderRadius: '4px',
    padding: '0.125rem 0.375rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  subSectionLabel: {
    fontSize: '0.625rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--set-aside)',
    marginTop: '0.25rem',
    marginBottom: '0.125rem',
  },

  // Set Aside button
  setAsideBtn: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: 'var(--set-aside)',
    backgroundColor: 'transparent',
    border: '1px solid var(--set-aside)',
    borderRadius: '4px',
    padding: '0.125rem 0.5rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  setAsidePopup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    flexWrap: 'wrap',
  },
  setAsidePopupLabel: {
    fontSize: '0.6875rem',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
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
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },

  // Bring Back button
  bringBackBtn: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--tier-2)',
    backgroundColor: 'transparent',
    border: '1px solid var(--tier-2)',
    borderRadius: '6px',
    padding: '0.25rem 0.75rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  // Edit mode
  editMode: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  },
  editField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  fieldLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  typePicker: {
    display: 'flex',
    gap: '0.25rem',
  },
  typeOption: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  editActions: {
    display: 'flex',
    gap: '0.375rem',
  },
  // Add plate
  addForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '0.875rem',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
  },
  addActions: {
    display: 'flex',
    gap: '0.375rem',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    border: '1px dashed var(--border)',
    borderRadius: '10px',
    background: 'var(--bg-base)',
    cursor: 'pointer',
    color: 'var(--tier-2)',
    fontWeight: 500,
    fontSize: '0.875rem',
    width: '100%',
  },

}
