import { useState, useEffect } from 'react';
import { useAuth } from '../auth';
import api from '../api';

const DASHBOARDS = [
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    icon: '🏗️',
    description: 'Roads, bridges, utilities, public facilities, and city infrastructure conditions. Report damage, outages, closures, or neglected maintenance in Huntsville and surrounding areas.',
  },
  {
    id: 'environment',
    label: 'Environment',
    icon: '🌿',
    description: 'Air quality, pollution, illegal dumping, toxic sites, deforestation, and environmental hazards. Document what you see happening to the land, water, and air around you.',
  },
  {
    id: 'housing',
    label: 'Housing',
    icon: '🏠',
    description: 'Vacant lots, code violations, slumlords, displacement, eviction patterns, and affordable housing conditions. Track who owns what and what is being done with it.',
  },
  {
    id: 'health',
    label: 'Health',
    icon: '🏥',
    description: 'Hospital closures, clinic access, disease outbreaks, mental health service gaps, and public health concerns. Report barriers to care and community health conditions.',
  },
  {
    id: 'watershed',
    label: 'Watershed & Land',
    icon: '💧',
    description: 'Creek contamination, wetland destruction, industrial runoff, land use changes, and zoning decisions that affect water and soil. Protect the watershed that sustains the community.',
  },
  {
    id: 'food',
    label: 'Food & Agriculture',
    icon: '🌾',
    description: 'Food deserts, grocery access, community gardens, urban farming, food assistance programs, and agricultural land under threat. Map where food comes from and where it is lacking.',
  },
  {
    id: 'surveillance',
    label: 'Surveillance',
    icon: '📡',
    description: 'Camera installations, facial recognition, license plate readers, fusion centers, and other surveillance infrastructure being deployed in public spaces. Know what is watching.',
  },
  {
    id: 'civic',
    label: 'Civic',
    icon: '🏛️',
    description: 'Local government actions, policy decisions, zoning changes, public meeting notices, and civic accountability. Track what elected officials and agencies are doing.',
  },
];

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

        {/* Dashboard tabs */}
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
        </div>

        {dashboard && (
          <WatchDashboard
            key={dashboard.id}
            dashboard={dashboard}
            onRequireAuth={onRequireAuth}
          />
        )}
      </div>
    </div>
  );
}

function WatchDashboard({ dashboard, onRequireAuth }) {
  const { user, token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
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

      {/* Map placeholder */}
      <div className="watch-map-placeholder">
        <span className="watch-map-label">📍 Map View — Coming Soon</span>
        <p className="watch-map-sub">Reports will be plotted on an interactive map of Huntsville and North Alabama</p>
      </div>

      {/* Reports feed */}
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
              <WatchReportCard key={r.id} report={r} />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <WatchReportModal
          dashboard={dashboard}
          token={token}
          onClose={() => setShowForm(false)}
          onCreated={report => {
            setReports(prev => [report, ...prev]);
            setShowForm(false);
          }}
        />
      )}
    </>
  );
}

function WatchReportCard({ report }) {
  const date = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="watch-report-card">
      <div className="watch-report-card-header">
        <div>
          <p className="watch-report-title">{report.title}</p>
          <div className="watch-report-meta">
            <span>{report.username}</span>
            {report.location_label && <><span className="meta-sep">·</span><span>📍 {report.location_label}</span></>}
            <span className="meta-sep">·</span>
            <span>{date}</span>
            {report.verified && (
              <span className="watch-verified-badge">✓ Verified</span>
            )}
          </div>
        </div>
      </div>
      {report.description && (
        <p className="watch-report-body">{report.description}</p>
      )}
      {report.source_url && (
        <a className="watch-report-source" href={report.source_url} target="_blank" rel="noopener noreferrer">
          Source →
        </a>
      )}
      {Array.isArray(report.photo_urls) && report.photo_urls.length > 0 && (
        <div className="watch-report-photos">
          {report.photo_urls.map((url, i) => (
            <img
              key={i}
              src={`https://mycelium.unprecedentedtimes.org${url}`}
              alt=""
              className="watch-report-photo"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchReportModal({ dashboard, token, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [photos, setPhotos] = useState([]);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  function handlePhotos(e) {
    const files = Array.from(e.target.files);
    e.target.value = '';
    setPhotos(prev => [...prev, ...files].slice(0, 5));
  }

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) { setErr('Title is required'); return; }
    setBusy(true); setErr(null);
    try {
      const form = new FormData();
      form.append('title', title.trim());
      if (description) form.append('description', description);
      if (locationLabel) form.append('location_label', locationLabel);
      if (sourceUrl) form.append('source_url', sourceUrl);
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
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title">
            {dashboard.icon} Submit {dashboard.label} Report
          </span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" required value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief description of what you observed" />
          </div>
          <div className="form-group">
            <label className="form-label">Details</label>
            <textarea className="form-textarea" rows={4} value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what you saw, when, and any relevant context" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={locationLabel}
                onChange={e => setLocationLabel(e.target.value)}
                placeholder="e.g. North Huntsville, Highway 72" />
            </div>
            <div className="form-group">
              <label className="form-label">Source URL</label>
              <input className="form-input" type="url" value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="https://..." />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Photos (up to 5)</label>
            <input type="file" accept="image/*" multiple
              className="form-input" onChange={handlePhotos} />
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
