import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

const TYPE_BADGE = { need: 'badge-need', offer: 'badge-offer', event: 'badge-event' };
const BASE_URL = 'https://mycelium.unprecedentedtimes.org';

const CATEGORY_LABELS = {
  jobs_services:  'Jobs & Services',
  goods_supplies: 'Goods & Supplies',
  community:      'Community',
};

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function MediaGrid({ media }) {
  const [lightbox, setLightbox] = useState(null);
  if (!media?.length) return null;

  const visible = media.slice(0, 4);
  const extra = media.length - 4;
  const countClass = media.length === 1 ? 'count-1' : media.length === 2 ? 'count-2' : media.length === 3 ? 'count-3' : 'count-4';

  return (
    <>
      <div className={`media-grid ${countClass}`}>
        {visible.map((m, i) => {
          const isVideo = m.mime_type?.startsWith('video/');
          const url = m.url?.startsWith('http') ? m.url : `${BASE_URL}${m.url}`;
          const isLast = i === 3 && extra > 0;
          return (
            <div key={m.id} className="media-item" onClick={() => !isVideo && setLightbox(url)}>
              {isVideo
                ? <video src={url} controls onClick={e => e.stopPropagation()} />
                : <img src={url} alt="" loading="lazy" />
              }
              {isLast && <div className="media-more-overlay">+{extra + 1}</div>}
            </div>
          );
        })}
      </div>
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function PostCard({ post, onRequireAuth, onReserved, onDeleted }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [reserving, setReserving] = useState(false);
  const [reserved,  setReserved]  = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported,  setReported]  = useState(false);
  const [rsvp,      setRsvp]      = useState(post.my_rsvp || null);
  const [rsvpBusy,  setRsvpBusy]  = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [err, setErr]             = useState(null);

  async function handleRsvp(status) {
    if (!user) { onRequireAuth?.(); return; }
    setRsvpBusy(true); setErr(null);
    try {
      if (rsvp === status) {
        await api.removeRsvp(post.id, token);
        setRsvp(null);
      } else {
        const r = await api.setRsvp(post.id, status, token);
        setRsvp(r.rsvp.status);
      }
    } catch (e) { setErr(e.message); }
    finally { setRsvpBusy(false); }
  }

  const isOwn      = user?.id === post.user_id;
  const canDelete  = isOwn || user?.role === 'admin' || user?.role === 'moderator';

  const nowMs       = Date.now();
  const expiresAtMs = post.expires_at ? new Date(post.expires_at).getTime() : null;
  const isExpired   = expiresAtMs !== null && expiresAtMs < nowMs;
  const isExpiringSoon = expiresAtMs !== null && !isExpired && (expiresAtMs - nowMs) < ONE_DAY_MS;

  async function handleDelete(e) {
    e.stopPropagation();
    if (!confirm('This will permanently remove this post and all reservations. This cannot be undone. Confirm delete?')) return;
    setDeleting(true);
    try {
      await api.deletePost(post.id, token);
      onDeleted?.(post.id);
    } catch (e) {
      setErr(e.message);
      setDeleting(false);
    }
  }
  const cap    = post.capacity;
  const filled = post.reserved_count ?? 0;
  const isFull = cap !== null && filled >= cap;
  const pct    = cap ? Math.min(100, (filled / cap) * 100) : 0;

  async function report() {
    if (!user) { onRequireAuth?.(); return; }
    setReporting(true); setErr(null);
    try {
      await api.reportPost(post.id, token);
      setReported(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setReporting(false);
    }
  }

  async function reserve() {
    if (!user) { onRequireAuth?.(); return; }
    setReserving(true); setErr(null);
    try {
      await api.createReservation({ post_id: post.id }, token);
      setReserved(true);
      onReserved?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setReserving(false);
    }
  }

  const urgencyDot = post.auto_urgent
    ? <span className="urgency-dot dot-auto" title="Automatically flagged as urgent" />
    : post.is_urgent
      ? <span className="urgency-dot dot-self" title="Poster marked as urgent" />
      : null;

  return (
    <div
      className={`card post-card${isExpired ? ' post-card-expired' : ''}`}
      onClick={e => { if (!e.defaultPrevented) navigate(`/posts/${post.id}`); }}
      style={{ cursor: 'pointer' }}
    >
      <div className="post-header">
        <span className={`badge ${TYPE_BADGE[post.type]}`}>{post.type}</span>
        {urgencyDot}
        {isExpiringSoon && (
          <span className="badge-expiring-soon" title={`Expires ${new Date(post.expires_at).toLocaleString()}`}>
            Expiring Soon
          </span>
        )}
        {isExpired && (
          <span className="badge-expired">Expired</span>
        )}
        {(post.category || post.subcategory) && (
          <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {post.category && (
              <span style={{
                fontSize: '.72rem', padding: '.15rem .45rem', borderRadius: 99,
                background: 'var(--surface-2, #f0f0f0)', color: 'var(--muted)',
                border: '1px solid var(--border)', fontWeight: 500, lineHeight: 1.4,
              }}>
                {CATEGORY_LABELS[post.category]}
              </span>
            )}
            {post.subcategory && (
              <span style={{
                fontSize: '.72rem', padding: '.15rem .45rem', borderRadius: 99,
                background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', lineHeight: 1.4,
              }}>
                {post.subcategory}
              </span>
            )}
          </div>
        )}
        <span className="post-meta" style={{ marginLeft: 'auto' }}>
          <Link
            to={`/profile/${post.username}`}
            className="username-link"
            onClick={e => e.stopPropagation()}
          >
            {post.username}
          </Link>
          {post.founding_member && (
            <span className="post-founding-dot" title="Founding member">⬡</span>
          )}
          <span className="score">★ {parseFloat(post.reliability_score || 5).toFixed(1)}</span>
        </span>
      </div>

      <div className="post-title-row">
        <h3 className="post-title">{post.title}</h3>
        {post.commerce_type === 'commerce' && post.price != null && (
          <span className="post-price">${parseFloat(post.price).toFixed(2)}</span>
        )}
        {post.commerce_type === 'exchange' && (
          <span className="post-exchange-badge">Exchange</span>
        )}
      </div>

      {post.business_id && post.business_name && (
        <div className="post-business-link" onClick={e => e.stopPropagation()}>
          <Link to={`/businesses/${post.business_id}`} className="post-business-link-inner">
            🏪 {post.business_name}
          </Link>
        </div>
      )}

      {post.description && <p className="post-description">{post.description}</p>}

      <div onClick={e => e.stopPropagation()}>
        <MediaGrid media={post.media} />
      </div>

      <div className="post-details">
        {post.location    && <span>📍 {post.location}</span>}
        {post.starts_at   && <span>🗓 {fmt(post.starts_at)}</span>}
        {post.circle_name && <span>⬡ {post.circle_name}</span>}
      </div>

      {post.tags?.length > 0 && (
        <div className="tags">
          {post.tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      )}

      {cap !== null && (
        <div className="capacity-section">
          <div className="capacity-bar">
            <div className={`capacity-fill${isFull ? ' full' : ''}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="capacity-label">{filled} / {cap} spots</span>
        </div>
      )}

      {err && <p className="card-error">{err}</p>}

      {post.type === 'event' && (
        <div className="post-rsvp-row" onClick={e => e.stopPropagation()}>
          {['going', 'interested', 'saved'].map(s => (
            <button key={s}
              className={`btn btn-xs post-rsvp-btn rsvp-${s}${rsvp === s ? ' active' : ''}`}
              onClick={() => handleRsvp(s)}
              disabled={rsvpBusy}
              title={s.charAt(0).toUpperCase() + s.slice(1)}
            >
              {s === 'going' ? '✓ Going' : s === 'interested' ? '★ Interested' : '🔖 Save'}
            </button>
          ))}
          <div className="post-rsvp-tallies">
            {(post.rsvp_going_count > 0) && (
              <span className="post-rsvp-tally tally-going">{post.rsvp_going_count} going</span>
            )}
            {(post.rsvp_interested_count > 0) && (
              <span className="post-rsvp-tally tally-interested">{post.rsvp_interested_count} interested</span>
            )}
            {(post.rsvp_saved_count > 0) && (
              <span className="post-rsvp-tally tally-saved">{post.rsvp_saved_count} saved</span>
            )}
          </div>
        </div>
      )}

      {!isOwn && post.status === 'active' && post.type !== 'event' && (
        <div className="post-actions" onClick={e => e.stopPropagation()}>
          <button
            className={`btn btn-sm ${reserved ? 'btn-success' : 'btn-primary'}`}
            onClick={reserve}
            disabled={reserving || reserved || isFull}
          >
            {reserved ? 'Reserved ✓' : isFull ? 'Full' : reserving ? '…' : 'Reserve'}
          </button>
          <button
            className={`btn-report${reported ? ' reported' : ''}`}
            onClick={report}
            disabled={reporting || reported}
            title={reported ? 'Reported' : 'Report this post'}
            style={{ marginLeft: 'auto' }}
          >
            {reported ? 'Reported' : 'Report'}
          </button>
          {canDelete && (
            <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? '…' : 'Delete'}
            </button>
          )}
        </div>
      )}

      {!isOwn && post.status === 'active' && post.type === 'event' && (
        <div className="post-actions" onClick={e => e.stopPropagation()}>
          <button
            className={`btn-report${reported ? ' reported' : ''}`}
            onClick={report}
            disabled={reporting || reported}
            title={reported ? 'Reported' : 'Report this post'}
          >
            {reported ? 'Reported' : 'Report'}
          </button>
          {canDelete && (
            <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? '…' : 'Delete'}
            </button>
          )}
        </div>
      )}

      {isOwn && (
        <div className="post-actions post-owner-actions" onClick={e => e.stopPropagation()}>
          <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}
