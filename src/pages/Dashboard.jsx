import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore, usePlatesStore, usePreferencesStore, useDropStore } from '../lib/store'
import { getEffectiveTier, getTierColor, sortByUrgency } from '../lib/urgency'
import { SettingsIcon, PlayIcon, CheckIcon } from '../components/Icons'
import BillableNudgeBar from '../components/BillableNudgeBar'
import InHandPanel from '../components/InHandPanel'
import InHandView from './InHandView'
import Sidebar from '../components/Sidebar'
import FilteredTaskList from '../components/FilteredTaskList'
import PlateDetail from './PlateDetail'
import PlateSubDashboard from './PlateSubDashboard'
import ProjectDetail from './ProjectDetail'
import SettingsMenu from './SettingsMenu'
import PlateSettings from './PlateSettings'
import ThemeSettings from './ThemeSettings'
import Tutorial from './Tutorial'
import CompletedTasksView from './CompletedTasksView'
import UnsortedList from '../components/UnsortedList'

export default function Dashboard() {
  const { user, signOut } = useAuthStore()
  const { plates, fetchPlates, loading } = usePlatesStore()
  const { fetchPreferences } = usePreferencesStore()
  const { items: dropItems, fetchDropItems } = useDropStore()

  const [allTasks, setAllTasks] = useState([])
  const [allProjects, setAllProjects] = useState([])
  const [selectedPlate, setSelectedPlate] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedProjectPlate, setSelectedProjectPlate] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsPage, setSettingsPage] = useState(null) // null | 'plates' | 'theme' | 'tutorial'
  const [showTutorial, setShowTutorial] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeFilter, setActiveFilter] = useState(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showUnsorted, setShowUnsorted] = useState(false)
  const [globalFocusTask, setGlobalFocusTask] = useState(null)
  const [dataVersion, setDataVersion] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)

  const fetchAllTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_complete', false)
    setAllTasks(data || [])
  }, [])

  const fetchCompletedCount = useCallback(async () => {
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('is_complete', true)
    setCompletedCount(count || 0)
  }, [])

  // Fetch ALL projects across all plates
  const fetchAllProjects = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true })
    setAllProjects(data || [])
  }, [])

  // Auto-show tutorial for first-time users
  useEffect(() => {
    const seen = localStorage.getItem('handle_tutorial_seen')
    if (!seen) {
      setShowTutorial(true)
      localStorage.setItem('handle_tutorial_seen', 'true')
    }
  }, [])

  useEffect(() => {
    fetchPlates()
    fetchPreferences()
    fetchAllTasks()
    fetchAllProjects()
    fetchCompletedCount()
    fetchDropItems()
  }, [fetchPlates, fetchPreferences, fetchAllTasks, fetchAllProjects, fetchCompletedCount, fetchDropItems])

  // Focus a task directly from main dashboard (Pick Up)
  const handleFocusTask = async (task) => {
    const history = task.pause_history || []
    const { error } = await supabase
      .from('tasks')
      .update({
        is_focused: true,
        focused_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pause_history: [...history, { action: 'resumed', timestamp: new Date().toISOString() }],
      })
      .eq('id', task.id)
    if (!error) fetchAllTasks()
  }

  // Resume a paused task from main dashboard (Pick Back Up)
  const handleResumeTask = async (task) => {
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
        pause_history: [...history, { action: 'resumed', note: task.paused_note || null, prev_paused_note: task.paused_note || null, timestamp: new Date().toISOString() }],
      })
      .eq('id', task.id)
    if (!error) fetchAllTasks()
  }

  // Navigate back from any detail view
  const handleBack = () => {
    setSelectedPlate(null)
    setSelectedProject(null)
    setSelectedProjectPlate(null)
    setShowSettings(false)
    setSettingsPage(null)
    setShowCompleted(false)
    setShowUnsorted(false)
    fetchAllTasks()
    fetchPlates()
    fetchAllProjects()
    fetchCompletedCount()
    fetchDropItems()
  }

  // Build set of set-aside plate IDs for filtering
  const setAsidePlateIds = new Set(plates.filter(p => p.is_set_aside).map(p => p.id))

  // Visible tasks = exclude tasks from set-aside plates (used for sidebar, put-down list, drill-downs)
  const visibleTasks = allTasks.filter(t => !setAsidePlateIds.has(t.plate_id))

  // Find the currently focused task — check direct state first, then fall back to allTasks
  const focusedTask = globalFocusTask || allTasks.find(t => t.is_focused && !t.is_complete)
  const focusedPlate = focusedTask ? plates.find(p => p.id === focusedTask.plate_id) : null

  // Count paused tasks for the 10-task limit (from visible tasks only)
  const pausedCount = visibleTasks.filter(t => t.is_paused && !t.is_complete).length

  // Helper: get project count for a plate
  const getPlateProjects = (plateId) => {
    return allProjects.filter(p => p.plate_id === plateId && p.status === 'active')
  }

  // Helper: does this plate have sub-plates?
  const plateHasProjects = (plateId) => {
    return getPlateProjects(plateId).length > 0
  }

  // Bring back a set-aside plate
  const handleBringBack = async (plate) => {
    const { error } = await supabase
      .from('plates')
      .update({ is_set_aside: false, set_aside_until: null })
      .eq('id', plate.id)
    if (!error) {
      fetchPlates()
      fetchAllTasks()
    }
  }

  // Navigate into a plate — routes to sub-dashboard or flat task list
  const handlePlateClick = (plate) => {
    setSelectedPlate(plate)
  }

  // Navigate into a project from PlateSubDashboard
  const handleProjectClick = (project, plate) => {
    setSelectedProject(project)
    setSelectedProjectPlate(plate)
  }

  // ===== GLOBAL FOCUS MODE OVERLAY =====
  // Renders on top of ANY page when a task is focused
  const focusOverlay = focusedTask ? (
    <div style={styles.focusOverlay}>
      <InHandView
        task={focusedTask}
        plateName={focusedPlate ? focusedPlate.name : ''}
        onUpdate={() => {
          setGlobalFocusTask(null)
          setDataVersion(v => v + 1)
          fetchAllTasks()
          fetchPlates()
          fetchAllProjects()
        }}
      />
    </div>
  ) : null

  // ===== SETTINGS VIEWS =====
  if (showSettings) {
    // Sub-pages within settings
    if (settingsPage === 'plates') {
      return (
        <div style={styles.container}>
          {focusOverlay}
          <header style={styles.header}>
            <h1 style={styles.logo}>Handle.</h1>
            <button onClick={signOut} style={styles.signOut}>Sign out</button>
          </header>
          <PlateSettings plates={plates} onBack={() => setSettingsPage(null)} onUpdate={() => { fetchPlates(); fetchAllProjects() }} />
        </div>
      )
    }
    if (settingsPage === 'theme') {
      return (
        <div style={styles.container}>
          {focusOverlay}
          <header style={styles.header}>
            <h1 style={styles.logo}>Handle.</h1>
            <button onClick={signOut} style={styles.signOut}>Sign out</button>
          </header>
          <ThemeSettings onBack={() => setSettingsPage(null)} />
        </div>
      )
    }
    if (settingsPage === 'tutorial') {
      return <Tutorial onClose={() => setSettingsPage(null)} />
    }

    // Settings menu (hub)
    return (
      <div style={styles.container}>
        {focusOverlay}
        <header style={styles.header}>
          <h1 style={styles.logo}>Handle.</h1>
          <button onClick={signOut} style={styles.signOut}>Sign out</button>
        </header>
        <SettingsMenu onBack={handleBack} onNavigate={(page) => setSettingsPage(page)} />
      </div>
    )
  }

  // ===== COMPLETED TASKS VIEW =====
  if (showCompleted) {
    return (
      <div style={styles.container}>
        {focusOverlay}
        <header style={styles.header}>
          <h1 style={styles.logo}>Handle.</h1>
          <button onClick={signOut} style={styles.signOut}>Sign out</button>
        </header>
        <CompletedTasksView
          plates={plates}
          onBack={handleBack}
        />
      </div>
    )
  }

  // ===== UNSORTED (THE DROP) TRIAGE VIEW =====
  if (showUnsorted) {
    return (
      <div style={styles.container}>
        {focusOverlay}
        <header style={styles.header}>
          <h1 style={styles.logo}>Handle.</h1>
          <button onClick={signOut} style={styles.signOut}>Sign out</button>
        </header>
        <div style={{ padding: '1.25rem' }}>
          <UnsortedList
            plates={plates}
            projects={allProjects}
            onClose={handleBack}
            onTaskConverted={() => {
              fetchAllTasks()
              fetchDropItems()
            }}
          />
        </div>
      </div>
    )
  }

  // ===== PROJECT DETAIL VIEW =====
  if (selectedProject && selectedProjectPlate) {
    return (
      <div style={styles.container}>
        {focusOverlay}
        <header style={styles.header}>
          <h1 style={styles.logo}>Handle.</h1>
          <button onClick={signOut} style={styles.signOut}>Sign out</button>
        </header>
        <ProjectDetail
          project={selectedProject}
          plate={selectedProjectPlate}
          onBack={() => {
            // Go back to the plate's sub-dashboard, not all the way home
            setSelectedProject(null)
            setSelectedProjectPlate(null)
            fetchAllTasks()
          }}
          onTaskFocused={(task) => setGlobalFocusTask(task)}
          dataVersion={dataVersion}
        />
      </div>
    )
  }

  // ===== PLATE SUB-DASHBOARD (for plates with projects) =====
  if (selectedPlate && plateHasProjects(selectedPlate.id)) {
    return (
      <div style={styles.container}>
        {focusOverlay}
        <header style={styles.header}>
          <h1 style={styles.logo}>Handle.</h1>
          <button onClick={signOut} style={styles.signOut}>Sign out</button>
        </header>
        <PlateSubDashboard
          plate={selectedPlate}
          onBack={handleBack}
          onSelectProject={(project) => handleProjectClick(project, selectedPlate)}
          onTaskFocused={(task) => setGlobalFocusTask(task)}
          dataVersion={dataVersion}
        />
      </div>
    )
  }

  // ===== PLATE DETAIL (flat task list for plates without projects) =====
  if (selectedPlate) {
    return (
      <div style={styles.container}>
        {focusOverlay}
        <header style={styles.header}>
          <h1 style={styles.logo}>Handle.</h1>
          <button onClick={signOut} style={styles.signOut}>Sign out</button>
        </header>
        <PlateDetail plate={selectedPlate} onBack={handleBack} pausedCount={pausedCount} onTaskFocused={(task) => setGlobalFocusTask(task)} dataVersion={dataVersion} />
      </div>
    )
  }

  // ===== MAIN DASHBOARD VIEW =====

  // Calculate urgency score for a plate (higher = more urgent = appears first)
  const getPlateUrgencyScore = (plateId) => {
    const plateTasks = allTasks.filter(t => t.plate_id === plateId)
    let score = 0
    plateTasks.forEach(t => {
      const tier = getEffectiveTier(t)
      if (tier === 'Overdue') score += 100
      else if (tier === 'Today') score += 50
      else if (tier === 'Tomorrow') score += 25
      else if (tier === 'This Week') score += 10
      else if (tier === 'Next Week') score += 5
      else if (tier === 'This Month') score += 2
      else score += 1
    })
    return score
  }

  // Get plate info for card display
  const getPlateTaskInfo = (plateId) => {
    const plateTasks = allTasks.filter(t => t.plate_id === plateId && !t.is_complete)
    const sorted = sortByUrgency(plateTasks)
    const overdueCount = plateTasks.filter(t => getEffectiveTier(t) === 'Overdue').length
    const todayCount = plateTasks.filter(t => getEffectiveTier(t) === 'Today').length
    return { tasks: sorted.slice(0, 3), overdueCount, todayCount, total: plateTasks.length }
  }

  // Permanent plate pinned at top
  const permanentPlate = plates.find(p => p.is_permanent)

  // Standard plates sorted by urgency score (most urgent first, set-aside at bottom)
  const standardPlates = plates
    .filter(p => !p.is_permanent)
    .sort((a, b) => {
      // Set-aside plates always go to the bottom
      if (a.is_set_aside && !b.is_set_aside) return 1
      if (!a.is_set_aside && b.is_set_aside) return -1
      return getPlateUrgencyScore(b.id) - getPlateUrgencyScore(a.id)
    })

  const permInfo = permanentPlate ? getPlateTaskInfo(permanentPlate.id) : null
  const permProjects = permanentPlate ? getPlateProjects(permanentPlate.id) : []
  const permBillableToday = permanentPlate
    ? allTasks.filter(t =>
        t.plate_id === permanentPlate.id &&
        t.task_type === 'Billable' &&
        (getEffectiveTier(t) === 'Today' || getEffectiveTier(t) === 'Overdue')
      ).length
    : 0

  return (
    <div style={styles.container}>
      {/* App Header */}
      <header style={styles.header}>
        <h1 style={styles.logo}>Handle.</h1>
        <div style={styles.headerRight}>
          <button onClick={() => setShowSettings(true)} style={styles.settingsBtn} title="Manage Plates">
            <SettingsIcon size={18} color="var(--text-secondary)" />
          </button>
          <button onClick={signOut} style={styles.signOut}>Sign out</button>
        </div>
      </header>

      {/* Billable Nudge Bar */}
      <BillableNudgeBar tasks={visibleTasks} />

      {/* Global focus overlay on main dashboard too */}
      {focusOverlay}

      {/* Tutorial overlay */}
      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}

      {/* Sidebar + Main Layout */}
      <div className="dashboard-layout" style={{ flex: 1 }}>
        {/* Analytics Sidebar */}
        <Sidebar
          tasks={visibleTasks}
          plates={plates}
          projects={allProjects}
          activeFilter={activeFilter}
          onFilterClick={(filter) => { setActiveFilter(filter); setShowCompleted(false); setShowUnsorted(false) }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onResumeTask={handleResumeTask}
          onShowCompleted={() => { setShowCompleted(true); setActiveFilter(null) }}
          completedCount={completedCount}
          unsortedCount={dropItems.length}
          onShowUnsorted={() => { setShowUnsorted(true); setActiveFilter(null) }}
        />

        {/* Main Content */}
        <main style={styles.main}>
          {loading ? (
            <p style={styles.loadingText}>Loading your plates...</p>
          ) : plates.length === 0 ? (
            <p style={styles.loadingText}>Setting up your workspace...</p>
          ) : (
            <>
              {/* Drill-down filtered list (when a sidebar stat is clicked) */}
              {activeFilter && (
                <FilteredTaskList
                  tasks={visibleTasks}
                  plates={plates}
                  projects={allProjects}
                  filter={activeFilter}
                  onClose={() => setActiveFilter(null)}
                  onTaskFocused={(task) => setGlobalFocusTask(task)}
                  onTaskUpdated={() => { fetchAllTasks(); fetchAllProjects() }}
                  pausedCount={pausedCount}
                  onNavigateToPlate={(plate) => { setActiveFilter(null); setSelectedPlate(plate) }}
                  onNavigateToProject={(project, plate) => { setActiveFilter(null); handleProjectClick(project, plate) }}
                />
              )}

            {/* Permanent Plate (88 Studio LLC) — full width, pinned at top */}
            {permanentPlate && (
              <div
                style={styles.permCard}
                onClick={() => handlePlateClick(permanentPlate)}
              >
                <div style={styles.permHeader}>
                  <h2 style={styles.permName}>{permanentPlate.name}</h2>
                  <div style={styles.permBadges}>
                    {permInfo.overdueCount > 0 && (
                      <span style={styles.permOverdueBadge}>{permInfo.overdueCount}</span>
                    )}
                  </div>
                </div>
                <div style={styles.permStats}>
                  {permProjects.length > 0 && (
                    <span>{permProjects.length} plate{permProjects.length !== 1 ? 's' : ''}</span>
                  )}
                  <span>{permInfo.total} task{permInfo.total !== 1 ? 's' : ''}</span>
                  {permInfo.overdueCount > 0 && (
                    <span style={{ color: 'var(--tier-1)', fontWeight: 600 }}>
                      {permInfo.overdueCount} overdue
                    </span>
                  )}
                  {permInfo.todayCount > 0 && (
                    <span style={{ color: 'var(--tier-2)' }}>
                      {permInfo.todayCount} due today
                    </span>
                  )}
                  {permBillableToday > 0 && (
                    <span style={{ color: 'var(--tier-2)' }}>
                      {permBillableToday} billable today
                    </span>
                  )}
                </div>
                {/* Top 3 most urgent task previews with interactive buttons */}
                <div style={styles.previewTasks}>
                  {permInfo.tasks.length === 0 ? (
                    <span style={styles.noTasks}>No tasks</span>
                  ) : (
                    permInfo.tasks.map((task) => {
                      const tier = getEffectiveTier(task)
                      const tierColor = getTierColor(tier)
                      return (
                        <div key={task.id} style={styles.interactivePreview}>
                          <span style={{ ...styles.previewDot, backgroundColor: tierColor }} />
                          <span style={styles.previewTitle}>{task.title}</span>
                          {task.is_paused ? (
                            <button onClick={(e) => { e.stopPropagation(); handleResumeTask(task) }} style={styles.miniPickUpBtn}><PlayIcon size={9} color="var(--text-on-accent)" /> Pick Back Up</button>
                          ) : !task.is_focused ? (
                            <button onClick={(e) => { e.stopPropagation(); handleFocusTask(task) }} style={styles.miniWorkBtn}>
                              <PlayIcon size={9} color="var(--tier-2)" /> Pick Up
                            </button>
                          ) : null}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* Standard Plates — auto-sorted by urgency */}
            <div style={styles.grid}>
              {standardPlates.map((plate) => {
                const info = getPlateTaskInfo(plate.id)
                const hasProjects = plateHasProjects(plate.id)
                const plateProjs = hasProjects ? getPlateProjects(plate.id) : []
                const isSetAside = plate.is_set_aside

                return (
                  <div
                    key={plate.id}
                    onClick={() => handlePlateClick(plate)}
                    style={{
                      ...styles.plateCard,
                      ...(isSetAside ? styles.setAsidePlate : {}),
                      cursor: 'pointer',
                    }}
                  >
                    <div style={styles.plateHeader}>
                      <h2 style={{
                        ...styles.plateName,
                        color: isSetAside ? 'var(--set-aside)' : 'var(--text-primary)',
                      }}>
                        {plate.name}
                      </h2>
                      {info.overdueCount > 0 && !isSetAside && (
                        <span style={styles.plateOverdueBadge}>{info.overdueCount}</span>
                      )}
                    </div>

                    {isSetAside ? (
                      <div style={styles.setAsideFooter}>
                        <p style={styles.setAsideLabel}>
                          Set Aside{plate.set_aside_until ? ` until ${new Date(plate.set_aside_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}` : ''}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleBringBack(plate) }}
                          style={styles.bringBackBtn}
                        >
                          Bring Back
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Summary stats line */}
                        {hasProjects && (
                          <div style={styles.plateSummary}>
                            <span>{plateProjs.length} plate{plateProjs.length !== 1 ? 's' : ''}</span>
                            <span>{info.total} task{info.total !== 1 ? 's' : ''}</span>
                            {info.overdueCount > 0 && (
                              <span style={{ color: 'var(--tier-1)', fontWeight: 600 }}>
                                {info.overdueCount} overdue
                              </span>
                            )}
                            {info.todayCount > 0 && (
                              <span style={{ color: 'var(--tier-2)' }}>
                                {info.todayCount} due today
                              </span>
                            )}
                          </div>
                        )}
                        {/* Top 3 most urgent task previews with interactive buttons — always shown */}
                        <div style={styles.previewTasks}>
                          {info.tasks.length === 0 ? (
                            <span style={styles.noTasks}>No tasks</span>
                          ) : (
                            info.tasks.map((task) => {
                              const tier = getEffectiveTier(task)
                              const tierColor = getTierColor(tier)
                              return (
                                <div key={task.id} style={styles.interactivePreview}>
                                  <span style={{ ...styles.previewDot, backgroundColor: tierColor }} />
                                  <span style={styles.previewTitle}>{task.title}</span>
                                  {task.is_paused ? (
                                    <button onClick={(e) => { e.stopPropagation(); handleResumeTask(task) }} style={styles.miniPickUpBtn}><PlayIcon size={9} color="var(--text-on-accent)" /> Pick Back Up</button>
                                  ) : !task.is_focused ? (
                                    <button onClick={(e) => { e.stopPropagation(); handleFocusTask(task) }} style={styles.miniWorkBtn}>
                                      <PlayIcon size={9} color="var(--tier-2)" /> Pick Up
                                    </button>
                                  ) : null}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}

            </div>
          </>
        )}
        </main>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-subtle)',
  },
  focusOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--bg-subtle)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1.25rem',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1.25rem',
    backgroundColor: 'var(--bg-base)',
    borderBottom: '1px solid var(--border-light)',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  settingsBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid var(--border-light)',
    background: 'var(--bg-base)',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  signOut: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    textDecoration: 'underline',
  },
  main: {
    flex: 1,
    padding: '1.25rem',
    maxWidth: '960px',
    width: '100%',
    margin: '0 auto',
  },
  loadingText: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    marginTop: '3rem',
  },

  // Permanent plate card (full width, pinned top)
  permCard: {
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1rem',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s ease',
  },
  permHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.25rem',
  },
  permName: {
    fontSize: '1.25rem',
    fontWeight: 700,
  },
  permBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  permOverdueBadge: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
    backgroundColor: 'var(--tier-1)',
    borderRadius: '50%',
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  permStats: {
    display: 'flex',
    gap: '0.625rem',
    alignItems: 'center',
    flexWrap: 'wrap',
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
  },

  // Standard plates grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '0.75rem',
  },
  plateCard: {
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '1rem',
    transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
  },
  setAsidePlate: {
    opacity: 0.5,
  },
  plateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  plateName: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  plateOverdueBadge: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
    backgroundColor: 'var(--tier-1)',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  setAsideFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setAsideLabel: {
    fontSize: '0.75rem',
    color: 'var(--set-aside)',
    fontStyle: 'italic',
    margin: 0,
  },
  bringBackBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--tier-2)',
    backgroundColor: 'transparent',
    padding: '0.25rem 0.625rem',
    borderRadius: '6px',
    border: '1px solid var(--tier-2)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  // Interactive task preview row (with buttons)
  interactivePreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  miniWorkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.125rem',
    fontSize: '0.625rem',
    fontWeight: 500,
    color: 'var(--tier-2)',
    backgroundColor: 'transparent',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  miniPickUpBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.125rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    color: 'var(--text-on-accent)',
    backgroundColor: 'var(--tier-2)',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  // Plate with projects: summary stats
  plateSummary: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
  },

  // Top 3 task previews (always shown)
  previewTasks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    marginTop: '0.5rem',
  },
  previewDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  previewTitle: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
    minWidth: 0,
  },
  noTasks: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },

}
