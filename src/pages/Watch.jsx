import { useState, useEffect } from 'react';
import { useAuth } from '../auth';
import api from '../api';

const DASHBOARDS = [
  { id: 'infrastructure', label: 'Infrastructure', icon: '🏗️', description: 'Roads, bridges, utilities, public facilities, and city infrastructure conditions.' },
  { id: 'environment',    label: 'Environment',    icon: '🌿', description: 'Air quality, pollution, illegal dumping, toxic sites, and environmental hazards.' },
  { id: 'housing',        label: 'Housing',        icon: '🏠', description: 'Vacant lots, code violations, slumlords, displacement, and affordable housing conditions.' },
  { id: 'health',         label: 'Health',         icon: '🏥', description: 'Disease patterns, clinic access, hospital conditions, and public health concerns.' },
  { id: 'watershed',      label: 'Watershed',      icon: '💧', description: 'Creek contamination, wetland destruction, industrial runoff, and land use changes.' },
  { id: 'food',           label: 'Food & Ag',      icon: '🌾', description: 'Food deserts, grocery access, farmland threats, and agricultural contamination.' },
  { id: 'surveillance',   label: 'Surveillance',   icon: '📡', description: 'Camera installations, license plate readers, facial recognition, and surveillance infrastructure.' },
  { id: 'civic',          label: 'Civic',          icon: '🏛️', description: 'Local government actions, policy decisions, zoning changes, and civic accountability.' },
];

const REPORT_TYPES = {
  infrastructure: ['bridge/overpass','road/pothole','retaining wall','drainage','signage','utility','other'],
  environment:    ['water contamination','air quality','soil contamination','EMF/RF','atmospheric','other'],
  housing:        ['mold','structural','no heat/AC','pest infestation','electrical','plumbing','code violation','other'],
  health:         ['respiratory illness','GI illness','MRSA/skin infection','neurological','wildlife disease','tick exposure','other'],
  watershed:      ['development near water','flooding','erosion','impervious surface','other'],
  food:           ['farmland contamination','spray drift','CAFO runoff','discharge','other'],
  surveillance:   ['ALPR/Flock camera','facial recognition','cell tower','drone','other'],
  civic:          ['pothole response time','budget concern','development approval','other'],
};

const SEVERITY_OPTIONS = [
  { value: 'critical',   label: 'Critical',   color: '#dc2626', bg: '#fef2f2', desc: 'Imminent threat to health or safety' },
  { value: 'serious',    label: 'Serious',    color: '#ea580c', bg: '#fff7ed', desc: 'Significant concern requiring attention' },
  { value: 'moderate',   label: 'Moderate',   color: '#ca8a04', bg: '#fefce8', desc: 'Noteworthy issue to monitor' },
  { value: 'minor',      label: 'Minor',      color: '#2563eb', bg: '#eff6ff', desc: 'Low-level concern or observation' },
  { value: 'monitoring', label: 'Monitoring', color: '#6b7280', bg: '#f9fafb', desc: 'Routine documentation, no immediate concern' },
];

function getSeverityStyle(severity) {
  const opt = SEVERITY_OPTIONS.find(s => s.value === severity) || SEVERITY_OPTIONS[4];
  return { color: opt.color, bg: opt.bg, label: opt.label };
}

function SeverityBadge({ severity, style = {} }) {
  const s = getSeverityStyle(severity);
  return (
    <span style={{
      display: 'inline-block',
      padding: '.15rem .55rem',
      borderRadius: 99,
      fontSize: '.7rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.06em',
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.color}44`,
      ...style,
    }}>
      {s.label}
    </span>
  );
}

export default function Watch({ onRequireAuth }) {
  const [active, setActive] = useState('infrastructure');
  const dashboard = DASHBOARDS.find(d => d.id === active);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Watch</h1>
            <p className="page-subtitle">Community intelligence — document, report, and monitor what matters</p>
          </div>
        </div>

        <div className="watch-tab-row">
          {DASHBOARDS.map(d => (
            <button
              key={d.id}
              className={`watch-tab-btn${active === d.id ? ' active' : ''}`}
              onClick={() => setActive(d.id)}
            >
              <span className="watch-tab-icon">{d.icon}</span>
              <span className="watch-tab-label">{d.label}</span>
            </button>
          ))}
          <button
            className={`watch-tab-btn${active === 'anomalies' ? ' active' : ''}`}
            onClick={() => setActive('anomalies')}
          >
            <span className="watch-tab-icon">⚠</span>
            <span className="watch-tab-label">Anomalies</span>
          </button>
        </div>

        {active === 'anomalies' ? (
          <AnomaliesView />
        ) : dashboard ? (
          <WatchDashboard
            key={dashboard.id}
            dashboard={dashboard}
            onRequireAuth={onRequireAuth}
          />
        ) : null}
      </div>
    </div>
  );
}

function WatchDashboard({ dashboard, onRequireAuth }) {
  const { user, token } = useAuth();
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getWatchReports(dashboard.id)
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [dashboard.id]);

  function handleSubmitReport() {
    if (!user) { onRequireAuth?.(); return; }
    setShowForm(true);
  }

  return (
    <>
      <div className="watch-dashboard-header">
        <div className="watch-dashboard-title-row">
          <span className="watch-dashboard-icon">{dashboard.icon}</span>
          <h2 className="watch-dashboard-title">{dashboard.label}</h2>
        </div>
        <p className="watch-dashboard-desc">{dashboard.description}</p>
        <button className="btn btn-primary" onClick={handleSubmitReport}>
          + Submit Report
        </button>
      </div>

      <div className="watch-map-placeholder">
        <span className="watch-map-label">📍 Map View — Coming Soon</span>
        <p className="watch-map-sub">Reports will be plotted on an interactive map of Huntsville and North Alabama</p>
      </div>

      <div className="watch-reports">
        <h3 className="watch-reports-heading">
          Community Reports
          {reports.length > 0 && <span className="watch-reports-count"> ({reports.length})</span>}
        </h3>
        {loading ? (
          <div className="spinner" />
        ) : reports.length === 0 ? (
          <p className="empty">No reports yet for this dashboard. Be the first to document what you see.</p>
        ) : (
          <div className="watch-report-list">
            {reports.map(r => <WatchReportCard key={r.id} report={r} />)}
          </div>
        )}
      </div>

      {showForm && (
        <WatchReportModal
          dashboard={dashboard}
          token={token}
          onClose={() => setShowForm(false)}
          onCreated={report => { setReports(prev => [report, ...prev]); setShowForm(false); }}
        />
      )}
    </>
  );
}

function WatchReportCard({ report }) {
  const date = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="watch-report-card">
      <div className="watch-report-card-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.25rem' }}>
            <p className="watch-report-title" style={{ margin: 0 }}>{report.title}</p>
            <SeverityBadge severity={report.severity} />
            {report.report_type && (
              <span style={{ fontSize: '.72rem', color: 'var(--muted)', background: 'var(--surface)', padding: '.1rem .4rem', borderRadius: 4, border: '1px solid var(--border)' }}>
                {report.report_type}
              </span>
            )}
          </div>
          <div className="watch-report-meta">
            <span>{report.username}</span>
            {report.location_label && <><span className="meta-sep">·</span><span>📍 {report.location_label}</span></>}
            <span className="meta-sep">·</span>
            <span>{date}</span>
            {report.verified && <span className="watch-verified-badge">✓ Verified</span>}
          </div>
        </div>
      </div>
      {report.description && <p className="watch-report-body">{report.description}</p>}
      {report.source_url && (
        <a className="watch-report-source" href={report.source_url} target="_blank" rel="noopener noreferrer">
          Source →
        </a>
      )}
      {Array.isArray(report.photo_urls) && report.photo_urls.length > 0 && (
        <div className="watch-report-photos">
          {report.photo_urls.map((url, i) => (
            <img key={i} src={`https://mycelium.unprecedentedtimes.org${url}`} alt="" className="watch-report-photo" />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchReportModal({ dashboard, token, onClose, onCreated }) {
  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [sourceUrl,     setSourceUrl]     = useState('');
  const [severity,      setSeverity]      = useState('');
  const [reportType,    setReportType]    = useState('');
  const [photos,        setPhotos]        = useState([]);
  const [err,           setErr]           = useState(null);
  const [busy,          setBusy]          = useState(false);

  const reportTypes = REPORT_TYPES[dashboard.id] || [];
  const selectedSev = SEVERITY_OPTIONS.find(s => s.value === severity);

  function handlePhotos(e) {
    const files = Array.from(e.target.files);
    e.target.value = '';
    setPhotos(prev => [...prev, ...files].slice(0, 5));
  }

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) { setErr('Title is required'); return; }
    if (!severity) { setErr('Severity is required'); return; }
    setBusy(true); setErr(null);
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('severity', severity);
      if (description)   form.append('description', description);
      if (locationLabel) form.append('location_label', locationLabel);
      if (sourceUrl)     form.append('source_url', sourceUrl);
      if (reportType)    form.append('report_type', reportType);
      photos.forEach(f => form.append('photos', f));
      const report = await api.submitWatchReport(dashboard.id, form, token);
      onCreated(report);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <span className="modal-title">{dashboard.icon} Submit {dashboard.label} Report</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Severity <span className="form-required">*</span></label>
            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
              {SEVERITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  title={opt.desc}
                  style={{
                    padding: '.3rem .75rem',
                    borderRadius: 99,
                    fontSize: '.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: `2px solid ${severity === opt.value ? opt.color : 'transparent'}`,
                    background: severity === opt.value ? opt.bg : 'var(--surface)',
                    color: severity === opt.value ? opt.color : 'var(--muted)',
                    transition: 'all .15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {selectedSev && (
              <p style={{ fontSize: '.78rem', color: selectedSev.color, marginTop: '.35rem' }}>{selectedSev.desc}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Issue Type</label>
            <select className="form-select" value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="">— Select type —</option>
              {reportTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Title <span className="form-required">*</span></label>
            <input className="form-input" required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Brief description of what you observed" />
          </div>
          <div className="form-group">
            <label className="form-label">Details</label>
            <textarea className="form-textarea" rows={4} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe what you saw, when, and any relevant context" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={locationLabel} onChange={e => setLocationLabel(e.target.value)}
                placeholder="e.g. North Huntsville, Highway 72" />
            </div>
            <div className="form-group">
              <label className="form-label">Source URL</label>
              <input className="form-input" type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
                placeholder="https://..." />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Photos (up to 5)</label>
            <input type="file" accept="image/*" multiple className="form-input" onChange={handlePhotos} />
            {photos.length > 0 && (
              <div className="photo-preview-row">
                {photos.map((f, i) => (
                  <div key={i} className="photo-preview-thumb">
                    <img src={URL.createObjectURL(f)} alt="" />
                    <button type="button" className="photo-remove"
                      onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? '…' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Anomalies view ────────────────────────────────────────────────────────────

const ANOMALY_TYPE_LABELS = {
  location_cluster:    'Location Cluster',
  severity_escalation: 'Severity Escalation',
  cross_dashboard:     'Cross-Dashboard Pattern',
  temporal_pattern:    'Temporal Pattern',
  sensitive_location:  'Near Sensitive Location',
};

function AnomaliesView() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    api.getWatchAnomalies()
      .then(setAnomalies)
      .catch(() => setAnomalies([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" style={{ marginTop: '2rem' }} />;

  const unreviewed = anomalies.filter(a => !a.reviewed);
  const reviewed   = anomalies.filter(a => a.reviewed);

  return (
    <div>
      <div className="watch-dashboard-header">
        <div className="watch-dashboard-title-row">
          <span className="watch-dashboard-icon">⚠</span>
          <h2 className="watch-dashboard-title">AI Anomaly Detection</h2>
        </div>
        <p className="watch-dashboard-desc">
          Patterns detected by AI analysis of community reports — location clusters, severity escalations,
          cross-dashboard correlations, and reports near sensitive locations.
          Analysis runs every 30 minutes.
        </p>
      </div>

      {unreviewed.length === 0 && reviewed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: .5 }}>◉</div>
          <p style={{ fontSize: '.95rem' }}>No anomalies detected yet. The AI analyzes all reports every 30 minutes.</p>
        </div>
      ) : (
        <>
          {unreviewed.length > 0 && (
            <div className="watch-report-list">
              {unreviewed.map(a => <AnomalyCard key={a.id} anomaly={a} />)}
            </div>
          )}
          {reviewed.length > 0 && (
            <>
              <h3 style={{ fontSize: '.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', margin: '2rem 0 .75rem' }}>
                Reviewed ({reviewed.length})
              </h3>
              <div className="watch-report-list" style={{ opacity: .65 }}>
                {reviewed.map(a => <AnomalyCard key={a.id} anomaly={a} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function AnomalyCard({ anomaly }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(anomaly.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const sev  = getSeverityStyle(anomaly.severity);
  const typeLabel = ANOMALY_TYPE_LABELS[anomaly.anomaly_type] || anomaly.anomaly_type;

  const confidenceColors = { high: '#16a34a', medium: '#ca8a04', low: '#6b7280' };
  const confColor = confidenceColors[anomaly.ai_confidence] || '#6b7280';

  return (
    <div className="watch-anomaly-card" style={{ borderLeftColor: sev.color }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.35rem' }}>
            <SeverityBadge severity={anomaly.severity} />
            <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {typeLabel}
            </span>
            <span style={{ fontSize: '.72rem', color: confColor, fontWeight: 600 }}>
              {anomaly.ai_confidence} confidence
            </span>
            {anomaly.reviewed && (
              <span style={{ fontSize: '.68rem', color: 'var(--green)', fontWeight: 700, background: 'var(--green-bg)', padding: '.1rem .4rem', borderRadius: 4 }}>
                ✓ Reviewed
              </span>
            )}
          </div>
          <p style={{ margin: '0 0 .35rem', fontSize: '.9rem', color: 'var(--text)', lineHeight: 1.5 }}>
            {anomaly.description}
          </p>
          <div style={{ fontSize: '.78rem', color: 'var(--muted)', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            {anomaly.location_label && <span>📍 {anomaly.location_label}</span>}
            {anomaly.dashboard_types?.length > 0 && (
              <span>Dashboards: {anomaly.dashboard_types.join(', ')}</span>
            )}
            <span>{anomaly.affected_reports?.length || 0} report{anomaly.affected_reports?.length !== 1 ? 's' : ''} involved</span>
            <span>{date}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
