// ============================================================
// Handle. SVG Icons — palette-toned, never emoji
// Minimal, modern, typographically weighted
// ============================================================

/**
 * Flame icon — overdue 2+ days
 * Single upward teardrop, slight asymmetric lean
 */
export function FlameIcon({ color = 'var(--tier-1)', size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Overdue"
    >
      <path d="M12.9 2.1c-.4-.3-.9-.1-1 .3C11.1 5.4 9 7.5 7.5 9.5 5.5 12.3 5 14.5 5 16c0 3.9 3.1 7 7 7s7-3.1 7-7c0-3.2-2.4-8.1-6.1-13.9zm-.9 18.9c-2.8 0-5-2.2-5-5 0-1.2.4-3 2-5.2 1-1.4 2.3-2.9 3-4.1 1.8 3.2 3 6.1 3 7.3 0 3.8-1.2 5-3 7z" />
    </svg>
  )
}

/**
 * Boot icon — Kick the Can
 * Side-profile boot in kicking motion, angled forward
 * Clean single-color fill, no detail, designed to read at small sizes
 */
export function BootIcon({ color = 'var(--tier-3)', size = 16, disabled = false }) {
  const fillColor = disabled ? 'var(--set-aside)' : color
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fillColor}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Kick the Can"
      style={{ opacity: disabled ? 0.5 : 1, transform: 'rotate(-15deg)' }}
    >
      {/* Boot shaft (ankle/calf) */}
      <path d="M8 3C7.4 3 7 3.5 7 4v8h6V4c0-.5-.4-1-1-1H8z" />
      {/* Boot foot — extended toe pointing right for kicking feel */}
      <path d="M5 12c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h2v3c0 .6.4 1 1 1h12c.6 0 1-.4 1-1v-2c0-.6-.4-1-1-1h-7v-1h-1v-2c0-.6-.4-1-1-1H5z" />
      {/* Sole — thick bottom edge */}
      <path d="M7 20h13c.6 0 1 .2 1 .5v.5c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1v-.5c0-.3.4-.5 1-.5z" />
    </svg>
  )
}

/**
 * Play/resume icon for Pick Up
 */
export function PlayIcon({ color = 'currentColor', size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Resume"
    >
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

/**
 * Plus icon — add task / FAB
 */
export function PlusIcon({ color = 'currentColor', size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Add"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

/**
 * Check icon — complete task
 */
export function CheckIcon({ color = 'currentColor', size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Complete"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

/**
 * Back arrow icon
 */
export function BackIcon({ color = 'currentColor', size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Back"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

/**
 * Settings gear icon — classic toothed gear wheel
 */
export function SettingsIcon({ color = 'currentColor', size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Settings"
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

/**
 * Pause icon
 */
export function PauseIcon({ color = 'currentColor', size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Pause"
    >
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

/**
 * Trash/delete icon
 */
export function TrashIcon({ color = 'currentColor', size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Delete"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  )
}

/**
 * Promote icon — upward arrow (move task to more urgent tier)
 */
export function PromoteIcon({ color = 'currentColor', size = 16, disabled = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={disabled ? 'var(--text-secondary)' : color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Promote"
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}

/**
 * Grip icon — 6-dot drag handle (2 columns × 3 rows)
 */
export function GripIcon({ color = 'var(--text-secondary)', size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Drag to reorder"
    >
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  )
}

export function ChevronDownIcon({ color = 'currentColor', size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function ChevronUpIcon({ color = 'currentColor', size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline points="6 15 12 9 18 15" />
    </svg>
  )
}

export function NoteIcon({ color = 'currentColor', size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}
