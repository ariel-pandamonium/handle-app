import { useState, useEffect } from 'react'

const SLIDES = [
  {
    key: 'welcome',
    title: 'Handle',
    body: "You know that feeling — staring at a mountain of things you need to do and not being able to figure out which one to start. The urgent thing from last week? The meeting tomorrow? The bill that's due... sometime?\n\nYour brain is trying to hold it all, rank it all, and decide what's next — all at once.\n\nHandle takes that job away from you. It holds everything, ranks it automatically, and answers one question: what actually needs your attention right now?",
    animation: 'scatter',
  },
  {
    key: 'plates',
    title: 'Plates',
    body: "Everything in Handle is organized into Plates — your major life areas. Work, home, hobbies, volunteering — whatever you're juggling.\n\nEach plate holds tasks. Your plates are sorted by urgency automatically — the plate that needs you most floats to the top. You see the 3 most pressing tasks on each plate without opening anything.\n\nOne plate is permanent (pinned at the top) — it's your primary area. The rest can be added, renamed, removed, or set aside whenever you need.",
    animation: 'plates',
  },
  {
    key: 'subplates',
    title: 'Sub-Plates',
    body: "Any plate can have sub-plates — projects or categories within a life area. For example, your Work plate might have sub-plates for different clients or initiatives.\n\nSub-plates keep things organized without creating a whole new plate.",
    animation: 'subplates',
  },
  {
    key: 'urgency',
    title: 'Urgency Tiers',
    body: "Every task has an urgency tier: Today, Tomorrow, This Week, Next Week, This Month, or Someday. You can also set a specific due date or mark a task as Scheduled with a time — like a meeting at 2:00 PM.\n\nHandle doesn't ask you to rank priorities. Instead, urgency is based on time. Tasks automatically escalate — 'This Week' becomes 'Today' when the day arrives. Miss a deadline and it becomes Overdue.\n\nYou don't manage urgency — Handle does it for you.",
    animation: 'tiers',
  },
  {
    key: 'dashboard',
    title: 'The Dashboard',
    body: "Your dashboard shows everything at a glance. At the top: how many tasks are active, overdue, due today, due this week, and billable.\n\nTap any of those numbers to see the full filtered list.",
    animation: 'dashboard',
  },
  {
    key: 'focus',
    title: 'Pick Up / Put Down',
    body: "When you start working on a task, you Pick It Up — it goes In Hand and takes over the screen so you can focus.\n\nWhen you get interrupted (and you will), you Put It Down with a quick note about where you left off. That note is right there when you pick it back up.\n\nYou can have up to 10 tasks put down at once.",
    animation: 'focus',
  },
  {
    key: 'kick',
    title: 'Kick / Promote',
    body: "Sometimes a task can wait. Kick the Can pushes it one tier later — 'Today' becomes 'Tomorrow,' 'This Week' becomes 'Next Week.' The kick count stays on the task forever, so you can see which ones you keep pushing off.\n\nPromote does the opposite. Here's when it matters: tasks set to 'This Week' are essentially due Friday. There's a gap between Tomorrow and This Week. At the end of your day, check your This Week and Next Week lists in the dashboard — that's your chance to Promote tasks to Tomorrow or Today, priming your brain for what's coming next. It's your end-of-day planning tool.",
    animation: 'kick',
  },
  {
    key: 'drop',
    title: 'The Drop',
    body: "Thought of something but don't have time to organize it? Hit the + button, tap 'Drop It,' and type a quick note. It goes into your Unsorted list — no plate, no urgency, no friction.\n\nCome back later and convert it into a real task with all the details. You can hold up to 12 items in The Drop before your hands are too full — that's by design. If you've dropped 12 things without sorting any, it's time to triage.",
    animation: 'drop',
  },
  {
    key: 'billable',
    title: 'Billable Tasks',
    body: "Tasks marked as Billable get special treatment. They show up in a dedicated count on your dashboard and are always visible — because protecting your income matters.\n\nIf billable work is due today, you'll see a nudge bar at the top reminding you.",
    animation: 'billable',
  },
  {
    key: 'setaside',
    title: 'Set Aside',
    body: "Going on vacation? Plate not relevant for a while? Set it aside — it fades to gray and its tasks stop cluttering your dashboard.\n\nSet a date for it to come back, or bring it back manually whenever. Nothing is lost, it's just out of your way.",
    animation: 'setaside',
  },
  {
    key: 'ready',
    title: "You're Ready",
    body: "That's it. Handle is designed so you can ignore it for days and nothing breaks. Come back whenever, and it tells you exactly what needs your attention.\n\nNo guilt, no streaks, no punishment. Just clarity.",
    animation: 'ready',
  },
]

// ============================================================
// Animation Components
// ============================================================

function ScatterAnimation() {
  const [sorted, setSorted] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSorted(true), 800)
    return () => clearTimeout(timer)
  }, [])

  const cards = ['Call roofer', 'Invoice #204', 'Grocery list', 'Fix printer', 'Team meeting', 'Pay electric']
  const scatterPositions = [
    { x: -40, y: -20, r: -12 },
    { x: 30, y: -35, r: 8 },
    { x: -20, y: 15, r: -5 },
    { x: 45, y: 10, r: 15 },
    { x: -35, y: 40, r: -8 },
    { x: 15, y: 45, r: 10 },
  ]

  return (
    <div style={animStyles.scatterContainer}>
      {cards.map((label, i) => (
        <div
          key={i}
          style={{
            ...animStyles.miniCard,
            transform: sorted
              ? `translate(0, ${i * 36}px) rotate(0deg)`
              : `translate(${scatterPositions[i].x}px, ${scatterPositions[i].y + 80}px) rotate(${scatterPositions[i].r}deg)`,
            opacity: sorted ? 1 : 0.7,
            transition: `all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s`,
            backgroundColor: sorted ? `var(--tier-${Math.min(i + 1, 5)})` : 'var(--border)',
          }}
        >
          <span style={animStyles.miniCardText}>{label}</span>
        </div>
      ))}
    </div>
  )
}

function PlatesAnimation() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 400)
    return () => clearTimeout(timer)
  }, [])

  const plates = [
    { name: 'Work', urgency: 1, tasks: 12 },
    { name: 'Home', urgency: 2, tasks: 5 },
    { name: 'Hobby', urgency: 3, tasks: 3 },
  ]

  return (
    <div style={animStyles.platesContainer}>
      {plates.map((plate, i) => (
        <div
          key={i}
          style={{
            ...animStyles.plateCard,
            transform: loaded ? 'translateY(0)' : 'translateY(40px)',
            opacity: loaded ? 1 : 0,
            transition: `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.15 + 0.2}s`,
            borderLeft: `4px solid var(--tier-${plate.urgency})`,
          }}
        >
          <span style={animStyles.plateName}>{plate.name}</span>
          <span style={animStyles.plateTasks}>{plate.tasks} tasks</span>
        </div>
      ))}
      {loaded && (
        <div style={{
          ...animStyles.floatIndicator,
          animation: 'floatPulse 2s ease-in-out infinite',
        }}>
          ↑ Most urgent
        </div>
      )}
    </div>
  )
}

function SubPlatesAnimation() {
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setExpanded(true), 600)
    return () => clearTimeout(timer)
  }, [])

  const subs = ['Client A', 'Client B', 'Internal']

  return (
    <div style={animStyles.subContainer}>
      <div style={animStyles.parentPlate}>
        <span style={animStyles.plateName}>Work</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {expanded ? '▾' : '▸'} {subs.length} sub-plates
        </span>
      </div>
      {subs.map((sub, i) => (
        <div
          key={i}
          style={{
            ...animStyles.subPlateCard,
            maxHeight: expanded ? '50px' : '0',
            opacity: expanded ? 1 : 0,
            padding: expanded ? '0.5rem 0.75rem' : '0 0.75rem',
            marginTop: expanded ? '0.375rem' : '0',
            transition: `all 0.4s ease ${i * 0.1 + 0.1}s`,
            overflow: 'hidden',
          }}
        >
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{sub}</span>
        </div>
      ))}
    </div>
  )
}

function TiersAnimation() {
  const [active, setActive] = useState(0)
  const tiers = ['Today', 'Tomorrow', 'This Week', 'Next Week', 'This Month', 'Someday']
  const tierVars = [2, 2, 3, 4, 4, 5]

  useEffect(() => {
    const interval = setInterval(() => {
      setActive(prev => (prev + 1) % tiers.length)
    }, 1200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={animStyles.tiersContainer}>
      <div style={animStyles.tierBar}>
        {tiers.map((tier, i) => (
          <div
            key={i}
            style={{
              ...animStyles.tierSegment,
              backgroundColor: `var(--tier-${tierVars[i]})`,
              flex: 1,
              opacity: i <= active ? 1 : 0.3,
              transition: 'opacity 0.4s ease',
            }}
          >
            <span style={{
              fontSize: '0.5625rem',
              fontWeight: 600,
              color: i <= 2 ? 'var(--text-on-accent)' : 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}>{tier}</span>
          </div>
        ))}
      </div>
      <div style={animStyles.tierArrow}>
        <div style={{
          ...animStyles.taskDot,
          transform: `translateX(${active * (100 / (tiers.length - 1))}%)`,
          left: `${active * (100 / (tiers.length))}%`,
          transition: 'left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
        <span style={animStyles.tierArrowLabel}>← Tasks escalate over time</span>
      </div>
    </div>
  )
}

function DashboardAnimation() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 400)
    return () => clearTimeout(timer)
  }, [])

  const stats = [
    { count: 40, label: 'Active' },
    { count: 3, label: 'Overdue' },
    { count: 8, label: 'Today' },
    { count: 12, label: 'Billable' },
  ]

  return (
    <div style={animStyles.dashContainer}>
      {stats.map((stat, i) => (
        <div
          key={i}
          style={{
            ...animStyles.dashStat,
            transform: loaded ? 'scale(1)' : 'scale(0.5)',
            opacity: loaded ? 1 : 0,
            transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.1 + 0.2}s`,
          }}
        >
          <span style={animStyles.dashCount}>{stat.count}</span>
          <span style={animStyles.dashLabel}>{stat.label}</span>
        </div>
      ))}
    </div>
  )
}

function FocusAnimation() {
  const [phase, setPhase] = useState(0) // 0=idle, 1=picked up, 2=put down
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600)
    const t2 = setTimeout(() => setPhase(2), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={animStyles.focusContainer}>
      <div style={{
        ...animStyles.focusCard,
        transform: phase === 1 ? 'scale(1.1) translateY(-10px)' : phase === 2 ? 'scale(0.9) translateX(60px)' : 'scale(1)',
        boxShadow: phase === 1 ? '0 8px 24px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
        borderColor: phase === 1 ? 'var(--tier-2)' : 'var(--border-light)',
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tier-2)' }}>
          {phase === 1 ? 'IN HAND' : phase === 2 ? 'PUT DOWN' : ''}
        </span>
        <span style={animStyles.focusTaskName}>Fix printer issue</span>
      </div>
      {phase === 2 && (
        <div style={{
          ...animStyles.stickyNote,
          animation: 'fadeSlideIn 0.4s ease forwards',
        }}>
          "Waiting on part #"
        </div>
      )}
    </div>
  )
}

function KickAnimation() {
  const [kicked, setKicked] = useState(false)
  const [promoted, setPromoted] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setKicked(true), 800)
    const t2 = setTimeout(() => setPromoted(true), 2000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={animStyles.kickContainer}>
      <div style={animStyles.kickRow}>
        <div style={{
          ...animStyles.kickCard,
          backgroundColor: kicked ? 'var(--tier-4)' : 'var(--tier-3)',
          transform: kicked ? 'translateX(30px)' : 'translateX(0)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <span style={animStyles.kickCardText}>This Week → Next Week</span>
        </div>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          {kicked ? '🥾 Kicked' : ''}
        </span>
      </div>
      <div style={animStyles.kickRow}>
        <div style={{
          ...animStyles.kickCard,
          backgroundColor: promoted ? 'var(--tier-2)' : 'var(--tier-3)',
          transform: promoted ? 'translateX(-30px)' : 'translateX(0)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <span style={animStyles.kickCardText}>This Week → Tomorrow</span>
        </div>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          {promoted ? '⬆ Promoted' : ''}
        </span>
      </div>
    </div>
  )
}

function DropAnimation() {
  const [drops, setDrops] = useState([])
  useEffect(() => {
    const items = ['Call dentist', 'Buy screws', 'Email Sarah']
    let i = 0
    const interval = setInterval(() => {
      if (i < items.length) {
        setDrops(prev => [...prev, items[i]])
        i++
      } else {
        clearInterval(interval)
      }
    }, 700)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={animStyles.dropContainer}>
      <div style={animStyles.dropButton}>+</div>
      <div style={animStyles.dropTray}>
        <span style={animStyles.dropTrayLabel}>Unsorted</span>
        {drops.map((item, i) => (
          <div
            key={i}
            style={{
              ...animStyles.dropItem,
              animation: 'dropIn 0.4s ease forwards',
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function BillableAnimation() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={animStyles.billableContainer}>
      <div style={{
        ...animStyles.nudgeBar,
        transform: show ? 'translateY(0)' : 'translateY(-30px)',
        opacity: show ? 1 : 0,
        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        3 billable items need handling today
      </div>
      <div style={{
        ...animStyles.billableCard,
        transform: show ? 'translateY(0)' : 'translateY(20px)',
        opacity: show ? 1 : 0,
        transition: 'all 0.5s ease 0.3s',
      }}>
        <span style={animStyles.billableBadge}>$</span>
        <span style={{ fontSize: '0.8125rem' }}>Invoice #204</span>
      </div>
    </div>
  )
}

function SetAsideAnimation() {
  const [aside, setAside] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setAside(true), 800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={animStyles.setAsideContainer}>
      <div style={{
        ...animStyles.setAsidePlate,
        opacity: aside ? 0.35 : 1,
        transform: aside ? 'translateX(40px) scale(0.95)' : 'translateX(0) scale(1)',
        filter: aside ? 'grayscale(100%)' : 'none',
        transition: 'all 0.8s ease',
      }}>
        <span style={animStyles.plateName}>Combat Robotics</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>4 tasks</span>
      </div>
      {aside && (
        <div style={{
          ...animStyles.setAsideLabel,
          animation: 'fadeSlideIn 0.4s ease forwards',
        }}>
          Set aside until April 15
        </div>
      )}
    </div>
  )
}

function ReadyAnimation() {
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setPulse(true), 400)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={animStyles.readyContainer}>
      <div style={{
        fontSize: '3rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        opacity: pulse ? 1 : 0,
        transform: pulse ? 'scale(1)' : 'scale(0.8)',
        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        Handle.
      </div>
    </div>
  )
}

const ANIMATION_MAP = {
  scatter: ScatterAnimation,
  plates: PlatesAnimation,
  subplates: SubPlatesAnimation,
  tiers: TiersAnimation,
  dashboard: DashboardAnimation,
  focus: FocusAnimation,
  kick: KickAnimation,
  drop: DropAnimation,
  billable: BillableAnimation,
  setaside: SetAsideAnimation,
  ready: ReadyAnimation,
}

// ============================================================
// Main Tutorial Component
// ============================================================

export default function Tutorial({ onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(0) // -1 left, 1 right
  const [animKey, setAnimKey] = useState(0)
  const slide = SLIDES[currentSlide]
  const AnimComponent = ANIMATION_MAP[slide.animation]

  const goNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setDirection(1)
      setCurrentSlide(prev => prev + 1)
      setAnimKey(prev => prev + 1)
    } else {
      onClose()
    }
  }

  const goPrev = () => {
    if (currentSlide > 0) {
      setDirection(-1)
      setCurrentSlide(prev => prev - 1)
      setAnimKey(prev => prev + 1)
    }
  }

  // Swipe support
  const [touchStart, setTouchStart] = useState(null)
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX)
  const handleTouchEnd = (e) => {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (diff > 50) goNext()
    else if (diff < -50) goPrev()
    setTouchStart(null)
  }

  return (
    <div
      style={styles.overlay}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Global keyframes */}
      <style>{`
        @keyframes floatPulse {
          0%, 100% { transform: translateY(0); opacity: 0.7; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={styles.card}>
        {/* Skip button */}
        <button onClick={onClose} style={styles.skipBtn}>Skip</button>

        {/* Animation area */}
        <div key={animKey} style={styles.animArea}>
          {AnimComponent && <AnimComponent />}
        </div>

        {/* Content */}
        <h2 style={styles.slideTitle}>{slide.title}</h2>
        <div style={styles.slideBody}>
          {slide.body.split('\n\n').map((paragraph, i) => (
            <p key={i} style={styles.paragraph}>{paragraph}</p>
          ))}
        </div>

        {/* Progress dots */}
        <div style={styles.dots}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                backgroundColor: i === currentSlide ? 'var(--tier-2)' : 'var(--border)',
                width: i === currentSlide ? '20px' : '8px',
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div style={styles.nav}>
          {currentSlide > 0 ? (
            <button onClick={goPrev} style={styles.prevBtn}>Back</button>
          ) : (
            <div />
          )}
          <button onClick={goNext} className="btn-primary" style={styles.nextBtn}>
            {currentSlide === SLIDES.length - 1 ? "Let's Go" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Styles
// ============================================================

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--bg-subtle)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    overflow: 'auto',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: 'var(--bg-base)',
    borderRadius: '20px',
    border: '1px solid var(--border-light)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
  },
  skipBtn: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    zIndex: 1,
  },
  animArea: {
    height: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    overflow: 'hidden',
    position: 'relative',
  },
  slideTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '0.75rem',
  },
  slideBody: {
    flex: 1,
    marginBottom: '1.25rem',
  },
  paragraph: {
    fontSize: '0.875rem',
    lineHeight: 1.6,
    color: 'var(--text-secondary)',
    marginBottom: '0.625rem',
  },
  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    marginBottom: '1.25rem',
    alignItems: 'center',
  },
  dot: {
    height: '8px',
    borderRadius: '4px',
    transition: 'all 0.3s ease',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prevBtn: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.5rem 1rem',
  },
  nextBtn: {
    fontSize: '0.9375rem',
    padding: '0.625rem 1.5rem',
  },
}

// ============================================================
// Animation Styles
// ============================================================

const animStyles = {
  // Scatter
  scatterContainer: {
    position: 'relative',
    width: '200px',
    height: '160px',
  },
  miniCard: {
    position: 'absolute',
    left: '20px',
    top: '0',
    width: '160px',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
  },
  miniCardText: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--text-on-accent)',
  },

  // Plates
  platesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    width: '200px',
    position: 'relative',
  },
  plateCard: {
    padding: '0.625rem 0.75rem',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plateName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  plateTasks: {
    fontSize: '0.6875rem',
    color: 'var(--text-secondary)',
  },
  floatIndicator: {
    position: 'absolute',
    top: '-18px',
    right: '0',
    fontSize: '0.625rem',
    fontWeight: 600,
    color: 'var(--tier-2)',
  },

  // Sub-plates
  subContainer: {
    width: '200px',
  },
  parentPlate: {
    padding: '0.625rem 0.75rem',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    borderLeft: '4px solid var(--tier-2)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subPlateCard: {
    marginLeft: '1rem',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-subtle)',
    borderLeft: '3px solid var(--border)',
  },

  // Tiers
  tiersContainer: {
    width: '240px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  tierBar: {
    display: 'flex',
    borderRadius: '8px',
    overflow: 'hidden',
    height: '36px',
  },
  tierSegment: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 2px',
  },
  tierArrow: {
    position: 'relative',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskDot: {
    position: 'absolute',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'var(--tier-2)',
  },
  tierArrowLabel: {
    fontSize: '0.625rem',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },

  // Dashboard
  dashContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.5rem',
    width: '200px',
  },
  dashStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.75rem',
    borderRadius: '10px',
    backgroundColor: 'var(--bg-subtle)',
    border: '1px solid var(--border-light)',
  },
  dashCount: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  dashLabel: {
    fontSize: '0.6875rem',
    color: 'var(--text-secondary)',
  },

  // Focus
  focusContainer: {
    position: 'relative',
    width: '200px',
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusCard: {
    padding: '1rem',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-base)',
    border: '2px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    width: '160px',
  },
  focusTaskName: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  stickyNote: {
    position: 'absolute',
    bottom: '8px',
    right: '-10px',
    backgroundColor: '#FFF9C4',
    padding: '0.375rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.625rem',
    fontStyle: 'italic',
    color: '#5D4037',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    transform: 'rotate(2deg)',
  },

  // Kick
  kickContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '220px',
  },
  kickRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  kickCard: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    width: '180px',
    textAlign: 'center',
  },
  kickCardText: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-on-accent)',
  },

  // Drop
  dropContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    width: '180px',
  },
  dropButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    border: '1px solid var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    color: 'var(--text-secondary)',
  },
  dropTray: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-subtle)',
    border: '1px solid var(--border-light)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    minHeight: '60px',
  },
  dropTrayLabel: {
    fontSize: '0.625rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-secondary)',
    marginBottom: '0.25rem',
  },
  dropItem: {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    fontSize: '0.75rem',
    color: 'var(--text-primary)',
  },

  // Billable
  billableContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    width: '220px',
  },
  nudgeBar: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    backgroundColor: 'var(--nudge-bar)',
    color: 'var(--text-on-accent)',
    fontSize: '0.75rem',
    fontWeight: 600,
    textAlign: 'center',
  },
  billableCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    width: '100%',
  },
  billableBadge: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: 'var(--tier-2)',
    color: 'var(--text-on-accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.6875rem',
    fontWeight: 700,
    flexShrink: 0,
  },

  // Set Aside
  setAsideContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    width: '200px',
  },
  setAsidePlate: {
    padding: '0.75rem',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setAsideLabel: {
    fontSize: '0.6875rem',
    fontStyle: 'italic',
    color: 'var(--set-aside)',
  },

  // Ready
  readyContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
}
