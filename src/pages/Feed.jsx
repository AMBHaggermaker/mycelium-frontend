import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth';
import api from '../api';
import PostCard from '../components/PostCard';
import NewPostModal from '../components/NewPostModal';
import UrgentStrip from '../components/UrgentStrip';
import { getSocket } from '../socket';

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
  // token is also used by the Live Network sidebar
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
  const [covenantDismissed, setCovenantDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('covenant_banner_dismissed') === '1'
  );

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
    <div className="page feed-page-layout">
      {/* Mobile Live button */}
      <MobileLiveDrawer token={token} />

      <div className="feed-main-col">
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

        {/* Covenant banner */}
        {!covenantDismissed && (
          <div className="covenant-banner">
            <div className="covenant-banner-body">
              <span className="covenant-banner-icon">⬡</span>
              <div>
                <strong className="covenant-banner-title">The Mycelium Covenant</strong>
                <p className="covenant-banner-desc">The principles this community is built on</p>
              </div>
              <a
                href="/covenant"
                className="btn btn-sm btn-primary covenant-banner-btn"
              >
                Read &amp; Agree
              </a>
              <button
                className="covenant-banner-dismiss"
                onClick={() => {
                  setCovenantDismissed(true);
                  localStorage.setItem('covenant_banner_dismissed', '1');
                }}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

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

    <aside className="live-network-sidebar">
      <LiveNetworkPanel token={token} />
    </aside>
  </div>
  );
}

// ── Live Network Panel ────────────────────────────────────────────────────────

const ACTIVITY_LABELS = {
  new_post:     (d) => `New ${d.type}: ${d.title?.slice(0, 40)}`,
  rsvp:         (d) => `Someone marked Going: ${d.event_title?.slice(0, 35)}`,
  watch_report: (d) => `Watch report: ${d.dashboard || 'submitted'}`,
  chat_message: (d) => `Chat activity: ${d.room_name || 'room'}`,
  new_member:   (d) => `New member joined${d.location ? ` · ${d.location}` : ''}`,
  pattern_report:(d)=> `Pattern flagged: ${d.institution?.slice(0, 35)}`,
  anomaly:      (d) => `Anomaly detected: ${d.description?.slice(0, 40)}`,
};

const SEVERITY_STYLES = {
  urgent:   { background: '#fff3cd', borderLeft: '3px solid #e8a400', color: '#7a4f00' },
  critical: { background: '#fce8e8', borderLeft: '3px solid #b52424', color: '#b52424' },
  success:  { background: '#eef8ee', borderLeft: '3px solid #2a5f0a', color: '#2a5f0a' },
  normal:   { background: 'var(--surface)', borderLeft: '3px solid var(--border)' },
};

function LiveNetworkPanel({ token }) {
  const [activities, setActivities] = useState([]);
  const [activeNow,  setActiveNow]  = useState(0);
  const [todayStats, setTodayStats] = useState(null);
  const [newIds,     setNewIds]     = useState(new Set());

  useEffect(() => {
    api.getTodayActivity().then(setTodayStats).catch(() => {});
    const iv = setInterval(() => api.getTodayActivity().then(setTodayStats).catch(() => {}), 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    function onActivity(event) {
      const item = { ...event, _id: Math.random().toString(36).slice(2) };
      setActivities(prev => [item, ...prev].slice(0, 20));
      setNewIds(ids => {
        const next = new Set([...ids, item._id]);
        setTimeout(() => setNewIds(s => { const n = new Set(s); n.delete(item._id); return n; }), 1500);
        return next;
      });
    }
    function onPresence({ active }) { setActiveNow(active); }

    socket.on('network_activity', onActivity);
    socket.on('presence_update', onPresence);
    return () => { socket.off('network_activity', onActivity); socket.off('presence_update', onPresence); };
  }, [token]);

  return (
    <div className="live-network-panel">
      <div className="live-network-header">
        <span className="live-dot" />
        <span className="live-network-title">Live Network</span>
        {activeNow > 0 && <span className="live-active-count">{activeNow} online</span>}
      </div>

      {todayStats && (
        <div className="live-today-stats">
          <div className="live-stat"><span className="live-stat-val">{todayStats.posts_today}</span><span>posts</span></div>
          <div className="live-stat"><span className="live-stat-val">{todayStats.urgent_today}</span><span>urgent</span></div>
          <div className="live-stat"><span className="live-stat-val">{todayStats.members_today}</span><span>new members</span></div>
          <div className="live-stat"><span className="live-stat-val">{todayStats.rsvps_today}</span><span>rsvps</span></div>
        </div>
      )}

      <div className="live-activity-feed">
        {activities.length === 0 && (
          <p style={{ fontSize: '.8rem', color: 'var(--muted)', padding: '.5rem', textAlign: 'center' }}>
            Waiting for activity…
          </p>
        )}
        {activities.map(item => (
          <div key={item._id}
            className={'live-activity-item' + (newIds.has(item._id) ? ' live-item-pulse' : '')}
            style={SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.normal}
          >
            <p className="live-activity-text">
              {ACTIVITY_LABELS[item.type]?.(item.data || {}) || item.type}
            </p>
            <span className="live-activity-time">
              {new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mobile Live Drawer ────────────────────────────────────────────────────────

function MobileLiveDrawer({ token }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    function onActivity() { if (!open) setUnread(n => n + 1); }
    socket.on('network_activity', onActivity);
    return () => socket.off('network_activity', onActivity);
  }, [token, open]);

  function handleOpen() { setOpen(true); setUnread(0); }

  return (
    <>
      <button className="live-mobile-btn" onClick={handleOpen}>
        <span className="live-dot" />
        Live{unread > 0 && <span className="live-mobile-badge">{unread}</span>}
      </button>
      {open && (
        <div className="live-mobile-drawer-backdrop" onClick={() => setOpen(false)}>
          <div className="live-mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="live-mobile-drawer-handle" onClick={() => setOpen(false)} />
            <LiveNetworkPanel token={token} />
          </div>
        </div>
      )}
    </>
  );
}
