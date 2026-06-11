// Shared components and hooks for the four environmental dashboards.
import { useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export const DEFAULT_LAT    = 34.7304;
export const DEFAULT_LNG    = -86.5861;
export const DEFAULT_RADIUS = 25;
export const API_BASE = 'https://mycelium.unprecedentedtimes.org/api';

// Shared location state initialised from URL search params
export function useEnvLocation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lat    = parseFloat(searchParams.get('lat'))    || DEFAULT_LAT;
  const lng    = parseFloat(searchParams.get('lng'))    || DEFAULT_LNG;
  const radius = parseInt(searchParams.get('radius'))   || DEFAULT_RADIUS;
  const view   = searchParams.get('view') || 'local';

  const setLocation = useCallback((newLat, newLng) => {
    setSearchParams(p => { p.set('lat', newLat); p.set('lng', newLng); return p; }, { replace: true });
  }, [setSearchParams]);

  const setRadius = useCallback((r) => {
    setSearchParams(p => { p.set('radius', r); return p; }, { replace: true });
  }, [setSearchParams]);

  const setView = useCallback((v) => {
    setSearchParams(p => { p.set('view', v); return p; }, { replace: true });
  }, [setSearchParams]);

  return { lat, lng, radius, view, setLocation, setRadius, setView };
}

// Top location bar with city/zip search, radius slider, local/regional/national toggle
export function LocationControls({ lat, lng, radius, view, onLocation, onRadius, onView }) {
  const [q,           setQ]           = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching,   setSearching]   = useState(false);

  async function doSearch() {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(`${API_BASE}/watch-env/geocode?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setSuggestions(Array.isArray(d) ? d : []);
    } catch { setSuggestions([]); }
    finally { setSearching(false); }
  }

  return (
    <div className="env-location-bar">
      <div className="env-location-search-wrap" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <input
            className="form-input"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="City or zip code…"
            style={{ fontSize: '.85rem', padding: '.35rem .7rem' }}
          />
          <button className="btn btn-sm btn-outline" onClick={doSearch} disabled={searching}>
            {searching ? '…' : 'Go'}
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="env-geocode-dropdown">
            {suggestions.map((s, i) => (
              <button key={i} className="env-geocode-item"
                onClick={() => { onLocation(s.lat, s.lng); setSuggestions([]); setQ(''); }}>
                {s.display_name.length > 70 ? s.display_name.slice(0, 70) + '…' : s.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="env-radius-wrap">
        <span className="env-radius-label">{radius} mi</span>
        <input type="range" min="5" max="100" step="5" value={radius}
          onChange={e => onRadius(parseInt(e.target.value))}
          className="env-radius-slider" />
      </div>

      <div style={{ display: 'flex', gap: '.3rem' }}>
        {['local', 'regional', 'national'].map(v => (
          <button key={v}
            className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '.75rem', textTransform: 'capitalize', padding: '.25rem .6rem' }}
            onClick={() => onView(v)}>
            {v}
          </button>
        ))}
      </div>

      <div style={{ fontSize: '.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </div>
    </div>
  );
}

// Data freshness bar
export function DataFreshness({ officialTs, communityTs }) {
  function fmt(ts) {
    if (!ts) return 'No data';
    const d = new Date(ts);
    const diff = Date.now() - d;
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  }
  return (
    <div className="env-freshness-bar">
      <span className="env-freshness-item">
        <span className="env-freshness-dot env-freshness-dot--official" />
        Official data: <strong>{fmt(officialTs)}</strong>
      </span>
      <span className="env-freshness-item">
        <span className="env-freshness-dot env-freshness-dot--community" />
        Latest community report: <strong>{fmt(communityTs)}</strong>
      </span>
    </div>
  );
}

// Divergence alert — shown when community index exceeds official index by >20%
export function DivergenceAlert({ officialScore, communityScore }) {
  if (!officialScore || !communityScore) return null;
  const pct = (communityScore - officialScore) / Math.abs(officialScore);
  if (Math.abs(pct) < 0.2) return null;
  return (
    <div className="env-divergence-banner" role="alert">
      ⚠ Community reports suggest conditions may differ from official monitoring
      <span style={{ fontSize: '.78rem', marginLeft: '.5rem', opacity: .8 }}>
        ({pct > 0 ? '+' : ''}{(pct * 100).toFixed(0)}% difference)
      </span>
    </div>
  );
}

// QR code panel with download button
export function QRPanel({ dashboard, lat, lng, radius }) {
  const url = `https://mycelium.unprecedentedtimes.org/watch/${dashboard}?lat=${lat}&lng=${lng}&radius=${radius}`;

  function download() {
    const a = document.createElement('a');
    a.href = `${API_BASE}/watch-env/qr/${dashboard}?lat=${lat}&lng=${lng}&radius=${radius}`;
    a.download = `${dashboard}-qr.png`;
    a.click();
  }

  return (
    <div className="env-qr-panel">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '.75rem', background: '#0d1117', borderRadius: 8 }}>
        <QRCodeSVG value={url} size={140} fgColor="#00ff88" bgColor="#0d1117" level="M" />
      </div>
      <button className="btn btn-sm btn-outline env-qr-btn" onClick={download}>
        Download QR PNG
      </button>
    </div>
  );
}

// PDF export (browser print dialog with print CSS)
export function PDFExportButton({ title }) {
  function handlePrint() {
    const orig = document.title;
    document.title = `${title} — Mycelium Watch — ${new Date().toLocaleDateString()}`;
    window.print();
    document.title = orig;
  }
  return (
    <button className="btn btn-sm btn-outline" onClick={handlePrint}>
      Export PDF
    </button>
  );
}

// How This Works expandable panel
export function HowThisWorksPanel({ id, what, sources, methodology, community }) {
  const key = `env-htw-${id}`;
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
  });
  function toggle() {
    const n = !open;
    setOpen(n);
    try { localStorage.setItem(key, n ? '1' : ''); } catch { /* ignore */ }
  }
  return (
    <div className="htw-panel" style={{ marginTop: '1.25rem' }}>
      <button className="htw-toggle" onClick={toggle} aria-expanded={open}>
        <span className="htw-toggle-icon">⬡</span>
        <span className="htw-toggle-label">How This Works</span>
        <span className="htw-arrow" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {open && (
        <div className="htw-body">
          <div className="htw-section"><strong>What this tracks</strong><p>{what}</p></div>
          <div className="htw-section"><strong>Official data sources</strong><p>{sources}</p></div>
          <div className="htw-section"><strong>Methodology</strong><p>{methodology}</p></div>
          <div className="htw-section"><strong>Community data</strong><p>{community}</p></div>
          <div className="htw-section" style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
            <strong>Official vs community</strong>
            <p>Blue lines and markers represent data from government monitoring agencies. Green lines and markers represent reports submitted by verified Mycelium community members. When community observations diverge more than 20% from official readings, a banner alert appears. Neither source is more "true" — they measure different things and together paint a fuller picture.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-tab nav shared across the 4 env dashboards
export function EnvDashNav({ active }) {
  const tabs = [
    { id: 'water',  label: '💧 Water',  path: '/watch/water'  },
    { id: 'air',    label: '🌬️ Air',    path: '/watch/air'    },
    { id: 'soil',   label: '🌱 Soil',   path: '/watch/soil'   },
    { id: 'energy', label: '⚡ Energy', path: '/watch/energy' },
  ];
  return (
    <div className="env-dash-nav">
      <Link to="/watch" className="env-dash-back">← Watch</Link>
      <div className="env-dash-tabs">
        {tabs.map(t => (
          <Link key={t.id} to={t.path}
            className={`env-dash-tab${active === t.id ? ' active' : ''}`}>
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// Severity helpers
export const SEV_COLOR = {
  critical: '#ff4060', serious: '#f59e0b', moderate: '#ffc832',
  minor: '#4da6ff', monitoring: '#a8b5a0',
};

export function SeverityBadge({ severity }) {
  const c = SEV_COLOR[severity] || '#a8b5a0';
  return (
    <span style={{
      display: 'inline-block', padding: '.1rem .4rem', borderRadius: 99,
      fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
      background: `${c}22`, color: c, border: `1px solid ${c}55`,
    }}>
      {severity}
    </span>
  );
}

// Date formatter
export function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
