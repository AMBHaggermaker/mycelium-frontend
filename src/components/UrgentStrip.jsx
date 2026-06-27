import { useState, useEffect } from 'react';

const LF_BASE = 'https://lostfound.unprecedentedtimes.org';

const SUBJECT_ICON = { person: '👤', pet: '🐾', item: '📦' };

function hoursLabel(h) {
  if (h < 1)  return 'Just reported';
  if (h < 24) return `${h}h missing`;
  const d = Math.floor(h / 24);
  return `${d}d missing`;
}

export default function UrgentStrip() {
  const [cases,   setCases]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(false);

  useEffect(() => {
    fetch(`${LF_BASE}/api/urgent`)
      .then(r => r.json())
      .then(data => { setCases(data); setLoading(false); })
      .catch(() => { setErr(true); setLoading(false); });
  }, []);

  if (loading || err || cases.length === 0) return null;

  return (
    <div className="urgent-strip">
      <div className="urgent-strip-label">
        <span className="urgent-dot" />
        MISSING
      </div>
      <div className="urgent-cases">
        {cases.map(c => (
          <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer" className="urgent-case">
            <div className="urgent-photo">
              {c.photo_url
                ? <img src={c.photo_url} alt={c.subject_name || c.title} />
                : <span className="urgent-photo-icon">{SUBJECT_ICON[c.subject_type] || '?'}</span>
              }
            </div>
            <div className="urgent-info">
              <p className="urgent-name">{c.subject_name || c.title}</p>
              <p className="urgent-meta">
                <span className={`urgent-type urgent-type-${c.subject_type}`}>{c.subject_type}</span>
                <span className="urgent-time">{hoursLabel(c.hours_missing)}</span>
              </p>
              {c.last_seen_location && (
                <p className="urgent-loc">📍 {c.last_seen_location}</p>
              )}
            </div>
          </a>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.15rem', alignItems: 'flex-end' }}>
        <a href={LF_BASE} target="_blank" rel="noopener noreferrer" className="urgent-all-link">
          View all →
        </a>
        <a href={`${LF_BASE}/map`} target="_blank" rel="noopener noreferrer" className="urgent-all-link"
          style={{ fontSize: '.8rem', opacity: .85 }}>
          🗺 Map view →
        </a>
      </div>
    </div>
  );
}
