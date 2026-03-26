import { BackIcon } from '../components/Icons'

export default function SettingsMenu({ onBack, onNavigate }) {
  const menuItems = [
    { key: 'plates', label: 'Manage Plates', description: 'Add, edit, or set aside plates and sub-plates' },
    { key: 'theme', label: 'Theme', description: 'Choose a color palette for your app' },
    { key: 'tutorial', label: 'How It Works', description: 'A quick walkthrough of Handle.' },
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <BackIcon size={20} />
        </button>
        <h1 style={styles.title}>Settings</h1>
      </div>

      <div style={styles.menuList}>
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            style={styles.menuItem}
          >
            <div style={styles.menuItemText}>
              <span style={styles.menuItemLabel}>{item.label}</span>
              <span style={styles.menuItemDesc}>{item.description}</span>
            </div>
            <span style={styles.menuItemArrow}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = {
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
    marginBottom: '1.5rem',
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
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'background-color 0.15s ease',
  },
  menuItemText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
  },
  menuItemLabel: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  menuItemDesc: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
  },
  menuItemArrow: {
    fontSize: '1.25rem',
    color: 'var(--text-secondary)',
    flexShrink: 0,
    marginLeft: '0.75rem',
  },
}
