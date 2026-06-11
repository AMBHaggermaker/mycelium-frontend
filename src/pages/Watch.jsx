import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import WatchMap, { AnomalyMap } from '../components/WatchMap';
import ImageCropUploader from '../components/ImageCropUploader';
import WhyThisWorks from '../components/WhyThisWorks';

const VALID_TABS = ['overview','infrastructure','environment','housing','health','watershed','food','surveillance','civic','land_development','atmospheric_observations','anomalies'];

// ── Dashboard instructions ─────────────────────────────────────────────────────

const DASHBOARD_HOW_IT_WORKS = {
  default: {
    what: 'This dashboard tracks community-submitted reports on a specific issue area. Reports are geo-tagged and analyzed by AI to detect patterns, severity clusters, and connections across submissions.',
    submit: 'Click "Submit Report" and fill in the type, location, description, and severity level. Photos are highly recommended — they help other community members and our AI analysis understand the situation.',
    after: 'After submission, your report is analyzed and cross-referenced with other reports in the area. If a pattern is detected across multiple reports, an anomaly alert may be generated.',
    severity: 'Severity levels run from Critical (immediate health/safety threat) through Serious, Moderate, and Minor to Monitoring (routine documentation). Choose the level that matches the urgency of what you observed.',
    tips: ['Include photos whenever possible — they dramatically improve AI analysis accuracy.', 'Use the location button to capture precise GPS coordinates, especially if reporting from a mobile device.', 'The more detail in your description, the better the cross-referencing works.', 'Add a source URL if your report is based on a public record or news article.'],
  },
  land_development: {
    what: 'The Land Development dashboard tracks property transfers, LLC acquisitions, rezoning requests, annexation filings, demolition permits, and displacement risk patterns across the community.',
    submit: 'Reports can be submitted from your own observations or from public records. For public records, include the source URL from the county assessor, planning department, or city council website.',
    after: 'After submission, the AI pattern analyzer looks for bulk purchases by the same LLC or entity, geographic clustering, and connections to prior reports or public records. Suspicious patterns surface as intel reports.',
    severity: 'Critical = immediate displacement risk or historic property loss. Serious = large-scale acquisition or zoning change affecting many residents. Moderate = worth monitoring. Minor = routine development.',
    tips: ['Find public records at Huntsville city council agendas, Madison County Assessor, and the Alabama Secretary of State LLC registry.', 'When submitting LLC acquisitions, note the registered agent name — it often reveals the actual owner.', 'Cross-reference with the Public Records Tracker to avoid duplicate submissions.', 'Rezoning and annexation filings are public record — submit them as soon as they appear on a council agenda.'],
  },
  atmospheric_observations: {
    what: 'The Atmospheric Observations dashboard tracks unusual aerial phenomena including persistent contrails, grid patterns, low-altitude spray events, and unidentified aerial observations. Every submission is automatically cross-referenced with live flight data from the OpenSky Network and NOAA weather conditions.',
    submit: 'Click "Submit Observation" and provide as much detail as possible. GPS coordinates are required for the flight cross-reference to work. Use the "Use My Location" button or enter coordinates manually.',
    after: 'After submission, the system queries the OpenSky Network for flights within a 50-mile radius at the time of observation. Weather data (humidity, wind speed) is pulled from NOAA. The AI then classifies the observation.',
    classify: 'EXPLAINED = matching flight confirmed by OpenSky (real-time) and/or Fli (scheduled routes) with supporting conditions. PARTIAL = scheduled commercial route exists (Fli) but no real-time tracking confirmation (OpenSky), or flight found but altitude/conditions don\'t fully match. UNIDENTIFIED = neither OpenSky nor Fli found any matching flights — dual-source confirmation increases confidence. UNEXPLAINED = flight found but atmospheric conditions are abnormal. Sources shown as colored pills on each badge.',
    severity: 'Critical = immediate chemical exposure risk. Serious = confirmed unusual pattern with no flight match. Moderate = unusual but not immediately dangerous. Minor = minor deviation from normal. Monitoring = routine documentation.',
    tips: ['GPS coordinates are essential — without them the flight cross-reference cannot run.', 'Note the exact time as precisely as possible — the OpenSky query searches ±30 minutes around your observation time.', 'Photograph the sky and any residue on surfaces, vehicles, or plants.', 'If you collect soil or rainwater samples, submit them through the Soil/Rainwater Testing section and they will be automatically linked to nearby observations.', 'The flight data comes from the OpenSky Network which has ~85% coverage — some military and private aircraft may not appear.'],
  },
};

const BranchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="1.8" fill="currentColor"/>
    <path d="M8 8L8 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M8 8L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M8 8L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M8 4L5 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M8 4L11 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M5.5 10.5L3.5 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M10.5 10.5L12.5 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

function HowThisWorks({ dashboardId }) {
  const storageKey = `watch-htw-${dashboardId}`;
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem(storageKey) === 'open'; } catch { return false; }
  });

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    try { localStorage.setItem(storageKey, next ? 'open' : 'closed'); } catch { /* ignore */ }
  }

  const info = DASHBOARD_HOW_IT_WORKS[dashboardId] || DASHBOARD_HOW_IT_WORKS.default;

  return (
    <div className="htw-panel">
      <button className="htw-toggle" onClick={toggle} type="button" aria-expanded={expanded}>
        <span className="htw-toggle-icon"><BranchIcon /></span>
        <span className="htw-toggle-label">How This Works</span>
        <span className="htw-arrow" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {expanded && (
        <div className="htw-body">
          <div className="htw-section">
            <strong>What this tracks</strong>
            <p>{info.what}</p>
          </div>
          <div className="htw-section">
            <strong>How to submit a report</strong>
            <p>{info.submit}</p>
          </div>
          <div className="htw-section">
            <strong>After submission</strong>
            <p>{info.after}</p>
          </div>
          {info.classify && (
            <div className="htw-section">
              <strong>How classifications work</strong>
              <p>{info.classify}</p>
            </div>
          )}
          <div className="htw-section">
            <strong>Severity levels</strong>
            <p>{info.severity}</p>
          </div>
          <div className="htw-tips">
            <strong>✦ Tips for best results</strong>
            <ul>
              {info.tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

const DASHBOARDS = [
  { id: 'infrastructure',  label: 'Infrastructure',   icon: '🏗️', description: 'Roads, bridges, utilities, public facilities, and city infrastructure conditions.' },
  { id: 'environment',     label: 'Environment',      icon: '🌿', description: 'Air quality, pollution, illegal dumping, toxic sites, and environmental hazards.' },
  { id: 'housing',         label: 'Housing',          icon: '🏠', description: 'Vacant lots, code violations, slumlords, displacement, and affordable housing conditions.' },
  { id: 'health',          label: 'Health',           icon: '🏥', description: 'Disease patterns, clinic access, hospital conditions, and public health concerns.' },
  { id: 'watershed',       label: 'Watershed',        icon: '💧', description: 'Creek contamination, wetland destruction, industrial runoff, and land use changes.' },
  { id: 'food',            label: 'Food & Ag',        icon: '🌾', description: 'Food deserts, grocery access, farmland threats, and agricultural contamination.' },
  { id: 'surveillance',    label: 'Surveillance',     icon: '📡', description: 'Camera installations, license plate readers, facial recognition, and surveillance infrastructure.' },
  { id: 'civic',           label: 'Civic',            icon: '🏛️', description: 'Local government actions, policy decisions, zoning changes, and civic accountability.' },
  { id: 'land_development',         label: 'Land Development',          icon: '🗺️', description: 'Property transfers, LLC acquisitions, annexation filings, rezoning requests, and displacement risk tracking.' },
  { id: 'atmospheric_observations', label: 'Atmospheric Observations',   icon: '🌫️', description: 'Persistent contrails, grid patterns, unusual spray events — cross-referenced with flight data, weather conditions, and soil testing.' },
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
  land_development:['commercial development approval','residential subdivision','annexation filing','zoning change request','demolition permit','historic property change','LLC property acquisition','bulk property purchase','agricultural land conversion','easement','eminent domain','probate/property abuse','other'],
  atmospheric_observations:['persistent_contrail','grid_pattern','low_altitude_trail','no_corresponding_flight','unusual_spray_pattern','other'],
};

const SEVERITY_OPTIONS = [
  { value: 'critical',   label: 'Critical',   color: '#ff4060', bg: 'rgba(255,64,96,0.12)',   glow: '0 0 10px rgba(255,64,96,0.5)',   desc: 'Imminent threat to health or safety' },
  { value: 'serious',    label: 'Serious',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  glow: '0 0 10px rgba(245,158,11,0.4)',  desc: 'Significant concern requiring attention' },
  { value: 'moderate',   label: 'Moderate',   color: '#ffc832', bg: 'rgba(255,200,50,0.1)',   glow: '0 0 8px rgba(255,200,50,0.3)',   desc: 'Noteworthy issue to monitor' },
  { value: 'minor',      label: 'Minor',      color: '#4da6ff', bg: 'rgba(77,166,255,0.1)',   glow: '0 0 8px rgba(77,166,255,0.3)',   desc: 'Low-level concern or observation' },
  { value: 'monitoring', label: 'Monitoring', color: '#a8b5a0', bg: 'rgba(168,181,160,0.08)', glow: 'none',                           desc: 'Routine documentation, no immediate concern' },
];

function getSeverityStyle(severity) {
  const opt = SEVERITY_OPTIONS.find(s => s.value === severity) || SEVERITY_OPTIONS[4];
  return { color: opt.color, bg: opt.bg, label: opt.label, glow: opt.glow };
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
      border: `1px solid ${s.color}66`,
      boxShadow: s.glow,
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
    return VALID_TABS.includes(t) ? t : 'overview';
  }

  const [active,       setActive]       = useState(() => tabFromSearch(location.search));
  const [overviewRpts, setOverviewRpts] = useState([]);
  const [overviewAnoms,setOverviewAnoms]= useState([]);
  const [overviewLoad, setOverviewLoad] = useState(false);
  const [isMobile,     setIsMobile]     = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    setActive(tabFromSearch(location.search));
  }, [location.search]);

  useEffect(() => {
    if (active !== 'overview') return;
    setOverviewLoad(true);
    Promise.all([
      api.getAllWatchReports({ limit: 300 }).catch(() => []),
      api.getWatchAnomalies().catch(() => []),
    ]).then(([rpts, anoms]) => {
      setOverviewRpts(rpts);
      setOverviewAnoms(anoms);
    }).finally(() => setOverviewLoad(false));
  }, [active]);

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

        <WhyThisWorks id="watch-community-reports">
          Because the people closest to a problem see it first. Institutions report what they are required to report. Communities report what they actually experience.
        </WhyThisWorks>

        <div className="watch-tab-row">
          <button
            className={`watch-tab-btn${active === 'overview' ? ' active' : ''}`}
            onClick={() => setActive('overview')}
          >
            <span className="watch-tab-icon">🗺</span>
            <span className="watch-tab-label">Overview</span>
          </button>
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
          <span className="watch-tab-divider" aria-hidden="true" />
          {[
            { path: '/watch/water',  icon: '💧', label: 'Water Quality' },
            { path: '/watch/air',    icon: '🌬️', label: 'Air Quality' },
            { path: '/watch/soil',   icon: '🌱', label: 'Soil Quality' },
            { path: '/watch/energy', icon: '⚡', label: 'Energy' },
          ].map(t => (
            <Link key={t.path} to={t.path} className="watch-tab-btn watch-tab-btn--env">
              <span className="watch-tab-icon">{t.icon}</span>
              <span className="watch-tab-label">{t.label}</span>
            </Link>
          ))}
        </div>

        {active === 'overview' ? (
          <WatchOverviewMap
            reports={overviewRpts}
            anomalies={overviewAnoms}
            loading={overviewLoad}
            isMobile={isMobile}
          />
        ) : active === 'anomalies' ? (
          <AnomaliesView />
        ) : active === 'land_development' ? (
          <LandDevelopmentDashboard
            dashboard={DASHBOARDS.find(d => d.id === 'land_development')}
            onRequireAuth={onRequireAuth}
            highlightedIds={highlightedIds}
            isMobile={isMobile}
          />
        ) : active === 'atmospheric_observations' ? (
          <AtmosphericDashboard
            dashboard={DASHBOARDS.find(d => d.id === 'atmospheric_observations')}
            onRequireAuth={onRequireAuth}
            highlightedIds={highlightedIds}
          />
        ) : dashboard ? (
          <WatchDashboard
            key={dashboard.id}
            dashboard={dashboard}
            onRequireAuth={onRequireAuth}
            highlightedIds={highlightedIds}
            isMobile={isMobile}
          />
        ) : null}
      </div>
    </div>
  );
}

function WatchOverviewMap({ reports, anomalies, loading, isMobile }) {
  return (
    <div>
      <div className="watch-dashboard-header">
        <div className="watch-dashboard-title-row">
          <span className="watch-dashboard-icon">🗺</span>
          <h2 className="watch-dashboard-title">Watch Overview Map</h2>
        </div>
        <p className="watch-dashboard-desc">
          All community reports across every dashboard, live on a single map.
          Use the filters to focus on specific dashboards or severity levels.
        </p>
      </div>
      {loading ? (
        <div className="spinner" style={{ margin: '3rem auto' }} />
      ) : (
        <WatchMap
          reports={reports}
          anomalies={anomalies}
          height={isMobile ? 'calc(100vh - 200px)' : '600px'}
          showDashboardFilter
          showSeverityFilter
          showAnomalyToggle
          className="watch-overview-map"
        />
      )}
      <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '.65rem', textAlign: 'center' }}>
        {reports.filter(r => r.location_lat).length} of {reports.length} reports have location data · Select a dashboard tab to submit new reports
      </p>
    </div>
  );
}

function WatchDashboard({ dashboard, onRequireAuth, highlightedIds, isMobile }) {
  const { user, token } = useAuth();
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem(`watch-view-${dashboard.id}`) || 'list'
  );

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

  function toggleView(mode) {
    setViewMode(mode);
    localStorage.setItem(`watch-view-${dashboard.id}`, mode);
  }

  return (
    <>
      <HowThisWorks dashboardId={dashboard.id} />
      <div className="watch-dashboard-header">
        <div className="watch-dashboard-title-row">
          <span className="watch-dashboard-icon">{dashboard.icon}</span>
          <h2 className="watch-dashboard-title">{dashboard.label}</h2>
        </div>
        <p className="watch-dashboard-desc">{dashboard.description}</p>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleSubmitReport}>
            + Submit Report
          </button>
          <div className="watch-view-toggle">
            <button className={`watch-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => toggleView('list')}>
              ☰ List
            </button>
            <button className={`watch-view-btn${viewMode === 'map' ? ' active' : ''}`} onClick={() => toggleView('map')}>
              🗺 Map
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'map' ? (
        loading ? (
          <div className="spinner" style={{ margin: '2rem auto' }} />
        ) : (
          <WatchMap
            reports={reports}
            dashboard={dashboard.id}
            height={isMobile ? 'calc(100vh - 220px)' : '520px'}
          />
        )
      ) : (
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
      )}

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
      data-severity={report.severity}
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
      {report.soil_test && (
        <div className="watch-soil-test">
          <div className="watch-soil-test-header">
            <span className="watch-soil-test-icon">🧪</span>
            <strong className="watch-soil-test-title">Lab Results</strong>
            {report.soil_test.sample_type && (
              <span className="watch-soil-test-type">{report.soil_test.sample_type.replace(/_/g, ' ')}</span>
            )}
            {report.soil_test.lab_name && (
              <span className="watch-soil-test-lab">{report.soil_test.lab_name}</span>
            )}
            {report.soil_test.collection_date && (
              <span className="watch-soil-test-date">
                {new Date(report.soil_test.collection_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
          {report.soil_test.compounds_tested?.length > 0 && (
            <div className="watch-soil-test-compounds">
              {report.soil_test.compounds_tested.map(c => {
                const res = report.soil_test.results?.[c];
                return (
                  <div key={c} className="watch-soil-compound-pill">
                    <span className="watch-soil-compound-name">{c}</span>
                    {res?.value && (
                      <span className="watch-soil-compound-val">{res.value} {res.unit || 'ppb'}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {report.soil_test.lab_report_url && (
            <a href={`https://mycelium.unprecedentedtimes.org${report.soil_test.lab_report_url}`}
              target="_blank" rel="noopener noreferrer" className="watch-soil-test-pdf">
              View Lab Report PDF →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

const LAB_COMPOUNDS = ['aluminum','barium','strontium','silver','PFAS','lead','nitrates','coliform','other'];
const LAB_DASHBOARDS = new Set(['environment','food']);

function GpsButton({ onCapture }) {
  const [status, setStatus] = useState('idle'); // idle|loading|denied|unavailable
  function capture() {
    if (!navigator.geolocation) { setStatus('unavailable'); return; }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        onCapture(
          pos.coords.latitude.toFixed(6),
          pos.coords.longitude.toFixed(6)
        );
        setStatus('idle');
      },
      err => setStatus(err.code === 1 ? 'denied' : 'unavailable'),
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem', alignItems: 'flex-end' }}>
      <button type="button" className="btn btn-sm btn-outline"
        style={{ fontSize: '.75rem', padding: '.2rem .55rem' }}
        disabled={status === 'loading'}
        onClick={capture}>
        {status === 'loading' ? '⏳ Getting location…' : '◎ Use My Location'}
      </button>
      {status === 'denied' && (
        <p style={{ fontSize: '.72rem', color: '#b52424', margin: 0, lineHeight: 1.4, textAlign: 'right', maxWidth: 260 }}>
          Location access denied — please enter your location manually or type your address in the location label field.
        </p>
      )}
      {status === 'unavailable' && (
        <p style={{ fontSize: '.72rem', color: '#b52424', margin: 0, lineHeight: 1.4, textAlign: 'right', maxWidth: 260 }}>
          Location unavailable — please enter coordinates manually.
        </p>
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
  const [locationLat,   setLocationLat]   = useState('');
  const [locationLng,   setLocationLng]   = useState('');
  const [err,           setErr]           = useState(null);
  const [busy,          setBusy]          = useState(false);

  // Lab results state
  const [showLab,         setShowLab]         = useState(false);
  const [labSampleType,   setLabSampleType]   = useState('');
  const [labCollDate,     setLabCollDate]      = useState('');
  const [labName,         setLabName]         = useState('');
  const [labCompounds,    setLabCompounds]    = useState(new Set());
  const [labResults,      setLabResults]      = useState({});
  const [labReportFile,   setLabReportFile]   = useState(null);

  const reportTypes   = REPORT_TYPES[dashboard.id] || [];
  const selectedSev   = SEVERITY_OPTIONS.find(s => s.value === severity);
  const supportsLab   = LAB_DASHBOARDS.has(dashboard.id);

  function addPhoto(blob, filename) {
    setPhotos(prev => {
      if (prev.length >= 5) return prev;
      return [...prev, new File([blob], filename, { type: 'image/jpeg' })];
    });
  }

  function toggleCompound(c) {
    setLabCompounds(prev => {
      const next = new Set(prev);
      if (next.has(c)) { next.delete(c); setLabResults(r => { const n = {...r}; delete n[c]; return n; }); }
      else next.add(c);
      return next;
    });
  }

  function setResult(compound, field, value) {
    setLabResults(prev => ({
      ...prev,
      [compound]: { ...(prev[compound] || { value: '', unit: 'ppb' }), [field]: value },
    }));
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
      if (locationLat) form.append('location_lat', locationLat);
      if (locationLng) form.append('location_lng', locationLng);

      // Lab results
      if (supportsLab && showLab && labSampleType) {
        form.append('lab_sample_type', labSampleType);
        if (labCollDate)    form.append('lab_collection_date', labCollDate);
        if (labName)        form.append('lab_name', labName);
        form.append('lab_compounds', JSON.stringify([...labCompounds]));
        form.append('lab_results',   JSON.stringify(labResults));
        if (labReportFile)  form.append('lab_report', labReportFile);
      }

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.3rem' }}>
              <label className="form-label" style={{ margin: 0 }}>GPS Coordinates <span style={{ fontSize: '.72rem', color: 'var(--muted)', fontWeight: 400 }}>(enables map pin)</span></label>
              <GpsButton onCapture={(lat, lng) => { setLocationLat(lat); setLocationLng(lng); }} />
            </div>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <input className="form-input" type="number" step="any" placeholder="Latitude (e.g. 34.7304)"
                value={locationLat} onChange={e => setLocationLat(e.target.value)} />
              <input className="form-input" type="number" step="any" placeholder="Longitude (e.g. -86.5861)"
                value={locationLng} onChange={e => setLocationLng(e.target.value)} />
            </div>
            {locationLat && locationLng ? (
              <p style={{ fontSize: '.74rem', color: '#15803d', margin: '.2rem 0 0' }}>
                ✓ {parseFloat(locationLat).toFixed(5)}°N, {Math.abs(parseFloat(locationLng)).toFixed(5)}°W
              </p>
            ) : !locationLat && locationLabel ? (
              <p style={{ fontSize: '.74rem', color: 'var(--muted)', margin: '.2rem 0 0' }}>
                No GPS — your location label will be used for the report.
              </p>
            ) : null}
          </div>
          <div className="form-group">
            <label className="form-label">Photos (up to 5)</label>
            {photos.length < 5 && (
              <ImageCropUploader
                aspect={4 / 3}
                targetWidth={1200}
                targetHeight={900}
                label={`+ Add Photo ${photos.length > 0 ? `(${photos.length}/5)` : ''}`}
                hint="Any size, landscape preferred, min 800px wide"
                onFile={addPhoto}
                btnClassName="btn btn-outline btn-sm"
              />
            )}
            {photos.length > 0 && (
              <div className="photo-preview-row" style={{ marginTop: '.5rem' }}>
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

          {supportsLab && (
            <div className="lab-section">
              <button type="button" className="lab-toggle" onClick={() => setShowLab(v => !v)}>
                <span className="lab-toggle-icon">🧪</span>
                <span>Lab Results {showLab ? '▲' : '▼'}</span>
                <span className="lab-toggle-optional">optional</span>
              </button>
              {showLab && (
                <div className="lab-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Sample Type <span className="form-required">*</span></label>
                      <select className="form-select" value={labSampleType} onChange={e => setLabSampleType(e.target.value)}>
                        <option value="">— Select —</option>
                        <option value="soil_surface">Soil — Surface</option>
                        <option value="soil_deep">Soil — Deep</option>
                        <option value="rainwater">Rainwater</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Collection Date</label>
                      <input className="form-input" type="date" value={labCollDate} onChange={e => setLabCollDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lab Name</label>
                    <input className="form-input" value={labName} onChange={e => setLabName(e.target.value)}
                      placeholder="Name of testing laboratory" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Compounds Tested</label>
                    <div className="lab-compound-grid">
                      {LAB_COMPOUNDS.map(c => (
                        <label key={c} className={`lab-compound-check${labCompounds.has(c) ? ' checked' : ''}`}>
                          <input type="checkbox" checked={labCompounds.has(c)} onChange={() => toggleCompound(c)} />
                          {c}
                        </label>
                      ))}
                    </div>
                  </div>
                  {labCompounds.size > 0 && (
                    <div className="form-group">
                      <label className="form-label">Results</label>
                      <div className="lab-results-inputs">
                        {[...labCompounds].map(c => (
                          <div key={c} className="lab-result-row">
                            <span className="lab-result-name">{c}</span>
                            <input
                              className="form-input lab-result-value"
                              type="number" step="any" min="0"
                              placeholder="value"
                              value={labResults[c]?.value || ''}
                              onChange={e => setResult(c, 'value', e.target.value)}
                            />
                            <select
                              className="form-select lab-result-unit"
                              value={labResults[c]?.unit || 'ppb'}
                              onChange={e => setResult(c, 'unit', e.target.value)}
                            >
                              <option value="ppb">ppb</option>
                              <option value="ppm">ppm</option>
                              <option value="mg/L">mg/L</option>
                              <option value="cfu/100mL">cfu/100mL</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Lab Report PDF</label>
                    <input type="file" accept="application/pdf,.pdf" className="form-input"
                      onChange={e => setLabReportFile(e.target.files[0] || null)} />
                    {labReportFile && <p style={{ fontSize: '.77rem', color: 'var(--muted)', marginTop: '.2rem' }}>{labReportFile.name}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

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
      <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '.75rem' }}>
        Use these sources to find records to submit. The AI analyzes patterns across everything the community submits.
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
function LandDevelopmentDashboard({ dashboard, onRequireAuth, highlightedIds, isMobile }) {
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
  const [viewMode,        setViewMode]        = useState('list');

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
      <HowThisWorks dashboardId="land_development" />
      <div className="watch-dashboard-header">
        <div className="watch-dashboard-title-row">
          <span className="watch-dashboard-icon">{dashboard.icon}</span>
          <h2 className="watch-dashboard-title">{dashboard.label}</h2>
        </div>
        <p className="watch-dashboard-desc">{dashboard.description}</p>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
          <div className="watch-view-toggle">
            <button className={`watch-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')}>☰ List</button>
            <button className={`watch-view-btn${viewMode === 'map'  ? ' active' : ''}`} onClick={() => setViewMode('map')}>🗺 Map</button>
          </div>
        </div>
      </div>

      {viewMode === 'map' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <WatchMap
            reports={watchReports}
            dashboard="land_development"
            height={isMobile ? 'calc(100vh - 220px)' : '480px'}
          />
        </div>
      )}

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
  const [viewMode,  setViewMode]  = useState('list');

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
        <div className="watch-view-toggle">
          <button className={`watch-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')}>☰ List</button>
          <button className={`watch-view-btn${viewMode === 'map'  ? ' active' : ''}`} onClick={() => setViewMode('map')}>🗺 Map</button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <AnomalyMap anomalies={anomalies} height="520px" />
      ) : unreviewed.length === 0 && reviewed.length === 0 ? (
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

// ══════════════════════════════════════════════════════════════════════════════
// ATMOSPHERIC OBSERVATIONS DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

const ATMOS_TYPE_LABELS = {
  persistent_contrail:     'Persistent Contrail',
  grid_pattern:            'Grid Pattern',
  low_altitude_trail:      'Low Altitude Trail',
  no_corresponding_flight: 'No Corresponding Flight',
  unusual_spray_pattern:   'Unusual Spray Pattern',
  other:                   'Other',
};

const CLASSIFICATION_STYLES = {
  explained:    { color: '#15803d', bg: '#dcfce7', border: '#16a34a44', label: 'EXPLAINED' },
  partial:      { color: '#854d0e', bg: '#fef9c3', border: '#ca8a0444', label: 'PARTIAL' },
  unexplained:  { color: '#c2410c', bg: '#fff7ed', border: '#f9731644', label: 'UNEXPLAINED' },
  unidentified: { color: '#991b1b', bg: '#fee2e2', border: '#dc262644', label: 'UNIDENTIFIED' },
  pending:      { color: '#6b7280', bg: '#f3f4f6', border: '#9ca3af44', label: 'PENDING' },
};

function ClassificationBadge({ classification, sources }) {
  const s = CLASSIFICATION_STYLES[classification] || CLASSIFICATION_STYLES.pending;
  const src = sources ? (typeof sources === 'string' ? JSON.parse(sources) : sources) : null;
  const showOpenSky = src?.opensky_queried === true;
  const showFli     = src?.fli_queried === true;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', flexWrap: 'wrap' }}>
      <span
        className={classification === 'unidentified' ? 'atmos-badge-unidentified' : undefined}
        style={{
          fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
          padding: '.12rem .5rem', borderRadius: 99, background: s.bg, color: s.color,
          border: `1px solid ${s.border}`, whiteSpace: 'nowrap',
        }}
      >
        {s.label}
      </span>
      {showOpenSky && (
        <span style={{
          fontSize: '.6rem', fontWeight: 600, padding: '.08rem .38rem', borderRadius: 99,
          background: 'rgba(0,180,255,0.10)', color: '#38bdf8',
          border: '1px solid rgba(0,180,255,0.25)', whiteSpace: 'nowrap', letterSpacing: '.04em',
        }}>OpenSky</span>
      )}
      {showFli && (
        <span style={{
          fontSize: '.6rem', fontWeight: 600, padding: '.08rem .38rem', borderRadius: 99,
          background: 'rgba(168,85,247,0.10)', color: '#c084fc',
          border: '1px solid rgba(168,85,247,0.25)', whiteSpace: 'nowrap', letterSpacing: '.04em',
        }}>Fli</span>
      )}
    </span>
  );
}

function DriftZonesDisplay({ zones }) {
  if (!zones?.length) return null;
  const bearingToCardinal = b => {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(b / 22.5) % 16];
  };
  return (
    <div className="atmos-drift-zones">
      <div className="atmos-drift-title">🌬 Downwind Collection Zones</div>
      <div className="atmos-drift-list">
        {zones.map(z => (
          <div key={z.miles} className="atmos-drift-item">
            <span className="atmos-drift-dist">{z.miles} mi</span>
            <span className="atmos-drift-dir">{bearingToCardinal(z.bearing)}</span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${z.lat},${z.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="atmos-drift-coords"
            >
              {z.lat.toFixed(4)}°N, {Math.abs(z.lng).toFixed(4)}°W ↗
            </a>
          </div>
        ))}
      </div>
      <p className="atmos-drift-note">Soil and rainwater samples collected in these zones can be linked to this observation.</p>
    </div>
  );
}

function AtmosphericObsCard({ obs, highlighted, isAdmin, token, onDeleted }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(obs.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const typeLabel  = ATMOS_TYPE_LABELS[obs.report_type] || obs.report_type;
  const driftZones = obs.drift_zones            ? (typeof obs.drift_zones            === 'string' ? JSON.parse(obs.drift_zones)            : obs.drift_zones)            : null;
  const weather    = obs.weather_data           ? (typeof obs.weather_data           === 'string' ? JSON.parse(obs.weather_data)           : obs.weather_data)           : null;
  const flights    = obs.matched_flights        ? (typeof obs.matched_flights        === 'string' ? JSON.parse(obs.matched_flights)        : obs.matched_flights)        : null;
  const sources    = obs.classification_sources ? (typeof obs.classification_sources === 'string' ? JSON.parse(obs.classification_sources) : obs.classification_sources) : null;

  return (
    <div id={`atmos-${obs.id}`} className={`watch-report-card${highlighted ? ' watch-report-highlighted' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.35rem' }}>
        <ClassificationBadge classification={obs.classification} sources={sources} />
        <SeverityBadge severity={obs.severity} />
        <span style={{ fontSize: '.72rem', padding: '.12rem .45rem', borderRadius: 99, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>{typeLabel}</span>
        <span style={{ fontSize: '.72rem', color: 'var(--muted)', marginLeft: 'auto' }}>{date}</span>
      </div>
      <p className="watch-report-title">{obs.title}</p>
      <div className="watch-report-meta">
        <span>by {obs.username}</span>
        {obs.location_label && <><span className="meta-sep">·</span><span>📍 {obs.location_label}</span></>}
        {obs.estimated_altitude && <><span className="meta-sep">·</span><span>Alt: {obs.estimated_altitude}</span></>}
        {obs.observation_duration_min && <><span className="meta-sep">·</span><span>{obs.observation_duration_min} min</span></>}
        {obs.wind_direction && <><span className="meta-sep">·</span><span>Wind from {obs.wind_direction}</span></>}
        {obs.weather_conditions && <><span className="meta-sep">·</span><span>{obs.weather_conditions.replace('_',' ')}</span></>}
      </div>
      {obs.description && <p className="watch-report-body">{obs.description}</p>}
      {obs.photo_urls?.length > 0 && (
        <div className="watch-report-photos">
          {obs.photo_urls.map((u,i) => <img key={i} src={u} alt="" className="watch-report-photo" />)}
        </div>
      )}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ fontSize: '.78rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', padding: '.25rem 0', fontFamily: 'inherit' }}
      >
        {expanded ? '▲ Hide details' : '▼ Show flight data & drift zones'}
      </button>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '.65rem', marginTop: '.25rem', display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
          <div className="atmos-crossref">
            <div className="atmos-crossref-label">Flight Cross-Reference</div>
            {obs.classification === 'pending' && <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: 0 }}>Classification pending — query runs immediately on submission. GPS coordinates required for flight matching.</p>}
            {obs.classification !== 'pending' && (
              <>
                {/* OpenSky real-time block */}
                <div style={{ marginBottom: '.5rem' }}>
                  <span style={{ fontSize: '.68rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '.05em' }}>OpenSky Network — Real-time</span>
                  {flights && flights.length > 0 ? (
                    <div style={{ fontSize: '.8rem', color: 'var(--text)', marginTop: '.25rem' }}>
                      <p style={{ margin: '0 0 .3rem' }}>{flights.length} flight{flights.length !== 1?'s':''} detected in area (50 mi radius):</p>
                      {flights.slice(0,4).map((f,i) => (
                        <div key={i} style={{ padding: '.2rem .5rem', background: 'var(--surface)', borderRadius: 4, marginBottom: '.2rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600 }}>{f.callsign || f.icao24}</span>
                          <span style={{ color: 'var(--muted)' }}>{f.origin}</span>
                          {f.altitude_m && <span>{Math.round(f.altitude_m * 3.281)} ft</span>}
                          {f.heading && <span>Hdg {Math.round(f.heading)}°</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: '.2rem 0 0' }}>
                      {sources?.opensky_queried === false ? 'OpenSky unavailable at time of classification.' : 'No registered flights found in area (50-mile radius).'}
                    </p>
                  )}
                </div>

                {/* Fli scheduled routes block */}
                {sources?.fli_queried && (
                  <div style={{ marginBottom: '.35rem' }}>
                    <span style={{ fontSize: '.68rem', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      Fli (Google Flights) — Scheduled Routes
                    </span>
                    {sources.fli_routes_found ? (
                      <p style={{ fontSize: '.8rem', color: 'var(--text)', margin: '.2rem 0 0' }}>
                        {sources.fli_route_count} scheduled commercial route{sources.fli_route_count !== 1 ? 's' : ''} found between{' '}
                        <strong>{sources.fli_airports_checked?.[0]}</strong> and{' '}
                        <strong>{sources.fli_airports_checked?.[1]}</strong> today
                        {sources.fli_note && <span style={{ color: 'var(--muted)' }}> — {sources.fli_note}</span>}
                      </p>
                    ) : sources.fli_routes_found === false ? (
                      <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: '.2rem 0 0' }}>
                        No scheduled commercial routes found between{' '}
                        {sources.fli_airports_checked?.[0]} and {sources.fli_airports_checked?.[1]}.
                        {sources.fli_note && ` ${sources.fli_note}`}
                      </p>
                    ) : (
                      <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: '.2rem 0 0' }}>Fli query unavailable.</p>
                    )}
                  </div>
                )}

                {weather && (
                  <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: '.35rem 0 0', lineHeight: 1.45 }}>
                    NOAA — {weather.station}: Humidity {weather.humidity_pct !== null ? `${Math.round(weather.humidity_pct)}%` : 'unavailable'}{weather.temp_c !== null ? `, ${Math.round(weather.temp_c)}°C` : ''}
                    {weather.description ? ` — ${weather.description}` : ''}
                    {weather.humidity_pct !== null && obs.classification === 'explained'   && ' (≥60% humidity supports persistent contrail formation)'}
                    {weather.humidity_pct !== null && obs.classification === 'unexplained' && ' (<40% humidity — persistent contrails not expected)'}
                  </p>
                )}
              </>
            )}
          </div>
          {driftZones && <DriftZonesDisplay zones={driftZones} />}
          {obs.checked_flight_tracker && obs.flight_tracking_result && obs.flight_tracking_result !== 'did_not_check' && (
            <div style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
              Observer checked flight tracker: <strong style={{ color: 'var(--text)' }}>{obs.flight_tracking_result.replace(/_/g,' ')}</strong>
            </div>
          )}
        </div>
      )}
      {isAdmin && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '.5rem', marginTop: '.35rem', display: 'flex', gap: '.4rem' }}>
          <button className="btn-xs btn-danger"
            onClick={async () => { if (confirm('Delete this observation?')) { await api.deleteAtmosphericObservation(obs.id, token); onDeleted(obs.id); } }}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function SubmitAtmosphericObsModal({ token, onClose, onCreated }) {
  const [form, setForm] = useState({ title:'', description:'', location_label:'', location_lat:'', location_lng:'', severity:'moderate', report_type:'persistent_contrail', observation_duration_min:'', estimated_altitude:'', wind_direction:'', wind_speed_estimate:'', weather_conditions:'', checked_flight_tracker:false, flight_tracking_result:'did_not_check', source_url:'' });
  const [photos, setPhotos] = useState([]);
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault(); setErr('');
    if (!form.title.trim()) return setErr('Title is required');
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => { if (v !== '' && v !== null) fd.append(k, String(v)); });
      photos.forEach(f => fd.append('photos', f));
      const created = await api.submitAtmosphericObservation(fd, token);
      onCreated(created);
    } catch(e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Submit Atmospheric Observation</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="Brief description of what you observed" value={form.title} onChange={set('title')} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Observation Type *</label>
                <select className="form-input" value={form.report_type} onChange={set('report_type')}>
                  {Object.entries(ATMOS_TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Severity *</label>
                <select className="form-input" value={form.severity} onChange={set('severity')}>
                  {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} placeholder="What did you see? Duration, direction, any other details..." value={form.description} onChange={set('description')} />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" placeholder="Neighborhood, street, or landmark" value={form.location_label} onChange={set('location_label')} />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.3rem' }}>
                <label className="form-label" style={{ margin: 0 }}>GPS Coordinates</label>
                <GpsButton onCapture={(lat, lng) => setForm(f => ({ ...f, location_lat: lat, location_lng: lng }))} />
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <input className="form-input" type="number" step="any" placeholder="Latitude (34.7304)" value={form.location_lat} onChange={set('location_lat')} />
                <input className="form-input" type="number" step="any" placeholder="Longitude (-86.5861)" value={form.location_lng} onChange={set('location_lng')} />
              </div>
              {form.location_lat && form.location_lng ? (
                <p style={{ fontSize: '.74rem', color: '#15803d', margin: '.2rem 0 0' }}>
                  ✓ {parseFloat(form.location_lat).toFixed(5)}°N, {Math.abs(parseFloat(form.location_lng)).toFixed(5)}°W — flight cross-reference will run automatically
                </p>
              ) : (
                <p style={{ fontSize: '.75rem', color: '#c2410c', margin: '.2rem 0 0', padding: '.3rem .5rem', background: '#fff7ed', borderRadius: 4, lineHeight: 1.45 }}>
                  ⚠ Precise location required for flight cross-reference — use the location button or enter coordinates manually.
                </p>
              )}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <input className="form-input" type="number" placeholder="e.g. 45" value={form.observation_duration_min} onChange={set('observation_duration_min')} />
              </div>
              <div className="form-group">
                <label className="form-label">Estimated Altitude</label>
                <select className="form-input" value={form.estimated_altitude} onChange={set('estimated_altitude')}>
                  <option value="">Unknown</option>
                  <option value="low">Low (&lt;10,000 ft)</option>
                  <option value="medium">Medium (10,000–25,000 ft)</option>
                  <option value="high">High (&gt;25,000 ft)</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Wind Direction (from)</label>
                <select className="form-input" value={form.wind_direction} onChange={set('wind_direction')}>
                  <option value="">Unknown</option>
                  {['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Wind Speed Estimate</label>
                <input className="form-input" placeholder="e.g. calm, 5-10 mph" value={form.wind_speed_estimate} onChange={set('wind_speed_estimate')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Weather Conditions</label>
              <select className="form-input" value={form.weather_conditions} onChange={set('weather_conditions')}>
                <option value="">Not specified</option>
                <option value="clear">Clear</option>
                <option value="partly_cloudy">Partly Cloudy</option>
                <option value="overcast">Overcast</option>
                <option value="humid">Humid / Hazy</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', fontSize: '.87rem' }}>
              <input type="checkbox" checked={form.checked_flight_tracker} onChange={set('checked_flight_tracker')} style={{ accentColor: 'var(--green)' }} />
              I checked a flight tracking app (FlightAware, Flightradar24, etc.)
            </label>
            {form.checked_flight_tracker && (
              <div className="form-group">
                <label className="form-label">Flight Tracking Result</label>
                <select className="form-input" value={form.flight_tracking_result} onChange={set('flight_tracking_result')}>
                  <option value="matched_known_flight">Matched a known commercial flight</option>
                  <option value="no_match_found">No match found in area</option>
                  <option value="partial_match">Partial match (wrong altitude/route)</option>
                  <option value="did_not_check">Did not check</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Source URL</label>
              <input className="form-input" placeholder="Optional link to related documentation" value={form.source_url} onChange={set('source_url')} />
            </div>
            <div className="form-group">
              <label className="form-label">Photos</label>
              <input type="file" accept="image/*" multiple className="form-input" onChange={e => setPhotos([...e.target.files])} />
              <p className="img-crop-hint">Any size, landscape preferred, min 800px wide</p>
            </div>
            {err && <p className="form-error">{err}</p>}
            <button className="btn btn-primary btn-full" disabled={busy}>{busy ? '…' : 'Submit Observation'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function WeatherModPermitsPanel({ isAdmin, token }) {
  const [permits,  setPermits]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [form, setForm] = useState({ operator:'', permit_type:'', area_description:'', active_from:'', active_to:'', compounds_used:'', source_url:'', notes:'' });
  const [busy, setBusy] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getAtmosphericPermits().then(setPermits).catch(()=>setPermits([])).finally(()=>setLoading(false));
  }, []);

  async function savePermit(e) {
    e.preventDefault(); setBusy(true);
    try {
      if (editId) { const p = await api.updateAtmosphericPermit(editId, form, token); setPermits(ps => ps.map(x => x.id===editId ? p : x)); }
      else        { const p = await api.createAtmosphericPermit(form, token);          setPermits(ps => [p, ...ps]); }
      setShowForm(false); setEditId(null);
      setForm({ operator:'', permit_type:'', area_description:'', active_from:'', active_to:'', compounds_used:'', source_url:'', notes:'' });
    } catch(e) { alert(e.message); } finally { setBusy(false); }
  }

  const activePermits = permits.filter(p => !p.active_to || p.active_to >= today);
  const pastPermits   = permits.filter(p => p.active_to && p.active_to < today);

  if (loading) return <div className="spinner" style={{ margin: '1rem auto' }} />;

  return (
    <div className="atmos-section">
      <div className="atmos-section-header">
        <div>
          <h3 className="atmos-section-title">☁ Weather Modification Activity</h3>
          <p className="atmos-section-sub">Active permits in Alabama and Tennessee Valley. Check whether a permitted operation was active when you made your observation.</p>
        </div>
        {isAdmin && !showForm && <button className="btn btn-sm btn-primary" onClick={() => { setEditId(null); setShowForm(true); }}>+ Add Permit</button>}
      </div>

      {showForm && (
        <form onSubmit={savePermit} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Operator *</label><input className="form-input" required value={form.operator} onChange={set('operator')} placeholder="Agency or company name" /></div>
            <div className="form-group"><label className="form-label">Permit Type *</label><input className="form-input" required value={form.permit_type} onChange={set('permit_type')} placeholder="e.g. cloud seeding" /></div>
          </div>
          <div className="form-group"><label className="form-label">Area Description *</label><input className="form-input" required value={form.area_description} onChange={set('area_description')} placeholder="Geographic coverage" /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Active From</label><input className="form-input" type="date" value={form.active_from} onChange={set('active_from')} /></div>
            <div className="form-group"><label className="form-label">Active To</label><input className="form-input" type="date" value={form.active_to} onChange={set('active_to')} /></div>
          </div>
          <div className="form-group"><label className="form-label">Compounds Used</label><input className="form-input" value={form.compounds_used} onChange={set('compounds_used')} placeholder="e.g. silver iodide, calcium chloride" /></div>
          <div className="form-group"><label className="form-label">Source URL</label><input className="form-input" value={form.source_url} onChange={set('source_url')} /></div>
          <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={form.notes} onChange={set('notes')} /></div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn btn-sm btn-primary" disabled={busy}>{busy ? '…' : editId ? 'Save Changes' : 'Add Permit'}</button>
            <button type="button" className="btn btn-sm" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
          </div>
        </form>
      )}

      {activePermits.length === 0 ? (
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', padding: '.5rem 0' }}>No active weather modification permits on record. Admins can add permits found via NOAA Weather Modification Reporting Program or TVA public records.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '.75rem' }}>
          {activePermits.map(p => (
            <div key={p.id} className="atmos-permit-item">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
                <div><span style={{ fontWeight: 700, fontSize: '.9rem' }}>{p.operator}</span><span style={{ fontSize: '.75rem', color: 'var(--muted)', marginLeft: '.5rem' }}>{p.permit_type}</span></div>
                <span style={{ fontSize: '.7rem', padding: '.1rem .4rem', borderRadius: 99, background: '#dcfce7', color: '#15803d', border: '1px solid #16a34a44', fontWeight: 700 }}>ACTIVE</span>
              </div>
              <p style={{ fontSize: '.82rem', margin: '.2rem 0', color: 'var(--text)' }}>{p.area_description}</p>
              {p.compounds_used && <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: '.1rem 0' }}>Compounds: {p.compounds_used}</p>}
              <div style={{ fontSize: '.74rem', color: 'var(--muted)', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                {p.active_from && <span>From: {new Date(p.active_from).toLocaleDateString()}</span>}
                {p.active_to   && <span>To: {new Date(p.active_to).toLocaleDateString()}</span>}
                {p.source_url  && <a href={p.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)' }}>Source ↗</a>}
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '.4rem', marginTop: '.35rem' }}>
                  <button className="btn-xs" onClick={() => { setForm({ operator:p.operator, permit_type:p.permit_type, area_description:p.area_description, active_from:p.active_from||'', active_to:p.active_to||'', compounds_used:p.compounds_used||'', source_url:p.source_url||'', notes:p.notes||'' }); setEditId(p.id); setShowForm(true); }}>Edit</button>
                  <button className="btn-xs btn-danger" onClick={async () => { if(confirm('Delete?')) { await api.deleteAtmosphericPermit(p.id, token); setPermits(ps => ps.filter(x=>x.id!==p.id)); } }}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pastPermits.length > 0 && (
        <details style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
          <summary style={{ cursor: 'pointer', marginBottom: '.5rem' }}>Past permits ({pastPermits.length})</summary>
          {pastPermits.map(p => (
            <div key={p.id} style={{ padding: '.4rem .6rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '.5rem' }}>
              <span>{p.operator} — {p.permit_type} — {p.area_description}</span>
              {isAdmin && <button className="btn-xs btn-danger" onClick={async () => { await api.deleteAtmosphericPermit(p.id, token); setPermits(ps=>ps.filter(x=>x.id!==p.id)); }}>×</button>}
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

const COMPOUND_LABELS  = { aluminum_ppb:'Al', barium_ppb:'Ba', strontium_ppb:'Sr', silver_ppb:'Ag', tio2_ppb:'TiO₂', pfas_ppb:'PFAS' };
const COMPOUND_THRESH  = { aluminum_ppb:50, barium_ppb:2, strontium_ppb:5, silver_ppb:0.5, tio2_ppb:10, pfas_ppb:0.1 };

function SoilSamplesPanel({ isAdmin, token, onRequireAuth, currentUser }) {
  const [samples,  setSamples]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState('');
  const [labPhoto, setLabPhoto] = useState(null);
  const [form, setForm] = useState({ sample_type:'rainwater', collection_date:'', location_lat:'', location_lng:'', location_label:'', distance_from_obs_miles:'', direction_from_obs:'', linked_observation_id:'', lab_name:'', lab_cert_number:'', aluminum_ppb:'', barium_ppb:'', strontium_ppb:'', silver_ppb:'', tio2_ppb:'', pfas_ppb:'' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => { api.getSoilSamples().then(setSamples).catch(()=>setSamples([])).finally(()=>setLoading(false)); }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setErr('');
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => { if (v !== '') fd.append(k, v); });
      if (labPhoto) fd.append('lab_photo', labPhoto);
      const created = await api.submitSoilSample(fd, token);
      setSamples(s => [created, ...s]);
      setShowForm(false);
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="atmos-section">
      <div className="atmos-section-header">
        <div>
          <h3 className="atmos-section-title">🧪 Soil & Rainwater Testing</h3>
          <p className="atmos-section-sub">Community lab results for aluminum, barium, strontium, silver, TiO₂, and PFAS. Each submission is cross-referenced with EPA TRI industrial sources. AI compound origin analysis runs automatically on elevated readings.</p>
        </div>
        <button className="btn btn-sm btn-primary" onClick={() => { if (!currentUser) { onRequireAuth?.(); return; } setShowForm(true); }}>+ Submit Lab Results</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header"><h2 className="modal-title">Submit Lab Results</h2><button className="modal-close" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Sample Type *</label>
                    <select className="form-input" value={form.sample_type} onChange={set('sample_type')}>
                      <option value="rainwater">Rainwater</option>
                      <option value="soil_surface">Soil — Surface (0–2 in)</option>
                      <option value="soil_deep">Soil — Deep (6+ in)</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Collection Date</label><input className="form-input" type="date" value={form.collection_date} onChange={set('collection_date')} /></div>
                </div>
                <div className="form-group"><label className="form-label">Location</label><input className="form-input" placeholder="Neighborhood, address, or landmark" value={form.location_label} onChange={set('location_label')} /></div>
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.3rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>GPS Coordinates</label>
                    <GpsButton onCapture={(lat, lng) => setForm(f => ({ ...f, location_lat: lat, location_lng: lng }))} />
                  </div>
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <input className="form-input" type="number" step="any" placeholder="Latitude (34.7304)" value={form.location_lat} onChange={set('location_lat')} />
                    <input className="form-input" type="number" step="any" placeholder="Longitude (-86.5861)" value={form.location_lng} onChange={set('location_lng')} />
                  </div>
                  {form.location_lat && form.location_lng && (
                    <p style={{ fontSize: '.74rem', color: '#15803d', margin: '.2rem 0 0' }}>
                      ✓ {parseFloat(form.location_lat).toFixed(5)}°N, {Math.abs(parseFloat(form.location_lng)).toFixed(5)}°W
                    </p>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Distance from obs (mi)</label><input className="form-input" type="number" step="any" value={form.distance_from_obs_miles} onChange={set('distance_from_obs_miles')} /></div>
                  <div className="form-group"><label className="form-label">Direction from obs</label>
                    <select className="form-input" value={form.direction_from_obs} onChange={set('direction_from_obs')}>
                      <option value="">Unknown</option>
                      {['N','NE','E','SE','S','SW','W','NW'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Lab Name</label><input className="form-input" value={form.lab_name} onChange={set('lab_name')} /></div>
                  <div className="form-group"><label className="form-label">Lab Cert #</label><input className="form-input" value={form.lab_cert_number} onChange={set('lab_cert_number')} /></div>
                </div>
                <p style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Compound Results (ppb)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                  {Object.entries(COMPOUND_LABELS).map(([k,l]) => (
                    <div key={k} className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">{l} (ppb)</label>
                      <input className="form-input" type="number" step="any" placeholder="0.00" value={form[k]} onChange={set(k)} />
                    </div>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label">Lab Report Photo *</label>
                  <input type="file" accept="image/*,application/pdf" className="form-input" onChange={e => setLabPhoto(e.target.files[0])} />
                  <p style={{ fontSize: '.74rem', color: 'var(--muted)', margin: '.2rem 0 0' }}>Photo or PDF scan of lab report required for credibility</p>
                </div>
                {err && <p className="form-error">{err}</p>}
                <button className="btn btn-primary btn-full" disabled={busy}>{busy ? '…' : 'Submit Lab Results'}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="spinner" style={{ margin: '1rem auto' }} /> : samples.length === 0 ? (
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', padding: '.5rem 0' }}>No lab results submitted yet. If you have soil or rainwater test results showing elevated aluminum, barium, strontium, silver, TiO₂, or PFAS, submit them here.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          {samples.map(s => {
            const assessment = s.ai_assessment ? (typeof s.ai_assessment === 'string' ? JSON.parse(s.ai_assessment) : s.ai_assessment) : null;
            return (
              <div key={s.id} className="atmos-sample-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.3rem' }}>
                  <span style={{ fontSize: '.75rem', padding: '.1rem .4rem', borderRadius: 99, background: 'var(--surface)', border: '1px solid var(--border)', fontWeight: 600 }}>{s.sample_type.replace(/_/g,' ')}</span>
                  {Object.keys(COMPOUND_LABELS).map(k => s[k] > COMPOUND_THRESH[k] && (
                    <span key={k} style={{ fontSize: '.66rem', padding: '.08rem .35rem', borderRadius: 99, background: '#fee2e2', color: '#991b1b', border: '1px solid #dc262644', fontWeight: 700 }}>{COMPOUND_LABELS[k]} ↑</span>
                  ))}
                  <span style={{ fontSize: '.72rem', color: 'var(--muted)', marginLeft: 'auto' }}>{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: '.8rem', color: 'var(--text)', marginBottom: '.25rem' }}>
                  {s.location_label && <span>📍 {s.location_label}</span>}
                  {s.lab_name && <span style={{ color: 'var(--muted)', marginLeft: '.5rem' }}> — {s.lab_name}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px,1fr))', gap: '.3rem', marginBottom: '.35rem' }}>
                  {Object.entries(COMPOUND_LABELS).map(([k,l]) => s[k] != null && s[k] !== '' && (
                    <div key={k} style={{ fontSize: '.75rem', padding: '.2rem .4rem', background: s[k] > COMPOUND_THRESH[k] ? '#fee2e2' : 'var(--surface)', borderRadius: 4, border: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 700, color: s[k] > COMPOUND_THRESH[k] ? '#991b1b' : 'var(--muted)' }}>{l}</span>
                      <span style={{ color: 'var(--text)', marginLeft: '.3rem' }}>{s[k]} ppb</span>
                    </div>
                  ))}
                </div>
                {s.photo_url && <a href={s.photo_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.75rem', color: 'var(--green)' }}>View lab report ↗</a>}
                {assessment && (
                  <div style={{ marginTop: '.5rem', padding: '.6rem .75rem', background: '#fffbeb', border: '1px solid #d97706', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#92400e', marginBottom: '.25rem' }}>AI Origin Assessment — {s.ai_confidence} confidence</div>
                    <p style={{ fontSize: '.8rem', color: 'var(--text)', margin: '0 0 .35rem', lineHeight: 1.5 }}>{assessment.assessment}</p>
                    {assessment.flags?.geoengineering_signature && <p style={{ fontSize: '.75rem', color: '#991b1b', fontWeight: 600, margin: 0 }}>⚠ Compound signature matches proposed geoengineering materials (Al+Ba+Sr) — no confirmed industrial source identified</p>}
                    {assessment.flags?.known_industrial_source_nearby && <p style={{ fontSize: '.75rem', color: '#92400e', margin: '.1rem 0 0' }}>Known industrial TRI source nearby — see EPA data for details</p>}
                  </div>
                )}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '.4rem', marginTop: '.4rem', borderTop: '1px solid var(--border)', paddingTop: '.4rem' }}>
                    <button className="btn-xs" onClick={async () => { await api.analyzeSoilSample(s.id, token); alert('AI analysis triggered — refresh in a moment'); }}>Re-analyze</button>
                    <button className="btn-xs btn-danger" onClick={async () => { if(confirm('Delete?')) { await api.deleteSoilSample(s.id, token); setSamples(prev=>prev.filter(x=>x.id!==s.id)); } }}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MilitaryAirspacePanel({ isAdmin, token }) {
  const [foiaItems, setFoiaItems] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editId,    setEditId]    = useState(null);
  const [editForm,  setEditForm]  = useState({});

  useEffect(() => { api.getAtmosphericFoia().then(setFoiaItems).catch(()=>setFoiaItems([])).finally(()=>setLoading(false)); }, []);

  const STATUS_S = {
    pending:      { color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
    acknowledged: { color: '#1e40af', bg: '#dbeafe', border: '#3b82f6' },
    partial:      { color: '#92400e', bg: '#fef3c7', border: '#d97706' },
    fulfilled:    { color: '#15803d', bg: '#dcfce7', border: '#16a34a' },
    denied:       { color: '#991b1b', bg: '#fee2e2', border: '#dc2626' },
    appealing:    { color: '#c2410c', bg: '#fff7ed', border: '#f97316' },
  };

  async function saveEdit(id) {
    try {
      const updated = await api.updateAtmosphericFoia(id, editForm, token);
      setFoiaItems(items => items.map(x => x.id === id ? updated : x));
      setEditId(null);
    } catch(e) { alert(e.message); }
  }

  return (
    <div className="atmos-section atmos-military-panel">
      <h3 className="atmos-section-title">🪖 Military Airspace Documentation Gap</h3>
      <div className="atmos-military-notice">
        <p><strong>Known limitation:</strong> Redstone Arsenal flight operations are not fully reflected in public ADS-B flight tracking databases. Observations in the Redstone Arsenal corridor cannot be fully cross-referenced with available public flight data.</p>
        <p>Military aircraft operating under IFR or special authorizations may not appear in OpenSky Network or FlightAware. Observations classified as UNIDENTIFIED in this corridor should be interpreted with this limitation in mind.</p>
      </div>
      <h4 style={{ fontSize: '.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', margin: '.85rem 0 .5rem' }}>Records Requests — Airspace Transparency</h4>
      {loading ? <div className="spinner" style={{ margin: '1rem auto' }} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {foiaItems.map(item => {
            const s = STATUS_S[item.status] || STATUS_S.pending;
            const isEditing = editId === item.id;
            return (
              <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '.75rem .9rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--text)', flex: 1 }}>{item.target_agency}</span>
                  <span style={{ fontSize: '.68rem', padding: '.1rem .4rem', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}44`, fontWeight: 700, whiteSpace: 'nowrap' }}>{item.status.toUpperCase()}</span>
                </div>
                <p style={{ fontSize: '.82rem', color: 'var(--text)', margin: '.2rem 0 .25rem', lineHeight: 1.5 }}>{item.records_sought}</p>
                <div style={{ fontSize: '.75rem', color: 'var(--muted)', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  {item.submitted_date && <span>Submitted: {new Date(item.submitted_date).toLocaleDateString()}</span>}
                  {item.response_due   && <span>Due: {new Date(item.response_due).toLocaleDateString()}</span>}
                </div>
                {item.notes && <p style={{ fontSize: '.76rem', color: 'var(--muted)', fontStyle: 'italic', margin: '.25rem 0 0', lineHeight: 1.4 }}>{item.notes}</p>}
                {isAdmin && !isEditing && (
                  <button className="btn-xs" style={{ marginTop: '.4rem' }} onClick={() => { setEditId(item.id); setEditForm({ status: item.status, submitted_date: item.submitted_date||'', response_due: item.response_due||'', notes: item.notes||'' }); }}>Update Status</button>
                )}
                {isAdmin && isEditing && (
                  <div style={{ marginTop: '.5rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                    <div className="form-row" style={{ marginBottom: 0 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Status</label>
                        <select className="form-input" value={editForm.status} onChange={e => setEditForm(f=>({...f, status:e.target.value}))}>
                          {Object.keys(STATUS_S).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Submitted Date</label>
                        <input className="form-input" type="date" value={editForm.submitted_date} onChange={e => setEditForm(f=>({...f,submitted_date:e.target.value}))} />
                      </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={editForm.notes} onChange={e => setEditForm(f=>({...f,notes:e.target.value}))} /></div>
                    <div style={{ display: 'flex', gap: '.4rem' }}>
                      <button className="btn btn-sm btn-primary" onClick={() => saveEdit(item.id)}>Save</button>
                      <button className="btn btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AtmosphericDashboard({ dashboard, onRequireAuth, highlightedIds }) {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [observations, setObservations] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [filterClass,  setFilterClass]  = useState('');
  const [viewMode,     setViewMode]     = useState('list');

  useEffect(() => {
    const params = {};
    if (filterClass) params.classification = filterClass;
    setLoading(true);
    api.getAtmosphericObservations(params)
      .then(setObservations)
      .catch(() => setObservations([]))
      .finally(() => setLoading(false));
  }, [filterClass]);

  useEffect(() => {
    if (loading || !highlightedIds?.size) return;
    const first = observations.find(o => highlightedIds.has(o.id));
    if (!first) return;
    setTimeout(() => document.getElementById(`atmos-${first.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
  }, [loading]);

  const classFilters = [
    { value: '',             label: 'All' },
    { value: 'unidentified', label: 'Unidentified' },
    { value: 'unexplained',  label: 'Unexplained' },
    { value: 'partial',      label: 'Partial' },
    { value: 'explained',    label: 'Explained' },
    { value: 'pending',      label: 'Pending' },
  ];

  return (
    <>
      <HowThisWorks dashboardId="atmospheric_observations" />
      <div className="watch-dashboard-header">
        <div className="watch-dashboard-title-row">
          <span className="watch-dashboard-icon">{dashboard.icon}</span>
          <h2 className="watch-dashboard-title">{dashboard.label}</h2>
        </div>
        <p className="watch-dashboard-desc">{dashboard.description}</p>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => { if (!user) { onRequireAuth?.(); return; } setShowForm(true); }}>+ Submit Observation</button>
          <div className="watch-view-toggle">
            <button className={`watch-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')}>☰ List</button>
            <button className={`watch-view-btn${viewMode === 'map'  ? ' active' : ''}`} onClick={() => setViewMode('map')}>🗺 Map</button>
          </div>
          <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: 0 }}>Submissions are automatically cross-referenced with OpenSky Network flight data and NOAA weather conditions.</p>
        </div>
      </div>

      <WeatherModPermitsPanel isAdmin={isAdmin} token={token} />

      {viewMode === 'map' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <WatchMap
            reports={observations.filter(o => o.location_lat && o.location_lng)}
            dashboard="atmospheric_observations"
            height="500px"
          />
        </div>
      )}

      <div className="atmos-section">
        <div className="atmos-section-header" style={{ marginBottom: '.75rem' }}>
          <h3 className="atmos-section-title">📋 Community Observations</h3>
          <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
            {classFilters.map(f => (
              <button key={f.value} onClick={() => setFilterClass(f.value)} style={{ padding: '.25rem .6rem', fontSize: '.75rem', fontWeight: 600, borderRadius: 99, border: `1px solid ${filterClass===f.value ? 'var(--green)' : 'var(--border)'}`, background: filterClass===f.value ? 'var(--green)' : 'var(--surface)', color: filterClass===f.value ? '#fff' : 'var(--muted)', cursor: 'pointer' }}>{f.label}</button>
            ))}
          </div>
        </div>
        {loading ? <div className="spinner" style={{ margin: '1.5rem auto' }} /> :
          observations.length === 0 ? (
            <p style={{ fontSize: '.87rem', color: 'var(--muted)', padding: '1rem 0' }}>
              {filterClass ? `No ${filterClass} observations.` : 'No observations submitted yet.'}
            </p>
          ) : (
            <div className="watch-report-list">
              {observations.map(o => (
                <AtmosphericObsCard key={o.id} obs={o}
                  highlighted={!!highlightedIds?.has(o.id)}
                  isAdmin={isAdmin} token={token}
                  onDeleted={id => setObservations(prev => prev.filter(x => x.id !== id))}
                />
              ))}
            </div>
          )
        }
      </div>

      <SoilSamplesPanel isAdmin={isAdmin} token={token} onRequireAuth={onRequireAuth} currentUser={user} />
      <MilitaryAirspacePanel isAdmin={isAdmin} token={token} />

      {showForm && (
        <SubmitAtmosphericObsModal
          token={token}
          onClose={() => setShowForm(false)}
          onCreated={obs => { setObservations(prev => [obs, ...prev]); setShowForm(false); }}
        />
      )}
    </>
  );
}
