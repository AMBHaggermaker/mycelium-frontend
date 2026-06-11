import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import EventLocationMap from '../components/EventLocationMap';

const BASE_URL = 'https://mycelium.unprecedentedtimes.org';

const TYPE_BADGE = { need: 'badge-need', offer: 'badge-offer', event: 'badge-event' };

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtShort(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TimeUntil({ date, label }) {
  const ms  = new Date(date) - Date.now();
  const abs = Math.abs(ms);
  const past = ms < 0;
  const mins  = Math.floor(abs / 60000);
  const hours = Math.floor(abs / 3600000);
  const days  = Math.floor(abs / 86400000);
  const str   = days > 1 ? `${days} days` : hours > 0 ? `${hours}h` : `${mins}m`;
  return (
    <span style={{ fontSize: '.78rem', color: past ? 'var(--muted)' : '#ea580c' }}>
      {label}: {past ? `${str} ago` : `in ${str}`}
    </span>
  );
}

function AuthorBlock({ post }) {
  const initials = (post.username || '?')[0].toUpperCase();
  return (
    <div className="post-detail-author">
      <div className="post-detail-avatar">
        {post.author_avatar_url
          ? <img src={`${BASE_URL}${post.author_avatar_url}`} alt={post.username} />
          : initials
        }
      </div>
      <div className="post-detail-author-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
          <Link to={`/profile/${post.username}`} className="post-detail-author-name">
            {post.username}
          </Link>
          {post.author_founding_member && (
            <span className="founding-badge" title="Founding member">⬡ Founding Member</span>
          )}
          {post.author_verified && !post.author_founding_member && (
            <span className="verified-badge" title="Verified member">✓ Verified</span>
          )}
          <span className="score" style={{ fontSize: '.78rem' }}>
            ★ {parseFloat(post.reliability_score || 5).toFixed(1)}
          </span>
        </div>
        {post.author_bio && (
          <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: '.2rem 0 0', lineHeight: 1.4 }}>
            {post.author_bio}
          </p>
        )}
      </div>
    </div>
  );
}

function MediaGallery({ media }) {
  const [lightbox, setLightbox] = useState(null);
  if (!media?.length) return null;
  return (
    <>
      <div className="post-detail-gallery">
        {media.map(m => {
          const url = `${BASE_URL}${m.url}`;
          const isVideo = m.mime_type?.startsWith('video/');
          return (
            <div key={m.id} className="post-detail-gallery-item" onClick={() => !isVideo && setLightbox(url)}>
              {isVideo
                ? <video src={url} controls />
                : <img src={url} alt="" loading="lazy" />
              }
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

function CommentItem({ comment }) {
  const initials = (comment.username || '?')[0].toUpperCase();
  return (
    <div className="post-detail-comment">
      <div className="post-detail-comment-avatar">
        {comment.avatar_url
          ? <img src={`${BASE_URL}${comment.avatar_url}`} alt={comment.username} />
          : initials
        }
      </div>
      <div className="post-detail-comment-body">
        <div className="post-detail-comment-meta">
          <Link to={`/profile/${comment.username}`} className="username-link" style={{ fontWeight: 600 }}>
            {comment.username}
          </Link>
          {comment.founding_member && (
            <span style={{ fontSize: '.68rem', color: 'var(--green)', fontWeight: 700 }}>⬡</span>
          )}
          {comment.verified && !comment.founding_member && (
            <span style={{ fontSize: '.68rem', color: 'var(--blue)', fontWeight: 700 }}>✓</span>
          )}
          <span style={{ fontSize: '.72rem', color: 'var(--muted)', marginLeft: '.35rem' }}>
            {fmtShort(comment.created_at)}
          </span>
        </div>
        <p className="post-detail-comment-text">{comment.content}</p>
      </div>
    </div>
  );
}

export default function PostDetailPage({ onRequireAuth }) {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [post,    setPost]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);

  const [reservationId, setReservationId] = useState(null);
  const [reserving,     setReserving]     = useState(false);
  const [cancelling,    setCancelling]    = useState(false);
  const [reserveErr,    setReserveErr]    = useState(null);

  const [rsvp,     setRsvp]     = useState(null);
  const [rsvpBusy, setRsvpBusy] = useState(false);

  const [comments,        setComments]        = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment,      setNewComment]      = useState('');
  const [submitting,      setSubmitting]      = useState(false);
  const [commentErr,      setCommentErr]      = useState(null);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getPost(id)
      .then(p => { setPost(p); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });

    api.getPostComments(id)
      .then(setComments)
      .catch(() => {})
      .finally(() => setCommentsLoading(false));

    if (user && token) {
      api.getMyReservation(id, token)
        .then(r => { if (r?.reservation_id) setReservationId(r.reservation_id); })
        .catch(() => {});
      api.getRsvp(id, token)
        .then(r => { if (r?.status) setRsvp(r.status); })
        .catch(() => {});
    }
  }, [id, token]);

  async function handleRsvp(status) {
    if (!user) { onRequireAuth?.(); return; }
    setRsvpBusy(true);
    try {
      if (rsvp === status) {
        await api.removeRsvp(id, token);
        setRsvp(null);
      } else {
        const r = await api.setRsvp(id, status, token);
        setRsvp(r.rsvp.status);
      }
    } catch { /* ignore */ }
    finally { setRsvpBusy(false); }
  }

  async function handleReserve() {
    if (!user) { onRequireAuth?.(); return; }
    setReserving(true); setReserveErr(null);
    try {
      const res = await api.createReservation({ post_id: id }, token);
      setReservationId(res.id);
      setPost(p => ({ ...p, reserved_count: (p.reserved_count || 0) + 1 }));
    } catch (e) {
      setReserveErr(e.message);
    } finally {
      setReserving(false);
    }
  }

  async function handleCancel() {
    if (!reservationId) return;
    setCancelling(true); setReserveErr(null);
    try {
      await api.cancelReservation(reservationId, token);
      setReservationId(null);
      setPost(p => ({ ...p, reserved_count: Math.max(0, (p.reserved_count || 1) - 1) }));
    } catch (e) {
      setReserveErr(e.message);
    } finally {
      setCancelling(false);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) { onRequireAuth?.(); return; }
    setSubmitting(true); setCommentErr(null);
    try {
      const c = await api.addPostComment(id, { content: newComment.trim() }, token);
      setComments(prev => [...prev, c]);
      setNewComment('');
    } catch (e) {
      setCommentErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        <div className="spinner" style={{ marginTop: '4rem' }} />
      </div>
    </div>
  );

  if (err || !post) return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700, paddingTop: '3rem' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>← Back</button>
        <p className="error-msg">{err || 'Post not found.'}</p>
      </div>
    </div>
  );

  const isOwn      = user?.id === post.user_id;
  const canDelete  = isOwn || user?.role === 'admin' || user?.role === 'moderator';
  const cap    = post.capacity;
  const filled = post.reserved_count ?? 0;
  const isFull = cap !== null && filled >= cap;
  const pct    = cap ? Math.min(100, (filled / cap) * 100) : 0;

  const autoUrgent = post.auto_urgent;
  const selfUrgent = post.is_urgent;
  const now = Date.now();
  const expiresAt = post.expires_at ? new Date(post.expires_at) : null;
  const isExpired = expiresAt && expiresAt < now;
  const isExpiringSoon = expiresAt && !isExpired && (expiresAt - now) < 24 * 60 * 60 * 1000;

  async function handleDelete() {
    const isMod = !isOwn && (user?.role === 'admin' || user?.role === 'moderator');
    const msg = isMod
      ? 'You are removing this post as a moderator. This action is logged. Confirm removal.'
      : 'Are you sure you want to delete this post? This cannot be undone.';
    if (!confirm(msg)) return;
    setDeleting(true);
    try {
      await api.deletePost(post.id, token);
      if (isMod) {
        api.logModerationAction({ action: 'delete_post', target_type: 'post', target_id: post.id }, token)
          .catch(() => {});
      }
      navigate(-1);
    } catch (e) {
      alert(e.message);
      setDeleting(false);
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => navigate(-1)}
          style={{ marginBottom: '1.5rem' }}
        >
          ← Back
        </button>

        <div className="post-detail-card">
          {/* Header row */}
          <div className="post-detail-header">
            <span className={`badge ${TYPE_BADGE[post.type] || ''}`}>{post.type}</span>
            {(autoUrgent || selfUrgent) && (
              <span className={`urgency-dot ${autoUrgent ? 'dot-auto' : 'dot-self'}`}
                title={autoUrgent ? 'Auto-flagged urgent' : 'Poster-flagged urgent'} />
            )}
            {post.category && (
              <span style={{
                fontSize: '.72rem', padding: '.15rem .45rem', borderRadius: 99,
                background: 'var(--surface)', color: 'var(--muted)',
                border: '1px solid var(--border)', fontWeight: 500,
              }}>
                {post.category.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            )}
            {post.subcategory && (
              <span style={{
                fontSize: '.72rem', padding: '.15rem .45rem', borderRadius: 99,
                background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)',
              }}>
                {post.subcategory}
              </span>
            )}
            {isExpiringSoon && (
              <span className="badge-expiring-soon"
                title={`Expires ${expiresAt.toLocaleString()}`}>
                Expiring Soon
              </span>
            )}
            {isExpired && (
              <span className="badge-expired">Expired</span>
            )}
          </div>

          {/* Author */}
          <AuthorBlock post={post} />

          {/* Title & price */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem', flexWrap: 'wrap', margin: '1.25rem 0 .5rem' }}>
            <h1 className="post-detail-title">{post.title}</h1>
            {post.commerce_type === 'commerce' && post.price != null && (
              <span className="post-price" style={{ flexShrink: 0, marginTop: '.15rem' }}>
                ${parseFloat(post.price).toFixed(2)}
              </span>
            )}
            {post.commerce_type === 'exchange' && (
              <span className="post-exchange-badge">Exchange</span>
            )}
          </div>

          {/* Description */}
          {post.description && (
            <p className="post-detail-body">{post.description}</p>
          )}

          {/* Media */}
          <MediaGallery media={post.media} />

          {/* Meta info */}
          <div className="post-detail-meta">
            {post.location    && <span>📍 {post.location}</span>}
            {post.circle_name && <span>⬡ {post.circle_name}</span>}
            {post.starts_at   && <span>🗓 Starts: {fmt(post.starts_at)}</span>}
            {post.ends_at     && <span>🏁 Ends: {fmt(post.ends_at)}</span>}
            {expiresAt && !isExpired && <TimeUntil date={expiresAt} label="Expires" />}
            {post.source_url  && (
              <a href={post.source_url} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--blue)' }}>
                Source →
              </a>
            )}
          </div>

          {/* Event location map */}
          {post.type === 'event' && post.location_lat && post.location_lng && (
            <EventLocationMap
              lat={post.location_lat}
              lng={post.location_lng}
              address={post.location}
              title={post.title}
            />
          )}

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="tags" style={{ marginTop: '.5rem' }}>
              {post.tags.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
          )}

          {/* Capacity / headcount */}
          {cap !== null ? (
            <div className="capacity-section" style={{ marginTop: '1rem' }}>
              <div className="capacity-bar">
                <div className={`capacity-fill${isFull ? ' full' : ''}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="capacity-label">{filled} / {cap} spots filled</span>
            </div>
          ) : filled > 0 ? (
            <div className="capacity-section" style={{ marginTop: '1rem' }}>
              <span className="capacity-label">{filled} {filled === 1 ? 'person' : 'people'} going</span>
            </div>
          ) : null}

          {/* RSVP (events) */}
          {post.type === 'event' && (
            <div style={{ marginTop: '1rem' }}>
              <div className="post-rsvp-row">
                <span style={{ fontSize: '.82rem', color: 'var(--muted)', marginRight: '.5rem' }}>RSVP:</span>
                {['going', 'interested', 'saved'].map(s => (
                  <button key={s}
                    className={`btn btn-sm post-rsvp-btn rsvp-${s}${rsvp === s ? ' active' : ''}`}
                    onClick={() => handleRsvp(s)}
                    disabled={rsvpBusy}
                  >
                    {s === 'going' ? '✓ Going' : s === 'interested' ? '★ Interested' : '🔖 Save'}
                  </button>
                ))}
              </div>
              <div className="post-rsvp-tallies" style={{ marginTop: '.4rem' }}>
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

          {/* Reserve / cancel */}
          {reserveErr && <p className="card-error" style={{ marginTop: '.75rem' }}>{reserveErr}</p>}
          {!isOwn && post.status === 'active' && !isExpired && post.type !== 'event' && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem' }}>
              {reservationId ? (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? '…' : 'Cancel Reservation'}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleReserve}
                  disabled={reserving || isFull}
                >
                  {isFull ? 'Full' : reserving ? '…' : 'Reserve a Spot'}
                </button>
              )}
            </div>
          )}

          {/* Delete */}
          {canDelete && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete Post'}
              </button>
              <span style={{ marginLeft: '.75rem', fontSize: '.78rem', color: 'var(--muted)' }}>
                Permanently removes this post and all reservations.
              </span>
            </div>
          )}
        </div>

        {/* Comment thread */}
        <div className="post-detail-comments">
          <h2 className="post-detail-comments-heading">
            Comments {comments.length > 0 && <span className="watch-reports-count">({comments.length})</span>}
          </h2>

          {commentsLoading ? (
            <div className="spinner" />
          ) : comments.length === 0 ? (
            <p className="empty" style={{ margin: '.5rem 0 1rem' }}>No comments yet.</p>
          ) : (
            <div className="post-detail-comment-list">
              {comments.map(c => <CommentItem key={c.id} comment={c} />)}
            </div>
          )}

          {user ? (
            <form onSubmit={submitComment} className="post-detail-comment-form">
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Add a comment…"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                maxLength={2000}
              />
              {commentErr && <p className="form-error">{commentErr}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '.5rem' }}>
                <button className="btn btn-primary btn-sm" disabled={submitting || !newComment.trim()}>
                  {submitting ? '…' : 'Post Comment'}
                </button>
              </div>
            </form>
          ) : (
            <button className="btn btn-outline btn-sm" onClick={onRequireAuth} style={{ marginTop: '.5rem' }}>
              Sign in to comment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
