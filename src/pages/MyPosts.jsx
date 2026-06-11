import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

const STATUS_LABEL = {
  active:    { label: 'Active',    color: 'var(--green)',  bg: 'var(--green-bg)' },
  fulfilled: { label: 'Fulfilled', color: '#1565c0',       bg: '#e3f2fd' },
  cancelled: { label: 'Cancelled', color: 'var(--muted)',  bg: 'var(--surface)' },
  expired:   { label: 'Expired',   color: '#b52424',       bg: '#fce8e8' },
};

const TYPE_LABEL = { need: 'Need', offer: 'Offer', event: 'Event' };
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const CATEGORIES = [
  { value: 'jobs_services', label: 'Jobs & Services' },
  { value: 'goods_supplies', label: 'Goods & Supplies' },
  { value: 'community', label: 'Community' },
];

const COMMERCE_TYPES = [
  { value: 'exchange', label: 'Exchange / Free' },
  { value: 'commerce', label: 'Commerce / Paid' },
  { value: 'urgent', label: 'Urgent' },
];

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] || { label: status, color: 'var(--muted)', bg: 'var(--surface)' };
  return (
    <span style={{
      fontSize: '.68rem', fontWeight: 700, padding: '.15rem .45rem', borderRadius: 99,
      background: s.bg, color: s.color, border: `1px solid ${s.color}44`,
      textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

function emptyEditForm(p) {
  return {
    title:             p.title        || '',
    description:       p.description  || '',
    category:          p.category     || '',
    subcategory:       p.subcategory  || '',
    commerce_type:     p.commerce_type || '',
    price:             p.price != null ? String(p.price) : '',
    expires_at:        p.expires_at   ? p.expires_at.slice(0, 10) : '',
    is_urgent:         p.is_urgent    || false,
    location:          p.location     || '',
    limit_attendance:  p.capacity != null,
    capacity:          p.capacity != null ? String(p.capacity) : '',
  };
}

export default function MyPosts() {
  const { user, token, ready } = useAuth();
  const navigate = useNavigate();
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);
  const [filter,  setFilter]  = useState('all');
  const [extendId, setExtendId] = useState(null);
  const [extendDate, setExtendDate] = useState('');
  const [extendBusy, setExtendBusy] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [editId,   setEditId]   = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editBusy, setEditBusy] = useState(false);
  const [editErr,  setEditErr]  = useState(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) { navigate('/'); return; }
    api.getMyPosts(token)
      .then(setPosts)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [ready, token, user]);

  function openEdit(p) {
    setEditId(p.id);
    setEditForm(emptyEditForm(p));
    setEditErr(null);
    setExtendId(null);
  }

  function setField(key, val) {
    setEditForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave(postId) {
    setEditBusy(true);
    setEditErr(null);
    try {
      if (editForm.limit_attendance && !editForm.capacity.trim()) {
        setEditErr('Enter a capacity limit, or turn off Limit attendance.');
        setEditBusy(false);
        return;
      }
      const payload = {
        title:         editForm.title.trim()       || undefined,
        description:   editForm.description.trim() || undefined,
        category:      editForm.category           || undefined,
        subcategory:   editForm.subcategory.trim() || undefined,
        commerce_type: editForm.commerce_type      || undefined,
        price:         editForm.price !== ''       ? parseFloat(editForm.price) : undefined,
        expires_at:    editForm.expires_at         ? new Date(editForm.expires_at).toISOString() : undefined,
        is_urgent:     editForm.is_urgent,
        location:      editForm.location.trim()    || undefined,
        // Send explicit null to clear cap when toggle is off; a number to set it.
        capacity:      editForm.limit_attendance
                         ? parseInt(editForm.capacity, 10)
                         : null,
      };
      const updated = await api.updatePost(postId, payload, token);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updated } : p));
      setEditId(null);
    } catch (e) {
      setEditErr(e.message);
    } finally {
      setEditBusy(false);
    }
  }

  async function handleComplete(postId) {
    if (!confirm('Mark this post as completed/fulfilled?')) return;
    setActionId(postId);
    try {
      const updated = await api.completePost(postId, token);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: updated.status } : p));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(postId, title) {
    if (!confirm('This will permanently remove this post and all reservations. This cannot be undone. Confirm delete?')) return;
    setActionId(postId);
    try {
      await api.deletePost(postId, token);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  }

  async function handleExtend(postId) {
    if (!extendDate) return;
    setExtendBusy(true);
    try {
      const updated = await api.extendPostExpiry(postId, new Date(extendDate).toISOString(), token);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, expires_at: updated.expires_at } : p));
      setExtendId(null);
      setExtendDate('');
    } catch (e) {
      alert(e.message);
    } finally {
      setExtendBusy(false);
    }
  }

  if (!ready) return <div className="page"><div className="container"><div className="spinner" style={{ marginTop: '3rem' }} /></div></div>;
  if (!user) return null;
  if (loading) return <div className="page"><div className="container"><div className="spinner" style={{ marginTop: '3rem' }} /></div></div>;
  if (err) return <div className="page"><div className="container"><p className="error-msg">{err}</p></div></div>;

  const now = Date.now();

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter);
  const counts = {
    all:       posts.length,
    active:    posts.filter(p => p.status === 'active').length,
    fulfilled: posts.filter(p => p.status === 'fulfilled').length,
    expired:   posts.filter(p => p.status === 'expired').length,
    cancelled: posts.filter(p => p.status === 'cancelled').length,
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 780 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">My Posts</h1>
            <p className="page-subtitle">{posts.length} posts total</p>
          </div>
          <Link to={`/profile/${user.username}`} className="btn btn-outline btn-sm">
            ← Profile
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="tabs" style={{ marginBottom: '1.25rem' }}>
          {['all', 'active', 'fulfilled', 'expired', 'cancelled'].map(f => (
            <button
              key={f}
              className={`tab-btn${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {counts[f] > 0 && <span style={{ marginLeft: '.35rem', fontSize: '.78rem', opacity: .7 }}>({counts[f]})</span>}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="empty">No {filter === 'all' ? '' : filter + ' '}posts yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {filtered.map(p => {
              const expiresAtMs = p.expires_at ? new Date(p.expires_at).getTime() : null;
              const isExpired      = expiresAtMs !== null && expiresAtMs < now;
              const isExpiringSoon = expiresAtMs !== null && !isExpired && (expiresAtMs - now) < ONE_DAY_MS;
              const canExtend      = p.status === 'active' && !isExpired;
              const canComplete    = p.status === 'active';
              const busy           = actionId === p.id;
              const isExtending    = extendId === p.id;
              const isEditing      = editId === p.id;

              return (
                <div key={p.id} className="my-posts-row">
                  <div className="my-posts-row-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', flex: 1 }}>
                      <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                        {TYPE_LABEL[p.type] || p.type}
                      </span>
                      <StatusBadge status={p.status} />
                      {isExpiringSoon && <span className="badge-expiring-soon">Expiring Soon</span>}
                    </div>
                    <span style={{ fontSize: '.75rem', color: 'var(--muted)', flexShrink: 0 }}>{fmtDate(p.created_at)}</span>
                  </div>

                  <Link to={`/posts/${p.id}`} className="my-posts-title">
                    {p.title}
                  </Link>

                  <div className="my-posts-meta">
                    {p.reservation_count > 0 && (
                      <span>🔖 {p.reservation_count} reservation{p.reservation_count !== 1 ? 's' : ''}</span>
                    )}
                    {p.rsvp_going_count > 0 && (
                      <span>✓ {p.rsvp_going_count} going</span>
                    )}
                    {p.expires_at && (
                      <span style={{ color: isExpired ? '#b52424' : isExpiringSoon ? '#ea580c' : 'var(--muted)' }}>
                        {isExpired ? 'Expired' : 'Expires'} {fmtDate(p.expires_at)}
                      </span>
                    )}
                    {p.location && <span>📍 {p.location}</span>}
                  </div>

                  <div className="my-posts-actions">
                    {canComplete && (
                      <button className="btn btn-sm btn-outline" disabled={busy}
                        onClick={() => handleComplete(p.id)}
                        style={{ fontSize: '.78rem' }}>
                        {busy ? '…' : '✓ Mark Complete'}
                      </button>
                    )}
                    {canExtend && !isEditing && (
                      isExtending ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                          <input
                            type="date"
                            className="form-input"
                            style={{ padding: '.25rem .5rem', fontSize: '.8rem', width: 'auto' }}
                            value={extendDate}
                            min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                            onChange={e => setExtendDate(e.target.value)}
                          />
                          <button className="btn btn-sm btn-primary" onClick={() => handleExtend(p.id)} disabled={extendBusy || !extendDate}>
                            {extendBusy ? '…' : 'Save'}
                          </button>
                          <button className="btn btn-sm btn-ghost" onClick={() => { setExtendId(null); setExtendDate(''); }}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-sm btn-outline" disabled={busy}
                          onClick={() => setExtendId(p.id)}
                          style={{ fontSize: '.78rem' }}>
                          Extend Expiry
                        </button>
                      )
                    )}
                    <button
                      className={`btn btn-sm${isEditing ? ' btn-primary' : ' btn-outline'}`}
                      disabled={busy}
                      onClick={() => isEditing ? setEditId(null) : openEdit(p)}
                      style={{ fontSize: '.78rem' }}>
                      {isEditing ? '✕ Cancel Edit' : 'Edit'}
                    </button>
                    <button className="btn btn-sm btn-danger" disabled={busy}
                      onClick={() => handleDelete(p.id, p.title)}
                      style={{ fontSize: '.78rem', marginLeft: 'auto' }}>
                      {busy ? '…' : 'Delete'}
                    </button>
                  </div>

                  {isEditing && (
                    <div style={{
                      marginTop: '.75rem', padding: '1rem', borderRadius: 8,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      display: 'flex', flexDirection: 'column', gap: '.75rem',
                    }}>
                      <p style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                        Edit Post
                      </p>

                      <div>
                        <label className="form-label">Title</label>
                        <input
                          className="form-input"
                          value={editForm.title}
                          onChange={e => setField('title', e.target.value)}
                          placeholder="Post title"
                        />
                      </div>

                      <div>
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-input"
                          rows={3}
                          value={editForm.description}
                          onChange={e => setField('description', e.target.value)}
                          placeholder="Describe your post…"
                          style={{ resize: 'vertical' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
                        <div>
                          <label className="form-label">Category</label>
                          <select
                            className="form-input"
                            value={editForm.category}
                            onChange={e => setField('category', e.target.value)}
                          >
                            <option value="">— select —</option>
                            {CATEGORIES.map(c => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Subcategory</label>
                          <input
                            className="form-input"
                            value={editForm.subcategory}
                            onChange={e => setField('subcategory', e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
                        <div>
                          <label className="form-label">Commerce Type</label>
                          <select
                            className="form-input"
                            value={editForm.commerce_type}
                            onChange={e => setField('commerce_type', e.target.value)}
                          >
                            <option value="">— select —</option>
                            {COMMERCE_TYPES.map(c => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Price ($)</label>
                          <input
                            className="form-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.price}
                            onChange={e => setField('price', e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
                        <div>
                          <label className="form-label">Expiry Date</label>
                          <input
                            className="form-input"
                            type="date"
                            value={editForm.expires_at}
                            onChange={e => setField('expires_at', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="form-label">Attendance</label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', fontSize: '.85rem', marginBottom: editForm.limit_attendance ? '.4rem' : 0 }}>
                            <input
                              type="checkbox"
                              checked={editForm.limit_attendance}
                              onChange={e => setField('limit_attendance', e.target.checked)}
                              style={{ width: 14, height: 14 }}
                            />
                            Limit attendance?
                          </label>
                          {editForm.limit_attendance && (
                            <input
                              className="form-input"
                              type="number"
                              min="1"
                              value={editForm.capacity}
                              onChange={e => setField('capacity', e.target.value)}
                              placeholder="Max spots"
                            />
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Location</label>
                        <input
                          className="form-input"
                          value={editForm.location}
                          onChange={e => setField('location', e.target.value)}
                          placeholder="City, neighborhood, or address"
                        />
                      </div>

                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', fontSize: '.88rem' }}>
                          <input
                            type="checkbox"
                            checked={editForm.is_urgent}
                            onChange={e => setField('is_urgent', e.target.checked)}
                          />
                          Mark as urgent
                        </label>
                      </div>

                      {editErr && <p className="error-msg" style={{ margin: 0 }}>{editErr}</p>}

                      <div style={{ display: 'flex', gap: '.5rem' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSave(p.id)}
                          disabled={editBusy || !editForm.title.trim()}
                        >
                          {editBusy ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setEditId(null)}
                          disabled={editBusy}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
