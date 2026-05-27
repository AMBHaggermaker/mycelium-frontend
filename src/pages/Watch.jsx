import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

const VALID_TABS = ['infrastructure','environment','housing','health','watershed','food','surveillance','civic','land_development','anomalies'];

const DASHBOARDS = [
  { id: 'infrastructure',  label: 'Infrastructure',   icon: '🏗️', description: 'Roads, bridges, utilities, public facilities, and city infrastructure conditions.' },
  { id: 'environment',     label: 'Environment',      icon: '🌿', description: 'Air quality, pollution, illegal dumping, toxic sites, and environmental hazards.' },
  { id: 'housing',         label: 'Housing',          icon: '🏠', description: 'Vacant lots, code violations, slumlords, displacement, and affordable housing conditions.' },
  { id: 'health',          label: 'Health',           icon: '🏥', description: 'Disease patterns, clinic access, hospital conditions, and public health concerns.' },
  { id: 'watershed',       label: 'Watershed',        icon: '💧', description: 'Creek contamination, wetland destruction, industrial runoff, and land use changes.' },
  { id: 'food',            label: 'Food & Ag',        icon: '🌾', description: 'Food deserts, grocery access, farmland threats, and agricultural contamination.' },
  { id: 'surveillance',    label: 'Surveillance',     icon: '📡', description: 'Camera installations, license plate readers, facial recognition, and surveillance infrastructure.' },
  { id: 'civic',           label: 'Civic',            icon: '🏛️', description: 'Local government actions, policy decisions, zoning changes, and civic accountability.' },
  { id: 'land_development',label: 'Land Development', icon: '🗺️', description: 'Property transfers, LLC acquisitions, annexation filings, rezoning requests, and displacement risk tracking.' },
];

const REPORT_TYPES = {
  infrastructure:  ['bridge/overpass','road/pothole','retaining wall','drainage','signage','utility','other'],
  environment:     ['water contamination','air quality','soil contamination','EMF/RF','atmospheric','other'],
  housing:         ['mold','structural','no heat/AC','pest infestation','electrical','plumbing','code violation','other'],
  health:          ['respiratory illness','GI illness','MRSA/skin infection','neurological','wildlife disease','tick exposure','mental illness','mental health crisis','suicide risk','substance abuse crisis','domestic violence','other'],
  watershed:       ['development near water','flooding','erosion','impervious surface','other'],
  food:            ['farmland contamination','spray drift','CAFO runoff','discharge','other'],
  surveillance:    ['ALPR/Flock camera','facial recognition','cell tower','drone','other'],
  civic:           ['pothole response time','budget concern','development approval','other'],
  land_development:['commercial development approval','residential subdivision','annexation filing','zoning change request','demolition permit','historic property change','LLC property acquisition','bulk property purchase','agricultural land conversion','other'],
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
  const location = useLocation();

  function tabFromSearch(search) {
    const t = new URLSearchParams(search).get('tab');
    return VALID_TABS.includes(t) ? t : 'infrastructure';
  }

  const [active, setActive] = useState(() => tabFromSearch(location.search));

  useEffect(() => {
    setActive(tabFromSearch(location.search));
  }, [location.search]);

  const highlightParam = new URLSearchParams(location.search).get('highlight');
  const highlightedIds = new Set(highlightParam ? highlightParam.split(',').filter(Boolean) : []);

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
        ) : active === 'land_development' ? (
          <LandDevelopmentDashboard
            dashboard={DASHBOARDS.find(d => d.id === 'land_development')}
            onRequireAuth={onRequireAuth}
            highlightedIds={highlightedIds}
          />
        ) : dashboard ? (
          <WatchDashboard
            key={dashboard.id}
            dashboard={dashboard}
            onRequireAuth={onRequireAuth}
            highlightedIds={highlightedIds}
          />
        ) : null}
      </div>
    </div>
  );
}

function WatchDashboard({ dashboard, onRequireAuth, highlightedIds }) {
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

  useEffect(() => {
    if (loading || !highlightedIds?.size) return;
    const first = reports.find(r => highlightedIds.has(r.id));
    if (!first) return;
    setTimeout(() => {
      document.getElementById(`report-${first.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }, [loading]);

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
            {reports.map(r => (
              <WatchReportCard
                key={r.id}
                report={r}
                highlighted={!!highlightedIds?.has(r.id)}
              />
            ))}
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

function WatchReportCard({ report, highlighted }) {
  const date = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div
      id={`report-${report.id}`}
      className={`watch-report-card${highlighted ? ' watch-report-highlighted' : ''}`}
    >
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
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              <select
                className="form-select"
                required
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                style={selectedSev ? {
                  borderLeft: `4px solid ${selectedSev.color}`,
                  fontWeight: 600,
                  color: selectedSev.color,
                } : {}}
              >
                <option value="" disabled>— Choose severity —</option>
                {SEVERITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ color: opt.color, fontWeight: 600 }}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {selectedSev && (
                <span style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: selectedSev.color, flexShrink: 0,
                }} />
              )}
            </div>
            {selectedSev && (
              <p style={{ fontSize: '.78rem', color: selectedSev.color, margin: '.25rem 0 0' }}>
                {selectedSev.desc}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Issue Type <span style={{ fontSize: '.75rem', color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
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

// ── Land Development dashboard ───────────────────────────────────────────────

const LAND_REPORT_TYPE_LABELS = {
  displacement_risk:       'Displacement Risk',
  llc_acquisition_pattern: 'LLC Acquisition Pattern',
  zoning_change_request:   'Zoning Change Request',
  annexation_activity:     'Annexation Activity',
  bulk_purchase_pattern:   'Bulk Purchase Pattern',
  agricultural_conversion: 'Agricultural Conversion',
  property_transfer_cluster: 'Property Transfer Cluster',
};

// ── Reliable public data source references ────────────────────────────────────
const DATA_SOURCES = [
  {
    name: 'Alabama GIS Hub — property datasets',
    url:  'https://www.alabamagis.com/',
    note: 'Downloadable county property transfer datasets including Madison County',
    tag:  'GIS',
  },
  {
    name: 'EPA ECHO — environmental permits',
    url:  'https://echo.epa.gov',
    note: 'Facility permits and compliance records — integrated into AI analysis automatically',
    tag:  'API',
  },
  {
    name: 'Alabama Secretary of State — LLC lookup',
    url:  'https://www.sos.alabama.gov/government-records/business-entity-records',
    note: 'Registered agents and member names for any Alabama LLC',
    tag:  'SOS',
  },
  {
    name: 'City Clerk — annexation petitions',
    url:  'https://www.huntsvilleal.gov/government/city-clerk/',
    note: 'Pending petitions reviewed at City Council meetings',
    tag:  'City',
  },
];

function LandIntelCard({ report }) {
  const confidenceColors = { high: '#16a34a', medium: '#ca8a04', low: '#6b7280' };
  const typeLabel = LAND_REPORT_TYPE_LABELS[report.report_type] || report.report_type.replace(/_/g,' ');
  const confColor = confidenceColors[report.ai_confidence] || '#6b7280';
  const date = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="land-intel-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.6rem', flexWrap: 'wrap', marginBottom: '.4rem' }}>
        <span className="land-intel-type-badge">{typeLabel}</span>
        <span style={{ fontSize: '.72rem', color: confColor, fontWeight: 600 }}>
          {report.ai_confidence} confidence
        </span>
        <span style={{ fontSize: '.72rem', color: 'var(--muted)', marginLeft: 'auto' }}>{date}</span>
      </div>
      <p className="land-intel-title">{report.title}</p>
      <p className="land-intel-summary">{report.summary}</p>
      {report.affected_areas?.length > 0 && (
        <div style={{ fontSize: '.77rem', color: 'var(--muted)', marginTop: '.35rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600 }}>Areas:</span>
          {report.affected_areas.map((a, i) => (
            <span key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '.1rem .35rem' }}>{a}</span>
          ))}
        </div>
      )}
      {report.data_sources?.length > 0 && (
        <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.25rem' }}>
          Sources: {report.data_sources.join(' · ')}
        </p>
      )}
    </div>
  );
}

// ── Submitted land record types config ───────────────────────────────────────
const LAND_RECORD_TYPES = [
  { value: 'property_transfer',  label: 'Property Transfer',       color: '#b86b10', bg: '#fdf2e3' },
  { value: 'annexation_filing',  label: 'Annexation Filing',       color: '#dc2626', bg: '#fef2f2' },
  { value: 'zoning_change',      label: 'Zoning Change',           color: '#2563eb', bg: '#eff6ff' },
  { value: 'planning_decision',  label: 'Planning Decision',       color: '#16a34a', bg: '#f0fdf4' },
];

const PRR_STATUSES = {
  pending:      { label: 'Pending',      color: '#6b7280', bg: '#f3f4f6' },
  acknowledged: { label: 'Acknowledged', color: '#2563eb', bg: '#eff6ff' },
  partial:      { label: 'Partial',      color: '#ca8a04', bg: '#fefce8' },
  fulfilled:    { label: 'Fulfilled',    color: '#16a34a', bg: '#f0fdf4' },
  denied:       { label: 'Denied',       color: '#dc2626', bg: '#fef2f2' },
  appealing:    { label: 'Appealing',    color: '#ea580c', bg: '#fff7ed' },
};

function LandRecordTypeBadge({ type }) {
  const cfg = LAND_RECORD_TYPES.find(t => t.value === type);
  if (!cfg) return null;
  return (
    <span style={{
      fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
      padding: '.15rem .5rem', borderRadius: 99,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44`,
    }}>
      {cfg.label}
    </span>
  );
}

function LandRecordCard({ record, isAdmin, onVerify, onDelete }) {
  const date = record.record_date
    ? new Date(record.record_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const submitted = new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="land-record-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.4rem' }}>
        <LandRecordTypeBadge type={record.record_type} />
        {record.verified && (
          <span style={{ fontSize: '.68rem', fontWeight: 700, color: '#16a34a', background: '#f0fdf4',
            padding: '.15rem .45rem', borderRadius: 99, border: '1px solid #16a34a44' }}>
            ✓ Verified
          </span>
        )}
        <span style={{ fontSize: '.72rem', color: 'var(--muted)', marginLeft: 'auto' }}>
          Submitted {submitted} by {record.submitted_by_username}
        </span>
      </div>

      {/* Type-specific key fields */}
      {record.record_type === 'property_transfer' && (
        <div className="land-record-fields">
          {record.address  && <span><strong>Address:</strong> {record.address}</span>}
          {record.buyer    && <span><strong>Buyer:</strong> {record.buyer}</span>}
          {record.seller   && <span><strong>Seller:</strong> {record.seller}</span>}
          {record.sale_price && <span><strong>Price:</strong> ${parseFloat(record.sale_price).toLocaleString()}</span>}
          {date            && <span><strong>Date:</strong> {date}</span>}
        </div>
      )}
      {record.record_type === 'annexation_filing' && (
        <div className="land-record-fields">
          {record.area_affected && <span><strong>Area:</strong> {record.area_affected}</span>}
          {record.petitioner    && <span><strong>Petitioner:</strong> {record.petitioner}</span>}
          {date                 && <span><strong>Filed:</strong> {date}</span>}
        </div>
      )}
      {record.record_type === 'zoning_change' && (
        <div className="land-record-fields">
          {record.location_label   && <span><strong>Location:</strong> {record.location_label}</span>}
          {(record.from_zone || record.to_zone) && (
            <span><strong>Zone:</strong> {record.from_zone} → {record.to_zone}</span>
          )}
          {record.requesting_party && <span><strong>Requestor:</strong> {record.requesting_party}</span>}
          {date                    && <span><strong>Filed:</strong> {date}</span>}
        </div>
      )}
      {record.record_type === 'planning_decision' && (
        <div className="land-record-fields">
          {record.project_name    && <span><strong>Project:</strong> {record.project_name}</span>}
          {record.location_label  && <span><strong>Location:</strong> {record.location_label}</span>}
          {record.decision        && <span><strong>Decision:</strong> {record.decision}</span>}
          {date                   && <span><strong>Date:</strong> {date}</span>}
        </div>
      )}

      {record.notes && (
        <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: '.3rem', lineHeight: 1.5 }}>
          {record.notes}
        </p>
      )}

      <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', marginTop: '.4rem', flexWrap: 'wrap' }}>
        {record.source_url && (
          <a href={record.source_url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '.75rem', color: 'var(--blue)' }}
            onClick={e => e.stopPropagation()}>
            Source →
          </a>
        )}
        {isAdmin && (
          <>
            <button className="btn btn-sm btn-outline" style={{ fontSize: '.72rem', padding: '.2rem .55rem' }}
              onClick={() => onVerify(record.id)}>
              {record.verified ? 'Unverify' : 'Verify'}
            </button>
            <button className="btn btn-sm" style={{ fontSize: '.72rem', padding: '.2rem .55rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #dc262644' }}
              onClick={() => onDelete(record.id)}>
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Submit Land Record modal ──────────────────────────────────────────────────
function SubmitLandRecordModal({ token, onClose, onCreated }) {
  const [recordType,      setRecordType]      = useState('property_transfer');
  const [locationLabel,   setLocationLabel]   = useState('');
  const [recordDate,      setRecordDate]       = useState('');
  const [sourceUrl,       setSourceUrl]       = useState('');
  const [notes,           setNotes]           = useState('');
  // property_transfer
  const [address,         setAddress]         = useState('');
  const [buyer,           setBuyer]           = useState('');
  const [seller,          setSeller]          = useState('');
  const [salePrice,       setSalePrice]       = useState('');
  // annexation_filing
  const [areaAffected,    setAreaAffected]    = useState('');
  const [petitioner,      setPetitioner]      = useState('');
  // zoning_change
  const [fromZone,        setFromZone]        = useState('');
  const [toZone,          setToZone]          = useState('');
  const [requestingParty, setRequestingParty] = useState('');
  // planning_decision
  const [projectName,     setProjectName]     = useState('');
  const [decision,        setDecision]        = useState('');

  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);

  const dateLabels = {
    property_transfer: 'Sale Date', annexation_filing: 'Filing Date',
    zoning_change: 'Filing Date', planning_decision: 'Decision Date',
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const record = await api.submitLandRecord({
        record_type:      recordType,
        location_label:   locationLabel.trim() || null,
        record_date:      recordDate || null,
        source_url:       sourceUrl.trim() || null,
        notes:            notes.trim() || null,
        address:          address.trim() || null,
        buyer:            buyer.trim() || null,
        seller:           seller.trim() || null,
        sale_price:       salePrice ? parseFloat(salePrice) : null,
        area_affected:    areaAffected.trim() || null,
        petitioner:       petitioner.trim() || null,
        from_zone:        fromZone.trim() || null,
        to_zone:          toZone.trim() || null,
        requesting_party: requestingParty.trim() || null,
        project_name:     projectName.trim() || null,
        decision:         decision.trim() || null,
      }, token);
      onCreated(record);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const cfg = LAND_RECORD_TYPES.find(t => t.value === recordType);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <span className="modal-title">Submit Land Development Record</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
            Submit public records you find through the Alabama GIS Hub, Alabama Secretary of State, courthouse records,
            or planning commission agendas. The AI analyzes submitted records for patterns.
          </p>

          <div className="form-group">
            <label className="form-label">Record Type <span className="form-required">*</span></label>
            <select className="form-select" value={recordType} onChange={e => setRecordType(e.target.value)}
              style={{ borderLeft: `4px solid ${cfg?.color}`, fontWeight: 600, color: cfg?.color }}>
              {LAND_RECORD_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Property Transfer fields */}
          {recordType === 'property_transfer' && (<>
            <div className="form-group">
              <label className="form-label">Property Address <span className="form-required">*</span></label>
              <input className="form-input" value={address} onChange={e => setAddress(e.target.value)}
                placeholder="Street address" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Buyer / LLC Name</label>
                <input className="form-input" value={buyer} onChange={e => setBuyer(e.target.value)}
                  placeholder="e.g. Smith Holdings LLC" />
              </div>
              <div className="form-group">
                <label className="form-label">Seller</label>
                <input className="form-input" value={seller} onChange={e => setSeller(e.target.value)}
                  placeholder="Previous owner" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Sale Price ($)</label>
                <input className="form-input" type="number" min="0" step="1" value={salePrice}
                  onChange={e => setSalePrice(e.target.value)} placeholder="e.g. 285000" />
              </div>
              <div className="form-group">
                <label className="form-label">{dateLabels[recordType]}</label>
                <input className="form-input" type="date" value={recordDate}
                  onChange={e => setRecordDate(e.target.value)} />
              </div>
            </div>
          </>)}

          {/* Annexation Filing fields */}
          {recordType === 'annexation_filing' && (<>
            <div className="form-group">
              <label className="form-label">Area Affected <span className="form-required">*</span></label>
              <input className="form-input" value={areaAffected} onChange={e => setAreaAffected(e.target.value)}
                placeholder="Neighborhood, street, or parcel description" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Petitioner</label>
                <input className="form-input" value={petitioner} onChange={e => setPetitioner(e.target.value)}
                  placeholder="Who filed the petition" />
              </div>
              <div className="form-group">
                <label className="form-label">{dateLabels[recordType]}</label>
                <input className="form-input" type="date" value={recordDate}
                  onChange={e => setRecordDate(e.target.value)} />
              </div>
            </div>
          </>)}

          {/* Zoning Change fields */}
          {recordType === 'zoning_change' && (<>
            <div className="form-group">
              <label className="form-label">Location / Address <span className="form-required">*</span></label>
              <input className="form-input" value={locationLabel} onChange={e => setLocationLabel(e.target.value)}
                placeholder="Address or area description" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">From Zone <span className="form-required">*</span></label>
                <input className="form-input" value={fromZone} onChange={e => setFromZone(e.target.value)}
                  placeholder="e.g. R-1 Residential" required />
              </div>
              <div className="form-group">
                <label className="form-label">To Zone <span className="form-required">*</span></label>
                <input className="form-input" value={toZone} onChange={e => setToZone(e.target.value)}
                  placeholder="e.g. I-1 Light Industrial" required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Requesting Party</label>
                <input className="form-input" value={requestingParty} onChange={e => setRequestingParty(e.target.value)}
                  placeholder="Who requested the change" />
              </div>
              <div className="form-group">
                <label className="form-label">{dateLabels[recordType]}</label>
                <input className="form-input" type="date" value={recordDate}
                  onChange={e => setRecordDate(e.target.value)} />
              </div>
            </div>
          </>)}

          {/* Planning Decision fields */}
          {recordType === 'planning_decision' && (<>
            <div className="form-group">
              <label className="form-label">Project Name <span className="form-required">*</span></label>
              <input className="form-input" value={projectName} onChange={e => setProjectName(e.target.value)}
                placeholder="Development project name" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" value={locationLabel} onChange={e => setLocationLabel(e.target.value)}
                  placeholder="Address or area" />
              </div>
              <div className="form-group">
                <label className="form-label">Decision</label>
                <input className="form-input" value={decision} onChange={e => setDecision(e.target.value)}
                  placeholder="e.g. Approved, Denied, Tabled" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{dateLabels[recordType]}</label>
              <input className="form-input" type="date" value={recordDate}
                onChange={e => setRecordDate(e.target.value)} />
            </div>
          </>)}

          {/* Shared fields */}
          <div className="form-group">
            <label className="form-label">Source URL</label>
            <input className="form-input" type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
              placeholder="Link to where you found this record" />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional context — related transactions, entity connections, community impact…" />
          </div>

          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? '…' : 'Submit Record'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── PRR tracker ───────────────────────────────────────────────────────────────
function PRRModal({ existing, token, onClose, onSaved }) {
  const [agency,        setAgency]        = useState(existing?.agency        || '');
  const [recordsSought, setRecordsSought] = useState(existing?.records_sought || '');
  const [submittedDate, setSubmittedDate] = useState(existing?.submitted_date || '');
  const [status,        setStatus]        = useState(existing?.status         || 'pending');
  const [responseDue,   setResponseDue]   = useState(existing?.response_due  || '');
  const [notes,         setNotes]         = useState(existing?.notes          || '');
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const payload = {
        agency: agency.trim(), records_sought: recordsSought.trim(),
        submitted_date: submittedDate || null, status,
        response_due: responseDue || null, notes: notes.trim() || null,
      };
      const saved = existing
        ? await api.updatePRR(existing.id, payload, token)
        : await api.createPRR(payload, token);
      onSaved(saved, !!existing);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">{existing ? 'Update Request' : 'Log Records Request'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Agency <span className="form-required">*</span></label>
            <select className="form-select" value={agency} onChange={e => setAgency(e.target.value)} required>
              <option value="">— Select agency —</option>
              <option value="Madison County Revenue Commission">Madison County Revenue Commission</option>
              <option value="Madison County Commission">Madison County Commission</option>
              <option value="City of Huntsville City Clerk">City of Huntsville City Clerk</option>
              <option value="Huntsville Planning Department">Huntsville Planning Department</option>
              <option value="Huntsville Building Permits">Huntsville Building Permits</option>
              <option value="Board of Zoning Adjustment">Board of Zoning Adjustment</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Records Sought <span className="form-required">*</span></label>
            <textarea className="form-textarea" rows={3} value={recordsSought}
              onChange={e => setRecordsSought(e.target.value)} required
              placeholder="Describe exactly what records you requested" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date Submitted</label>
              <input className="form-input" type="date" value={submittedDate}
                onChange={e => setSubmittedDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Response Due</label>
              <input className="form-input" type="date" value={responseDue}
                onChange={e => setResponseDue(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
              {Object.entries(PRR_STATUSES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={2} value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Updates, reference numbers, contacts…" />
          </div>
          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? '…' : existing ? 'Save Changes' : 'Log Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

function PRRTracker({ isAdmin, token }) {
  const [requests,  setRequests]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);

  useEffect(() => {
    api.getPRR()
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(saved, isUpdate) {
    if (isUpdate) {
      setRequests(prev => prev.map(r => r.id === saved.id ? saved : r));
    } else {
      setRequests(prev => [saved, ...prev]);
    }
    setShowModal(false);
    setEditing(null);
  }

  async function handleDelete(id) {
    if (!confirm('Remove this records request?')) return;
    try {
      await api.deletePRR(id, token);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="prr-tracker">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
        <div className="watch-dashboard-title-row" style={{ margin: 0 }}>
          <span className="watch-dashboard-icon" style={{ fontSize: '1.1rem' }}>📬</span>
          <h3 className="watch-dashboard-title" style={{ fontSize: '1rem', margin: 0 }}>
            Public Records Request Tracker
          </h3>
        </div>
        {isAdmin && (
          <button className="btn btn-outline btn-sm" onClick={() => { setEditing(null); setShowModal(true); }}>
            + Log Request
          </button>
        )}
      </div>
      <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: '.85rem', lineHeight: 1.4 }}>
        Formal records requests submitted to Madison County and City of Huntsville agencies.
        {!isAdmin && ' Admins can log and track request status here.'}
      </p>

      {loading ? <div className="spinner" style={{ margin: '.5rem 0' }} /> : (
        requests.length === 0 ? (
          <p className="empty" style={{ margin: '.25rem 0' }}>
            {isAdmin ? 'No requests logged yet. Use "Log Request" to track a FOIA/public records submission.' : 'No records requests logged yet.'}
          </p>
        ) : (
          <div className="prr-list">
            {requests.map(r => {
              const st = PRR_STATUSES[r.status] || PRR_STATUSES.pending;
              const submitted = r.submitted_date
                ? new Date(r.submitted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : null;
              const due = r.response_due
                ? new Date(r.response_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : null;
              return (
                <div key={r.id} className="prr-item">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.2rem' }}>
                        <span style={{
                          fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase',
                          padding: '.15rem .45rem', borderRadius: 99,
                          background: st.bg, color: st.color, border: `1px solid ${st.color}44`,
                        }}>
                          {st.label}
                        </span>
                        <span style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text)' }}>{r.agency}</span>
                      </div>
                      <p style={{ fontSize: '.82rem', color: 'var(--text)', margin: '0 0 .2rem', lineHeight: 1.45 }}>
                        {r.records_sought}
                      </p>
                      <div style={{ fontSize: '.72rem', color: 'var(--muted)', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                        {submitted && <span>Submitted: {submitted}</span>}
                        {due       && <span>Due: {due}</span>}
                        {r.notes   && <span>{r.notes}</span>}
                      </div>
                    </div>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '.35rem', flexShrink: 0 }}>
                        <button className="btn btn-sm btn-outline" style={{ fontSize: '.7rem', padding: '.2rem .45rem' }}
                          onClick={() => { setEditing(r); setShowModal(true); }}>
                          Edit
                        </button>
                        <button className="btn btn-sm" style={{ fontSize: '.7rem', padding: '.2rem .45rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #dc262644' }}
                          onClick={() => handleDelete(r.id)}>
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {showModal && (
        <PRRModal
          existing={editing}
          token={token}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ── Data Sources reference panel ──────────────────────────────────────────────
function DataSourcesPanel() {
  return (
    <div className="public-records-tracker" style={{ marginBottom: '1.5rem' }}>
      <div className="watch-dashboard-title-row" style={{ marginBottom: '.6rem' }}>
        <span className="watch-dashboard-icon" style={{ fontSize: '1rem' }}>🔗</span>
        <h3 className="watch-dashboard-title" style={{ fontSize: '.95rem', margin: 0 }}>Reliable Data Sources</h3>
      </div>
      <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '.35rem' }}>
        Use these sources to find records to submit above. The AI analyzes what the community submits — no unreliable scraping.
      </p>
      <p style={{ fontSize: '.78rem', color: 'var(--amber)', background: 'var(--amber-bg)', border: '1px solid var(--amber)', borderRadius: 'var(--radius-sm)', padding: '.45rem .65rem', marginBottom: '.75rem', lineHeight: 1.5 }}>
        Public records sources are verified periodically — some government websites have limited availability. Submit records you find directly using the form below.
      </p>
      <div className="public-records-list">
        {DATA_SOURCES.map((src, i) => (
          <div key={i} className="public-records-item">
            <span style={{
              fontSize: '.65rem', fontWeight: 700, padding: '.1rem .35rem', borderRadius: 4,
              background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)',
              flexShrink: 0, alignSelf: 'center', whiteSpace: 'nowrap',
            }}>
              {src.tag}
            </span>
            <div className="public-records-info">
              <div className="public-records-name">{src.name}</div>
              <div className="public-records-note">{src.note}</div>
            </div>
            <a href={src.url} target="_blank" rel="noopener noreferrer"
              className="public-records-link" onClick={e => e.stopPropagation()}>
              Open →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Land Development dashboard ──────────────────────────────────────────
function LandDevelopmentDashboard({ dashboard, onRequireAuth, highlightedIds }) {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [intelReports,    setIntelReports]    = useState([]);
  const [intelLoading,    setIntelLoading]    = useState(true);
  const [landRecords,     setLandRecords]     = useState([]);
  const [recordsLoading,  setRecordsLoading]  = useState(true);
  const [recordFilter,    setRecordFilter]    = useState('');
  const [watchReports,    setWatchReports]    = useState([]);
  const [watchLoading,    setWatchLoading]    = useState(true);
  const [showForm,        setShowForm]        = useState(false);
  const [showRecordForm,  setShowRecordForm]  = useState(false);

  useEffect(() => {
    api.getLandIntelReports()
      .then(setIntelReports).catch(() => []).finally(() => setIntelLoading(false));

    api.getLandRecords()
      .then(setLandRecords).catch(() => []).finally(() => setRecordsLoading(false));

    api.getWatchReports('land_development')
      .then(setWatchReports).catch(() => []).finally(() => setWatchLoading(false));
  }, []);

  useEffect(() => {
    if (watchLoading || !highlightedIds?.size) return;
    const first = watchReports.find(r => highlightedIds.has(r.id));
    if (!first) return;
    setTimeout(() => {
      document.getElementById(`report-${first.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }, [watchLoading]);

  async function handleVerifyRecord(id) {
    try {
      const updated = await api.verifyLandRecord(id, token);
      setLandRecords(prev => prev.map(r => r.id === id ? { ...r, verified: updated.verified } : r));
    } catch (e) { alert(e.message); }
  }

  async function handleDeleteRecord(id) {
    if (!confirm('Delete this submitted record?')) return;
    try {
      await api.deleteLandRecord(id, token);
      setLandRecords(prev => prev.filter(r => r.id !== id));
    } catch (e) { alert(e.message); }
  }

  const filteredRecords = recordFilter
    ? landRecords.filter(r => r.record_type === recordFilter)
    : landRecords;

  return (
    <>
      <div className="watch-dashboard-header">
        <div className="watch-dashboard-title-row">
          <span className="watch-dashboard-icon">{dashboard.icon}</span>
          <h2 className="watch-dashboard-title">{dashboard.label}</h2>
        </div>
        <p className="watch-dashboard-desc">{dashboard.description}</p>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => {
            if (!user) { onRequireAuth?.(); return; }
            setShowRecordForm(true);
          }}>
            + Submit Property Record
          </button>
          <button className="btn btn-outline" onClick={() => {
            if (!user) { onRequireAuth?.(); return; }
            setShowForm(true);
          }}>
            + Submit Watch Report
          </button>
        </div>
      </div>

      {/* AI Intelligence Reports */}
      <div className="land-intel-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.6rem' }}>
          <h3 className="watch-reports-heading" style={{ margin: 0, color: '#c8e6b0' }}>AI Intelligence Reports</h3>
          <span style={{ fontSize: '.7rem', background: '#2a5f0a', color: '#c8e6b0', padding: '.1rem .45rem', borderRadius: 99, fontWeight: 700, border: '1px solid #3a7f14' }}>
            EPA ECHO + Community Data
          </span>
        </div>
        <p style={{ fontSize: '.8rem', color: '#8ab882', marginBottom: '1rem', lineHeight: 1.5 }}>
          Runs every 6 hours. Analyzes community-submitted records for: same LLC across multiple transactions,
          bulk purchases (3+ in 90 days), zoning changes near housing violation areas, and EPA facility permit patterns.
          Submit records below to feed this analysis.
        </p>
        {intelLoading ? <div className="spinner" /> :
          intelReports.length === 0 ? (
            <div className="land-intel-empty">
              <p>No intelligence reports yet. Analysis runs every 6 hours once community-submitted records accumulate.</p>
            </div>
          ) : (
            <div className="land-intel-list">
              {intelReports.map(r => <LandIntelCard key={r.id} report={r} />)}
            </div>
          )
        }
      </div>

      {/* Community-submitted land records */}
      <div className="land-records-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.75rem' }}>
          <h3 className="watch-reports-heading" style={{ margin: 0 }}>
            Submitted Records
            {landRecords.length > 0 && <span className="watch-reports-count"> ({landRecords.length})</span>}
          </h3>
          <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
            <button className={`filter-tab${!recordFilter ? ' active' : ''}`} onClick={() => setRecordFilter('')} style={{ fontSize: '.75rem', padding: '.2rem .55rem' }}>All</button>
            {LAND_RECORD_TYPES.map(t => (
              <button key={t.value}
                className={`filter-tab${recordFilter === t.value ? ' active' : ''}`}
                style={{ fontSize: '.75rem', padding: '.2rem .55rem' }}
                onClick={() => setRecordFilter(recordFilter === t.value ? '' : t.value)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: '.85rem', lineHeight: 1.4 }}>
          Public records submitted by community members from courthouse documents, Alabama GIS Hub, and planning commission agendas.
          These records feed the AI analysis above.
        </p>
        {recordsLoading ? <div className="spinner" /> :
          filteredRecords.length === 0 ? (
            <p className="empty">
              {landRecords.length === 0
                ? 'No records submitted yet. Use "Submit Property Record" to document transfers, annexations, zoning changes, or planning decisions you find.'
                : 'No records match this filter.'}
            </p>
          ) : (
            <div className="land-record-list">
              {filteredRecords.map(r => (
                <LandRecordCard
                  key={r.id}
                  record={r}
                  isAdmin={isAdmin}
                  onVerify={handleVerifyRecord}
                  onDelete={handleDeleteRecord}
                />
              ))}
            </div>
          )
        }
      </div>

      {/* Reliable data sources reference */}
      <DataSourcesPanel />

      {/* PRR tracker */}
      <PRRTracker isAdmin={isAdmin} token={token} />

      {/* Community watch reports */}
      <div className="watch-reports">
        <h3 className="watch-reports-heading">
          Community Watch Reports
          {watchReports.length > 0 && <span className="watch-reports-count"> ({watchReports.length})</span>}
        </h3>
        {watchLoading ? <div className="spinner" /> :
          watchReports.length === 0 ? (
            <p className="empty">No watch reports yet. Use "Submit Watch Report" to document what you observe on the ground.</p>
          ) : (
            <div className="watch-report-list">
              {watchReports.map(r => (
                <WatchReportCard key={r.id} report={r} highlighted={!!highlightedIds?.has(r.id)} />
              ))}
            </div>
          )
        }
      </div>

      {showRecordForm && (
        <SubmitLandRecordModal
          token={token}
          onClose={() => setShowRecordForm(false)}
          onCreated={record => { setLandRecords(prev => [record, ...prev]); setShowRecordForm(false); }}
        />
      )}
      {showForm && dashboard && (
        <WatchReportModal
          dashboard={dashboard}
          token={token}
          onClose={() => setShowForm(false)}
          onCreated={report => { setWatchReports(prev => [report, ...prev]); setShowForm(false); }}
        />
      )}
    </>
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
