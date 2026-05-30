import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth';
import api from '../api';

const ThemeContext = createContext(null);

const DEFAULT_PREFS = {
  base: 'cosmic',
  accent: '#00ff88',
  font: 'mystical',
  starfield: true,
  animation: 'full',
};

const FONT_STACKS = {
  mystical: "'Cinzel Decorative', serif",
  modern:   'inherit',
  classic:  'Georgia, serif',
  typewriter: "'Courier New', monospace",
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function applyTheme(prefs) {
  const root = document.documentElement;
  const p = { ...DEFAULT_PREFS, ...prefs };

  if (p.base === 'light') {
    root.style.setProperty('--bg',      '#f2ede4');
    root.style.setProperty('--surface', '#faf8f4');
    root.style.setProperty('--card',    '#ffffff');
    root.style.setProperty('--border',  '#ddd6c8');
    root.style.setProperty('--text',    '#1a1710');
    root.style.setProperty('--muted',   '#6b6254');
    document.body.classList.remove('theme-cosmic', 'theme-dark');
    document.body.classList.add('theme-light');
  } else if (p.base === 'dark-minimal') {
    root.style.setProperty('--bg',      '#0f0f0f');
    root.style.setProperty('--surface', '#1a1a1a');
    root.style.setProperty('--card',    '#242424');
    root.style.setProperty('--border',  'rgba(255,255,255,0.1)');
    root.style.setProperty('--text',    '#e8e8e8');
    root.style.setProperty('--muted',   '#888');
    document.body.classList.remove('theme-cosmic', 'theme-light');
    document.body.classList.add('theme-dark');
  } else {
    // cosmic (default) — reset to cosmic vars
    root.style.removeProperty('--bg');
    root.style.removeProperty('--surface');
    root.style.removeProperty('--card');
    root.style.removeProperty('--border');
    root.style.removeProperty('--text');
    root.style.removeProperty('--muted');
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add('theme-cosmic');
  }

  // Accent color override
  if (p.accent && p.accent !== '#00ff88') {
    const rgb = hexToRgb(p.accent);
    root.style.setProperty('--green',      p.accent);
    root.style.setProperty('--green-bg',   `rgba(${rgb},0.1)`);
    root.style.setProperty('--glow-green', `0 0 12px rgba(${rgb},0.4)`);
    root.style.setProperty('--shadow-md',  `0 0 0 1px rgba(${rgb},0.12), 0 8px 32px rgba(0,0,0,0.6), 0 0 12px rgba(${rgb},0.4)`);
  } else {
    root.style.removeProperty('--green');
    root.style.removeProperty('--green-bg');
    root.style.removeProperty('--glow-green');
    root.style.removeProperty('--shadow-md');
  }

  // Heading font
  root.style.setProperty('--font-heading', FONT_STACKS[p.font] || FONT_STACKS.mystical);

  // Starfield
  document.body.classList.toggle('no-starfield', !p.starfield);

  // Animation intensity
  if (p.animation === 'none') {
    root.style.setProperty('--transition', '0ms');
    document.body.classList.add('reduce-motion');
  } else if (p.animation === 'reduced') {
    root.style.setProperty('--transition', '80ms ease');
    document.body.classList.remove('reduce-motion');
  } else {
    root.style.removeProperty('--transition');
    document.body.classList.remove('reduce-motion');
  }
}

export function ThemeProvider({ children }) {
  const { user, token } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  // Load preferences when user logs in
  useEffect(() => {
    if (!user || !token) {
      applyTheme(DEFAULT_PREFS);
      setPrefs(DEFAULT_PREFS);
      return;
    }
    api.getThemePreferences(token)
      .then(p => {
        const merged = { ...DEFAULT_PREFS, ...p };
        setPrefs(merged);
        applyTheme(merged);
      })
      .catch(() => {});
  }, [user, token]);

  const savePrefs = useCallback(async (updates) => {
    const next = { ...prefs, ...updates };
    setPrefs(next);
    applyTheme(next);
    if (!token) return;
    setSaving(true);
    try { await api.saveThemePreferences(token, updates); }
    catch { /* ignore */ }
    finally { setSaving(false); }
  }, [prefs, token]);

  return (
    <ThemeContext.Provider value={{ prefs, savePrefs, saving }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
