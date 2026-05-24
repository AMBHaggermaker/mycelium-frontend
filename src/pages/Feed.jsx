import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth';
import api from '../api';
import PostCard from '../components/PostCard';
import NewPostModal from '../components/NewPostModal';
import UrgentStrip from '../components/UrgentStrip';

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

export default function Feed({ onRequireAuth }) {
  const { user, token } = useAuth();
  const [posts,       setPosts]       = useState([]);
  const [type,        setType]        = useState('');
  const [category,    setCategory]    = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [err,         setErr]         = useState(null);
  const [showNew,     setShowNew]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      let result;
      if (search.trim()) {
        const res = await api.search({
          q: search.trim(), type: 'posts',
          post_type:  type        || undefined,
          category:   category    || undefined,
          subcategory: subcategory || undefined,
        });
        result = res.posts ?? [];
      } else {
        result = await api.getPosts({
          status:     'active',
          type:       type        || undefined,
          category:   category    || undefined,
          subcategory: subcategory || undefined,
        }, token);
      }
      setPosts(result);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [type, category, subcategory, search, token]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  function handleCategoryChange(val) {
    setCategory(val);
    setSubcategory('');
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Hotlight</h1>
            <p className="page-subtitle">Needs, offers, and events from the community</p>
          </div>
          {user
            ? <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New Post</button>
            : <button className="btn btn-outline" onClick={onRequireAuth}>Sign in to post</button>
          }
        </div>

        <UrgentStrip />

        {/* Row 1: type tabs + search */}
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

        {/* Row 2: category tabs + subcategory filter */}
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
            style={{ width: 160 }} />
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

      {showNew && (
        <NewPostModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />
      )}
    </div>
  );
}
