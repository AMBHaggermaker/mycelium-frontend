import { useTheme } from '../contexts/ThemeContext';

const BASE_THEMES = [
  { value: 'cosmic',       label: 'Cosmic Mycelium', desc: 'Dark space + bioluminescent forest' },
  { value: 'dark-minimal', label: 'Dark Minimal',    desc: 'Clean dark interface' },
  { value: 'light',        label: 'Light',           desc: 'Classic light theme' },
];

const ACCENT_SWATCHES = [
  { color: '#00ff88', label: 'Bioluminescent Green' },
  { color: '#9d4edd', label: 'Cosmic Purple' },
  { color: '#ff6eb4', label: 'Nebula Pink' },
  { color: '#4da6ff', label: 'Starlight Blue' },
  { color: '#f59e0b', label: 'Solar Amber' },
  { color: '#ffc832', label: 'Gold' },
  { color: '#ff4060', label: 'Neon Red' },
  { color: '#00d4ff', label: 'Cyan' },
];

const FONT_OPTIONS = [
  { value: 'mystical',    label: 'Mystical',    desc: 'Cinzel Decorative headings' },
  { value: 'modern',      label: 'Modern',      desc: 'Clean sans everywhere' },
  { value: 'classic',     label: 'Classic',     desc: 'Serif headings' },
  { value: 'typewriter',  label: 'Typewriter',  desc: 'Monospace headings' },
];

const ANIMATION_OPTIONS = [
  { value: 'full',    label: 'Full' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'none',    label: 'None' },
];

export default function ThemeSettings() {
  const { prefs, savePrefs, saving } = useTheme();

  return (
    <div className="page container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Theme Settings</h1>
          <p className="page-subtitle">Personalize your Mycelium experience</p>
        </div>
        {saving && <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Saving…</span>}
      </div>

      <div className="card theme-settings-panel" style={{ maxWidth: 560 }}>

        {/* Base theme */}
        <div className="theme-settings-group">
          <span className="theme-settings-label">Base Theme</span>
          <div className="theme-option-grid">
            {BASE_THEMES.map(t => (
              <button
                key={t.value}
                className={'theme-option-btn' + (prefs.base === t.value ? ' selected' : '')}
                onClick={() => savePrefs({ base: t.value })}
                title={t.desc}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div className="theme-settings-group">
          <span className="theme-settings-label">Accent Color</span>
          <div className="accent-swatch-row">
            {ACCENT_SWATCHES.map(s => (
              <button
                key={s.color}
                className={'accent-swatch' + (prefs.accent === s.color ? ' selected' : '')}
                style={{ background: s.color, color: s.color }}
                title={s.label}
                onClick={() => savePrefs({ accent: s.color })}
                aria-label={s.label}
              />
            ))}
            <input
              type="color"
              value={prefs.accent || '#00ff88'}
              onChange={e => savePrefs({ accent: e.target.value })}
              title="Custom color"
              style={{ width: 28, height: 28, border: 'none', padding: 0, cursor: 'pointer',
                borderRadius: '50%', overflow: 'hidden', background: 'none' }}
            />
          </div>
        </div>

        {/* Font style */}
        <div className="theme-settings-group">
          <span className="theme-settings-label">Heading Style</span>
          <div className="theme-option-grid">
            {FONT_OPTIONS.map(f => (
              <button
                key={f.value}
                className={'theme-option-btn' + (prefs.font === f.value ? ' selected' : '')}
                onClick={() => savePrefs({ font: f.value })}
                title={f.desc}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Starfield */}
        <div className="theme-settings-group">
          <span className="theme-settings-label">Star Field</span>
          <label className="starfield-toggle">
            <input
              type="checkbox"
              checked={!!prefs.starfield}
              onChange={e => savePrefs({ starfield: e.target.checked })}
            />
            Show animated star field background
          </label>
        </div>

        {/* Animation intensity */}
        <div className="theme-settings-group">
          <span className="theme-settings-label">Animations</span>
          <div className="theme-option-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {ANIMATION_OPTIONS.map(a => (
              <button
                key={a.value}
                className={'theme-option-btn' + (prefs.animation === a.value ? ' selected' : '')}
                onClick={() => savePrefs({ animation: a.value })}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
