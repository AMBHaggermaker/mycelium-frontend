import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import PostCard from '../components/PostCard';

const BASE_URL = 'https://mycelium.unprecedentedtimes.org';

const MOODS = [
  { emoji: '😊', label: 'Good' },
  { emoji: '🌱', label: 'Growing' },
  { emoji: '🔥', label: 'Fired up' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '🤔', label: 'Thinking' },
  { emoji: '💪', label: 'Motivated' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '🌊', label: 'Flowing' },
  { emoji: '🦠', label: 'Shenaniganning' },
  { emoji: '😂', label: 'Chaotic' },
  { emoji: '💙', label: 'Grateful' },
  { emoji: '🌧️', label: 'Heavy' },
  { emoji: '⚡', label: 'Energized' },
  { emoji: '🕊️', label: 'Peaceful' },
  { emoji: '🤯', label: 'Overwhelmed' },
  { emoji: '🛠️', label: 'Building' },
  { emoji: '🌻', label: 'Hopeful' },
  { emoji: '😏', label: 'Plotting' },
  { emoji: '🦋', label: 'Flibberdigibetting' },
  { emoji: '🫠', label: 'Melting' },
  { emoji: '🌀', label: 'Scattered' },
  { emoji: '😌', label: 'Unbothered' },
  { emoji: '🐉', label: 'Feral' },
];

const FONT_STYLES = {
  classic:    { label: 'Classic',    css: "'Georgia', serif" },
  modern:     { label: 'Modern',     css: "-apple-system, 'Segoe UI', sans-serif" },
  typewriter: { label: 'Typewriter', css: "'Courier New', monospace" },
  editorial:  { label: 'Editorial',  css: "'Palatino Linotype', 'Book Antiqua', serif" },
};

const LAYOUT_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'wide',     label: 'Wide' },
  { value: 'minimal',  label: 'Minimal' },
  { value: 'sidebar',  label: 'Sidebar' },
];

function resolveAvatar(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function profileStyle(u) {
  if (!u) return {};
  const styles = {};
  if (u.font_style && FONT_STYLES[u.font_style]) {
    styles['--profile-font'] = FONT_STYLES[u.font_style].css;
  }
  if (u.accent_color) styles['--profile-accent'] = u.accent_color;
  if (u.background_gradient) {
    styles.background = u.background_gradient;
  } else if (u.background_color) {
    styles.background = u.background_color;
  }
  return styles;
}

// ── Main Profile Page ─────────────────────────────────────────────────────────

export default function Profile() {
  const { username } = useParams();
  const { user: authUser, token } = useAuth();
  const navigate = useNavigate();

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [err,        setErr]        = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [activeTab,  setActiveTab]  = useState('board');
  const [wallInput,  setWallInput]  = useState('');
  const [posting,    setPosting]    = useState(false);

  const isOwn = data && authUser && data.user.id === authUser.id;

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      setData(await api.getProfile(username));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { load(); }, [load]);

  async function postOnWall(e) {
    e.preventDefault();
    if (!wallInput.trim()) return;
    setPosting(true);
    try {
      const wp = await api.postOnWall(username, { content: wallInput.trim() }, token);
      setData(d => ({ ...d, wall: [wp, ...d.wall] }));
      setWallInput('');
    } catch (e) { alert(e.message); }
    finally { setPosting(false); }
  }

  async function deleteWallPost(postId) {
    if (!confirm('Delete this wall post?')) return;
    try {
      await api.deleteWallPost(username, postId, token);
      setData(d => ({ ...d, wall: d.wall.filter(p => p.id !== postId) }));
    } catch (e) { alert(e.message); }
  }

  if (loading) return <div className="page"><div className="container"><div className="spinner" style={{ marginTop: '4rem' }} /></div></div>;
  if (err)     return <div className="page"><div className="container"><p className="error-msg">{err}</p></div></div>;

  const { user: u, posts, circles, events, copart, photos, albums, wall } = data;
  const isDark   = u.profile_theme === 'dark';
  const pStyle   = profileStyle(u);
  const hasPhotos = photos.length > 0;

  const albumMap = {};
  photos.forEach(p => {
    if (!albumMap[p.album_name]) albumMap[p.album_name] = [];
    albumMap[p.album_name].push(p);
  });

  return (
    <div
      className={'profile-page' + (isDark ? ' profile-dark' : '')}
      style={{ ...pStyle, fontFamily: pStyle['--profile-font'] || undefined }}
    >
      {/* Banner */}
      <div className="profile-banner" style={
        u.banner_image_url
          ? { backgroundImage: `url(${u.banner_image_url})` }
          : u.accent_color
            ? { background: `linear-gradient(135deg, ${u.accent_color}44, ${u.accent_color}22)` }
            : {}
      }>
        {isOwn && (
          <div className="profile-banner-upload-hint">
            <BannerUpload token={token} onUploaded={url => setData(d => ({ ...d, user: { ...d.user, banner_image_url: url } }))} />
          </div>
        )}
      </div>

      <div className="profile-main-container">
        {/* Header row */}
        <div className="profile-header-row">
          {/* Avatar with mood emoji */}
          <div className="profile-avatar-wrap" style={{ position: 'relative' }}>
            <AvatarBlock user={u} isOwn={isOwn} token={token} onUpdated={newUrl => setData(d => ({ ...d, user: { ...d.user, avatar_url: newUrl } }))} />
            {u.mood_emoji && (
              <span className="profile-mood-emoji-badge" title={u.mood || ''}>
                {u.mood_emoji}
              </span>
            )}
          </div>

          {/* Identity */}
          <div className="profile-identity">
            <div className="profile-name-row">
              <h1 className="profile-display-name" style={{ fontFamily: pStyle['--profile-font'] }}>
                {u.username}
              </h1>
              {u.founding_member && (
                <span className="founding-badge" title="Founding member">⬡ Founding</span>
              )}
              {u.verified && !u.founding_member && (
                <span className="verified-badge">✓ Verified</span>
              )}
              {u.is_veteran && u.veteran_confirmed && (
                <span className="veteran-badge-sm" title="Confirmed veteran">⬡ Veteran</span>
              )}
            </div>

            {u.mood && (
              <div className="profile-mood-line">
                {u.mood_emoji} <span>{u.mood}</span>
              </div>
            )}
            {u.status_text && (
              <p className="profile-status-text">{u.status_text}</p>
            )}
            {u.location && <p className="profile-meta-item">📍 {u.location}</p>}
            {u.website && (
              <p className="profile-meta-item">
                🔗 <a href={u.website.startsWith('http') ? u.website : `https://${u.website}`}
                  target="_blank" rel="noopener noreferrer">{u.website}</a>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="profile-actions">
            {isOwn ? (
              <button className="btn btn-primary btn-sm" onClick={() => setShowEditor(true)}>
                Edit Profile
              </button>
            ) : authUser && (
              <button className="btn btn-outline btn-sm"
                onClick={() => navigate(`/messages?with=${u.id}`)}>
                ✉ Message
              </button>
            )}
          </div>
        </div>

        {/* Music bar */}
        {u.music_url && (
          <div className="profile-music-bar" style={{ '--pa': u.accent_color || 'var(--green)' }}>
            <span className="profile-music-icon">♪</span>
            <span className="profile-music-label">{u.music_label || 'Now playing'}</span>
            <a href={u.music_url} target="_blank" rel="noopener noreferrer" className="profile-music-link">
              Open ↗
            </a>
          </div>
        )}

        {/* Main content */}
        <div className={'profile-content-grid profile-layout-' + (u.layout || 'standard')}>

          {/* Left column / sidebar */}
          <div className="profile-sidebar-col">
            {/* About Me */}
            {u.bio && (
              <div className="profile-board">
                <h3 className="profile-board-title" style={{ '--pa': u.accent_color }}>About Me</h3>
                <p className="profile-bio-text">{u.bio}</p>
              </div>
            )}

            {/* My Interests */}
            {u.interests?.length > 0 && (
              <div className="profile-board">
                <h3 className="profile-board-title" style={{ '--pa': u.accent_color }}>My Interests</h3>
                <div className="profile-interests-cloud">
                  {u.interests.map((tag, i) => (
                    <span key={i} className="profile-interest-tag"
                      style={{ borderColor: u.accent_color, color: u.accent_color }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* People I Have Shown Up With */}
            {copart.length > 0 && (
              <div className="profile-board">
                <h3 className="profile-board-title" style={{ '--pa': u.accent_color }}>
                  People I Have Shown Up With
                </h3>
                <div className="profile-copart-row">
                  {copart.map(c => (
                    <Link key={c.id} to={`/profile/${c.username}`} className="profile-copart-item" title={c.username}>
                      <div className="profile-copart-avatar">
                        {c.avatar_url
                          ? <img src={resolveAvatar(c.avatar_url)} alt={c.username} />
                          : c.username[0].toUpperCase()
                        }
                      </div>
                      <span className="profile-copart-name">{c.username}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* My Circles */}
            {circles.length > 0 && (
              <div className="profile-board">
                <h3 className="profile-board-title" style={{ '--pa': u.accent_color }}>My Circles</h3>
                <ul className="profile-circles-list">
                  {circles.map(c => (
                    <li key={c.id}>
                      <Link to={`/commons/${c.id}`} className="profile-circle-item">
                        <span className="profile-circle-name">{c.name}</span>
                        <span className="profile-circle-count">{c.member_count} members</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Main column */}
          <div className="profile-main-col">
            {/* Tab bar */}
            <div className="tab-bar" style={{ marginBottom: '1rem' }}>
              <button className={'tab-btn' + (activeTab === 'board' ? ' active' : '')} onClick={() => setActiveTab('board')}>Board</button>
              <button className={'tab-btn' + (activeTab === 'posts' ? ' active' : '')} onClick={() => setActiveTab('posts')}>My Posts ({posts.length})</button>
              <button className={'tab-btn' + (activeTab === 'events' ? ' active' : '')} onClick={() => setActiveTab('events')}>Events</button>
              <button className={'tab-btn' + (activeTab === 'photos' ? ' active' : '')} onClick={() => setActiveTab('photos')}>Photos</button>
              {isOwn && (
                <button className={'tab-btn' + (activeTab === 'invitations' ? ' active' : '')} onClick={() => setActiveTab('invitations')}>Invitations</button>
              )}
            </div>

            {/* Board = Bulletin + Wall */}
            {activeTab === 'board' && (
              <div>
                {/* Pinned Bulletin */}
                {u.pinned_bulletin && (
                  <div className="profile-bulletin-board">
                    <div className="profile-bulletin-title">
                      📌 Bulletin
                      {u.bulletin_updated_at && (
                        <span style={{ fontSize: '.72rem', fontWeight: 400, marginLeft: '.5rem', color: 'var(--muted)' }}>
                          {new Date(u.bulletin_updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="profile-bulletin-text">{u.pinned_bulletin}</p>
                  </div>
                )}

                {/* Wall compose */}
                {authUser && !isOwn && (
                  <form onSubmit={postOnWall} style={{ marginBottom: '1rem' }}>
                    <textarea
                      className="form-textarea"
                      placeholder={`Post on ${u.username}'s wall…`}
                      value={wallInput}
                      onChange={e => setWallInput(e.target.value)}
                      rows={2}
                      style={{ marginBottom: '.4rem' }}
                    />
                    <button className="btn btn-primary btn-sm" disabled={posting || !wallInput.trim()}>
                      {posting ? '…' : 'Post on Wall'}
                    </button>
                  </form>
                )}

                {/* Wall posts */}
                {wall.length === 0 && !u.pinned_bulletin ? (
                  <p className="empty">Nothing on the board yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                    {wall.map(wp => (
                      <div key={wp.id} className="profile-wall-post">
                        <div className="profile-wall-post-header">
                          <Link to={`/profile/${wp.author_username}`} className="profile-wall-author">
                            {wp.author_username}
                            {wp.author_verified && <span className="profile-verified-sm">✓</span>}
                          </Link>
                          <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
                            {new Date(wp.created_at).toLocaleDateString()}
                          </span>
                          {(isOwn || authUser?.id === wp.author_id) && (
                            <button className="btn btn-ghost btn-sm" style={{ padding: '0 .3rem', color: 'var(--danger)', fontSize: '.72rem' }}
                              onClick={() => deleteWallPost(wp.id)}>✕</button>
                          )}
                        </div>
                        <p className="profile-wall-post-content">{wp.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* My Posts */}
            {activeTab === 'posts' && (
              posts.length === 0 ? (
                <p className="empty">No posts yet.</p>
              ) : (
                <div className="profile-posts-grid">
                  {posts.map(p => <PostCard key={p.id} post={p} compact />)}
                </div>
              )
            )}

            {/* Events */}
            {activeTab === 'events' && (
              events.length === 0 ? (
                <p className="empty">No events yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  {events.map(e => (
                    <Link key={e.id} to={`/posts/${e.id}`} className="profile-event-item">
                      <div>
                        <strong>{e.title}</strong>
                        {e.location && <span style={{ fontSize: '.8rem', color: 'var(--muted)', marginLeft: '.5rem' }}>📍 {e.location}</span>}
                      </div>
                      {e.starts_at && (
                        <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                          {new Date(e.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )
            )}

            {/* Photos */}
            {activeTab === 'photos' && (
              <PhotoGallery
                photos={photos}
                albums={albumMap}
                isOwn={isOwn}
                token={token}
                onUploadComplete={photo => setData(d => ({ ...d, photos: [photo, ...d.photos] }))}
                onDelete={id => setData(d => ({ ...d, photos: d.photos.filter(p => p.id !== id) }))}
              />
            )}

            {/* Invitations */}
            {activeTab === 'invitations' && isOwn && (
              <InvitationsTab token={token} />
            )}
          </div>
        </div>
      </div>

      {/* Profile Editor */}
      {showEditor && (
        <ProfileEditor
          user={u}
          token={token}
          onClose={() => setShowEditor(false)}
          onSaved={updated => {
            setData(d => ({ ...d, user: { ...d.user, ...updated } }));
            if (updated.username && updated.username !== username) {
              navigate(`/profile/${updated.username}`, { replace: true });
            }
          }}
        />
      )}
    </div>
  );
}

// ── Avatar Block ──────────────────────────────────────────────────────────────

function AvatarBlock({ user: u, isOwn, token, onUpdated }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadProfilePhoto(file, { is_profile_photo: true }, token);
      onUpdated(res.url);
    } catch (e) { alert(e.message); }
    finally { setUploading(false); e.target.value = ''; }
  }

  return (
    <div
      className={'profile-avatar-lg' + (isOwn ? ' clickable' : '')}
      onClick={isOwn ? () => fileRef.current?.click() : undefined}
      title={isOwn ? 'Change profile photo' : u.username}
    >
      {u.avatar_url
        ? <img src={resolveAvatar(u.avatar_url)} alt={u.username} />
        : <span>{u.username[0].toUpperCase()}</span>
      }
      {isOwn && (
        <div className={'profile-avatar-overlay' + (uploading ? ' uploading' : '')}>
          {uploading ? '…' : '📷'}
        </div>
      )}
      {isOwn && (
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }} onChange={handleChange} />
      )}
    </div>
  );
}

// ── Banner Upload ─────────────────────────────────────────────────────────────

function BannerUpload({ token, onUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadProfileBanner(file, token);
      onUploaded(res.url);
    } catch (e) { alert(e.message); }
    finally { setUploading(false); e.target.value = ''; }
  }

  return (
    <>
      <button className="profile-banner-edit-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? '…' : '📷 Change Banner'}
      </button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }} onChange={handleChange} />
    </>
  );
}

// ── Photo Gallery ─────────────────────────────────────────────────────────────

function PhotoGallery({ photos, albums, isOwn, token, onUploadComplete, onDelete }) {
  const [uploading, setUploading] = useState(false);
  const [activeAlbum, setActiveAlbum] = useState('all');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadAlbum, setUploadAlbum] = useState('General');
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef(null);

  const albumNames = Object.keys(albums);
  const displayPhotos = activeAlbum === 'all' ? photos : (albums[activeAlbum] || []);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadProfilePhoto(file, {
        caption: uploadCaption || undefined,
        album_name: uploadAlbum || 'General',
      }, token);
      onUploadComplete(res.photo);
      setShowUpload(false);
      setUploadCaption('');
    } catch (e) { alert(e.message); }
    finally { setUploading(false); e.target.value = ''; }
  }

  if (photos.length === 0 && !isOwn) {
    return (
      <div className="profile-photos-placeholder">
        <div className="profile-photos-placeholder-icon">📷</div>
        <p>Your photo gallery lives here — upload your first photo to get started</p>
      </div>
    );
  }

  return (
    <div>
      {isOwn && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(v => !v)}>
            {showUpload ? 'Cancel' : '+ Upload Photo'}
          </button>
        </div>
      )}

      {showUpload && isOwn && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <div className="form-group" style={{ marginBottom: '.6rem' }}>
            <label className="form-label">Album</label>
            <input className="form-input" value={uploadAlbum}
              onChange={e => setUploadAlbum(e.target.value)} placeholder="General" />
          </div>
          <div className="form-group" style={{ marginBottom: '.75rem' }}>
            <label className="form-label">Caption (optional)</label>
            <input className="form-input" value={uploadCaption}
              onChange={e => setUploadCaption(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Choose Photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }} onChange={handleUpload} />
        </div>
      )}

      {albumNames.length > 1 && (
        <div className="tab-bar" style={{ marginBottom: '.75rem' }}>
          <button className={'tab-btn' + (activeAlbum === 'all' ? ' active' : '')} onClick={() => setActiveAlbum('all')}>
            All ({photos.length})
          </button>
          {albumNames.map(name => (
            <button key={name} className={'tab-btn' + (activeAlbum === name ? ' active' : '')} onClick={() => setActiveAlbum(name)}>
              {name} ({albums[name].length})
            </button>
          ))}
        </div>
      )}

      {displayPhotos.length === 0 ? (
        <div className="profile-photos-placeholder">
          <div className="profile-photos-placeholder-icon">📷</div>
          <p>Your photo gallery lives here — upload your first photo to get started</p>
        </div>
      ) : (
        <div className="profile-photo-grid">
          {displayPhotos.map(photo => (
            <div key={photo.id} className="profile-photo-item">
              <img src={photo.url} alt={photo.caption || ''} loading="lazy" />
              {photo.caption && <div className="profile-photo-caption">{photo.caption}</div>}
              {isOwn && (
                <button className="profile-photo-delete"
                  onClick={async () => {
                    if (!confirm('Delete this photo?')) return;
                    await api.deleteProfilePhoto(photo.id, token);
                    onDelete(photo.id);
                  }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Profile Editor ────────────────────────────────────────────────────────────

function ProfileEditor({ user: u, token, onClose, onSaved }) {
  const [editorTab, setEditorTab] = useState('appearance');
  const [form, setForm] = useState({
    // Identity
    username: u.username || '',
    bio:      u.bio || '',
    location: u.location || '',
    website:  u.website || '',
    interests: (u.interests || []).join(', '),
    // Mood & status
    mood:        u.mood || '',
    mood_emoji:  u.mood_emoji || '',
    status_text: u.status_text || '',
    // Music
    music_url:   u.music_url || '',
    music_label: u.music_label || '',
    // Appearance
    accent_color:        u.accent_color || '#2a5f0a',
    background_color:    u.background_color || '',
    background_gradient: u.background_gradient || '',
    use_gradient:        !!u.background_gradient,
    font_style:          u.font_style || 'modern',
    layout:              u.layout || 'standard',
    profile_theme:       u.profile_theme || 'light',
    // Bulletin
    pinned_bulletin: u.pinned_bulletin || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const payload = {
        username:   form.username.trim() || undefined,
        bio:        form.bio || undefined,
        location:   form.location || undefined,
        website:    form.website || undefined,
        interests:  form.interests ? form.interests.split(',').map(t => t.trim()).filter(Boolean) : [],
        mood:        form.mood || undefined,
        mood_emoji:  form.mood_emoji || undefined,
        status_text: form.status_text || undefined,
        music_url:   form.music_url || undefined,
        music_label: form.music_label || undefined,
        accent_color:        form.accent_color || undefined,
        background_color:    !form.use_gradient ? (form.background_color || undefined) : undefined,
        background_gradient: form.use_gradient ? (form.background_gradient || undefined) : undefined,
        font_style:    form.font_style || undefined,
        layout:        form.layout || undefined,
        profile_theme: form.profile_theme || undefined,
        pinned_bulletin: form.pinned_bulletin || undefined,
      };
      const updated = await api.customizeProfile(payload, token);
      onSaved(updated);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  const EDITOR_TABS = [
    { id: 'appearance', label: 'Appearance' },
    { id: 'identity',   label: 'Identity' },
    { id: 'mood',       label: 'Mood & Status' },
    { id: 'music',      label: 'Music' },
    { id: 'photos',     label: 'Photos' },
  ];

  return (
    <div className="profile-editor-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="profile-editor-panel">
        <div className="profile-editor-header">
          <h2 className="profile-editor-title">Edit Profile</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
        </div>

        <div className="profile-editor-tabs">
          {EDITOR_TABS.map(t => (
            <button key={t.id} className={'profile-editor-tab' + (editorTab === t.id ? ' active' : '')}
              onClick={() => setEditorTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="profile-editor-body">
          {/* Appearance */}
          {editorTab === 'appearance' && (
            <div className="profile-editor-section">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Accent Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <input type="color" value={form.accent_color}
                      onChange={e => set('accent_color', e.target.value)}
                      style={{ width: '44px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '4px' }} />
                    <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{form.accent_color}</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Theme</label>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    {['light','dark'].map(t => (
                      <button key={t} type="button"
                        className={'tab-btn' + (form.profile_theme === t ? ' active' : '')}
                        onClick={() => set('profile_theme', t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Background</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem', fontSize: '.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.use_gradient} onChange={e => set('use_gradient', e.target.checked)} />
                  Use gradient
                </label>
                {form.use_gradient ? (
                  <>
                    <input className="form-input" value={form.background_gradient}
                      onChange={e => set('background_gradient', e.target.value)}
                      placeholder="e.g. linear-gradient(135deg, #1a1a2e, #16213e)" />
                    <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.25rem' }}>CSS gradient value</p>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                    <input type="color" value={form.background_color || '#f2ede4'}
                      onChange={e => set('background_color', e.target.value)}
                      style={{ width: '44px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '4px' }} />
                    <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{form.background_color || '#f2ede4'}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Font Style</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                  {Object.entries(FONT_STYLES).map(([key, fs]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', cursor: 'pointer', fontSize: '.9rem' }}>
                      <input type="radio" name="font_style" value={key} checked={form.font_style === key}
                        onChange={() => set('font_style', key)} />
                      <span style={{ fontFamily: fs.css }}>{fs.label} — The quick brown fox</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Layout</label>
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                  {LAYOUT_OPTIONS.map(opt => (
                    <button key={opt.value} type="button"
                      className={'tab-btn' + (form.layout === opt.value ? ' active' : '')}
                      onClick={() => set('layout', opt.value)}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Pinned Bulletin (500 chars)</label>
                <textarea className="form-textarea" rows={3} value={form.pinned_bulletin}
                  onChange={e => set('pinned_bulletin', e.target.value)}
                  placeholder="What do you want your visitors to know right now?"
                  maxLength={500} />
                <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.2rem' }}>
                  {form.pinned_bulletin.length}/500
                </p>
              </div>
            </div>
          )}

          {/* Identity */}
          {editorTab === 'identity' && (
            <div className="profile-editor-section">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" value={form.username}
                  onChange={e => set('username', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-textarea" rows={4} value={form.bio}
                  onChange={e => set('bio', e.target.value)}
                  placeholder="Tell people about yourself…" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" value={form.location}
                    onChange={e => set('location', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input className="form-input" value={form.website}
                    onChange={e => set('website', e.target.value)}
                    placeholder="https://…" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Interests (comma-separated)</label>
                <input className="form-input" value={form.interests}
                  onChange={e => set('interests', e.target.value)}
                  placeholder="e.g. gardening, mutual aid, local history" />
              </div>
            </div>
          )}

          {/* Mood & Status */}
          {editorTab === 'mood' && (
            <div className="profile-editor-section">
              <div className="form-group">
                <label className="form-label">Current Mood</label>
                <div className="profile-mood-picker">
                  {MOODS.map(m => (
                    <button key={m.label} type="button"
                      className={'profile-mood-option' + (form.mood === m.label ? ' selected' : '')}
                      onClick={() => { set('mood', m.label); set('mood_emoji', m.emoji); }}
                      title={m.label}
                    >
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                  <button type="button"
                    className={'profile-mood-option' + (!form.mood ? ' selected' : '')}
                    onClick={() => { set('mood', ''); set('mood_emoji', ''); }}
                  >
                    <span>—</span><span>None</span>
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Status (100 chars)</label>
                <input className="form-input" value={form.status_text}
                  onChange={e => set('status_text', e.target.value)}
                  placeholder="What's on your mind?" maxLength={100} />
              </div>
            </div>
          )}

          {/* Music */}
          {editorTab === 'music' && (
            <div className="profile-editor-section">
              <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                Paste any link from YouTube, SoundCloud, Spotify, Amazon Music, or any other platform. It displays as a music bar on your profile.
              </p>
              <div className="form-group">
                <label className="form-label">Music URL</label>
                <input className="form-input" value={form.music_url}
                  onChange={e => set('music_url', e.target.value)}
                  placeholder="https://open.spotify.com/…" />
              </div>
              <div className="form-group">
                <label className="form-label">Label (song/artist name)</label>
                <input className="form-input" value={form.music_label}
                  onChange={e => set('music_label', e.target.value)}
                  placeholder="e.g. Ain't No Mountain High Enough — Marvin Gaye" />
              </div>
              {form.music_url && (
                <div className="profile-music-bar" style={{ '--pa': form.accent_color || 'var(--green)', marginTop: '.5rem', pointerEvents: 'none' }}>
                  <span className="profile-music-icon">♪</span>
                  <span className="profile-music-label">{form.music_label || 'Now playing'}</span>
                  <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Preview</span>
                </div>
              )}
            </div>
          )}

          {/* Photos */}
          {editorTab === 'photos' && (
            <div className="profile-editor-section">
              <p style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
                Upload photos and manage your gallery from the Photos tab on your profile page.
                You can also set your profile photo and banner from there.
              </p>
            </div>
          )}

          {err && <p className="form-error" style={{ marginTop: '.5rem' }}>{err}</p>}

          <div className="profile-editor-footer">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Invitations Tab ───────────────────────────────────────────────────────────

function InvitationsTab({ token }) {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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
        <p className="empty">No invitations sent yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {invitations.map(inv => (
            <div key={inv.id} className="invite-list-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="invite-list-email">{inv.email}</p>
                {inv.personal_note && <p className="invite-list-note">"{inv.personal_note}"</p>}
                <p className="invite-list-date">
                  Sent {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {inv.status === 'accepted' && inv.accepted_by_username && (
                    <> · Joined as{' '}
                      <Link to={`/profile/${inv.accepted_by_username}`} style={{ color: 'var(--green)' }}>
                        {inv.accepted_by_username}
                      </Link>
                    </>
                  )}
                  {inv.status === 'pending' && (
                    <> · Expires {new Date(inv.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                  )}
                </p>
              </div>
              <span className={`badge ${STATUS_CLASS[inv.status]}`}>{STATUS_LABEL[inv.status]}</span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ marginTop: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)} style={{ marginBottom: '.5rem' }}>Cancel</button>
          <InviteInline token={token} onSent={() => setShowForm(false)} />
        </div>
      )}
    </div>
  );
}

function InviteInline({ token, onSent }) {
  const [form, setForm] = useState({ email: '', personal_note: '' });
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true); setErr(null);
    try {
      await api.sendInvitation(form, token);
      onSent();
    } catch (e) { setErr(e.message); }
    finally { setSending(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', maxWidth: '400px' }}>
      <div className="form-group">
        <label className="form-label">Email *</label>
        <input type="email" className="form-input" required value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Personal note</label>
        <input className="form-input" value={form.personal_note}
          onChange={e => setForm(f => ({ ...f, personal_note: e.target.value }))} />
      </div>
      {err && <p className="form-error">{err}</p>}
      <div><button className="btn btn-primary btn-sm" disabled={sending}>{sending ? '…' : 'Send Invite'}</button></div>
    </form>
  );
}
