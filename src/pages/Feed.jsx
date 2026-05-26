import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth';
import api from '../api';
import PostCard from '../components/PostCard';
import NewPostModal from '../components/NewPostModal';
import UrgentStrip from '../components/UrgentStrip';

const FEED_TABS = [
  { value: '',          label: 'All',               desc: 'Everything from the community' },
  { value: 'community', label: 'Community Exchange', desc: 'Free exchanges and mutual aid' },
  { value: 'commerce',  label: 'Local Commerce',     desc: 'Goods and services for sale' },
  { value: 'urgent',    label: 'Urgent Needs',       desc: 'Time-sensitive community needs' },
];

const TYPES = [
  { value: '',      label: 'All'    },
  { value: 'need',  label: 'Needs'  },
  { value: 'offer', label: 'Offers' },
  { value: 'event', label: 'Events' },
];

const CATEGORIES = [
  { value: '',               label: 'All Categories' },
  { value: 'jobs_services',  label: 'Jobs & Services' },
  { value: 'goods_supplies', label: 'Goods & Supplies' },
  { value: 'community',      label: 'Community' },
];

const SORTS = [
  { value: 'recent',          label: 'Recent' },
  { value: 'urgent',          label: 'Most Urgent' },
  { value: 'least_responded', label: 'Least Responded' },
  { value: 'expiring',        label: 'Expiring Soon' },
];

export default function Feed({ onRequireAuth }) {
  const { user, token } = useAuth();
  const [posts,           setPosts]           = useState([]);
  const [feedTab,         setFeedTab]         = useState('');
  const [type,            setType]            = useState('');
  const [category,        setCategory]        = useState('');
  const [subcategory,     setSubcategory]     = useState('');
  const [search,          setSearch]          = useState('');
  const [sort,            setSort]            = useState('recent');
  const [loading,         setLoading]         = useState(true);
  const [err,             setErr]             = useState(null);
  const [showNew,         setShowNew]         = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      let result;
      if (search.trim()) {
        const res = await api.search({
          q: search.trim(), type: 'posts',
          post_type:   type        || undefined,
          category:    category    || undefined,
          subcategory: subcategory || undefined,
        });
        result = res.posts ?? [];
      } else {
        const sortParam = feedTab === 'urgent' ? 'urgent' : (sort !== 'recent' ? sort : undefined);
        result = await api.getPosts({
          status:      'active',
          type:        type        || undefined,
          category:    category    || undefined,
          subcategory: subcategory || undefined,
          feed_tab:    feedTab     || undefined,
          sort:        sortParam,
        }, token);
      }
      setPosts(result);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [feedTab, type, category, subcategory, search, sort, token]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  function handleCategoryChange(val) {
    setCategory(val);
    setSubcategory('');
  }

  function clearFilters() {
    setType(''); setCategory(''); setSubcategory(''); setSort('recent');
  }

  const activeFilterCount = [
    type !== '',
    category !== '',
    subcategory !== '',
    sort !== 'recent',
  ].filter(Boolean).length;

  const activeFeedTab = FEED_TABS.find(t => t.value === feedTab);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Hotlight</h1>
            <p className="page-subtitle">
              {activeFeedTab?.value ? activeFeedTab.desc : 'Needs, offers, and events from the community'}
            </p>
          </div>
          {user
            ? <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New Post</button>
            : <button className="btn btn-outline" onClick={onRequireAuth}>Sign in to post</button>
          }
        </div>

        <UrgentStrip />

        {/* Feed sub-tabs */}
        <div className="feed-subtabs">
          {FEED_TABS.map(t => (
            <button
              key={t.value}
              className={`feed-subtab${feedTab === t.value ? ' active' : ''}${t.value === 'urgent' ? ' subtab-urgent' : ''}`}
              onClick={() => setFeedTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Desktop filter rows */}
        <div className="filter-row">
          <div className="filter-tabs">
            {TYPES.map(t => (
              <button key={t.value}
                className={`filter-tab${type === t.value ? ' active' : ''}${t.value ? ` tab-${t.value}` : ''}`}
                onClick={() => setType(t.value)}>
                {t.label}
              </button>
            ))}
          </div>
          <input className="search-input" placeholder="Search…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-row" style={{ marginTop: '.5rem' }}>
          <div className="filter-tabs">
            {CATEGORIES.map(c => (
              <button key={c.value}
                className={`filter-tab${category === c.value ? ' active' : ''}`}
                onClick={() => handleCategoryChange(c.value)}>
                {c.label}
              </button>
            ))}
          </div>
          <input className="search-input" placeholder="Subcategory…" value={subcategory}
            onChange={e => setSubcategory(e.target.value)}
            style={{ width: 140 }} />
          <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Mobile filter bar */}
        <div className="filter-fab">
          <div className="filter-fab-search">
            <input className="search-input" placeholder="Search…" value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <button
            className={`filter-fab-btn${activeFilterCount > 0 ? ' has-filters' : ''}`}
            onClick={() => setShowFilterSheet(true)}
          >
            ⚙ Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>

        {loading
          ? <div className="spinner" />
          : err
            ? <p className="error-msg">{err}</p>
            : posts.length === 0
              ? <p className="empty">No posts yet — be the first to share a need or offer.</p>
              : <div className="post-grid">
                  {posts.map(p => (
                    <PostCard key={p.id} post={p} onRequireAuth={onRequireAuth} onReserved={load} />
                  ))}
                </div>
        }
      </div>

      {/* Mobile filter bottom sheet */}
      {showFilterSheet && (
        <>
          <div className="filter-sheet-backdrop" onClick={() => setShowFilterSheet(false)} />
          <div className="filter-sheet">
            <div className="filter-sheet-handle" />
            <div className="filter-sheet-header">
              <span className="filter-sheet-title">Filters</span>
              <button className="modal-close" onClick={() => setShowFilterSheet(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                {TYPES.map(t => (
                  <button key={t.value} type="button"
                    className={`filter-tab${type === t.value ? ' active' : ''}${t.value ? ` tab-${t.value}` : ''}`}
                    onClick={() => setType(t.value)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                {CATEGORIES.map(c => (
                  <button key={c.value} type="button"
                    className={`filter-tab${category === c.value ? ' active' : ''}`}
                    onClick={() => handleCategoryChange(c.value)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Subcategory</label>
              <input className="form-input" placeholder="e.g. childcare, tools…" value={subcategory}
                onChange={e => setSubcategory(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Sort by</label>
              <select className="form-select" value={sort} onChange={e => setSort(e.target.value)}>
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '.5rem', paddingTop: '.25rem' }}>
              <button className="btn btn-primary btn-full" onClick={() => setShowFilterSheet(false)}>
                Show Results
              </button>
              {activeFilterCount > 0 && (
                <button className="btn btn-outline" onClick={() => { clearFilters(); setShowFilterSheet(false); }}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {showNew && (
        <NewPostModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />
      )}
    </div>
  );
}
