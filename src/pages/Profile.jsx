import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import PostCard from '../components/PostCard';
import InviteModal from '../components/InviteModal';

const TYPE_BADGE = { need: 'badge-need', offer: 'badge-offer', event: 'badge-event' };

function scoreColor(s) {
  if (s >= 7.5) return 'var(--green)';
  if (s >= 5)   return 'var(--amber)';
  return 'var(--red)';
}

const BASE_URL = 'https://mycelium.unprecedentedtimes.org';

export default function Profile() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const isOwn = user?.id === id;

  const [profile,  setProfile]  = useState(null);
  const [posts,    setPosts]    = useState([]);
  const [circles,  setCircles]  = useState([]);
  const [tab,      setTab]      = useState('posts');
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState(null);
  const [editing,  setEditing]  = useState(false);
  const [editForm, setEditForm] = useState({ username: '', bio: '', location: '' });
  const [saving,    setSaving]   = useState(false);
  const [saveErr,   setSaveErr]  = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const [u, p, c] = await Promise.all([
        api.getUser(id),
        api.getUserPosts(id, { limit: 30 }),
        api.getUserCircles(id),
      ]);
      setProfile(u); setPosts(p); setCircles(c);
      setEditForm({ username: u.username, bio: u.bio || '', location: u.location || '' });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const updated = await api.uploadAvatar(id, file, token);
      setProfile(updated);
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true); setSaveErr(null);
    try {
      const updated = await api.updateUser(id, editForm, token);
      setProfile(updated);
      setEditing(false);
    } catch (e) {
      setSaveErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page"><div className="container"><div className="spinner" /></div></div>;
  if (err)     return <div className="page"><div className="container"><p className="error-msg">{err}</p></div></div>;

  const score = parseFloat(profile.reliability_score ?? 5);

  return (
    <div className="page">
      <div className="container">

        {/* Profile header */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          {editing ? (
            <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input className="form-input" value={editForm.username}
                    onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" value={editForm.location}
                    onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-textarea" value={editForm.bio}
                  onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} />
              </div>
              {saveErr && <p className="form-error">{saveErr}</p>}
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button className="btn btn-primary btn-sm" disabled={saving}>{saving ? '…' : 'Save'}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="profile-header">
              {isOwn ? (
                <div className="avatar avatar-upload" onClick={() => fileInputRef.current?.click()} title="Change photo">
                  {profile.avatar_url
                    ? <img src={`${BASE_URL}${profile.avatar_url}`} alt={profile.username} />
                    : profile.username[0].toUpperCase()
                  }
                  <div className={`avatar-upload-overlay${uploading ? ' uploading' : ''}`}>
                    {uploading ? '…' : 'Change\nPhoto'}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }} onChange={handleAvatarChange} />
                </div>
              ) : (
                <div className="avatar">
                  {profile.avatar_url
                    ? <img src={`${BASE_URL}${profile.avatar_url}`} alt={profile.username} />
                    : profile.username[0].toUpperCase()
                  }
                </div>
              )}
              <div className="profile-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                  <h1 className="profile-name">{profile.username}</h1>
                  {profile.founding_member && (
                    <span className="founding-badge" title="Founding member — vouched by AMBHaggermaker">
                      ⬡ Founding Member
                    </span>
                  )}
                  {profile.verified && !profile.founding_member && (
                    <span className="verified-badge" title="Verified — joined via invitation">
                      ✓ Verified
                    </span>
                  )}
                  <span className="reliability" style={{ color: scoreColor(score) }}>
                    ★ {score.toFixed(1)}
                  </span>
                </div>
                <div className="profile-meta">
                  {profile.location && <span>📍 {profile.location}</span>}
                  <span>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
                {profile.bio && <p className="profile-bio">{profile.bio}</p>}
              </div>
              {isOwn && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', flexShrink: 0 }}>
                  <button className="btn btn-outline btn-sm"
                    onClick={() => setEditing(true)}>Edit Profile</button>
                  <button className="btn btn-primary btn-sm"
                    onClick={() => setShowInvite(true)}>+ Invite Someone</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="tabs profile-page-tabs">
          <button className={`tab-btn${tab === 'posts' ? ' active' : ''}`} onClick={() => setTab('posts')}>
            Posts ({posts.length})
          </button>
          <button className={`tab-btn${tab === 'circles' ? ' active' : ''}`} onClick={() => setTab('circles')}>
            Circles ({circles.length})
          </button>
          {isOwn && (
            <button className={`tab-btn${tab === 'invitations' ? ' active' : ''}`} onClick={() => setTab('invitations')}>
              Invitations
            </button>
          )}
        </div>

        {tab === 'posts' && (
          posts.length === 0
            ? <p className="empty">No posts yet.</p>
            : <div className="post-grid">
                {posts.map(p => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
        )}

        {tab === 'circles' && (
          circles.length === 0
            ? <p className="empty">Not a member of any circles yet.</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {circles.map(c => (
                  <Link key={c.id} to={`/commons/${c.id}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '.75rem 1rem', background: 'var(--card)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '.875rem' }}>{c.name}</p>
                      {c.description && <p style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{c.description}</p>}
                    </div>
                    <span className={`badge badge-${c.role === 'admin' ? 'green' : 'gray'}`}>{c.role}</span>
                  </Link>
                ))}
              </div>
        )}

        {tab === 'invitations' && isOwn && (
          <InvitationsTab token={token} />
        )}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}

function InvitationsTab({ token }) {
  const [invitations, setInvitations] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);

  useEffect(() => {
    api.getMyInvitations(token)
      .then(setInvitations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const STATUS_LABEL = { pending: 'Pending', accepted: 'Accepted', expired: 'Expired' };
  const STATUS_CLASS = { pending: 'badge-gray', accepted: 'badge-green', expired: 'badge-red' };

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <p style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
          {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} sent
        </p>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Send Invite</button>
      </div>

      {invitations.length === 0 ? (
        <p className="empty">You haven't sent any invitations yet. Invite someone you trust to join the community.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {invitations.map(inv => (
            <div key={inv.id} className="invite-list-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="invite-list-email">{inv.email}</p>
                {inv.personal_note && (
                  <p className="invite-list-note">"{inv.personal_note}"</p>
                )}
                <p className="invite-list-date">
                  Sent {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {inv.status === 'accepted' && inv.accepted_by_username && (
                    <> · Joined as{' '}
                      <Link to={`/profile/${inv.accepted_by_id}`} style={{ color: 'var(--green)' }}>
                        {inv.accepted_by_username}
                      </Link>
                    </>
                  )}
                  {inv.status === 'pending' && (
                    <> · Expires {new Date(inv.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                  )}
                </p>
              </div>
              <span className={`badge ${STATUS_CLASS[inv.status]}`}>
                {STATUS_LABEL[inv.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      {showForm && <InviteModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
