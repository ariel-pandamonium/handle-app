import { usePreferencesStore } from '../lib/store'
import { BackIcon } from '../components/Icons'

const PALETTES = [
  { key: 'ember', name: 'Ember', colors: ['#8B2500', '#C0501F', '#D4845A', '#E8B89A', '#F5E0D3'] },
  { key: 'tide', name: 'Tide', colors: ['#1B2F4B', '#2E5481', '#5B86AD', '#9DB8D4', '#DAE5EF'] },
  { key: 'grove', name: 'Grove', colors: ['#2D3B1F', '#4A6332', '#7A9A5C', '#AEBF9A', '#DDE6D4'] },
  { key: 'dusk', name: 'Dusk', colors: ['#3D2451', '#6B3F8A', '#9670AE', '#C1A8D4', '#E6DCF0'] },
]

export default function ThemeSettings({ onBack }) {
  const { palette, setPalette } = usePreferencesStore()

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <BackIcon size={20} />
        </button>
        <h1 style={styles.title}>Theme</h1>
      </div>

      <p style={styles.description}>Choose a color palette for your app. The change takes effect immediately.</p>

      <div style={styles.paletteGrid}>
        {PALETTES.map((p) => {
          const isActive = palette === p.key
          return (
            <div
              key={p.key}
              onClick={() => setPalette(p.key)}
              style={{
                ...styles.paletteCard,
                ...(isActive ? styles.paletteCardActive : {}),
              }}
            >
              <div style={styles.paletteSwatches}>
                {p.colors.map((color, i) => (
                  <div key={i} style={{ ...styles.paletteSwatch, backgroundColor: color }} />
                ))}
              </div>
              <span style={{
                ...styles.paletteName,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--tier-2)' : 'var(--text-secondary)',
              }}>
                {p.name}{isActive ? ' ✓' : ''}
              </span>
            </div>
          )
        })}
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
  paletteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
  },
  paletteCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem',
    borderRadius: '12px',
    border: '2px solid transparent',
    backgroundColor: 'var(--bg-base)',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease',
    outline: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  paletteCardActive: {
    border: '2px solid var(--tier-2)',
  },
  paletteSwatches: {
    display: 'flex',
    gap: '4px',
    width: '100%',
    justifyContent: 'center',
  },
  paletteSwatch: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
  },
  paletteName: {
    fontSize: '0.8125rem',
  },
}
