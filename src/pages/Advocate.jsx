import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth';
import api from '../api';

const CASE_TYPE_LABELS = {
  medical_kidnapping:       'Medical Kidnapping',
  cps_overreach:            'CPS Overreach',
  elder_abuse:              'Elder Abuse',
  psychiatric_hold_abuse:   'Psychiatric Hold Abuse',
  parental_rights_violation:'Parental Rights Violation',
  court_ordered_treatment:  'Court-Ordered Treatment',
  other:                    'Other',
};

const INSTITUTION_TYPE_LABELS = {
  hospital:    'Hospital / Medical Center',
  cps_agency:  'CPS / DCFS Agency',
  care_facility:'Care Facility',
  court:       'Court',
  other:       'Other',
};

const STATUS_LABELS = {
  documenting:   'Documenting',
  legal_action:  'Legal Action',
  resolved:      'Resolved',
  withdrawn:     'Withdrawn',
};

const STATUS_COLORS = {
  documenting:  { background: '#fff3cd', color: '#856404', border: '1px solid #ffc107' },
  legal_action: { background: '#cfe2ff', color: '#0a58ca', border: '1px solid #6ea8fe' },
  resolved:     { background: '#d1e7dd', color: '#0a3622', border: '1px solid #a3cfbb' },
  withdrawn:    { background: '#e2e3e5', color: '#41464b', border: '1px solid #c4c8cb' },
};

const ADVOCATE_TABS = ['my_cases', 'new_case', 'patterns'];

export default function Advocate({ onRequireAuth }) {
  const { user, token } = useAuth();
  const [tab, setTab] = useState('my_cases');

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Advocate</h1>
            <p className="page-subtitle">Document, track, and find support for institutional rights violations</p>
          </div>
        </div>

        <div className="advocate-privacy-notice">
          <strong>Your privacy is protected.</strong> Cases you document are visible only to you and platform administrators. They are never publicly disclosed without your explicit consent. Administrators may access case logs only when investigating documented reports of abuse or facilitating resource connections. This is stated in the Mycelium Covenant.
        </div>

        <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
          {user && (
            <>
              <button
                className={'tab-btn' + (tab === 'my_cases' ? ' active' : '')}
                onClick={() => setTab('my_cases')}
              >My Cases</button>
              <button
                className={'tab-btn' + (tab === 'new_case' ? ' active' : '')}
                onClick={() => setTab('new_case')}
              >+ Document a Case</button>
            </>
          )}
          <button
            className={'tab-btn' + (tab === 'patterns' ? ' active' : '')}
            onClick={() => setTab('patterns')}
          >Public Patterns</button>
          {!user && (
            <button className="btn btn-primary btn-sm" onClick={onRequireAuth}>
              Sign In to Document a Case
            </button>
          )}
        </div>

        {tab === 'my_cases' && user && <MyCasesPanel token={token} />}
        {tab === 'new_case' && user && <NewCaseForm token={token} onCreated={() => setTab('my_cases')} />}
        {tab === 'patterns' && <PatternsPanel />}
      </div>
    </div>
  );
}

// ── My Cases ──────────────────────────────────────────────────────────────────

function MyCasesPanel({ token }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setCases(await api.getAdvocateCases(token)); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="spinner" />;
  if (err) return <p className="error-msg">{err}</p>;
  if (cases.length === 0) return (
    <div className="advocate-empty">
      <p>You have no documented cases. Use <strong>+ Document a Case</strong> to begin.</p>
      <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: '.5rem' }}>
        Your cases are private. They will never be shared without your consent.
      </p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {cases.map(c => (
        <CaseCard key={c.id} caseData={c} token={token}
          open={openId === c.id}
          onToggle={() => setOpenId(id => id === c.id ? null : c.id)}
          onDeleted={load}
          onUpdated={load}
        />
      ))}
    </div>
  );
}

function CaseCard({ caseData: c, token, open, onToggle, onDeleted, onUpdated }) {
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tlEntry, setTlEntry] = useState({ date: '', description: '' });
  const [addingTl, setAddingTl] = useState(false);
  const [tlErr, setTlErr] = useState(null);
  const [showTlForm, setShowTlForm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const statusStyle = STATUS_COLORS[c.status] || {};

  async function loadDetail() {
    if (detail) return;
    setLoadingDetail(true);
    try { setDetail(await api.getAdvocateCase(c.id, token)); }
    catch { /* ignore */ }
    finally { setLoadingDetail(false); }
  }

  async function handleOpen() {
    onToggle();
    if (!open) loadDetail();
  }

  async function addTimeline(e) {
    e.preventDefault();
    if (!tlEntry.description.trim()) return;
    setAddingTl(true); setTlErr(null);
    try {
      const res = await api.addCaseTimeline(c.id, {
        date: tlEntry.date || undefined,
        description: tlEntry.description.trim(),
      }, token);
      setDetail(d => d ? { ...d, case: { ...d.case, timeline: res.timeline } } : d);
      setTlEntry({ date: '', description: '' });
      setShowTlForm(false);
      onUpdated();
    } catch (e) { setTlErr(e.message); }
    finally { setAddingTl(false); }
  }

  async function handleDelete() {
    if (!confirm('Delete this case? This cannot be undone.')) return;
    setDeleting(true);
    try { await api.deleteAdvocateCase(c.id, token); onDeleted(); }
    catch (e) { alert(e.message); setDeleting(false); }
  }

  return (
    <div className="advocate-case-card">
      <div className="advocate-case-header" onClick={handleOpen} style={{ cursor: 'pointer' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '1rem' }}>{c.institution_name}</strong>
            <span style={{ fontSize: '.75rem', padding: '.15rem .45rem', borderRadius: '4px', ...statusStyle }}>
              {STATUS_LABELS[c.status]}
            </span>
          </div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
            {CASE_TYPE_LABELS[c.case_type]} · {INSTITUTION_TYPE_LABELS[c.institution_type]}
            {c.location_label && ` · ${c.location_label}`}
            {c.incident_date && ` · ${c.incident_date}`}
          </div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.15rem' }}>
            {c.evidence_count > 0 && `${c.evidence_count} evidence file${c.evidence_count > 1 ? 's' : ''} · `}
            {c.timeline_entries > 0 && `${c.timeline_entries} timeline entr${c.timeline_entries > 1 ? 'ies' : 'y'} · `}
            Added {new Date(c.created_at).toLocaleDateString()}
          </div>
        </div>
        <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="advocate-case-body">
          {loadingDetail ? <div className="spinner" style={{ margin: '.5rem 0' }} /> : (
            <>
              <p style={{ marginBottom: '.75rem' }}>{c.summary}</p>

              {/* Resources */}
              {detail?.resources && (
                <div className="advocate-resources">
                  <h4 className="advocate-resources-title">Resources for {CASE_TYPE_LABELS[c.case_type]}</h4>
                  <ul className="advocate-resource-list">
                    {detail.resources.map((r, i) => (
                      <li key={i}>
                        <a href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a>
                        {r.note && <span className="advocate-resource-note"> — {r.note}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timeline */}
              <div className="advocate-timeline-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '.9rem' }}>Timeline</h4>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowTlForm(v => !v)}>
                    {showTlForm ? 'Cancel' : '+ Add Entry'}
                  </button>
                </div>

                {showTlForm && (
                  <form onSubmit={addTimeline} style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem', flexWrap: 'wrap' }}>
                    <input type="date" className="form-input" style={{ flex: '0 0 140px' }}
                      value={tlEntry.date} onChange={e => setTlEntry(f => ({ ...f, date: e.target.value }))} />
                    <input className="form-input" style={{ flex: 1, minWidth: '180px' }}
                      placeholder="Describe what happened…" value={tlEntry.description}
                      onChange={e => setTlEntry(f => ({ ...f, description: e.target.value }))} required />
                    <button className="btn btn-primary btn-sm" disabled={addingTl}>
                      {addingTl ? '…' : 'Add'}
                    </button>
                    {tlErr && <p className="form-error" style={{ width: '100%' }}>{tlErr}</p>}
                  </form>
                )}

                {detail?.case?.timeline?.length > 0 ? (
                  <ul className="advocate-timeline-list">
                    {[...detail.case.timeline].reverse().map((entry, i) => (
                      <li key={i} className="advocate-timeline-entry">
                        <span className="advocate-tl-date">{entry.date}</span>
                        <span className="advocate-tl-desc">{entry.description}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>No timeline entries yet.</p>
                )}
              </div>

              {/* Evidence */}
              {detail?.case?.evidence_urls?.length > 0 && (
                <div style={{ marginTop: '.75rem' }}>
                  <h4 style={{ fontSize: '.9rem', marginBottom: '.4rem' }}>Evidence Files</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '.85rem' }}>
                    {detail.case.evidence_urls.map((url, i) => (
                      <li key={i}><a href={url} target="_blank" rel="noopener noreferrer">File {i + 1}</a></li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={handleDelete} disabled={deleting}>
                  {deleting ? '…' : 'Delete Case'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── New Case Form ─────────────────────────────────────────────────────────────

function NewCaseForm({ token, onCreated }) {
  const [form, setForm] = useState({
    case_type: '', institution_name: '', institution_type: '',
    location_label: '', incident_date: '', summary: '', status: 'documenting',
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [resources, setResources] = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true); setErr(null);
    try {
      const res = await api.createAdvocateCase(form, token);
      setResources(res.resources);
    } catch (e) { setErr(e.message); }
    finally { setSubmitting(false); }
  }

  if (resources) {
    return (
      <div className="advocate-submitted">
        <div className="advocate-submitted-icon">✓</div>
        <h3 style={{ marginBottom: '.5rem' }}>Case documented</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Your case has been saved privately. You can add timeline entries and evidence from My Cases.
        </p>
        <div className="advocate-resources">
          <h4 className="advocate-resources-title">Immediate Resources</h4>
          <ul className="advocate-resource-list">
            {resources.map((r, i) => (
              <li key={i}>
                <a href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a>
                {r.note && <span className="advocate-resource-note"> — {r.note}</span>}
              </li>
            ))}
          </ul>
        </div>
        <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={onCreated}>
          View My Cases
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '640px' }}>
      <h3 className="section-title" style={{ marginBottom: '1rem' }}>Document a Case</h3>
      <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        This case will be saved privately. Only you and platform administrators can see it.
        It will not be publicly disclosed without your explicit consent.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Case Type *</label>
          <select className="form-select" value={form.case_type} onChange={e => set('case_type', e.target.value)} required>
            <option value="">Select…</option>
            {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Institution Name *</label>
            <input className="form-input" required value={form.institution_name}
              onChange={e => set('institution_name', e.target.value)}
              placeholder="e.g. Huntsville Hospital" />
          </div>
          <div className="form-group">
            <label className="form-label">Institution Type *</label>
            <select className="form-select" value={form.institution_type} onChange={e => set('institution_type', e.target.value)} required>
              <option value="">Select…</option>
              {Object.entries(INSTITUTION_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" value={form.location_label}
              onChange={e => set('location_label', e.target.value)}
              placeholder="City, State" />
          </div>
          <div className="form-group">
            <label className="form-label">Incident Date</label>
            <input type="date" className="form-input" value={form.incident_date}
              onChange={e => set('incident_date', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Summary *</label>
          <textarea className="form-textarea" required value={form.summary}
            onChange={e => set('summary', e.target.value)}
            placeholder="Describe what happened. This is stored privately and is never shared without your consent."
            rows={5} />
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {err && <p className="form-error">{err}</p>}
        <div>
          <button className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Case Privately'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Public Patterns ───────────────────────────────────────────────────────────

const CONFIDENCE_STYLES = {
  high:   { background: '#f8d7da', color: '#842029', label: 'High Confidence' },
  medium: { background: '#fff3cd', color: '#856404', label: 'Medium Confidence' },
  low:    { background: '#e2e3e5', color: '#41464b', label: 'Low Confidence' },
};

function PatternsPanel() {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [respondingId, setRespondingId] = useState(null);

  useEffect(() => {
    api.getAdvocatePatterns()
      .then(setPatterns)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;
  if (err) return <p className="error-msg">{err}</p>;

  return (
    <div>
      <div className="advocate-patterns-header">
        <p style={{ fontSize: '.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          This page shows patterns of complaints documented against institutions by community members.
          Individual case details and identities are never shown here. Only institutions meeting a complaint threshold
          appear. Verified member complaints are weighted more heavily in the threshold calculation.
        </p>
      </div>

      {patterns.length === 0 ? (
        <p className="empty">No institutional patterns have been identified yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {patterns.map(p => (
            <PatternCard key={p.id} pattern={p}
              responding={respondingId === p.id}
              onRespond={() => setRespondingId(id => id === p.id ? null : p.id)}
              onResponseSubmitted={() => {
                setRespondingId(null);
                api.getAdvocatePatterns().then(setPatterns).catch(() => {});
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PatternCard({ pattern: p, responding, onRespond, onResponseSubmitted }) {
  const cs = CONFIDENCE_STYLES[p.ai_confidence] || CONFIDENCE_STYLES.low;

  return (
    <div className="advocate-pattern-card">
      <div className="advocate-pattern-header">
        <div>
          <strong style={{ fontSize: '1rem' }}>{p.institution_name}</strong>
          <span style={{ marginLeft: '.5rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>
            {INSTITUTION_TYPE_LABELS[p.institution_type] || p.institution_type}
          </span>
          {p.location_label && (
            <span style={{ marginLeft: '.5rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>
              · {p.location_label}
            </span>
          )}
        </div>
        <span style={{ fontSize: '.72rem', padding: '.15rem .5rem', borderRadius: '4px', ...cs }}>
          {cs.label}
        </span>
      </div>

      <div className="advocate-pattern-meta">
        <span className="advocate-pattern-count">
          <span className="advocate-pattern-count-verified">⬡ {p.verified_complaints} verified</span>
          {' · '}
          <span className="advocate-pattern-count-unverified">○ {p.unverified_complaints} unverified</span>
        </span>
        {p.time_period_start && p.time_period_end && (
          <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
            · {new Date(p.time_period_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            {' – '}
            {new Date(p.time_period_end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {p.complaint_types?.length > 0 && (
        <div style={{ marginBottom: '.5rem', display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
          {p.complaint_types.map((t, i) => (
            <span key={i} className="advocate-tag">{CASE_TYPE_LABELS[t] || t}</span>
          ))}
        </div>
      )}

      {p.ai_summary && (
        <p style={{ fontSize: '.9rem', margin: '.5rem 0 .75rem' }}>{p.ai_summary}</p>
      )}

      {/* Institution responses */}
      {p.responses?.length > 0 && (
        <div className="advocate-responses">
          <h5 style={{ fontSize: '.85rem', fontWeight: 700, marginBottom: '.4rem' }}>
            Institution Response{p.responses.length > 1 ? 's' : ''}
          </h5>
          {p.responses.map(r => (
            <div key={r.id} className="advocate-response-item">
              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '.2rem' }}>
                {r.institution_name}
                {r.submitted_by && ` · ${r.submitted_by}`}
                {' · '}{new Date(r.created_at).toLocaleDateString()}
              </div>
              <p style={{ margin: 0, fontSize: '.88rem' }}>{r.response_text}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '.75rem' }}>
        <button className="btn btn-outline btn-sm" onClick={onRespond}>
          {responding ? 'Cancel Response' : 'Submit Institution Response'}
        </button>
      </div>

      {responding && (
        <InstitutionResponseForm patternId={p.id} institutionName={p.institution_name}
          onSubmitted={onResponseSubmitted} />
      )}
    </div>
  );
}

function InstitutionResponseForm({ patternId, institutionName, onSubmitted }) {
  const [form, setForm] = useState({ institution_name: institutionName, response_text: '', submitted_by: '', contact_email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true); setErr(null);
    try {
      await api.submitPatternResponse(patternId, form);
      onSubmitted();
    } catch (e) { setErr(e.message); }
    finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '.75rem', display: 'flex', flexDirection: 'column', gap: '.75rem', padding: '1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', margin: 0 }}>
        Institutions named in pattern reports may submit a public response. Responses are shown alongside the pattern data.
      </p>
      <div className="form-group">
        <label className="form-label">Your Name / Title</label>
        <input className="form-input" value={form.submitted_by}
          onChange={e => setForm(f => ({ ...f, submitted_by: e.target.value }))}
          placeholder="e.g. Chief Medical Officer, Huntsville Hospital" />
      </div>
      <div className="form-group">
        <label className="form-label">Contact Email (not shown publicly)</label>
        <input type="email" className="form-input" value={form.contact_email}
          onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Response *</label>
        <textarea className="form-textarea" required rows={4} value={form.response_text}
          onChange={e => setForm(f => ({ ...f, response_text: e.target.value }))}
          placeholder="Your institution's response to the documented pattern (minimum 50 characters)…" />
      </div>
      {err && <p className="form-error">{err}</p>}
      <div>
        <button className="btn btn-primary btn-sm" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Response'}
        </button>
      </div>
    </form>
  );
}
