import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import ImageCropUploader from '../components/ImageCropUploader';

const AVAIL_LABELS = {
  available: '🟢 Available for Work', not_taking_clients: '🔴 Not Taking New Clients',
  open_to_opportunities: '🟡 Open to Opportunities', not_applicable: null,
};
import PostCard from '../components/PostCard';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const BASE_URL = 'https://mycelium.unprecedentedtimes.org';

const MOODS = [
  { emoji: '😊', label: 'Good' }, { emoji: '🌱', label: 'Growing' },
  { emoji: '🔥', label: 'Fired up' }, { emoji: '😴', label: 'Tired' },
  { emoji: '🤔', label: 'Thinking' }, { emoji: '💪', label: 'Motivated' },
  { emoji: '😤', label: 'Frustrated' }, { emoji: '🌊', label: 'Flowing' },
  { emoji: '🦠', label: 'Shenaniganning' }, { emoji: '😂', label: 'Chaotic' },
  { emoji: '💙', label: 'Grateful' }, { emoji: '🌧️', label: 'Heavy' },
  { emoji: '⚡', label: 'Energized' }, { emoji: '🕊️', label: 'Peaceful' },
  { emoji: '🤯', label: 'Overwhelmed' }, { emoji: '🛠️', label: 'Building' },
  { emoji: '🌻', label: 'Hopeful' }, { emoji: '😏', label: 'Plotting' },
  { emoji: '🦋', label: 'Flibberdigibetting' }, { emoji: '🫠', label: 'Melting' },
  { emoji: '🌀', label: 'Scattered' }, { emoji: '😌', label: 'Unbothered' },
  { emoji: '🐉', label: 'Feral' },
];

const FONT_STYLES = {
  classic:    { label: 'Classic',    css: "'Georgia', serif" },
  modern:     { label: 'Modern',     css: "-apple-system, 'Segoe UI', sans-serif" },
  typewriter: { label: 'Typewriter', css: "'Courier New', monospace" },
  editorial:  { label: 'Editorial',  css: "'Palatino Linotype', serif" },
};

const BOARD_TITLES = {
  bulletin:      '📌 Bulletin',
  timeline:      '📅 Timeline',
  posts:         '📋 My Posts',
  events:        '🗓 Events',
  photos:        '📷 Photos',
  circles:       '⬡ My Circles',
  people:        '🤝 People I\'ve Shown Up With',
  professional:  '💼 Professional',
  my_businesses: '🏪 My Businesses',
  invitations:   '✉️ Invitations',
  messages:      '💬 Messages',
  chats:         '🗨 Chat Rooms',
};

function resolveUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function profileStyle(u) {
  if (!u) return {};
  const s = {};
  if (u.font_style && FONT_STYLES[u.font_style]) s['--profile-font'] = FONT_STYLES[u.font_style].css;
  if (u.accent_color) s['--profile-accent'] = u.accent_color;
  if (u.background_gradient) s.background = u.background_gradient;
  else if (u.background_color) s.background = u.background_color;
  return s;
}

// ── Main Profile Page ─────────────────────────────────────────────────────────

export default function Profile() {
  const { username } = useParams();
  const { user: authUser, token } = useAuth();
  const navigate = useNavigate();

  const [data,        setData]        = useState(null);
  const [boards,      setBoards]      = useState(null); // board settings + supplemental data
  const [loading,     setLoading]     = useState(true);
  const [boardOrder,  setBoardOrder]  = useState(null); // current ordered board list
  const [dragMode,    setDragMode]    = useState(false);
  const [activeId,    setActiveId]    = useState(null);
  const [showEditor,  setShowEditor]  = useState(false);

  const isOwn = data && authUser && data.user.id === authUser.id;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, boardData] = await Promise.all([
        api.getProfile(username),
        api.getProfileBoards(username, token || undefined),
      ]);
      setData(profileData);
      setBoards(boardData);
      setBoardOrder(boardData.settings);
    } catch (e) {
      setLoading(false);
    }
    setLoading(false);
  }, [username, token]);

  useEffect(() => { load(); }, [load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } })
  );

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  async function handleDragEnd(event) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = boardOrder.findIndex(b => b.board_type === active.id);
    const newIndex = boardOrder.findIndex(b => b.board_type === over.id);
    const newOrder = arrayMove(boardOrder, oldIndex, newIndex).map((b, i) => ({ ...b, position: i }));
    setBoardOrder(newOrder);
    try { await api.saveBoardSettings(newOrder, token); } catch { /* ignore */ }
  }

  async function handleBoardSettingChange(boardType, changes) {
    const newOrder = boardOrder.map(b => b.board_type === boardType ? { ...b, ...changes } : b);
    setBoardOrder(newOrder);
    try { await api.saveBoardSettings(newOrder, token); } catch { /* ignore */ }
  }

  if (loading) return <div className="page"><div className="container"><div className="spinner" style={{ marginTop: '4rem' }} /></div></div>;
  if (!data)   return <div className="page"><div className="container"><p className="error-msg">Profile not found.</p></div></div>;

  const { user: u, posts, circles, events, copart, photos, albums, wall } = data;
  const isDark = u.profile_theme === 'dark';
  const pStyle = profileStyle(u);

  const albumMap = {};
  photos.forEach(p => {
    if (!albumMap[p.album_name]) albumMap[p.album_name] = [];
    albumMap[p.album_name].push(p);
  });

  const visibleBoards = (boardOrder || []).filter(b => isOwn || b.is_visible);

  return (
    <div className={'profile-page' + (isDark ? ' profile-dark' : '')}
      style={{ ...pStyle, fontFamily: pStyle['--profile-font'] || undefined }}>

      {/* Banner */}
      <div className="profile-banner" style={
        u.banner_image_url
          ? { backgroundImage: `url(${resolveUrl(u.banner_image_url)})` }
          : u.accent_color ? { background: `linear-gradient(135deg, ${u.accent_color}44, ${u.accent_color}22)` } : {}
      }>
        {isOwn && <BannerUpload token={token} onUploaded={url => setData(d => ({ ...d, user: { ...d.user, banner_image_url: url } }))} />}
      </div>

      <div className="profile-main-container">
        {/* Header row */}
        <div className="profile-header-row">
          <div style={{ position: 'relative' }}>
            <AvatarBlock user={u} isOwn={isOwn} token={token}
              onUpdated={url => setData(d => ({ ...d, user: { ...d.user, avatar_url: url } }))} />
            {u.mood_emoji && <span className="profile-mood-emoji-badge" title={u.mood}>{u.mood_emoji}</span>}
          </div>

          <div className="profile-identity">
            <div className="profile-name-row">
              <h1 className="profile-display-name" style={{ fontFamily: pStyle['--profile-font'] }}>{u.username}</h1>
              {u.founding_member && <span className="founding-badge">⬡ Founding</span>}
              {u.verified && !u.founding_member && <span className="verified-badge">✓ Verified</span>}
              {u.is_veteran && u.veteran_confirmed && <span className="veteran-badge-sm">⬡ Veteran</span>}
              {authUser?.role === 'admin' && u.covenant_agreed && (
                <span className="covenant-badge-sm"
                  title={u.covenant_agreed_at ? `Covenant agreed ${new Date(u.covenant_agreed_at).toLocaleDateString()}` : 'Covenant agreed'}>
                  ✓ Covenant
                </span>
              )}
            </div>
            {u.mood && <div className="profile-mood-line">{u.mood_emoji} <span>{u.mood}</span></div>}
            {u.status_text && <p className="profile-status-text">{u.status_text}</p>}
            {u.location && <p className="profile-meta-item">📍 {u.location}</p>}
            {u.website && (
              <p className="profile-meta-item">🔗 <a href={u.website.startsWith('http') ? u.website : `https://${u.website}`}
                target="_blank" rel="noopener noreferrer">{u.website}</a></p>
            )}
          </div>

          <div className="profile-actions">
            {isOwn ? (
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setShowEditor(true)}>Edit Profile</button>
                <button
                  className={`btn btn-sm ${dragMode ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setDragMode(v => !v)}
                  title="Toggle drag-to-reorder mode"
                >
                  {dragMode ? '✓ Done' : '⠿ Edit Layout'}
                </button>
              </div>
            ) : authUser ? (
              <button className="btn btn-outline btn-sm" onClick={() => navigate(`/messages?with=${u.id}`)}>
                ✉ Message
              </button>
            ) : null}
          </div>
        </div>

        {/* Music bar */}
        {u.music_url && (
          <div className="profile-music-bar" style={{ '--pa': u.accent_color || 'var(--green)' }}>
            <span className="profile-music-icon">♪</span>
            <span className="profile-music-label">{u.music_label || 'Now playing'}</span>
            <a href={u.music_url} target="_blank" rel="noopener noreferrer" className="profile-music-link">Open ↗</a>
          </div>
        )}

        {/* Bio (shown above boards if set) */}
        {u.bio && (
          <div className="profile-bio-strip">
            <p>{u.bio}</p>
          </div>
        )}

        {/* Interests */}
        {u.interests?.length > 0 && (
          <div className="profile-interests-cloud" style={{ padding: '0 0 .75rem' }}>
            {u.interests.map((tag, i) => (
              <span key={i} className="profile-interest-tag"
                style={{ borderColor: u.accent_color, color: u.accent_color }}>{tag}</span>
            ))}
          </div>
        )}

        {/* Board grid */}
        {dragMode && (
          <div className="profile-drag-mode-banner">
            ⠿ Drag mode active — grab the ⠿ handle on any board to reorder
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={visibleBoards.map(b => b.board_type)} strategy={rectSortingStrategy}>
            <div className={'profile-board-grid' + (dragMode ? ' drag-mode-active' : '')}>
              {visibleBoards.map(board => (
                <SortableBoard
                  key={board.board_type}
                  board={board}
                  isOwn={isOwn}
                  dragMode={dragMode}
                  accentColor={u.accent_color}
                  onSettingChange={handleBoardSettingChange}
                >
                  <BoardContent
                    board={board}
                    user={u}
                    profileData={data}
                    boardsData={boards}
                    albumMap={albumMap}
                    isOwn={isOwn}
                    token={token}
                    authUser={authUser}
                    pStyle={pStyle}
                    onWallPost={wp => setData(d => ({ ...d, wall: [wp, ...d.wall] }))}
                    onWallDelete={id => setData(d => ({ ...d, wall: d.wall.filter(p => p.id !== id) }))}
                    onPhotoUpload={photo => setData(d => ({ ...d, photos: [photo, ...d.photos] }))}
                    onPhotoDelete={id => setData(d => ({ ...d, photos: d.photos.filter(p => p.id !== id) }))}
                    username={username}
                  />
                </SortableBoard>
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="profile-drag-overlay-card">
                <span className="profile-board-card-header" style={{ background: u.accent_color || 'var(--green)', color: '#fff', padding: '.5rem .75rem', display: 'flex', alignItems: 'center', gap: '.4rem', borderRadius: 'var(--radius) var(--radius) 0 0' }}>
                  <span style={{ fontSize: '1.1rem' }}>⠿</span>
                  <span style={{ fontWeight: 700, fontSize: '.82rem' }}>{BOARD_TITLES[activeId]}</span>
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

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

// ── Sortable Board Wrapper ────────────────────────────────────────────────────

function SortableBoard({ board, children, isOwn, dragMode, accentColor, onSettingChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.board_type,
    disabled: !dragMode,
  });
  const style = {
    position: 'relative',
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 999 : 'auto',
    opacity: isDragging ? 0.75 : 1,
    outline: isDragging ? '2px dashed var(--green)' : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <BoardCard
        board={board}
        isOwn={isOwn}
        dragMode={dragMode}
        dragListeners={listeners}
        accentColor={accentColor}
        onSettingChange={onSettingChange}
      >
        {children}
      </BoardCard>
    </div>
  );
}

// ── Board Card Shell ──────────────────────────────────────────────────────────

function BoardCard({ board, children, isOwn, dragMode, dragListeners, accentColor, onSettingChange }) {
  const [showSettings, setShowSettings] = useState(false);
  const [expanded,     setExpanded]     = useState(false);

  const cardStyle = {};
  if (board.background_color) cardStyle.background = board.background_color;
  if (board.font_color) cardStyle.color = board.font_color;

  const headerStyle = { background: accentColor || 'var(--green)' };

  return (
    <div className={'profile-board-card' + (!board.is_visible && isOwn ? ' board-card-hidden' : '')} style={cardStyle}
      data-board={board.board_type}>
      <div className="profile-board-card-header" style={headerStyle}>
        {dragMode && (
          <span className="profile-drag-handle" {...dragListeners} title="Drag to reorder">⠿</span>
        )}
        <span className="profile-board-card-title">{BOARD_TITLES[board.board_type]}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '.3rem', alignItems: 'center' }}>
          {!board.is_visible && isOwn && (
            <span style={{ fontSize: '.7rem', opacity: .7 }}>Hidden</span>
          )}
          {isOwn && (
            <button className="profile-board-gear-btn" onClick={() => setShowSettings(v => !v)} title="Board settings">⚙</button>
          )}
        </div>
      </div>

      {showSettings && isOwn && (
        <BoardSettings board={board} onChange={onSettingChange} accentColor={accentColor} />
      )}

      <div className={'profile-board-card-body' + (expanded ? ' expanded' : '')}>
        {children}
      </div>

      <div className="profile-board-card-footer">
        <button className="profile-board-view-all" onClick={() => setExpanded(v => !v)}>
          {expanded ? 'Show Less ↑' : 'View All ↓'}
        </button>
      </div>
    </div>
  );
}

// ── Board Settings Panel ──────────────────────────────────────────────────────

function BoardSettings({ board, onChange, accentColor }) {
  return (
    <div className="profile-board-settings-panel">
      <div className="profile-board-settings-row">
        <label>Background</label>
        <input type="color" value={board.background_color || (accentColor || '#2a5f0a') + '22'}
          onChange={e => onChange(board.board_type, { background_color: e.target.value })} />
      </div>
      <div className="profile-board-settings-row">
        <label>Text Color</label>
        <input type="color" value={board.font_color || '#1a1a1a'}
          onChange={e => onChange(board.board_type, { font_color: e.target.value })} />
      </div>
      <div className="profile-board-settings-row">
        <label>Visible to visitors</label>
        <input type="checkbox" checked={board.is_visible}
          onChange={e => onChange(board.board_type, { is_visible: e.target.checked })} />
      </div>
    </div>
  );
}

// ── Board Content Router ──────────────────────────────────────────────────────

function BoardContent({ board, user: u, profileData, boardsData, albumMap, isOwn, token, authUser, pStyle, onWallPost, onWallDelete, onPhotoUpload, onPhotoDelete, username }) {
  const { posts, circles, copart, photos, wall } = profileData;
  const rsvpEvents  = boardsData?.rsvp_events     || [];
  const timeline    = boardsData?.timeline         || [];
  const recentMsgs  = boardsData?.recent_messages  || [];
  const recentChats = boardsData?.recent_chats     || [];

  switch (board.board_type) {
    case 'bulletin':
      return <BulletinBoard user={u} wall={wall} isOwn={isOwn} token={token} authUser={authUser}
                onWallPost={onWallPost} onWallDelete={onWallDelete} username={username} />;
    case 'timeline':
      return <TimelineBoard timeline={timeline} />;
    case 'posts':
      return <PostsBoard posts={posts} />;
    case 'events':
      return <EventsBoard rsvpEvents={rsvpEvents} profileEvents={profileData.events} isOwn={isOwn} />;
    case 'photos':
      return <PhotosBoard photos={photos} albumMap={albumMap} isOwn={isOwn} token={token}
                onUpload={onPhotoUpload} onDelete={onPhotoDelete} />;
    case 'circles':
      return <CirclesBoard circles={circles} />;
    case 'people':
      return <PeopleBoard copart={copart} />;
    case 'professional':
      return <ProfessionalBoard username={username} isOwn={isOwn} token={token} authUser={authUser} />;
    case 'my_businesses':
      return <MyBusinessesBoard user={u} isOwn={isOwn} token={token} />;
    case 'invitations':
      return isOwn ? <InvitationsBoard token={token} /> : null;
    case 'messages':
      return isOwn ? <MessagesBoard conversations={recentMsgs} /> : null;
    case 'chats':
      return isOwn ? <ChatsBoard chats={recentChats} /> : null;
    default:
      return null;
  }
}

// ── Board: Bulletin ───────────────────────────────────────────────────────────

function BulletinBoard({ user: u, wall, isOwn, token, authUser, onWallPost, onWallDelete, username }) {
  const [input, setInput] = useState('');
  const [posting, setPosting] = useState(false);

  async function handlePost(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setPosting(true);
    try {
      const wp = await api.postOnWall(username, { content: input.trim() }, token);
      onWallPost(wp);
      setInput('');
    } catch (e) { alert(e.message); }
    finally { setPosting(false); }
  }

  return (
    <div className="bulletin-board-content">
      {u.pinned_bulletin && (
        <div className="profile-bulletin-pinned">
          <span className="profile-bulletin-pin">📌</span>
          <p>{u.pinned_bulletin}</p>
          {u.bulletin_updated_at && (
            <span className="profile-bulletin-date">{new Date(u.bulletin_updated_at).toLocaleDateString()}</span>
          )}
        </div>
      )}
      {authUser && !isOwn && (
        <form onSubmit={handlePost} className="wall-compose">
          <textarea className="form-textarea wall-compose-input" rows={2}
            placeholder={`Leave a note on ${u.username}'s board…`}
            value={input} onChange={e => setInput(e.target.value)} />
          <button className="btn btn-primary btn-sm" disabled={posting || !input.trim()}>
            {posting ? '…' : 'Post'}
          </button>
        </form>
      )}
      <div className="wall-posts-list">
        {wall.slice(0, 5).map(wp => (
          <div key={wp.id} className="profile-wall-post">
            <div className="profile-wall-post-header">
              <Link to={`/profile/${wp.author_username}`} className="profile-wall-author">
                {wp.author_username}{wp.author_verified && <span className="profile-verified-sm">✓</span>}
              </Link>
              <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{new Date(wp.created_at).toLocaleDateString()}</span>
              {(isOwn || authUser?.id === wp.author_id) && (
                <button className="btn btn-ghost" style={{ padding: '0 .25rem', fontSize: '.7rem', color: 'var(--danger)', marginLeft: 'auto' }}
                  onClick={() => { if (confirm('Delete?')) onWallDelete(wp.id); }}>✕</button>
              )}
            </div>
            <p className="profile-wall-post-content">{wp.content}</p>
          </div>
        ))}
        {wall.length === 0 && !u.pinned_bulletin && (
          <p className="empty" style={{ fontSize: '.85rem' }}>No posts yet.</p>
        )}
      </div>
    </div>
  );
}

// ── Board: Timeline ───────────────────────────────────────────────────────────

const TIMELINE_LABELS = {
  post:        (item) => `Posted "${item.label}" (${item.sub_type})`,
  circle_join: (item) => `Joined circle: ${item.label}`,
  rsvp:        (item) => `RSVP'd ${item.sub_type} → "${item.label}"`,
};

function TimelineBoard({ timeline }) {
  if (!timeline.length) return <p className="empty board-empty">No activity yet.</p>;
  return (
    <div className="timeline-list">
      {timeline.slice(0, 8).map((item, i) => (
        <div key={i} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-item-body">
            <p className="timeline-item-label">
              {TIMELINE_LABELS[item.activity_type]?.(item) || item.label}
            </p>
            <span className="timeline-item-date">
              {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Board: My Posts ───────────────────────────────────────────────────────────

function PostsBoard({ posts }) {
  if (!posts.length) return <p className="empty board-empty">No posts yet.</p>;
  return (
    <div className="board-posts-list">
      {posts.slice(0, 4).map(p => (
        <Link key={p.id} to={`/posts/${p.id}`} className="board-post-row">
          <span className={`badge badge-${p.type} badge-xs`}>{p.type}</span>
          {(p.auto_urgent || p.is_urgent) && <span className="urgency-dot dot-auto" style={{ width: 7, height: 7 }} />}
          <span className="board-post-title">{p.title}</span>
          <span className="board-post-date" style={{ marginLeft: 'auto', fontSize: '.72rem', color: 'var(--muted)', flexShrink: 0 }}>
            {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </Link>
      ))}
    </div>
  );
}

// ── Board: Events ─────────────────────────────────────────────────────────────

function EventsBoard({ rsvpEvents, profileEvents }) {
  const going      = rsvpEvents.filter(e => e.rsvp_status === 'going');
  const interested = rsvpEvents.filter(e => e.rsvp_status === 'interested');
  const saved      = rsvpEvents.filter(e => e.rsvp_status === 'saved');

  const allEmpty = !going.length && !interested.length && !saved.length && !profileEvents.length;
  if (allEmpty) return <p className="empty board-empty">No events yet.</p>;

  function EventRow({ e }) {
    return (
      <Link to={`/posts/${e.id}`} className="board-event-row">
        <span className="board-event-title">{e.title}</span>
        {e.location && <span className="board-event-meta">📍 {e.location}</span>}
        {e.starts_at && <span className="board-event-meta">
          {new Date(e.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>}
        {e.rsvp_going_count > 0 && <span className="board-event-going">{e.rsvp_going_count} going</span>}
      </Link>
    );
  }

  return (
    <div className="events-board-content">
      {going.length > 0 && (
        <div className="events-group">
          <div className="events-group-label going">Going ({going.length})</div>
          {going.slice(0, 3).map(e => <EventRow key={e.id} e={e} />)}
        </div>
      )}
      {interested.length > 0 && (
        <div className="events-group">
          <div className="events-group-label interested">Interested ({interested.length})</div>
          {interested.slice(0, 3).map(e => <EventRow key={e.id} e={e} />)}
        </div>
      )}
      {saved.length > 0 && (
        <div className="events-group">
          <div className="events-group-label saved">Saved ({saved.length})</div>
          {saved.slice(0, 3).map(e => <EventRow key={e.id} e={e} />)}
        </div>
      )}
      {profileEvents.length > 0 && (going.length + interested.length + saved.length === 0) && (
        <div>
          {profileEvents.slice(0, 4).map(e => <EventRow key={e.id} e={e} />)}
        </div>
      )}
    </div>
  );
}

// ── Board: Photos ─────────────────────────────────────────────────────────────

function PhotosBoard({ photos, albumMap, isOwn, token, onUpload, onDelete }) {
  const [lightbox, setLightbox] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeAlbum, setActiveAlbum] = useState('all');
  const fileRef = useRef(null);
  const albumNames = Object.keys(albumMap);
  const display = activeAlbum === 'all' ? photos : (albumMap[activeAlbum] || []);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadProfilePhoto(file, { album_name: 'General' }, token);
      onUpload(res.photo);
    } catch (e) { alert(e.message); }
    finally { setUploading(false); e.target.value = ''; }
  }

  if (!photos.length && !isOwn) {
    return <p className="empty board-empty">No photos yet.</p>;
  }

  return (
    <div>
      {isOwn && (
        <div style={{ marginBottom: '.6rem', display: 'flex', gap: '.4rem', alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : '+ Upload Photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
        </div>
      )}
      {albumNames.length > 1 && (
        <div className="tab-bar" style={{ marginBottom: '.5rem', flexWrap: 'wrap' }}>
          <button className={'tab-btn' + (activeAlbum === 'all' ? ' active' : '')} onClick={() => setActiveAlbum('all')}>
            All ({photos.length})
          </button>
          {albumNames.map(n => (
            <button key={n} className={'tab-btn' + (activeAlbum === n ? ' active' : '')} onClick={() => setActiveAlbum(n)}>
              {n} ({albumMap[n].length})
            </button>
          ))}
        </div>
      )}
      {display.length === 0 ? (
        <p className="empty board-empty">No photos in this album.</p>
      ) : (
        <div className="profile-photo-grid">
          {display.map(photo => (
            <div key={photo.id} className="profile-photo-item" onClick={() => setLightbox(resolveUrl(photo.url))}>
              <img src={resolveUrl(photo.url)} alt={photo.caption || ''} loading="lazy" />
              {photo.caption && <div className="profile-photo-caption">{photo.caption}</div>}
              {isOwn && (
                <button className="profile-photo-delete" onClick={async e => {
                  e.stopPropagation();
                  if (!confirm('Delete this photo?')) return;
                  await api.deleteProfilePhoto(photo.id, token);
                  onDelete(photo.id);
                }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}

// ── Board: Circles ────────────────────────────────────────────────────────────

function CirclesBoard({ circles }) {
  if (!circles.length) return <p className="empty board-empty">No circles yet.</p>;
  return (
    <ul className="profile-circles-list">
      {circles.slice(0, 6).map(c => (
        <li key={c.id}>
          <Link to={`/commons/${c.id}`} className="profile-circle-item">
            <span className="profile-circle-name">{c.name}</span>
            {c.circle_type && <span className="badge badge-gray" style={{ fontSize: '.65rem' }}>{c.circle_type.replace('_',' ')}</span>}
            <span className="profile-circle-count" style={{ marginLeft: 'auto' }}>{c.member_count} members</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ── Board: People ─────────────────────────────────────────────────────────────

function PeopleBoard({ copart }) {
  if (!copart.length) return <p className="empty board-empty">No connections yet.</p>;
  return (
    <div className="profile-copart-row">
      {copart.slice(0, 12).map(c => (
        <Link key={c.id} to={`/profile/${c.username}`} className="profile-copart-item" title={`${c.username} — ${c.shared_circles} shared circles`}>
          <div className="profile-copart-avatar">
            {c.avatar_url ? <img src={resolveUrl(c.avatar_url)} alt={c.username} /> : c.username[0].toUpperCase()}
          </div>
          <span className="profile-copart-name">{c.username}</span>
        </Link>
      ))}
    </div>
  );
}

// ── Board: Invitations ────────────────────────────────────────────────────────

function InvitationsBoard({ token }) {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const STATUS_CLASS = { pending: 'badge-gray', accepted: 'badge-green', expired: 'badge-red' };

  useEffect(() => {
    api.getMyInvitations(token).then(setInvitations).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="spinner" style={{ margin: '.5rem auto', width: 20, height: 20 }} />;
  if (!invitations.length) return <p className="empty board-empty">No invitations sent yet.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
      {invitations.slice(0, 5).map(inv => (
        <div key={inv.id} className="board-invite-row">
          <span className="board-invite-email">{inv.email}</span>
          <span className={`badge ${STATUS_CLASS[inv.status]}`} style={{ fontSize: '.65rem' }}>{inv.status}</span>
          {inv.status === 'accepted' && inv.accepted_by_username && (
            <Link to={`/profile/${inv.accepted_by_username}`} style={{ fontSize: '.75rem', color: 'var(--green)' }}>
              → {inv.accepted_by_username}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Board: Messages ───────────────────────────────────────────────────────────

function MessagesBoard({ conversations }) {
  if (!conversations.length) return <p className="empty board-empty">No messages yet.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
      {conversations.slice(0, 4).map((c, i) => (
        <Link key={i} to={`/messages?with=${c.other_id}`} className="board-message-row">
          <span className="board-message-user">{c.other_username}</span>
          <span className="board-message-preview">{c.last_message?.slice(0, 50)}</span>
          {!c.read && <span className="board-unread-dot" />}
        </Link>
      ))}
    </div>
  );
}

// ── Board: Chats ──────────────────────────────────────────────────────────────

function ChatsBoard({ chats }) {
  if (!chats.length) return <p className="empty board-empty">No recent chat activity.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
      {chats.slice(0, 4).map((c, i) => (
        <Link key={i} to={`/chat`} className="board-chat-row">
          <span className="board-chat-room">{c.room_name}</span>
          <span className="board-chat-preview">{c.content?.slice(0, 40)}</span>
        </Link>
      ))}
    </div>
  );
}

// ── Board: Professional ───────────────────────────────────────────────────────

const BIZ_TYPE_LABELS_SHORT = {
  independently_owned: 'Indep.', locally_owned_franchise: 'Franchise',
  cooperative: 'Co-op', nonprofit: 'Nonprofit', sole_proprietor: 'Sole Prop.',
};

function ProfessionalBoard({ username, isOwn, token, authUser }) {
  const [data,    setData]    = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProfessionalProfile(username).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [username]);

  async function handleEndorse(skill) {
    try {
      await api.endorseSkill(username, skill, token);
      setData(d => {
        const map = { ...d.endorsements_by_skill };
        if (!map[skill]) map[skill] = [];
        if (!map[skill].find(e => e.id === authUser.id)) {
          map[skill] = [...map[skill], { id: authUser.id, username: authUser.username }];
        }
        return { ...d, endorsements_by_skill: map };
      });
    } catch (e) { alert(e.message); }
  }

  if (loading) return <div className="spinner" style={{ margin: '.5rem auto', width: 20, height: 20 }} />;

  const prof = data?.profile || {};
  const skills = prof.skills || [];
  const isEmpty = !prof.occupation && !skills.length && !prof.professional_bio && !prof.availability;

  if (isEmpty && !isOwn) return <p className="empty board-empty">No professional info yet.</p>;

  return (
    <div className="prof-board-content">
      {prof.availability && AVAIL_LABELS[prof.availability] && (
        <div className="prof-avail-badge">{AVAIL_LABELS[prof.availability]}</div>
      )}
      {prof.occupation && <p className="prof-occupation">{prof.occupation}</p>}
      {prof.professional_bio && <p className="prof-bio">{prof.professional_bio}</p>}
      {skills.length > 0 && (
        <div className="prof-skills-section">
          <p className="prof-section-label">Skills</p>
          <div className="prof-skill-cloud">
            {skills.map(skill => {
              const endorsements = data?.endorsements_by_skill?.[skill] || [];
              const alreadyEndorsed = authUser && endorsements.some(e => e.id === authUser.id);
              const canEndorse = authUser && !isOwn && authUser.id !== data?.user?.id;
              return (
                <div key={skill} className="prof-skill-tag-wrap">
                  <span className="prof-skill-tag">{skill}</span>
                  {endorsements.length > 0 && (
                    <span className="prof-skill-endorse-count" title={endorsements.map(e => e.username).join(', ')}>
                      +{endorsements.length}
                    </span>
                  )}
                  {canEndorse && (
                    <button
                      className={`prof-endorse-btn${alreadyEndorsed ? ' endorsed' : ''}`}
                      onClick={() => !alreadyEndorsed && handleEndorse(skill)}
                      title={alreadyEndorsed ? 'Endorsed' : 'Endorse this skill'}
                    >
                      {alreadyEndorsed ? '✓' : '+'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {(data?.affiliations || []).filter(a => a.business).length > 0 && (
        <div className="prof-affiliations">
          <p className="prof-section-label">Business Affiliations</p>
          {data.affiliations.filter(a => a.business).map((a, i) => (
            <Link key={i} to={`/businesses/${a.business_id}`} className="prof-affiliation-row">
              <span className="prof-affiliation-name">{a.business.business_name}</span>
              {a.business.is_verified_local && <span className="biz-verified-badge-sm">✓</span>}
              <span className="biz-type-pill-xs">{BIZ_TYPE_LABELS_SHORT[a.business.business_type]}</span>
              {a.role && <span className="prof-affiliation-role">{a.role}</span>}
            </Link>
          ))}
        </div>
      )}
      {prof.portfolio_urls?.length > 0 && (
        <div className="prof-portfolio">
          <p className="prof-section-label">Portfolio</p>
          <div className="prof-portfolio-links">
            {prof.portfolio_urls.map((item, i) => (
              <a key={i} href={item.url || item} target="_blank" rel="noopener noreferrer" className="prof-portfolio-link">
                {item.label || item.url || item}
              </a>
            ))}
          </div>
        </div>
      )}
      {isOwn && (
        <button className="btn btn-outline btn-sm" style={{ marginTop: '.75rem', fontSize: '.78rem' }}
          onClick={() => setEditing(true)}>
          Edit Professional Info
        </button>
      )}
      {editing && (
        <ProfessionalEditor
          prof={prof}
          token={token}
          onClose={() => setEditing(false)}
          onSaved={updated => {
            setData(d => ({ ...d, profile: updated }));
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function ProfessionalEditor({ prof, token, onClose, onSaved }) {
  const [form, setForm] = useState({
    occupation:      prof.occupation || '',
    professional_bio:prof.professional_bio || '',
    availability:    prof.availability || 'not_applicable',
    skillsInput:     (prof.skills || []).join(', '),
  });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const updated = await api.updateProfessionalProfile({
        occupation:       form.occupation || null,
        professional_bio: form.professional_bio || null,
        availability:     form.availability,
        skills:           form.skillsInput ? form.skillsInput.split(',').map(s => s.trim()).filter(Boolean) : [],
      }, token);
      onSaved(updated);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">Professional Info</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={save}>
          <div className="form-group">
            <label className="form-label">Occupation / Role</label>
            <input className="form-input" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} placeholder="e.g. Electrician, Graphic Designer, Nurse…" />
          </div>
          <div className="form-group">
            <label className="form-label">Skills (comma-separated)</label>
            <input className="form-input" value={form.skillsInput} onChange={e => setForm(f => ({ ...f, skillsInput: e.target.value }))} placeholder="e.g. wiring, AutoCAD, patient care" />
          </div>
          <div className="form-group">
            <label className="form-label">Availability</label>
            <select className="form-select" value={form.availability} onChange={e => setForm(f => ({ ...f, availability: e.target.value }))}>
              <option value="not_applicable">Not Applicable</option>
              <option value="available">Available for Work</option>
              <option value="open_to_opportunities">Open to Opportunities</option>
              <option value="not_taking_clients">Not Taking New Clients</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Professional Bio</label>
            <textarea className="form-textarea" rows={3} value={form.professional_bio} onChange={e => setForm(f => ({ ...f, professional_bio: e.target.value }))} placeholder="Work-focused bio…" />
          </div>
          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </form>
      </div>
    </div>
  );
}

// ── Board: My Businesses ──────────────────────────────────────────────────────

function MyBusinessesBoard({ user: u, isOwn, token }) {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    api.getBusinessesByOwner(u.id).then(setBusinesses).catch(() => {}).finally(() => setLoading(false));
  }, [u.id]);

  if (loading) return <div className="spinner" style={{ margin: '.5rem auto', width: 20, height: 20 }} />;
  if (!businesses.length) return (
    <div>
      <p className="empty board-empty">No businesses listed yet.</p>
      {isOwn && <Link to="/businesses" className="btn btn-outline btn-sm" style={{ marginTop: '.5rem', display: 'inline-block', fontSize: '.8rem' }}>+ List a Business</Link>}
    </div>
  );

  const BIZ_TYPE_LABELS = {
    independently_owned: 'Independently Owned', locally_owned_franchise: 'Locally Owned Franchise',
    cooperative: 'Cooperative', nonprofit: 'Nonprofit', sole_proprietor: 'Sole Proprietor',
  };
  const BASE_URL = 'https://mycelium.unprecedentedtimes.org';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
      {businesses.map(biz => (
        <Link key={biz.id} to={`/businesses/${biz.id}`} className="prof-affiliation-row" style={{ opacity: biz.is_active ? 1 : 0.5 }}>
          {biz.cover_photo && (
            <img src={biz.cover_photo.startsWith('http') ? biz.cover_photo : `${BASE_URL}${biz.cover_photo}`}
              alt={biz.business_name}
              style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="prof-affiliation-name">{biz.business_name}</span>
            {biz.is_verified_local && <span className="biz-verified-badge-sm" style={{ marginLeft: '.3rem' }}>✓</span>}
            {!biz.is_active && <span style={{ marginLeft: '.3rem', fontSize: '.65rem', color: 'var(--muted)' }}>(inactive)</span>}
            <span className="biz-type-pill-xs" style={{ display: 'block', marginTop: '.1rem' }}>{BIZ_TYPE_LABELS[biz.business_type]}</span>
          </div>
        </Link>
      ))}
      {isOwn && (
        <Link to="/businesses" className="btn btn-outline btn-sm" style={{ marginTop: '.25rem', fontSize: '.78rem', textAlign: 'center' }}>
          + Add Business
        </Link>
      )}
    </div>
  );
}

// ── Avatar Block ──────────────────────────────────────────────────────────────

function AvatarBlock({ user: u, isOwn, token, onUpdated }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(blob, filename) {
    setUploading(true);
    try {
      const file = new File([blob], filename, { type: 'image/jpeg' });
      const res = await api.uploadProfilePhoto(file, { is_profile_photo: true }, token);
      onUpdated(res.url);
    } catch (e) { alert(e.message); }
    finally { setUploading(false); }
  }

  return (
    <div className="profile-avatar-lg" style={{ position: 'relative' }}>
      {u.avatar_url ? <img src={resolveUrl(u.avatar_url)} alt={u.username} /> : <span>{u.username[0].toUpperCase()}</span>}
      {isOwn && (
        <div className="profile-avatar-crop-wrap">
          <ImageCropUploader
            aspect={1}
            targetWidth={400}
            targetHeight={400}
            label={uploading ? '…' : '📷'}
            hint="400×400px · square"
            onFile={handleFile}
            disabled={uploading}
            btnClassName="profile-avatar-edit-btn"
          />
        </div>
      )}
    </div>
  );
}

// ── Banner Upload ─────────────────────────────────────────────────────────────

function BannerUpload({ token, onUploaded }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(blob, filename) {
    setUploading(true);
    try {
      const file = new File([blob], filename, { type: 'image/jpeg' });
      const res = await api.uploadProfileBanner(file, token);
      onUploaded(res.url);
    } catch (e) { alert(e.message); }
    finally { setUploading(false); }
  }

  return (
    <ImageCropUploader
      aspect={3}
      targetWidth={1200}
      targetHeight={400}
      label={uploading ? '…' : '📷 Change Banner'}
      hint="1200×400px · 3:1"
      onFile={handleFile}
      disabled={uploading}
      btnClassName="profile-banner-edit-btn"
    />
  );
}

// ── Profile Editor ────────────────────────────────────────────────────────────

function ProfileEditor({ user: u, token, onClose, onSaved }) {
  const [editorTab, setEditorTab] = useState('appearance');
  const [form, setForm] = useState({
    username: u.username || '', bio: u.bio || '', location: u.location || '',
    website: u.website || '', interests: (u.interests || []).join(', '),
    mood: u.mood || '', mood_emoji: u.mood_emoji || '', status_text: u.status_text || '',
    music_url: u.music_url || '', music_label: u.music_label || '',
    accent_color: u.accent_color || '#2a5f0a',
    background_color: u.background_color || '',
    background_gradient: u.background_gradient || '',
    use_gradient: !!u.background_gradient,
    font_style: u.font_style || 'modern',
    layout: u.layout || 'standard',
    profile_theme: u.profile_theme || 'light',
    pinned_bulletin: u.pinned_bulletin || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const updated = await api.customizeProfile({
        username:   form.username.trim() || undefined,
        bio:        form.bio || undefined,
        location:   form.location || undefined,
        website:    form.website || undefined,
        interests:  form.interests ? form.interests.split(',').map(t => t.trim()).filter(Boolean) : [],
        mood: form.mood || undefined, mood_emoji: form.mood_emoji || undefined,
        status_text: form.status_text || undefined,
        music_url: form.music_url || undefined, music_label: form.music_label || undefined,
        accent_color: form.accent_color || undefined,
        background_color:    !form.use_gradient ? (form.background_color || undefined) : undefined,
        background_gradient: form.use_gradient  ? (form.background_gradient || undefined) : undefined,
        font_style: form.font_style || undefined, layout: form.layout || undefined,
        profile_theme: form.profile_theme || undefined,
        pinned_bulletin: form.pinned_bulletin || undefined,
      }, token);
      onSaved(updated);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  const TABS = [
    { id: 'appearance', label: 'Appearance' },
    { id: 'identity',   label: 'Identity' },
    { id: 'mood',       label: 'Mood & Status' },
    { id: 'music',      label: 'Music' },
  ];

  return (
    <div className="profile-editor-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="profile-editor-panel">
        <div className="profile-editor-header">
          <h2 className="profile-editor-title">Edit Profile</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
        </div>
        <div className="profile-editor-tabs">
          {TABS.map(t => (
            <button key={t.id} className={'profile-editor-tab' + (editorTab === t.id ? ' active' : '')}
              onClick={() => setEditorTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <form onSubmit={handleSave} className="profile-editor-body">
          {editorTab === 'appearance' && (
            <div className="profile-editor-section">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Accent Color</label>
                  <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                    <input type="color" value={form.accent_color}
                      onChange={e => set('accent_color', e.target.value)}
                      style={{ width: 44, height: 32, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
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
                  <input className="form-input" value={form.background_gradient}
                    onChange={e => set('background_gradient', e.target.value)}
                    placeholder="e.g. linear-gradient(135deg, #1a1a2e, #16213e)" />
                ) : (
                  <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                    <input type="color" value={form.background_color || '#f2ede4'}
                      onChange={e => set('background_color', e.target.value)}
                      style={{ width: 44, height: 32, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                    <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{form.background_color || '#f2ede4'}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Font Style</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                  {Object.entries(FONT_STYLES).map(([key, fs]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', cursor: 'pointer', fontSize: '.9rem' }}>
                      <input type="radio" name="font_style" value={key} checked={form.font_style === key} onChange={() => set('font_style', key)} />
                      <span style={{ fontFamily: fs.css }}>{fs.label} — The quick brown fox</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Pinned Bulletin (500 chars)</label>
                <textarea className="form-textarea" rows={3} value={form.pinned_bulletin}
                  onChange={e => set('pinned_bulletin', e.target.value)} maxLength={500}
                  placeholder="What do you want visitors to know?" />
                <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.2rem' }}>{form.pinned_bulletin.length}/500</p>
              </div>
            </div>
          )}
          {editorTab === 'identity' && (
            <div className="profile-editor-section">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" value={form.username} onChange={e => set('username', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-textarea" rows={4} value={form.bio} onChange={e => set('bio', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input className="form-input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://…" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Interests (comma-separated)</label>
                <input className="form-input" value={form.interests} onChange={e => set('interests', e.target.value)}
                  placeholder="e.g. gardening, mutual aid, local history" />
              </div>
            </div>
          )}
          {editorTab === 'mood' && (
            <div className="profile-editor-section">
              <div className="form-group">
                <label className="form-label">Current Mood</label>
                <div className="profile-mood-picker">
                  {MOODS.map(m => (
                    <button key={m.label} type="button"
                      className={'profile-mood-option' + (form.mood === m.label ? ' selected' : '')}
                      onClick={() => { set('mood', m.label); set('mood_emoji', m.emoji); }}>
                      <span>{m.emoji}</span><span>{m.label}</span>
                    </button>
                  ))}
                  <button type="button"
                    className={'profile-mood-option' + (!form.mood ? ' selected' : '')}
                    onClick={() => { set('mood', ''); set('mood_emoji', ''); }}>
                    <span>—</span><span>None</span>
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Status (100 chars)</label>
                <input className="form-input" value={form.status_text}
                  onChange={e => set('status_text', e.target.value)} maxLength={100}
                  placeholder="What's on your mind?" />
              </div>
            </div>
          )}
          {editorTab === 'music' && (
            <div className="profile-editor-section">
              <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                Paste any music link. It displays as a music bar on your profile.
              </p>
              <div className="form-group">
                <label className="form-label">Music URL</label>
                <input className="form-input" value={form.music_url} onChange={e => set('music_url', e.target.value)} placeholder="https://open.spotify.com/…" />
              </div>
              <div className="form-group">
                <label className="form-label">Label (song/artist)</label>
                <input className="form-input" value={form.music_label} onChange={e => set('music_label', e.target.value)}
                  placeholder="e.g. Ain't No Mountain High Enough" />
              </div>
            </div>
          )}
          {err && <p className="form-error" style={{ marginTop: '.5rem' }}>{err}</p>}
          <div className="profile-editor-footer">
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
