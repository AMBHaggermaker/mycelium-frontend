import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

const BIZ_TYPE_LABELS = {
  independently_owned:    'Independently Owned',
  locally_owned_franchise:'Locally Owned Franchise',
  cooperative:            'Cooperative',
  nonprofit:              'Nonprofit',
  sole_proprietor:        'Sole Proprietor',
};
const CATEGORY_LABELS = {
  construction: 'Construction', retail: 'Retail', food_beverage: 'Food & Beverage',
  healthcare: 'Healthcare', legal: 'Legal', creative: 'Creative', trades: 'Trades',
  technology: 'Technology', childcare: 'Childcare', education: 'Education',
  agriculture: 'Agriculture', other: 'Other',
};
const TYPE_BADGE_COLORS = {
  independently_owned:    '#2a5f0a',
  locally_owned_franchise:'#1a52a0',
  cooperative:            '#6b2fa0',
  nonprofit:              '#b86b10',
  sole_proprietor:        '#555',
};
const BASE_URL = 'https://mycelium.unprecedentedtimes.org';

function resolveUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${BASE_URL}${url}`;
}

function BizCard({ biz }) {
  return (
    <Link to={`/businesses/${biz.id}`} className="biz-card">
      <div className="biz-card-cover">
        {biz.cover_photo
          ? <img src={resolveUrl(biz.cover_photo)} alt={biz.business_name} loading="lazy" />
          : <div className="biz-card-cover-placeholder">{biz.business_name[0].toUpperCase()}</div>
        }
        {biz.is_verified_local && (
          <span className="biz-verified-badge" title="Verified Local Business">✓ Local</span>
        )}
      </div>
      <div className="biz-card-body">
        <div className="biz-card-name">{biz.business_name}</div>
        <div className="biz-card-meta">
          <span className="biz-type-pill" style={{ background: TYPE_BADGE_COLORS[biz.business_type] + '18', color: TYPE_BADGE_COLORS[biz.business_type], borderColor: TYPE_BADGE_COLORS[biz.business_type] + '44' }}>
            {BIZ_TYPE_LABELS[biz.business_type]}
          </span>
          <span className="biz-cat-pill">{CATEGORY_LABELS[biz.category]}</span>
        </div>
        {biz.location_label && <p className="biz-card-location">📍 {biz.location_label}</p>}
        {biz.description && <p className="biz-card-desc">{biz.description.slice(0, 90)}{biz.description.length > 90 ? '…' : ''}</p>}
        {biz.recommendation_count > 0 && (
          <p className="biz-card-recs">⬡ {biz.recommendation_count} recommendation{biz.recommendation_count !== 1 ? 's' : ''}</p>
        )}
      </div>
    </Link>
  );
}

export default function Businesses({ onRequireAuth }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [businesses,   setBusinesses]   = useState([]);
  const [recent,       setRecent]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [category,     setCategory]     = useState('');
  const [type,         setType]         = useState('');
  const [search,       setSearch]       = useState('');
  const [searchInput,  setSearchInput]  = useState('');
  const [showCreate,   setShowCreate]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, rec] = await Promise.all([
        api.getBusinesses({ category, type, search }),
        api.getRecentlyRecommendedBusinesses(),
      ]);
      setBusinesses(list);
      setRecent(rec);
    } catch { /* ignore */ }
    setLoading(false);
  }, [category, type, search]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">🏪 Local Businesses</h1>
            <p className="page-subtitle">Support North Alabama's independent, local, and cooperative businesses</p>
          </div>
          {user && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + List a Business
            </button>
          )}
        </div>

        {/* Search + filters */}
        <div className="biz-filter-bar">
          <form onSubmit={handleSearch} className="biz-search-form">
            <input
              className="form-input biz-search-input"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search businesses…"
            />
            <button type="submit" className="btn btn-outline btn-sm">Search</button>
            {search && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setSearchInput(''); }}>✕ Clear</button>}
          </form>
          <div className="biz-filter-selects">
            <select className="form-select biz-filter-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className="form-select biz-filter-select" value={type} onChange={e => setType(e.target.value)}>
              <option value="">All Types</option>
              {Object.entries(BIZ_TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Recently recommended section */}
        {!search && !category && !type && recent.length > 0 && (
          <div className="biz-section">
            <h2 className="biz-section-title">⬡ Recently Recommended</h2>
            <div className="biz-grid">
              {recent.map(biz => <BizCard key={biz.id} biz={biz} />)}
            </div>
          </div>
        )}

        {/* Directory */}
        <div className="biz-section">
          {(search || category || type) && (
            <h2 className="biz-section-title">
              {businesses.length} result{businesses.length !== 1 ? 's' : ''}
              {search ? ` for "${search}"` : ''}
              {category ? ` in ${CATEGORY_LABELS[category]}` : ''}
            </h2>
          )}
          {!search && !category && !type && <h2 className="biz-section-title">All Businesses</h2>}
          {loading ? (
            <div className="spinner" style={{ marginTop: '2rem' }} />
          ) : businesses.length === 0 ? (
            <p className="empty" style={{ marginTop: '1rem' }}>No businesses found.</p>
          ) : (
            <div className="biz-grid">
              {businesses.map(biz => <BizCard key={biz.id} biz={biz} />)}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateBusinessModal
          token={token}
          onClose={() => setShowCreate(false)}
          onCreated={biz => { setShowCreate(false); navigate(`/businesses/${biz.id}`); }}
        />
      )}
    </div>
  );
}

// ── Create Business Modal ─────────────────────────────────────────────────────

function CreateBusinessModal({ token, onClose, onCreated }) {
  const [form, setForm] = useState({
    business_name: '', business_type: 'independently_owned', category: 'retail',
    description: '', location_label: '', service_area: '',
    contact_phone: '', contact_email: '', contact_preference: 'platform_message',
    website_url: '',
  });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const biz = await api.createBusiness(form, token);
      onCreated(biz);
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
          <span className="modal-title">List a Business</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Business Name <span className="form-required">*</span></label>
            <input className="form-input" required value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Your business name" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Business Type <span className="form-required">*</span></label>
              <select className="form-select" value={form.business_type} onChange={e => set('business_type', e.target.value)}>
                {Object.entries(BIZ_TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category <span className="form-required">*</span></label>
              <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does your business do?" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location_label} onChange={e => set('location_label', e.target.value)} placeholder="e.g. North Huntsville" />
            </div>
            <div className="form-group">
              <label className="form-label">Service Area</label>
              <input className="form-input" value={form.service_area} onChange={e => set('service_area', e.target.value)} placeholder="e.g. Madison County" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Contact Preference</label>
            <select className="form-select" value={form.contact_preference} onChange={e => set('contact_preference', e.target.value)}>
              <option value="platform_message">Message on Mycelium</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
            </select>
          </div>
          {form.contact_preference !== 'platform_message' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Website</label>
            <input className="form-input" type="url" value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://…" />
          </div>
          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-primary btn-full" disabled={busy}>{busy ? '…' : 'Create Business Page'}</button>
        </form>
      </div>
    </div>
  );
}
