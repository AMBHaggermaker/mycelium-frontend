import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth';
import api from '../api';

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'federal',  label: 'Federal' },
  { id: 'state',    label: 'State (Alabama)' },
  { id: 'local',    label: 'Local' },
  { id: 'records',  label: 'Votes & Records' },
  { id: 'my_alerts',label: 'My Alerts' },
];

const TOPICS = [
  { value: 'health',          label: 'Health' },
  { value: 'environment',     label: 'Environment' },
  { value: 'housing',         label: 'Housing' },
  { value: 'surveillance',    label: 'Surveillance' },
  { value: 'parental_rights', label: 'Parental Rights' },
  { value: 'veterans',        label: 'Veterans' },
  { value: 'land_use',        label: 'Land Use' },
  { value: 'education',       label: 'Education' },
  { value: 'civil_liberties', label: 'Civil Liberties' },
];

const STATUS_CONFIG = {
  introduced:  { label: 'Introduced',  color: '#888',    bg: '#f0f0f0' },
  committee:   { label: 'In Committee', color: '#2563eb', bg: '#dbeafe' },
  floor_vote:  { label: 'Floor Vote',  color: '#d97706', bg: '#fef3c7' },
  passed:      { label: 'Passed',      color: '#16a34a', bg: '#dcfce7' },
  signed:      { label: 'Signed',      color: '#14532d', bg: '#bbf7d0' },
  vetoed:      { label: 'Vetoed',      color: '#dc2626', bg: '#fee2e2' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StarRating({ value, onChange, readonly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="leg-stars" style={{ cursor: readonly ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          style={{
            fontSize: '1.1rem',
            color: n <= (hover || value) ? '#f59e0b' : '#d1d5db',
            transition: 'color .15s',
          }}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange && onChange(n)}
        >
          ★
        </span>
      ))}
    </span>
  );
}

// ── Bill Card ─────────────────────────────────────────────────────────────────

function BillCard({ bill, user, subscribed, onSubscribe }) {
  const sc = STATUS_CONFIG[bill.status] || STATUS_CONFIG.introduced;
  const displaySummary = bill.ai_summary || bill.summary || 'No summary available.';
  const tags = Array.isArray(bill.topic_tags) ? bill.topic_tags : [];
  const [copied, setCopied] = useState(false);

  const mailtoHref = `mailto:?subject=${encodeURIComponent(`RE: ${bill.bill_number} - ${bill.title}`)}&body=${encodeURIComponent(`I am writing regarding ${bill.bill_number} - ${bill.title}.\n\n[Please add your message here]\n`)}`;

  const isUrgent = bill.status === 'floor_vote' || bill.status === 'committee';

  function handleShare() {
    const url = `${window.location.origin}/legislature?bill=${encodeURIComponent(bill.bill_number || bill.id)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      prompt('Copy this link:', url);
    });
  }

  return (
    <div className="leg-bill-card" style={{ borderLeft: isUrgent ? '4px solid #d97706' : '4px solid #e5e7eb' }}>
      {isUrgent && (
        <div className="leg-action-banner">
          {bill.status === 'floor_vote'
            ? '⚡ Action Needed: This bill is up for a floor vote — contact your representative now.'
            : '📋 In Committee: This bill needs community attention — contact committee members.'}
        </div>
      )}

      <div className="leg-bill-header">
        <div>
          <span className="leg-bill-number">{bill.bill_number}</span>
          <span className="leg-status-badge" style={{ color: sc.color, background: sc.bg }}>
            {sc.label}
          </span>
        </div>
        {bill.last_action_date && (
          <span className="leg-date">{formatDate(bill.last_action_date)}</span>
        )}
      </div>

      <h3 className="leg-bill-title">{bill.title}</h3>
      <p className="leg-bill-summary">{displaySummary}</p>

      {bill.last_action && (
        <p className="leg-last-action"><strong>Last action:</strong> {bill.last_action}</p>
      )}

      {tags.length > 0 && (
        <div className="leg-tags">
          {tags.map(t => <span key={t} className="leg-tag">{t.replace(/_/g, ' ')}</span>)}
        </div>
      )}

      <div className="leg-bill-actions">
        {bill.source_url && (
          <a href={bill.source_url} target="_blank" rel="noopener noreferrer" className="leg-btn leg-btn-ghost">
            View Source
          </a>
        )}
        <button className="leg-btn leg-btn-ghost" onClick={handleShare} title="Copy link to this bill">
          {copied ? '✓ Copied' : '🔗 Share'}
        </button>
        {user && (
          <button
            className={`leg-btn ${subscribed ? 'leg-btn-ghost' : 'leg-btn-outline'}`}
            onClick={() => onSubscribe?.(bill)}
            title={subscribed ? 'Unsubscribe from alerts' : 'Subscribe to alerts for this bill'}
          >
            {subscribed ? '🔕 Unsubscribe' : '🔔 Alert Me'}
          </button>
        )}
        <a href={mailtoHref} className="leg-btn leg-btn-primary">Contact Your Rep</a>
      </div>
    </div>
  );
}

// ── Rep Card ──────────────────────────────────────────────────────────────────

function RepCard({ rep, onRate, user }) {
  const [showRateForm, setShowRateForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rateError, setRateError] = useState('');
  const [rateDone, setRateDone] = useState(false);

  const partyColor = rep.party === 'Democrat' ? '#2563eb'
    : rep.party === 'Republican' ? '#dc2626'
    : '#6b7280';

  async function handleRateSubmit(e) {
    e.preventDefault();
    if (!rating) return setRateError('Please select a star rating.');
    setSubmitting(true);
    setRateError('');
    try {
      await onRate(rep.id, { rating, comment });
      setRateDone(true);
      setShowRateForm(false);
    } catch (err) {
      setRateError(err.message || 'Failed to submit rating.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="leg-rep-card">
      {rep.photo_url && (
        <img src={rep.photo_url} alt={rep.name} className="leg-rep-photo" />
      )}
      <div className="leg-rep-info">
        <div className="leg-rep-header">
          <strong className="leg-rep-name">{rep.name}</strong>
          {rep.party && (
            <span className="leg-party-badge" style={{ background: partyColor }}>
              {rep.party}
            </span>
          )}
        </div>
        {rep.chamber && rep.district && (
          <p className="leg-rep-district">
            {rep.chamber.charAt(0).toUpperCase() + rep.chamber.slice(1)} — {rep.district}
          </p>
        )}
        {rep.avg_rating && (
          <div className="leg-rep-rating">
            <StarRating value={Math.round(parseFloat(rep.avg_rating))} readonly />
            <span className="leg-rating-count">
              {rep.avg_rating} ({rep.rating_count} {rep.rating_count === 1 ? 'rating' : 'ratings'})
            </span>
          </div>
        )}
        {rep.contact_url && (
          <a href={rep.contact_url} target="_blank" rel="noopener noreferrer" className="leg-rep-contact">
            Official Contact Page
          </a>
        )}
        {user && !rateDone && (
          <button
            className="leg-btn leg-btn-outline leg-btn-sm"
            onClick={() => setShowRateForm(o => !o)}
            style={{ marginTop: '.5rem' }}
          >
            {showRateForm ? 'Cancel' : 'Rate This Rep'}
          </button>
        )}
        {rateDone && <p style={{ color: '#16a34a', fontSize: '.85rem', marginTop: '.4rem' }}>Rating submitted!</p>}

        {showRateForm && (
          <form className="leg-rate-form" onSubmit={handleRateSubmit}>
            <label className="leg-label">Your Rating</label>
            <StarRating value={rating} onChange={setRating} />
            <textarea
              className="leg-textarea"
              placeholder="Optional comment (public)"
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={2}
            />
            {rateError && <p className="leg-error">{rateError}</p>}
            <button type="submit" className="leg-btn leg-btn-primary leg-btn-sm" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Rating'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Votes & Records Tab ───────────────────────────────────────────────────────

function VotesRecordsTab({ user, token, onRequireAuth }) {
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [bodyFilter, setBodyFilter] = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitDone, setSubmitDone] = useState(false);

  const [form, setForm] = useState({
    body: '',
    vote_date: '',
    description: '',
    outcome: '',
    source_url: '',
  });

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLegislationCommunityRecords(bodyFilter ? { body: bodyFilter } : {});
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [bodyFilter]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return onRequireAuth();
    if (!form.body || !form.description) return setSubmitError('Body and description are required.');
    setSubmitting(true);
    setSubmitError('');
    try {
      await api.submitCommunityVoteRecord(form, token);
      setSubmitDone(true);
      setShowForm(false);
      setForm({ body: '', vote_date: '', description: '', outcome: '', source_url: '' });
      loadRecords();
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit record.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="leg-records-tab">
      <div className="leg-records-header">
        <h2 className="leg-section-title">Community Vote Records</h2>
        <p className="leg-section-desc">
          Track how local bodies (city council, county commission, school board, etc.) vote
          on issues that affect our community. Submit records, verify them, and keep
          elected officials accountable.
        </p>
      </div>

      <div className="leg-records-controls">
        <select
          className="leg-select"
          value={bodyFilter}
          onChange={e => setBodyFilter(e.target.value)}
        >
          <option value="">All Bodies</option>
          <option value="Huntsville City Council">Huntsville City Council</option>
          <option value="Madison County Commission">Madison County Commission</option>
          <option value="Huntsville City Schools Board">Huntsville City Schools Board</option>
          <option value="Madison City Council">Madison City Council</option>
          <option value="Athens City Council">Athens City Council</option>
          <option value="Decatur City Council">Decatur City Council</option>
          <option value="Alabama Legislature">Alabama Legislature</option>
          <option value="Other">Other</option>
        </select>

        <button
          className="leg-btn leg-btn-primary"
          onClick={() => user ? setShowForm(o => !o) : onRequireAuth()}
        >
          + Submit Record
        </button>
      </div>

      {submitDone && (
        <div className="leg-success-banner">Record submitted successfully. Thank you!</div>
      )}

      {showForm && (
        <form className="leg-record-form" onSubmit={handleSubmit}>
          <h3 className="leg-form-title">Submit a Vote Record</h3>
          <div className="leg-form-row">
            <label className="leg-label">Governing Body *</label>
            <select
              className="leg-select"
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              required
            >
              <option value="">Select body…</option>
              <option>Huntsville City Council</option>
              <option>Madison County Commission</option>
              <option>Huntsville City Schools Board</option>
              <option>Madison City Council</option>
              <option>Athens City Council</option>
              <option>Decatur City Council</option>
              <option>Alabama Legislature</option>
              <option>Other</option>
            </select>
          </div>
          <div className="leg-form-row">
            <label className="leg-label">Vote Date</label>
            <input
              type="date"
              className="leg-input"
              value={form.vote_date}
              onChange={e => setForm(f => ({ ...f, vote_date: e.target.value }))}
            />
          </div>
          <div className="leg-form-row">
            <label className="leg-label">Description *</label>
            <textarea
              className="leg-textarea"
              rows={3}
              placeholder="What was voted on? What happened?"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              required
            />
          </div>
          <div className="leg-form-row">
            <label className="leg-label">Outcome</label>
            <input
              className="leg-input"
              placeholder="e.g. Passed 5-2, Failed, Tabled…"
              value={form.outcome}
              onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
            />
          </div>
          <div className="leg-form-row">
            <label className="leg-label">Source URL</label>
            <input
              className="leg-input"
              type="url"
              placeholder="Meeting minutes, news article, etc."
              value={form.source_url}
              onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
            />
          </div>
          {submitError && <p className="leg-error">{submitError}</p>}
          <div className="leg-form-actions">
            <button type="button" className="leg-btn leg-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="leg-btn leg-btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Record'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="leg-loading">Loading records…</div>
      ) : records.length === 0 ? (
        <div className="leg-empty">
          No records found. Be the first to document how your local officials vote.
        </div>
      ) : (
        <div className="leg-records-list">
          {records.map(r => (
            <div key={r.id} className="leg-record-card">
              <div className="leg-record-header">
                <span className="leg-record-body">{r.body}</span>
                {r.vote_date && <span className="leg-date">{formatDate(r.vote_date)}</span>}
                {r.verified && <span className="leg-verified-badge">Verified</span>}
              </div>
              <p className="leg-record-desc">{r.description}</p>
              {r.outcome && (
                <p className="leg-record-outcome"><strong>Outcome:</strong> {r.outcome}</p>
              )}
              <div className="leg-record-meta">
                <span>Submitted by {r.username}</span>
                {r.source_url && (
                  <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="leg-source-link">
                    Source
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Legislature({ onRequireAuth }) {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab]     = useState('federal');
  const [bills, setBills]             = useState([]);
  const [reps, setReps]               = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [repsLoading, setRepsLoading]   = useState(false);
  const [topicFilter, setTopicFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError]             = useState('');
  const [myAlerts, setMyAlerts]       = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // level mapped from tab
  const levelForTab = activeTab === 'records' ? null
    : activeTab === 'local' ? 'local'
    : activeTab === 'state' ? 'state'
    : 'federal';

  const loadBills = useCallback(async () => {
    if (!levelForTab) return;
    setBillsLoading(true);
    setError('');
    try {
      const params = { level: levelForTab, limit: 40 };
      if (topicFilter)  params.topic  = topicFilter;
      if (statusFilter) params.status = statusFilter;
      const data = await api.getLegislationBills(params);
      setBills(data);
    } catch (err) {
      setError(err.message || 'Failed to load bills.');
      setBills([]);
    } finally {
      setBillsLoading(false);
    }
  }, [levelForTab, topicFilter, statusFilter]);

  const loadReps = useCallback(async () => {
    if (!levelForTab) return;
    setRepsLoading(true);
    try {
      const data = await api.getLegislationReps({ level: levelForTab });
      setReps(data);
    } catch {
      setReps([]);
    } finally {
      setRepsLoading(false);
    }
  }, [levelForTab]);

  const loadAlerts = useCallback(async () => {
    if (!token) return;
    setAlertsLoading(true);
    try {
      const data = await api.getBillAlerts(token);
      setMyAlerts(data);
    } catch { setMyAlerts([]); }
    finally { setAlertsLoading(false); }
  }, [token]);

  useEffect(() => {
    if (activeTab !== 'records' && activeTab !== 'my_alerts') {
      loadBills();
      loadReps();
    }
    if (activeTab === 'my_alerts') loadAlerts();
  }, [activeTab, loadBills, loadReps, loadAlerts]);

  async function handleRate(repId, data) {
    if (!user) return onRequireAuth();
    await api.rateLegislationRep(repId, data, token);
    loadReps();
  }

  async function handleSubscribeBill(bill) {
    if (!user) return onRequireAuth();
    const isSubscribed = myAlerts.some(a => a.bill_id === bill.id);
    try {
      if (isSubscribed) {
        await api.unsubscribeBillAlert(bill.id, token);
        setMyAlerts(prev => prev.filter(a => a.bill_id !== bill.id));
      } else {
        const alert = await api.subscribeBillAlert({
          bill_id: bill.id,
          bill_title: bill.title,
          bill_number: bill.bill_number,
        }, token);
        setMyAlerts(prev => [...prev, alert]);
      }
    } catch (e) { alert(e.message); }
  }

  async function handleSeedAdmin() {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/legislature/seed', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      alert(`Seed complete: ${data.representatives_inserted} reps, ${data.bills_inserted} bills inserted`);
      loadBills();
      loadReps();
    } catch {
      alert('Seed failed');
    }
  }

  const urgentBills = bills.filter(b => b.status === 'floor_vote' || b.status === 'committee');

  return (
    <div className="leg-page">
      <div className="leg-hero">
        <div className="container">
          <h1 className="leg-hero-title">🏛️ Legislature</h1>
          <p className="leg-hero-desc">
            Track legislation at every level of government — federal, state, and local.
            Know how your representatives vote. Make your voice heard.
          </p>
          {isAdmin && (
            <button className="leg-btn leg-btn-outline leg-btn-sm" onClick={handleSeedAdmin} style={{ marginTop: '.75rem' }}>
              Admin: Seed Sample Data
            </button>
          )}
        </div>
      </div>

      <div className="container leg-container">
        {/* Tab navigation */}
        <nav className="leg-tabs" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={'leg-tab' + (activeTab === tab.id ? ' leg-tab--active' : '')}
              onClick={() => { if (tab.id === 'my_alerts' && !user) { onRequireAuth?.(); return; } setActiveTab(tab.id); }}
            >
              {tab.label}
              {tab.id === 'my_alerts' && myAlerts.length > 0 && (
                <span className="leg-alert-badge">{myAlerts.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Votes & Records tab */}
        {activeTab === 'records' && (
          <VotesRecordsTab user={user} token={token} onRequireAuth={onRequireAuth} />
        )}

        {/* My Alerts tab */}
        {activeTab === 'my_alerts' && (
          <section className="leg-section">
            <h2 className="leg-section-title">My Bill Alerts</h2>
            {alertsLoading ? (
              <div className="leg-loading">Loading alerts…</div>
            ) : myAlerts.length === 0 ? (
              <div className="leg-empty">
                No alerts yet. Click <strong>🔔 Alert Me</strong> on any bill to get notified when it changes status.
              </div>
            ) : (
              <div className="leg-bills-grid">
                {myAlerts.map(a => (
                  <div key={a.id} className="leg-bill-card">
                    <div className="leg-bill-header">
                      <span className="leg-bill-number">{a.bill_number}</span>
                    </div>
                    <h3 className="leg-bill-title">{a.bill_title}</h3>
                    <p style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
                      Subscribed {new Date(a.created_at).toLocaleDateString()}
                    </p>
                    <div className="leg-bill-actions">
                      <button className="leg-btn leg-btn-ghost"
                        onClick={() => handleSubscribeBill({ id: a.bill_id, title: a.bill_title, bill_number: a.bill_number })}>
                        🔕 Unsubscribe
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Bills + Reps tabs */}
        {activeTab !== 'records' && activeTab !== 'my_alerts' && (
          <>
            {/* Community Action banner for urgent bills */}
            {urgentBills.length > 0 && (
              <div className="leg-urgent-strip">
                <strong>🚨 Community Action Needed:</strong>{' '}
                {urgentBills.map((b, i) => (
                  <span key={b.id}>
                    {i > 0 && ' · '}
                    <strong>{b.bill_number}</strong> — {b.status === 'floor_vote' ? 'floor vote imminent' : 'in committee'}
                    {b.last_action_date && ` (${formatDate(b.last_action_date)})`}
                  </span>
                ))}
                {' '}<a href={`mailto:?subject=Urgent+Legislative+Action+Needed&body=Community members are needed to contact representatives regarding pending legislation.`} className="leg-btn leg-btn-outline leg-btn-sm" style={{ marginLeft: '.5rem' }}>Contact Your Rep</a>
              </div>
            )}

            {/* Filters */}
            <div className="leg-filters">
              <div className="leg-topic-pills">
                <button
                  className={'leg-pill' + (!topicFilter ? ' leg-pill--active' : '')}
                  onClick={() => setTopicFilter('')}
                >
                  All Topics
                </button>
                {TOPICS.map(t => (
                  <button
                    key={t.value}
                    className={'leg-pill' + (topicFilter === t.value ? ' leg-pill--active' : '')}
                    onClick={() => setTopicFilter(prev => prev === t.value ? '' : t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <select
                className="leg-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="introduced">Introduced</option>
                <option value="committee">In Committee</option>
                <option value="floor_vote">Floor Vote</option>
                <option value="passed">Passed</option>
                <option value="signed">Signed</option>
                <option value="vetoed">Vetoed</option>
              </select>
            </div>

            {/* Bills section */}
            <section className="leg-section">
              <h2 className="leg-section-title">
                {activeTab === 'federal' ? 'Federal Bills' : activeTab === 'state' ? 'Alabama State Bills' : 'Local Bills'}
              </h2>

              {error && <p className="leg-error">{error}</p>}

              {billsLoading ? (
                <div className="leg-loading">Loading bills…</div>
              ) : bills.length === 0 ? (
                <div className="leg-empty">
                  No bills found for this filter.
                  {isAdmin && (
                    <> Use the <strong>Admin: Seed Sample Data</strong> button above to add sample bills.</>
                  )}
                </div>
              ) : (
                <div className="leg-bills-grid">
                  {bills.map(bill => (
                    <BillCard
                      key={bill.id}
                      bill={bill}
                      user={user}
                      subscribed={myAlerts.some(a => a.bill_id === bill.id)}
                      onSubscribe={handleSubscribeBill}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Representatives section */}
            <section className="leg-section">
              <h2 className="leg-section-title">
                {activeTab === 'federal' ? 'Federal Representatives' : activeTab === 'state' ? 'Alabama State Representatives' : 'Local Officials'}
              </h2>

              {repsLoading ? (
                <div className="leg-loading">Loading representatives…</div>
              ) : reps.length === 0 ? (
                <div className="leg-empty">No representatives found.</div>
              ) : (
                <div className="leg-reps-grid">
                  {reps.map(rep => (
                    <RepCard key={rep.id} rep={rep} onRate={handleRate} user={user} />
                  ))}
                </div>
              )}

              {!user && (
                <p className="leg-auth-prompt">
                  <button className="leg-link" onClick={onRequireAuth}>Sign in</button>{' '}
                  to rate your representatives.
                </p>
              )}
            </section>
          </>
        )}
      </div>

      <style>{`
        .leg-page {
          min-height: 100vh;
          background: var(--bg, #f9fafb);
        }
        .leg-hero {
          background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%);
          color: #fff;
          padding: calc(var(--nav-h) + 2.5rem) 0 2rem;
        }
        .leg-hero-title {
          font-size: 2rem;
          font-weight: 700;
          margin: 0 0 .5rem;
        }
        .leg-hero-desc {
          font-size: 1rem;
          opacity: .85;
          max-width: 600px;
          margin: 0;
        }
        .leg-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 1rem 4rem;
        }
        .leg-tabs {
          display: flex;
          gap: .25rem;
          border-bottom: 2px solid #e5e7eb;
          margin: 1.5rem 0 0;
          overflow-x: auto;
        }
        .leg-tab {
          background: none;
          border: none;
          padding: .75rem 1.25rem;
          font-size: .95rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          white-space: nowrap;
          transition: color .15s, border-color .15s;
        }
        .leg-tab:hover { color: #1e3a5f; }
        .leg-tab--active {
          color: #1e3a5f;
          border-bottom-color: #1e3a5f;
          font-weight: 600;
        }
        .leg-urgent-strip {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: .75rem 1rem;
          margin: 1.25rem 0 .5rem;
          font-size: .9rem;
          color: #92400e;
        }
        .leg-filters {
          display: flex;
          flex-wrap: wrap;
          gap: .75rem;
          align-items: center;
          margin: 1.25rem 0;
        }
        .leg-topic-pills {
          display: flex;
          flex-wrap: wrap;
          gap: .4rem;
          flex: 1;
        }
        .leg-pill {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          padding: .3rem .85rem;
          font-size: .8rem;
          cursor: pointer;
          color: #374151;
          transition: background .15s, border-color .15s, color .15s;
          white-space: nowrap;
        }
        .leg-pill:hover { background: #e5e7eb; }
        .leg-pill--active {
          background: #1e3a5f;
          color: #fff;
          border-color: #1e3a5f;
        }
        .leg-select {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: .4rem .75rem;
          font-size: .875rem;
          background: #fff;
          color: #374151;
          cursor: pointer;
        }
        .leg-section {
          margin-top: 2rem;
        }
        .leg-section-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #1e3a5f;
          margin: 0 0 1rem;
          padding-bottom: .5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .leg-section-desc {
          color: #6b7280;
          font-size: .925rem;
          margin: 0 0 1.25rem;
        }
        .leg-bills-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.25rem;
        }
        .leg-bill-card {
          background: #fff;
          border-radius: 10px;
          padding: 1.25rem;
          box-shadow: 0 1px 4px rgba(0,0,0,.06);
          display: flex;
          flex-direction: column;
          gap: .6rem;
        }
        .leg-action-banner {
          background: #fef3c7;
          border-radius: 6px;
          padding: .5rem .75rem;
          font-size: .8rem;
          color: #92400e;
          font-weight: 500;
        }
        .leg-bill-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: .5rem;
          flex-wrap: wrap;
        }
        .leg-bill-number {
          font-weight: 700;
          font-size: .875rem;
          color: #374151;
          margin-right: .5rem;
        }
        .leg-status-badge {
          display: inline-block;
          font-size: .75rem;
          font-weight: 600;
          padding: .2rem .6rem;
          border-radius: 999px;
        }
        .leg-date {
          font-size: .8rem;
          color: #9ca3af;
          white-space: nowrap;
        }
        .leg-bill-title {
          font-size: .975rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
          line-height: 1.4;
        }
        .leg-bill-summary {
          font-size: .875rem;
          color: #4b5563;
          line-height: 1.55;
          margin: 0;
        }
        .leg-last-action {
          font-size: .8rem;
          color: #6b7280;
          margin: 0;
        }
        .leg-tags {
          display: flex;
          flex-wrap: wrap;
          gap: .35rem;
        }
        .leg-tag {
          background: #eff6ff;
          color: #1d4ed8;
          font-size: .75rem;
          padding: .15rem .55rem;
          border-radius: 4px;
          text-transform: capitalize;
        }
        .leg-bill-actions {
          display: flex;
          gap: .5rem;
          margin-top: auto;
          flex-wrap: wrap;
        }
        .leg-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: .4rem 1rem;
          border-radius: 6px;
          font-size: .85rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          text-decoration: none;
          transition: opacity .15s, background .15s;
          white-space: nowrap;
        }
        .leg-btn:hover { opacity: .88; }
        .leg-btn-primary { background: #1e3a5f; color: #fff; }
        .leg-btn-outline { background: transparent; border: 1px solid #1e3a5f; color: #1e3a5f; }
        .leg-btn-ghost { background: #f3f4f6; color: #374151; }
        .leg-btn-sm { padding: .3rem .75rem; font-size: .8rem; }
        .leg-reps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        .leg-rep-card {
          background: #fff;
          border-radius: 10px;
          padding: 1rem;
          box-shadow: 0 1px 4px rgba(0,0,0,.06);
          display: flex;
          gap: .75rem;
          align-items: flex-start;
        }
        .leg-rep-photo {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        .leg-rep-info { flex: 1; }
        .leg-rep-header {
          display: flex;
          align-items: center;
          gap: .5rem;
          flex-wrap: wrap;
        }
        .leg-rep-name { font-size: .925rem; color: #111827; }
        .leg-party-badge {
          font-size: .7rem;
          font-weight: 600;
          padding: .15rem .5rem;
          border-radius: 999px;
          color: #fff;
          white-space: nowrap;
        }
        .leg-rep-district { font-size: .8rem; color: #6b7280; margin: .2rem 0 .4rem; }
        .leg-rep-rating { display: flex; align-items: center; gap: .4rem; }
        .leg-rating-count { font-size: .8rem; color: #6b7280; }
        .leg-rep-contact {
          display: inline-block;
          font-size: .8rem;
          color: #2563eb;
          text-decoration: none;
          margin-top: .3rem;
        }
        .leg-rep-contact:hover { text-decoration: underline; }
        .leg-rate-form {
          display: flex;
          flex-direction: column;
          gap: .5rem;
          margin-top: .5rem;
          padding: .75rem;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .leg-label { font-size: .8rem; font-weight: 600; color: #374151; }
        .leg-textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: .4rem .6rem;
          font-size: .85rem;
          resize: vertical;
          font-family: inherit;
        }
        .leg-input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: .4rem .6rem;
          font-size: .875rem;
          font-family: inherit;
          box-sizing: border-box;
        }
        .leg-error { color: #dc2626; font-size: .8rem; margin: 0; }
        .leg-loading { color: #9ca3af; padding: 1.5rem 0; font-size: .9rem; }
        .leg-empty { color: #9ca3af; padding: 1.5rem 0; font-size: .9rem; }
        .leg-auth-prompt { font-size: .875rem; color: #6b7280; margin-top: 1rem; }
        .leg-link { background: none; border: none; color: #2563eb; cursor: pointer; font-size: inherit; padding: 0; text-decoration: underline; }
        /* Records tab */
        .leg-records-tab { padding-top: 1.5rem; }
        .leg-records-header { margin-bottom: 1.25rem; }
        .leg-records-controls {
          display: flex;
          gap: .75rem;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
        }
        .leg-record-form {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: .75rem;
        }
        .leg-form-title { font-size: 1rem; font-weight: 700; color: #1e3a5f; margin: 0; }
        .leg-form-row { display: flex; flex-direction: column; gap: .35rem; }
        .leg-form-actions { display: flex; gap: .5rem; justify-content: flex-end; margin-top: .25rem; }
        .leg-success-banner {
          background: #d1fae5;
          border: 1px solid #6ee7b7;
          border-radius: 8px;
          padding: .75rem 1rem;
          color: #065f46;
          font-size: .9rem;
          margin-bottom: 1rem;
        }
        .leg-records-list { display: flex; flex-direction: column; gap: 1rem; }
        .leg-record-card {
          background: #fff;
          border-radius: 10px;
          padding: 1.1rem 1.25rem;
          box-shadow: 0 1px 4px rgba(0,0,0,.06);
          display: flex;
          flex-direction: column;
          gap: .4rem;
        }
        .leg-record-header {
          display: flex;
          align-items: center;
          gap: .75rem;
          flex-wrap: wrap;
        }
        .leg-record-body { font-weight: 700; font-size: .925rem; color: #1e3a5f; }
        .leg-verified-badge {
          background: #d1fae5;
          color: #065f46;
          font-size: .72rem;
          padding: .15rem .5rem;
          border-radius: 999px;
          font-weight: 600;
        }
        .leg-record-desc { font-size: .875rem; color: #374151; line-height: 1.5; margin: 0; }
        .leg-record-outcome { font-size: .85rem; color: #4b5563; margin: 0; }
        .leg-record-meta {
          display: flex;
          gap: 1rem;
          font-size: .78rem;
          color: #9ca3af;
          align-items: center;
          margin-top: .2rem;
        }
        .leg-source-link { color: #2563eb; text-decoration: none; }
        .leg-source-link:hover { text-decoration: underline; }
        .leg-alert-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #dc2626;
          color: #fff;
          font-size: .7rem;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 999px;
          padding: 0 4px;
          margin-left: .4rem;
        }
        @media (max-width: 640px) {
          .leg-bills-grid { grid-template-columns: 1fr; }
          .leg-reps-grid  { grid-template-columns: 1fr; }
          .leg-hero-title { font-size: 1.5rem; }
        }
      `}</style>
    </div>
  );
}
