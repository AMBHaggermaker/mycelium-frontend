import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import ImageCropUploader from '../components/ImageCropUploader';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';

async function cropToBlob(img, crop, targetW, targetH) {
  const canvas = document.createElement('canvas');
  canvas.width = targetW; canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  ctx.drawImage(img, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, targetW, targetH);
  return new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Canvas empty')), 'image/jpeg', 0.92));
}

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
  bulletin:      '📋 Wall',
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

const PATTERN_SCALE_PX = { small: 16, medium: 32, large: 64 };

function getPatternCSS(type, c1, c2, scale) {
  const sz = PATTERN_SCALE_PX[scale] || 32;
  const a = c1 || '#2a5f0a', b = c2 || '#1a3b07';
  switch (type) {
    case 'diagonal_stripes':
      return { background: `repeating-linear-gradient(45deg, ${a}, ${a} ${sz/4}px, ${b} ${sz/4}px, ${b} ${sz/2}px)` };
    case 'horizontal_stripes':
      return { background: `repeating-linear-gradient(0deg, ${a}, ${a} ${sz/2}px, ${b} ${sz/2}px, ${b} ${sz}px)` };
    case 'vertical_stripes':
      return { background: `repeating-linear-gradient(90deg, ${a}, ${a} ${sz/2}px, ${b} ${sz/2}px, ${b} ${sz}px)` };
    case 'grid':
      return { background: b, backgroundImage: `linear-gradient(${a} 1px, transparent 1px), linear-gradient(90deg, ${a} 1px, transparent 1px)`, backgroundSize: `${sz}px ${sz}px` };
    case 'dots':
      return { background: b, backgroundImage: `radial-gradient(circle, ${a} ${sz/8}px, transparent ${sz/8}px)`, backgroundSize: `${sz}px ${sz}px` };
    case 'checkerboard':
      return { background: b, backgroundImage: `repeating-conic-gradient(${a} 0% 25%, ${b} 0% 50%)`, backgroundSize: `${sz}px ${sz}px` };
    case 'zigzag':
      return { backgroundColor: b, backgroundImage: `linear-gradient(135deg, ${a} 25%, transparent 25%) -${sz/2}px 0, linear-gradient(225deg, ${a} 25%, transparent 25%) -${sz/2}px 0, linear-gradient(315deg, ${a} 25%, transparent 25%), linear-gradient(45deg, ${a} 25%, transparent 25%)`, backgroundSize: `${sz}px ${sz}px` };
    case 'diamonds':
      return { backgroundColor: b, backgroundImage: `linear-gradient(45deg, ${a} 25%, transparent 25%), linear-gradient(-45deg, ${a} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${a} 75%), linear-gradient(-45deg, transparent 75%, ${a} 75%)`, backgroundSize: `${sz}px ${sz}px`, backgroundPosition: `0 0, 0 ${sz/2}px, ${sz/2}px -${sz/2}px, -${sz/2}px 0px` };
    case 'honeycomb':
      return { background: b, backgroundImage: `radial-gradient(circle, ${a} 2px, transparent ${sz/5}px)`, backgroundSize: `${sz}px ${sz*0.866}px` };
    case 'crosshatch':
      return { background: b, backgroundImage: `repeating-linear-gradient(45deg, ${a}, ${a} 1px, transparent 1px, transparent ${sz/2}px), repeating-linear-gradient(-45deg, ${a}, ${a} 1px, transparent 1px, transparent ${sz/2}px)` };
    case 'waves':
      return { background: b, backgroundImage: `repeating-radial-gradient(ellipse at 50% 50%, transparent 0, transparent ${sz/3}px, ${a} ${sz/3}px, ${a} ${sz/3+2}px, transparent ${sz/3+2}px)` };
    case 'triangles':
      return { background: b, backgroundImage: `linear-gradient(120deg, ${a} 25%, transparent 25%), linear-gradient(240deg, ${a} 25%, transparent 25%)`, backgroundSize: `${sz}px ${sz*0.866}px` };
    case 'stars':
      return { background: b, backgroundImage: `radial-gradient(2px 2px at ${sz/4}px ${sz/4}px, ${a}, transparent), radial-gradient(2px 2px at ${sz*3/4}px ${sz*3/4}px, ${a}, transparent)`, backgroundSize: `${sz}px ${sz}px` };
    case 'mycelium': {
      const sv = sz * 2;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sv}' height='${sv}'><g stroke='${encodeURIComponent(a)}' stroke-width='0.8' fill='none' opacity='0.7'><path d='M${sv/2},${sv/2} L${sv*.2},${sv*.1} M${sv/2},${sv/2} L${sv*.8},${sv*.15} M${sv/2},${sv/2} L${sv*.05},${sv*.6} M${sv/2},${sv/2} L${sv*.9},${sv*.7} M${sv/2},${sv/2} L${sv*.3},${sv*.95} M${sv*.2},${sv*.1} L${sv*.05},${sv*.35} M${sv*.8},${sv*.15} L${sv*.95},${sv*.4}'/><circle cx='${sv/2}' cy='${sv/2}' r='2' fill='${encodeURIComponent(a)}'/><circle cx='${sv*.2}' cy='${sv*.1}' r='1.5' fill='${encodeURIComponent(a)}'/><circle cx='${sv*.8}' cy='${sv*.15}' r='1.5' fill='${encodeURIComponent(a)}'/></g></svg>`;
      return { background: b, backgroundImage: `url("data:image/svg+xml,${svg}")`, backgroundSize: `${sv}px ${sv}px` };
    }
    default:
      return { background: a };
  }
}

function profileStyle(u) {
  if (!u) return {};
  const s = {};
  if (u.font_style && FONT_STYLES[u.font_style]) s['--profile-font'] = FONT_STYLES[u.font_style].css;
  if (u.accent_color) s['--profile-accent'] = u.accent_color;
  if (!u.background_photo_url && !u.pattern_type) {
    if (u.background_gradient) s.background = u.background_gradient;
    else if (u.background_color) s.background = u.background_color;
  }
  return s;
}

// ── Main Profile Page ─────────────────────────────────────────────────────────

export default function Profile() {
  const { username } = useParams();
  const { user: authUser, token } = useAuth();
  const navigate = useNavigate();

  const [data,              setData]              = useState(null);
  const [boards,            setBoards]            = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [boardOrder,        setBoardOrder]        = useState(null);
  const [dragMode,          setDragMode]          = useState(false);
  const [activeId,          setActiveId]          = useState(null);
  const [showEditor,        setShowEditor]        = useState(false);
  const [stickers,          setStickers]          = useState([]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const bannerTriggerRef = useRef(null);

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

  useEffect(() => {
    if (!data?.user) return;
    try {
      const raw = data.user.profile_stickers;
      setStickers(Array.isArray(raw) ? raw : (JSON.parse(raw || '[]') || []));
    } catch { setStickers([]); }
  }, [data]);

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

  async function saveStickers(updated) {
    setStickers(updated);
    try { await api.customizeProfile({ profile_stickers: updated }, token); } catch { /* ignore */ }
  }

  const patternBg = u.pattern_type && u.pattern_type !== 'solid'
    ? getPatternCSS(u.pattern_type, u.pattern_color_primary, u.pattern_color_secondary, u.pattern_scale || 'medium')
    : null;

  return (
    <div className={'profile-page' + (isDark ? ' profile-dark' : '')}
      style={{ ...pStyle, fontFamily: pStyle['--profile-font'] || undefined, position: 'relative', overflow: 'hidden' }}>

      {/* Background photo layer */}
      {u.background_photo_url && (
        <div className="profile-bg-photo-layer" style={{ backgroundImage: `url(${resolveUrl(u.background_photo_url)})` }}>
          <div className="profile-bg-overlay" style={{ background: u.accent_color || '#000', opacity: u.background_overlay_opacity ?? 0.5 }} />
        </div>
      )}

      {/* Pattern background layer */}
      {!u.background_photo_url && patternBg && (
        <div className="profile-pattern-layer" style={{ ...patternBg, opacity: u.pattern_opacity ?? 0.8 }} />
      )}

      {/* Sticker overlay */}
      <StickerLayer
        stickers={stickers}
        isEditMode={dragMode}
        onUpdate={(id, changes) => {
          if (changes === null) {
            const updated = stickers.filter(s => s.id !== id);
            saveStickers(updated);
          } else {
            const updated = stickers.map(s => s.id === id ? { ...s, ...changes } : s);
            setStickers(updated);
          }
        }}
        onSave={() => saveStickers(stickers)}
        accentColor={u.accent_color}
      />

      {/* Banner */}
      <div className="profile-banner" style={
        u.banner_image_url
          ? { backgroundImage: `url(${resolveUrl(u.banner_image_url)})` }
          : u.accent_color ? { background: `linear-gradient(135deg, ${u.accent_color}44, ${u.accent_color}22)` } : {}
      }>
        {isOwn && (
          <>
            <button type="button" className="banner-camera-btn" onClick={() => bannerTriggerRef.current?.()} title="Change banner photo">📷</button>
            <p className="banner-upload-hint">1200×400px landscape (3:1 ratio)</p>
          </>
        )}
        {isOwn && <BannerUpload triggerRef={bannerTriggerRef} token={token} onUploaded={url => setData(d => ({ ...d, user: { ...d.user, banner_image_url: url } }))} />}
      </div>

      <div className="profile-layout-wrap">
        {/* Left network sidebar */}
        {copart.length > 0 && (
          <ProfileNetworkSidebar
            copart={copart}
            networkSettings={u.profile_network_settings}
            isOwn={isOwn}
            token={token}
            accentColor={u.accent_color}
            onSettingsUpdate={settings => setData(d => ({ ...d, user: { ...d.user, profile_network_settings: settings } }))}
          />
        )}

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
                {dragMode && (
                  <button className="btn btn-sm btn-outline" onClick={() => setShowStickerPicker(v => !v)}>
                    🎨 Stickers
                  </button>
                )}
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
                    onWallPin={updated => setData(d => ({ ...d, wall: d.wall.map(wp => ({ ...wp, is_pinned: wp.id === updated.id ? updated.is_pinned : false })) }))}
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

        {showStickerPicker && dragMode && (
          <StickerPicker
            onPlace={sticker => {
              const newSticker = { ...sticker, id: Date.now().toString(), x_percent: 20, y_percent: 30, size: 60, rotation: 0, opacity: 1 };
              const updated = [...stickers, newSticker];
              saveStickers(updated);
            }}
            onClose={() => setShowStickerPicker(false)}
            onClearAll={() => {
              if (confirm('Remove all stickers?')) saveStickers([]);
            }}
            token={token}
          />
        )}
      </div>
      </div> {/* close profile-layout-wrap */}

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

function BoardContent({ board, user: u, profileData, boardsData, albumMap, isOwn, token, authUser, pStyle, onWallPost, onWallDelete, onWallPin, onPhotoUpload, onPhotoDelete, username }) {
  const { posts, circles, copart, photos, wall } = profileData;
  const rsvpEvents  = boardsData?.rsvp_events     || [];
  const timeline    = boardsData?.timeline         || [];
  const recentMsgs  = boardsData?.recent_messages  || [];
  const recentChats = boardsData?.recent_chats     || [];

  switch (board.board_type) {
    case 'bulletin':
      return <WallBoard user={u} wall={wall} isOwn={isOwn} token={token} authUser={authUser}
                onWallPost={onWallPost} onWallDelete={onWallDelete} onWallPin={onWallPin} username={username} />;
    case 'timeline':
      return <TimelineBoard timeline={timeline} />;
    case 'posts':
      return <PostsBoard posts={posts} isOwn={isOwn} />;
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

// ── Rich Text Renderer ────────────────────────────────────────────────────────

function renderRichText(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const parts = [];
    const re = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|~~([^~\n]+)~~/g;
    let last = 0, m;
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      if (m[1]) parts.push(<strong key={`b${last}`}>{m[1]}</strong>);
      else if (m[2]) parts.push(<em key={`i${last}`}>{m[2]}</em>);
      else if (m[3]) parts.push(<s key={`s${last}`}>{m[3]}</s>);
      last = re.lastIndex;
    }
    if (last < line.length) parts.push(line.slice(last));
    return <span key={li}>{parts.length ? parts : line}{li < lines.length - 1 && <br />}</span>;
  });
}

// ── Board: Wall ───────────────────────────────────────────────────────────────

const WALL_EMOJIS = ['😊','😂','🔥','💯','👍','❤️','🙌','🌱','💪','🤔','🎉','💬','⭐','😅','🙏','🌻','💚','✨','🤝','⬡'];

function WallBoard({ user: u, wall, isOwn, token, authUser, onWallPost, onWallDelete, onWallPin, username }) {
  const [content,          setContent]          = useState('');
  const [photos,           setPhotos]           = useState([]);
  const [photoUrls,        setPhotoUrls]        = useState([]);
  const [layout,           setLayout]           = useState('single');
  const [posting,          setPosting]          = useState(false);
  const [showEmoji,        setShowEmoji]        = useState(false);
  const [openThreadPostId, setOpenThreadPostId] = useState(null);
  const textareaRef = useRef(null);
  const photoRef    = useRef(null);

  function insertFormat(marker) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const selected = content.slice(start, end);
    const newVal = content.slice(0, start) + marker + (selected || 'text') + marker + content.slice(end);
    setContent(newVal);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + marker.length, start + marker.length + (selected || 'text').length); }, 0);
  }

  function addEmoji(emoji) {
    const ta = textareaRef.current;
    const pos = ta?.selectionStart ?? content.length;
    setContent(c => c.slice(0, pos) + emoji + c.slice(pos));
    setShowEmoji(false);
    setTimeout(() => ta?.focus(), 0);
  }

  function handlePhotos(e) {
    const files = Array.from(e.target.files || []).slice(0, 5 - photos.length);
    if (!files.length) return;
    setPhotos(prev => [...prev, ...files].slice(0, 5));
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPhotoUrls(prev => [...prev, ev.target.result].slice(0, 5));
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  }

  function removePhoto(i) {
    setPhotos(prev => prev.filter((_, idx) => idx !== i));
    setPhotoUrls(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handlePost(e) {
    e.preventDefault();
    if (!content.trim() && !photos.length) return;
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append('content', content.trim());
      fd.append('collage_layout', layout);
      photos.forEach(f => fd.append('photos', f));
      const wp = await api.postOnWall(username, fd, token);
      onWallPost(wp);
      setContent(''); setPhotos([]); setPhotoUrls([]); setLayout('single');
    } catch (err) { alert(err.message); }
    finally { setPosting(false); }
  }

  if (!isOwn && u.wall_privacy === 'disabled') {
    return <p className="empty board-empty">🔒 Wall posting is disabled on this profile.</p>;
  }

  return (
    <div className="wall-board-content">
      {authUser ? (
        <form onSubmit={handlePost} className="wall-compose-form">
          <div className="wall-compose-toolbar">
            <button type="button" className="wall-fmt-btn" title="Bold" onClick={() => insertFormat('**')}><strong>B</strong></button>
            <button type="button" className="wall-fmt-btn wall-fmt-italic" title="Italic" onClick={() => insertFormat('*')}><em>I</em></button>
            <button type="button" className="wall-fmt-btn wall-fmt-strike" title="Strikethrough" onClick={() => insertFormat('~~')}><s>S</s></button>
            <span className="wall-toolbar-sep" />
            <div style={{ position: 'relative' }}>
              <button type="button" className="wall-fmt-btn" onClick={() => setShowEmoji(v => !v)} title="Emoji">😊</button>
              {showEmoji && (
                <div className="wall-emoji-picker">
                  {WALL_EMOJIS.map(em => (
                    <button key={em} type="button" className="wall-emoji-item" onClick={() => addEmoji(em)}>{em}</button>
                  ))}
                </div>
              )}
            </div>
            <span className="wall-toolbar-sep" />
            <button type="button" className="wall-fmt-btn" title="Add photos (max 5)"
              onClick={() => photoRef.current?.click()} disabled={photos.length >= 5}>
              📷{photos.length > 0 ? ` ${photos.length}/5` : ''}
            </button>
            <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotos} />
          </div>

          <textarea
            ref={textareaRef}
            className="form-textarea wall-compose-input"
            rows={3}
            placeholder={isOwn ? 'Post to your wall…' : `Post on ${u.username}'s wall…`}
            value={content}
            onChange={e => setContent(e.target.value)}
          />

          {photoUrls.length > 0 && (
            <div className="wall-photo-previews">
              {photoUrls.map((url, i) => (
                <div key={i} className="wall-photo-preview-item">
                  <img src={url} alt="" />
                  <button type="button" className="wall-photo-remove-btn" onClick={() => removePhoto(i)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {photos.length > 1 && (
            <div className="wall-layout-selector">
              {[['single','1 photo'],['side_by_side','Side by side'],['three','3 photos'],['grid','Grid']].map(([val, lbl]) => (
                <button key={val} type="button"
                  className={`wall-layout-btn${layout === val ? ' active' : ''}`}
                  onClick={() => setLayout(val)}>{lbl}</button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '.4rem' }}>
            <button className="btn btn-primary btn-sm" disabled={posting || (!content.trim() && !photos.length)}>
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      ) : (
        <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: '.5rem' }}>Sign in to post on this wall.</p>
      )}

      {u.wall_privacy === 'network' && !isOwn && (
        <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: '.35rem' }}>🔒 Network members only</div>
      )}

      <div className="wall-posts-list">
        {wall.map(wp => (
          <WallPost
            key={wp.id}
            wp={wp}
            isOwn={isOwn}
            authUser={authUser}
            token={token}
            username={username}
            onDelete={() => onWallDelete(wp.id)}
            onPin={onWallPin}
            openThreadPostId={openThreadPostId}
            onToggleThread={id => setOpenThreadPostId(prev => prev === id ? null : id)}
          />
        ))}
        {wall.length === 0 && <p className="empty board-empty">No wall posts yet.</p>}
      </div>
    </div>
  );
}

function WallPostPhotos({ photos, layout }) {
  const shown = layout === 'grid' ? photos.slice(0, 4)
    : layout === 'three' ? photos.slice(0, 3)
    : layout === 'side_by_side' ? photos.slice(0, 2)
    : photos.slice(0, 1);
  const cls = {
    single: 'wall-photos-single', side_by_side: 'wall-photos-side',
    three: 'wall-photos-three', grid: 'wall-photos-grid',
  }[layout] || 'wall-photos-single';
  return (
    <div className={`wall-photos-collage ${cls}`}>
      {shown.map((url, i) => (
        <img key={i} src={resolveUrl(url)} alt="" loading="lazy" className="wall-photo-img" />
      ))}
    </div>
  );
}

function WallPost({ wp, isOwn, authUser, token, username, onDelete, onPin, openThreadPostId, onToggleThread }) {
  const [thread,        setThread]        = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [newMessage,    setNewMessage]    = useState('');
  const [sendingMsg,    setSendingMsg]    = useState(false);
  const isOpen = openThreadPostId === wp.id;

  async function loadThread() {
    setThreadLoading(true);
    try {
      const threads = await api.getWallThreads(wp.id);
      if (threads.length > 0) {
        const t = await api.getThread(threads[0].id);
        setThread(t);
      } else {
        setThread({ id: null, messages: [] });
      }
    } catch {}
    finally { setThreadLoading(false); }
  }

  function handleToggle() {
    onToggleThread(wp.id);
    if (!isOpen && thread === null) loadThread();
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() || !authUser) return;
    setSendingMsg(true);
    try {
      if (!thread?.id) {
        const t = await api.createThread({ title: `Reply on @${wp.author_username}'s wall`, wall_post_id: wp.id }, token);
        const msg = await api.addMessage(t.id, { content: newMessage.trim() }, token);
        setThread({ ...t, messages: [{ ...msg, username: authUser.username }] });
      } else {
        const msg = await api.addMessage(thread.id, { content: newMessage.trim() }, token);
        setThread(prev => ({ ...prev, messages: [...prev.messages, { ...msg, username: authUser.username }] }));
      }
      setNewMessage('');
    } catch (err) { alert(err.message); }
    finally { setSendingMsg(false); }
  }

  async function handlePin() {
    try {
      const updated = await api.pinWallPost(username, wp.id, token);
      onPin(updated);
    } catch (err) { alert(err.message); }
  }

  async function handleDelete() {
    if (!confirm('Delete this wall post?')) return;
    try {
      await api.deleteWallPost(username, wp.id, token);
      onDelete();
    } catch (err) { alert(err.message); }
  }

  return (
    <div className={`profile-wall-post${wp.is_pinned ? ' wall-post-pinned' : ''}`}>
      {wp.is_pinned && <div className="wall-pin-badge">📌 Pinned</div>}
      <div className="profile-wall-post-header">
        {wp.author_avatar_url && (
          <img src={resolveUrl(wp.author_avatar_url)} alt={wp.author_username} className="wall-author-avatar" />
        )}
        <Link to={`/profile/${wp.author_username}`} className="profile-wall-author">
          {wp.author_username}{wp.author_verified && <span className="profile-verified-sm">✓</span>}
        </Link>
        <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
          {new Date(wp.created_at).toLocaleDateString()}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '.2rem', alignItems: 'center' }}>
          {isOwn && (
            <button className="btn btn-ghost"
              style={{ padding: '0 .3rem', fontSize: '.72rem', color: wp.is_pinned ? 'var(--green)' : 'var(--muted)', lineHeight: 1 }}
              title={wp.is_pinned ? 'Unpin' : 'Pin to top'} onClick={handlePin}>📌</button>
          )}
          {(isOwn || authUser?.id === wp.author_id) && (
            <button className="btn btn-ghost"
              style={{ padding: '0 .25rem', fontSize: '.7rem', color: 'var(--danger)', lineHeight: 1 }}
              onClick={handleDelete}>✕</button>
          )}
        </div>
      </div>

      {wp.content && (
        <p className="profile-wall-post-content">{renderRichText(wp.content)}</p>
      )}

      {wp.photo_urls?.length > 0 && (
        <WallPostPhotos photos={wp.photo_urls} layout={wp.collage_layout || 'single'} />
      )}

      <div className="wall-post-footer">
        <button className="wall-reply-btn" onClick={handleToggle}>
          💬 {wp.reply_count > 0 ? `${wp.reply_count} ${wp.reply_count === 1 ? 'reply' : 'replies'}` : 'Reply'}
          {' '}{isOpen ? '▲' : '▼'}
        </button>
      </div>

      {isOpen && (
        <div className="wall-thread-inline">
          {threadLoading && <div className="spinner" style={{ width: 16, height: 16, margin: '.5rem auto' }} />}
          {thread && thread.messages.map(m => (
            <div key={m.id} className="wall-thread-message">
              <Link to={`/profile/${m.username}`} className="wall-thread-author">{m.username}</Link>
              <span className="wall-thread-text">{m.content}</span>
              <span className="wall-thread-date">{new Date(m.created_at).toLocaleDateString()}</span>
            </div>
          ))}
          {thread && thread.messages.length === 0 && !threadLoading && (
            <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: '.25rem 0' }}>No replies yet.</p>
          )}
          {authUser && (
            <form onSubmit={sendMessage} className="wall-reply-form">
              <input className="form-input wall-reply-input" placeholder="Write a reply…"
                value={newMessage} onChange={e => setNewMessage(e.target.value)} />
              <button className="btn btn-primary btn-sm" disabled={sendingMsg || !newMessage.trim()}>
                {sendingMsg ? '…' : 'Reply'}
              </button>
            </form>
          )}
        </div>
      )}
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

function PostsBoard({ posts, isOwn }) {
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
      {!posts.length && <p className="empty board-empty">No posts yet.</p>}
      {isOwn && (
        <div style={{ marginTop: '.6rem', paddingTop: '.6rem', borderTop: '1px solid var(--border)' }}>
          <Link to="/my-posts" style={{ fontSize: '.8rem', color: 'var(--accent)', fontWeight: 600 }}>
            Manage all posts →
          </Link>
        </div>
      )}
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
            hint="400×400px square, displays as circle"
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

function BannerUpload({ token, onUploaded, triggerRef }) {
  const [src, setSrc] = useState(null);
  const [filename, setFilename] = useState('');
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (triggerRef) triggerRef.current = () => fileRef.current?.click();
  });

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => { setSrc(reader.result); setCrop(undefined); setCompletedCrop(undefined); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function onImageLoad(e) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 3, w, h), w, h));
  }

  async function confirm() {
    if (!completedCrop || !imgRef.current) return;
    setUploading(true);
    try {
      const blob = await cropToBlob(imgRef.current, completedCrop, 1200, 400);
      const file = new File([blob], filename.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
      const res = await api.uploadProfileBanner(file, token);
      onUploaded(res.url);
      setSrc(null);
    } catch (e) { alert(e.message); }
    finally { setUploading(false); }
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onFileChange} />
      {src && (
        <div className="img-crop-overlay" onClick={e => e.target === e.currentTarget && setSrc(null)}>
          <div className="img-crop-dialog">
            <div className="img-crop-dialog-header"><span>Crop Banner</span><button type="button" className="img-crop-close" onClick={() => setSrc(null)}>✕</button></div>
            <div className="img-crop-dialog-body">
              <ReactCrop crop={crop} onChange={(_, p) => setCrop(p)} onComplete={px => setCompletedCrop(px)} aspect={3} minWidth={40}>
                <img ref={imgRef} src={src} alt="crop" onLoad={onImageLoad} style={{ maxWidth: '80vw', maxHeight: '60vh', display: 'block' }} />
              </ReactCrop>
              <p className="img-crop-size-hint">Output: 1200×400px</p>
            </div>
            <div className="img-crop-dialog-footer">
              <button type="button" className="btn btn-primary" onClick={confirm} disabled={uploading || !completedCrop}>{uploading ? '…' : 'Use Photo'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setSrc(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Background Upload ─────────────────────────────────────────────────────────

function BackgroundUpload({ token, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  async function handleFile(blob, filename) {
    setUploading(true);
    try {
      const file = new File([blob], filename, { type: 'image/jpeg' });
      const res = await api.uploadProfileBackground(file, token);
      onUploaded(res.url);
    } catch (e) { alert(e.message); }
    finally { setUploading(false); }
  }
  return (
    <ImageCropUploader aspect={16/9} targetWidth={1920} targetHeight={1080}
      label={uploading ? '…' : '📷 Set Background Photo'} hint="1920×1080px landscape (16:9 ratio)"
      onFile={handleFile} disabled={uploading} btnClassName="btn btn-outline btn-sm" />
  );
}

// ── Profile Network Sidebar ───────────────────────────────────────────────────

function ProfileNetworkSidebar({ copart, networkSettings, isOwn, token, accentColor, onSettingsUpdate }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const settings = networkSettings || {};
  const visibleCount = Math.min(Math.max(1, settings.count || 1), 6);
  const rotationOn = settings.rotation !== false;

  const filteredPeople = useMemo(() => {
    let p = [...copart];
    if (settings.hidden?.length) p = p.filter(person => !settings.hidden.includes(String(person.id)));
    if (settings.order?.length) {
      const orderMap = {};
      settings.order.forEach((id, i) => { orderMap[String(id)] = i; });
      p.sort((a, b) => (orderMap[String(a.id)] ?? 999) - (orderMap[String(b.id)] ?? 999));
    }
    return p;
  }, [copart, settings]);

  useEffect(() => {
    if (!rotationOn || filteredPeople.length <= visibleCount) return;
    const id = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentIndex(i => (i + visibleCount) % filteredPeople.length);
        setFadeIn(true);
      }, 300);
    }, 4000);
    return () => clearInterval(id);
  }, [filteredPeople.length, visibleCount, rotationOn]);

  const total = filteredPeople.length;
  if (total === 0) return null;

  let displayPeople = filteredPeople.slice(currentIndex, currentIndex + visibleCount);
  if (displayPeople.length < visibleCount && total > visibleCount) {
    displayPeople = [...displayPeople, ...filteredPeople.slice(0, visibleCount - displayPeople.length)];
  }

  return (
    <aside className="profile-network-sidebar">
      <div className="pns-header">
        <span className="pns-title">My Network</span>
        {isOwn && <button className="pns-gear" onClick={() => setShowSettings(true)} title="Customize">⚙</button>}
      </div>
      <div className={`pns-carousel${fadeIn ? '' : ' pns-fading'}`}>
        {displayPeople.map(p => <PersonNetCard key={p.id} person={p} accentColor={accentColor} />)}
      </div>
      {rotationOn && total > visibleCount && (
        <div className="pns-dots">
          {Array.from({ length: Math.ceil(total / visibleCount) }).map((_, i) => (
            <span key={i} className={`pns-dot${Math.floor(currentIndex / visibleCount) === i ? ' active' : ''}`}
              onClick={() => setCurrentIndex(i * visibleCount)} />
          ))}
        </div>
      )}
      {showSettings && (
        <NetworkSettingsModal
          people={copart} settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={async ns => {
            try { await api.customizeProfile({ profile_network_settings: ns }, token); onSettingsUpdate(ns); } catch { /* ignore */ }
            setShowSettings(false);
          }}
        />
      )}
    </aside>
  );
}

function PersonNetCard({ person: p, accentColor }) {
  const preview = p.status_text || p.pinned_bulletin || '';
  return (
    <div className="pns-person-card">
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div className="pns-avatar" style={{ background: p.accent_color || accentColor || 'var(--green)' }}>
          {p.avatar_url ? <img src={resolveUrl(p.avatar_url)} alt={p.username} /> : <span>{p.username[0].toUpperCase()}</span>}
        </div>
        {p.mood_emoji && <span className="pns-mood-badge">{p.mood_emoji}</span>}
      </div>
      <div className="pns-person-info">
        <span className="pns-display-name">{p.username}</span>
        {p.mood && <span className="pns-mood-label">{p.mood}</span>}
        {preview && <p className="pns-status-line">{preview.slice(0, 60)}</p>}
        <Link to={`/profile/${p.username}`} className="pns-view-link">View Profile →</Link>
      </div>
    </div>
  );
}

function NetworkSettingsModal({ people, settings, onClose, onSave }) {
  const [hidden, setHidden] = useState(new Set((settings.hidden || []).map(String)));
  const [count, setCount] = useState(settings.count || 1);
  const [rotation, setRotation] = useState(settings.rotation !== false);
  const [order, setOrder] = useState(() => {
    if (settings.order?.length) {
      const ordered = [];
      const idMap = {};
      people.forEach(p => { idMap[String(p.id)] = p; });
      settings.order.forEach(id => { if (idMap[String(id)]) ordered.push(idMap[String(id)]); });
      people.forEach(p => { if (!settings.order.includes(String(p.id)) && !settings.order.includes(p.id)) ordered.push(p); });
      return ordered;
    }
    return [...people];
  });

  function toggleHide(id) {
    const s = new Set(hidden);
    if (s.has(String(id))) s.delete(String(id)); else s.add(String(id));
    setHidden(s);
  }

  function save() {
    onSave({ hidden: [...hidden], count, rotation, order: order.map(p => String(p.id)) });
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header"><span className="modal-title">Network Sidebar Settings</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="form-group">
            <label className="form-label">People to show at once</label>
            <input type="range" min={1} max={6} value={count} onChange={e => setCount(+e.target.value)} style={{ width: '100%' }} />
            <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{count} {count === 1 ? 'person' : 'people'}</span>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', fontSize: '.9rem' }}>
              <input type="checkbox" checked={rotation} onChange={e => setRotation(e.target.checked)} /> Auto-rotate every 4 seconds
            </label>
          </div>
          <div className="form-group">
            <label className="form-label">People (toggle to hide)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', maxHeight: 240, overflowY: 'auto' }}>
              {order.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.3rem .5rem', background: 'var(--surface)', borderRadius: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: p.accent_color || 'var(--green)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>
                    {p.avatar_url ? <img src={resolveUrl(p.avatar_url)} alt={p.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.username[0].toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: '.85rem' }}>{p.username}</span>
                  <button type="button" className={`btn btn-sm ${hidden.has(String(p.id)) ? 'btn-outline' : 'btn-primary'}`}
                    style={{ fontSize: '.7rem', padding: '.15rem .4rem' }} onClick={() => toggleHide(p.id)}>
                    {hidden.has(String(p.id)) ? 'Show' : 'Hide'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={save}>Save</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Sticker Layer ─────────────────────────────────────────────────────────────

const EMOJI_CATEGORIES = {
  'Faces':     ['😊','😂','🥲','😤','😴','🤔','😎','🤯','😏','🫠','🥳','😈','🤩','😬','🥺','😇','😅','🫡'],
  'Nature':    ['🌱','🌻','🌊','🔥','⚡','🌀','🌸','🍀','🦋','🐝','🌿','🌙','🦅','🌺','🍄','🌾','🐉','🦎'],
  'Food':      ['🍕','🍵','🌮','🍓','🥑','🧃','☕','🌽','🍇','🧁','🍞','🧀','🍎','🥕','🫐','🍋','🥜','🌶️'],
  'Activities':['🎸','📚','🏃','🎨','⚽','🧩','🎤','💻','📷','🎭','🛠️','🎯','🎪','🏋️','🚴','🧘','🎲','✍️'],
  'Objects':   ['💡','🔑','📌','🗂️','📜','🔭','🧪','🪴','🎁','🧲','🔮','📯','🪁','🗝️','⚙️','🪞','📦','🪬'],
  'Symbols':   ['❤️','✨','⭐','🌈','💫','♾️','💥','🏆','☀️','🌙','💜','💚','💛','🔴','⚡','🌟','💎','🔶'],
  'Community': ['🦠','🤝','🏘️','⬡','🌐','📣','🗳️','🌍','💬','🤲','🕊️','🏡','🧑‍🤝‍🧑','📢','🌱','⚖️','🏛️','🤜'],
};

const COMMUNITY_BADGES = [
  { id: 'founding',    label: 'Founding Member',        icon: '⬡', color: '#2a5f0a', bg: '#d1fae5' },
  { id: 'verified',    label: 'Verified',               icon: '✓', color: '#2563eb', bg: '#dbeafe' },
  { id: 'covenant',    label: 'Covenant Agreed',        icon: '✦', color: '#7c3aed', bg: '#ede9fe' },
  { id: 'veteran',     label: 'Veteran',                icon: '★', color: '#ea580c', bg: '#ffedd5' },
  { id: 'first_resp',  label: 'First Responder',        icon: '🚨', color: '#dc2626', bg: '#fee2e2' },
  { id: 'nbhd_2024',   label: 'Neighborhood Fave 2024', icon: '🏆', color: '#ca8a04', bg: '#fef9c3' },
  { id: 'nbhd_2025',   label: 'Neighborhood Fave 2025', icon: '🏆', color: '#ca8a04', bg: '#fef9c3' },
];

function StickerLayer({ stickers, isEditMode, onUpdate, onSave, accentColor }) {
  const layerRef = useRef(null);

  if (!stickers.length && !isEditMode) return null;

  return (
    <div ref={layerRef} className={`profile-sticker-layer${isEditMode ? ' sticker-edit-mode' : ''}`}>
      {stickers.map(s => (
        <StickerItem key={s.id} sticker={s} isEditMode={isEditMode} layerRef={layerRef}
          onUpdate={(id, changes) => onUpdate(id, changes)}
          onSave={onSave} accentColor={accentColor} />
      ))}
    </div>
  );
}

function StickerItem({ sticker: s, isEditMode, layerRef, onUpdate, onSave, accentColor }) {
  const moveDrag = useRef(null);
  const resizeDrag = useRef(null);
  const rotateDrag = useRef(null);

  function onMoveDown(e) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = layerRef.current?.getBoundingClientRect();
    moveDrag.current = { startX: e.clientX, startY: e.clientY, startXPct: s.x_percent, startYPct: s.y_percent, rect };
  }
  function onMoveMove(e) {
    if (!moveDrag.current) return;
    const { startX, startY, startXPct, startYPct, rect } = moveDrag.current;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    onUpdate(s.id, {
      x_percent: Math.max(0, Math.min(95, startXPct + (dx / rect.width) * 100)),
      y_percent: Math.max(0, Math.min(95, startYPct + (dy / rect.height) * 100)),
    });
  }
  function onMoveUp() { if (moveDrag.current) { moveDrag.current = null; onSave(); } }

  function onResizeDown(e) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeDrag.current = { startX: e.clientX, startY: e.clientY, startSize: s.size || 60 };
  }
  function onResizeMove(e) {
    if (!resizeDrag.current) return;
    const { startX, startY, startSize } = resizeDrag.current;
    const delta = (e.clientX - startX + e.clientY - startY) / 2;
    onUpdate(s.id, { size: Math.max(20, Math.min(300, startSize + delta)) });
  }
  function onResizeUp() { if (resizeDrag.current) { resizeDrag.current = null; onSave(); } }

  function onRotateDown(e) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = layerRef.current?.getBoundingClientRect();
    const cx = rect.left + (s.x_percent / 100) * rect.width + (s.size || 60) / 2;
    const cy = rect.top + (s.y_percent / 100) * rect.height + (s.size || 60) / 2;
    rotateDrag.current = { cx, cy, startAngle: Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI, startRot: s.rotation || 0 };
  }
  function onRotateMove(e) {
    if (!rotateDrag.current) return;
    const { cx, cy, startAngle, startRot } = rotateDrag.current;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    onUpdate(s.id, { rotation: startRot + (angle - startAngle) });
  }
  function onRotateUp() { if (rotateDrag.current) { rotateDrag.current = null; onSave(); } }

  const sz = s.size || 60;
  const style = {
    position: 'absolute',
    left: `${s.x_percent}%`,
    top: `${s.y_percent}%`,
    width: sz,
    opacity: s.opacity ?? 1,
    transform: `rotate(${s.rotation || 0}deg)`,
    cursor: isEditMode ? 'grab' : 'default',
    userSelect: 'none',
    zIndex: 10,
  };

  const renderContent = () => {
    if (s.type === 'emoji') return <span style={{ fontSize: sz * 0.9, lineHeight: 1 }}>{s.value}</span>;
    if (s.type === 'badge') {
      const badge = COMMUNITY_BADGES.find(b => b.id === s.value) || {};
      const customBadge = s.customBadge;
      const label = customBadge?.label || badge.label || s.value;
      const color = customBadge?.color || badge.color || accentColor || '#2a5f0a';
      const bg = customBadge?.bg || badge.bg || color + '22';
      return (
        <div style={{ background: bg, border: `2px solid ${color}`, borderRadius: 8, padding: '4px 10px', fontSize: sz * 0.2, fontWeight: 700, color, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: sz * 0.3 }}>{badge.icon || customBadge?.icon || '⬡'}</span>
          <span>{label}</span>
        </div>
      );
    }
    if (s.type === 'upload') return <img src={s.value} alt="sticker" style={{ width: sz, height: sz, objectFit: 'contain' }} />;
    if (s.type === 'text') {
      const fontMap = { classic: "'Georgia', serif", modern: 'sans-serif', typewriter: 'monospace', editorial: "'Palatino Linotype', serif" };
      return (
        <div style={{ fontSize: sz * 0.25, fontFamily: fontMap[s.font] || 'sans-serif', color: s.color || '#000', fontWeight: 700, whiteSpace: 'nowrap', padding: '4px 8px' }}>
          {s.value}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={style}>
      {isEditMode && (
        <div className="sticker-rotate-handle"
          onPointerDown={onRotateDown} onPointerMove={onRotateMove} onPointerUp={onRotateUp}>↻</div>
      )}
      <div className={isEditMode ? 'sticker-move-handle' : ''}
        onPointerDown={isEditMode ? onMoveDown : undefined}
        onPointerMove={isEditMode ? onMoveMove : undefined}
        onPointerUp={isEditMode ? onMoveUp : undefined}>
        {renderContent()}
      </div>
      {isEditMode && (
        <>
          <button className="sticker-delete-btn" onClick={() => onUpdate(s.id, null)} type="button">✕</button>
          <div className="sticker-resize-handle"
            onPointerDown={onResizeDown} onPointerMove={onResizeMove} onPointerUp={onResizeUp} />
          <div className="sticker-opacity-bar">
            <input type="range" min={0} max={100} value={Math.round((s.opacity ?? 1) * 100)}
              onChange={e => onUpdate(s.id, { opacity: +e.target.value / 100 })}
              onPointerUp={onSave} style={{ width: 60, height: 12 }} />
          </div>
        </>
      )}
    </div>
  );
}

function StickerPicker({ onPlace, onClose, onClearAll, token }) {
  const [tab, setTab] = useState('emojis');
  const [search, setSearch] = useState('');
  const [emojiCat, setEmojiCat] = useState('Faces');
  const [textVal, setTextVal] = useState('');
  const [textColor, setTextColor] = useState('#000000');
  const [textFont, setTextFont] = useState('modern');
  const [customBadgeText, setCustomBadgeText] = useState('');
  const [customBadgeColor, setCustomBadgeColor] = useState('#2a5f0a');
  const fileRef = useRef(null);

  const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
  const catEmojis = EMOJI_CATEGORIES[emojiCat] || [];
  const filtered = search ? allEmojis.filter(e => e.includes(search)) : catEmojis;

  return (
    <div className="sticker-picker-panel">
      <div className="sticker-picker-header">
        <span style={{ fontWeight: 700, fontSize: '.9rem' }}>🎨 Stickers</span>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <button className="btn btn-sm btn-outline" style={{ fontSize: '.72rem', color: 'var(--danger)' }} onClick={onClearAll}>Clear All</button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="sticker-picker-tabs">
        {['emojis','badges','upload','text'].map(t => (
          <button key={t} className={`sticker-tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'emojis' ? '😊 Emojis' : t === 'badges' ? '⬡ Badges' : t === 'upload' ? '📎 Upload' : '✍ Text'}
          </button>
        ))}
      </div>

      {tab === 'emojis' && (
        <div style={{ padding: '.5rem' }}>
          <input className="form-input" style={{ marginBottom: '.5rem', fontSize: '.82rem' }}
            placeholder="Search emojis…" value={search} onChange={e => setSearch(e.target.value)} />
          {!search && (
            <div className="sticker-cat-bar">
              {Object.keys(EMOJI_CATEGORIES).map(cat => (
                <button key={cat} className={`sticker-cat-btn${emojiCat === cat ? ' active' : ''}`} onClick={() => setEmojiCat(cat)}>{cat}</button>
              ))}
            </div>
          )}
          <div className="sticker-emoji-grid">
            {filtered.slice(0, 60).map((em, i) => (
              <button key={i} className="sticker-emoji-btn" onClick={() => onPlace({ type: 'emoji', value: em })} title={em}>
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'badges' && (
        <div style={{ padding: '.5rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {COMMUNITY_BADGES.map(badge => (
            <button key={badge.id} className="sticker-badge-btn" onClick={() => onPlace({ type: 'badge', value: badge.id })}
              style={{ background: badge.bg, border: `2px solid ${badge.color}`, color: badge.color }}>
              <span>{badge.icon}</span> {badge.label}
            </button>
          ))}
          <div style={{ marginTop: '.5rem', borderTop: '1px solid var(--border)', paddingTop: '.5rem' }}>
            <p style={{ fontSize: '.78rem', fontWeight: 600, marginBottom: '.4rem' }}>Custom Badge</p>
            <input className="form-input" style={{ fontSize: '.82rem', marginBottom: '.3rem' }}
              placeholder="Badge text" value={customBadgeText} onChange={e => setCustomBadgeText(e.target.value)} />
            <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', marginBottom: '.3rem' }}>
              <input type="color" value={customBadgeColor} onChange={e => setCustomBadgeColor(e.target.value)} style={{ width: 32, height: 28 }} />
              <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>Color</span>
            </div>
            <button className="btn btn-primary btn-sm" disabled={!customBadgeText.trim()}
              onClick={() => onPlace({ type: 'badge', value: 'custom', customBadge: { label: customBadgeText, color: customBadgeColor, bg: customBadgeColor + '22', icon: '★' } })}>
              Add Custom Badge
            </button>
          </div>
        </div>
      )}

      {tab === 'upload' && (
        <div style={{ padding: '.75rem', textAlign: 'center' }}>
          <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: '.75rem' }}>Square PNG with transparent background recommended, max 500KB</p>
          <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>Choose Image</button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }}
            onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const res = await api.uploadProfileSticker(file, token);
                onPlace({ type: 'upload', value: res.url });
              } catch (err) { alert(err.message); }
              e.target.value = '';
            }} />
        </div>
      )}

      {tab === 'text' && (
        <div style={{ padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          <input className="form-input" placeholder="Enter text" value={textVal} onChange={e => setTextVal(e.target.value)} />
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: 32, height: 28 }} />
            <select className="form-select" value={textFont} onChange={e => setTextFont(e.target.value)} style={{ flex: 1, fontSize: '.82rem' }}>
              <option value="modern">Modern</option>
              <option value="classic">Classic</option>
              <option value="typewriter">Typewriter</option>
              <option value="editorial">Editorial</option>
            </select>
          </div>
          <button className="btn btn-primary btn-sm" disabled={!textVal.trim()}
            onClick={() => onPlace({ type: 'text', value: textVal, color: textColor, font: textFont })}>
            Add Text Sticker
          </button>
        </div>
      )}
    </div>
  );
}

// ── Profile Editor ────────────────────────────────────────────────────────────

const PATTERN_NAMES = {
  solid: 'Solid Color', diagonal_stripes: 'Diagonal Stripes', horizontal_stripes: 'Horizontal Stripes',
  vertical_stripes: 'Vertical Stripes', grid: 'Grid', dots: 'Dots', checkerboard: 'Checkerboard',
  zigzag: 'Zigzag', diamonds: 'Diamonds', honeycomb: 'Honeycomb', crosshatch: 'Crosshatch',
  waves: 'Waves', triangles: 'Triangles', stars: 'Stars', mycelium: 'Mycelium',
};

function ProfileEditor({ user: u, token, onClose, onSaved }) {
  const [editorTab, setEditorTab] = useState('appearance');
  const [bgMode, setBgMode] = useState(u.background_photo_url ? 'photo' : u.pattern_type && u.pattern_type !== 'solid' ? 'pattern' : 'color');
  const [bgPhotoUrl, setBgPhotoUrl] = useState(u.background_photo_url || null);
  const [form, setForm] = useState({
    username: u.username || '', bio: u.bio || '', location: u.location || '',
    website: u.website || '', interests: (u.interests || []).join(', '),
    mood: u.mood || '', mood_emoji: u.mood_emoji || '', status_text: u.status_text || '',
    music_url: u.music_url || '', music_label: u.music_label || '',
    accent_color: u.accent_color || '#2a5f0a',
    background_color: u.background_color || '#f2ede4',
    background_gradient: u.background_gradient || '',
    use_gradient: !!u.background_gradient,
    font_style: u.font_style || 'modern',
    layout: u.layout || 'standard',
    profile_theme: u.profile_theme || 'light',
    pinned_bulletin: u.pinned_bulletin || '',
    background_overlay_opacity: u.background_overlay_opacity ?? 0.5,
    pattern_type: u.pattern_type || 'solid',
    pattern_color_primary: u.pattern_color_primary || u.accent_color || '#2a5f0a',
    pattern_color_secondary: u.pattern_color_secondary || '#1a3b07',
    pattern_scale: u.pattern_scale || 'medium',
    pattern_opacity: u.pattern_opacity ?? 0.8,
    wall_privacy: u.wall_privacy || 'everyone',
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
        mood: form.mood || undefined, mood_emoji: form.mood_emoji || undefined,
        status_text: form.status_text || undefined,
        music_url: form.music_url || undefined, music_label: form.music_label || undefined,
        accent_color: form.accent_color || undefined,
        background_color:    !form.use_gradient ? (form.background_color || undefined) : undefined,
        background_gradient: form.use_gradient  ? (form.background_gradient || undefined) : undefined,
        font_style: form.font_style || undefined, layout: form.layout || undefined,
        profile_theme: form.profile_theme || undefined,
        pinned_bulletin: form.pinned_bulletin || undefined,
        background_overlay_opacity: form.background_overlay_opacity,
        pattern_type: bgMode === 'pattern' ? form.pattern_type : 'solid',
        pattern_color_primary: form.pattern_color_primary,
        pattern_color_secondary: form.pattern_color_secondary,
        pattern_scale: form.pattern_scale,
        pattern_opacity: form.pattern_opacity,
        wall_privacy: form.wall_privacy || undefined,
      };
      if (bgMode !== 'photo') payload.background_photo_url = null;
      const updated = await api.customizeProfile(payload, token);
      onSaved({ ...updated, background_photo_url: bgMode === 'photo' ? bgPhotoUrl : null });
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

              {/* Background mode selector */}
              <div className="form-group">
                <label className="form-label">Background</label>
                <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.75rem' }}>
                  {[['color','🎨 Color/Gradient'], ['photo','📷 Photo'], ['pattern','⬡ Pattern']].map(([mode, label]) => (
                    <button key={mode} type="button" className={`tab-btn${bgMode === mode ? ' active' : ''}`}
                      style={{ fontSize: '.8rem' }} onClick={() => setBgMode(mode)}>{label}</button>
                  ))}
                </div>

                {bgMode === 'color' && (
                  <>
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
                  </>
                )}

                {bgMode === 'photo' && (
                  <div>
                    {bgPhotoUrl && (
                      <div style={{ position: 'relative', marginBottom: '.6rem' }}>
                        <img src={resolveUrl(bgPhotoUrl)} alt="background" style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 6 }} />
                        <button type="button" className="btn btn-sm btn-outline" style={{ position: 'absolute', top: 4, right: 4, fontSize: '.72rem', background: 'rgba(0,0,0,.5)', color: '#fff', border: 'none' }}
                          onClick={() => setBgPhotoUrl(null)}>Remove</button>
                      </div>
                    )}
                    <BackgroundUpload token={token} onUploaded={url => setBgPhotoUrl(url)} />
                    <div style={{ marginTop: '.75rem' }}>
                      <label className="form-label" style={{ fontSize: '.82rem' }}>
                        Overlay Opacity: {Math.round(form.background_overlay_opacity * 100)}%
                        <span style={{ fontSize: '.72rem', color: 'var(--muted)', marginLeft: '.3rem' }}>(accent color overlay)</span>
                      </label>
                      <input type="range" min={0} max={90} step={5} value={Math.round(form.background_overlay_opacity * 100)}
                        onChange={e => set('background_overlay_opacity', +e.target.value / 100)} style={{ width: '100%' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--muted)' }}>
                        <span>0% — raw photo</span><span>90% — nearly solid</span>
                      </div>
                    </div>
                  </div>
                )}

                {bgMode === 'pattern' && (
                  <div>
                    <div className="pattern-grid-picker">
                      {Object.keys(PATTERN_NAMES).map(type => {
                        const preview = type === 'solid' ? { background: form.pattern_color_primary } : getPatternCSS(type, form.pattern_color_primary, form.pattern_color_secondary, form.pattern_scale);
                        return (
                          <button key={type} type="button" title={PATTERN_NAMES[type]}
                            className={`pattern-swatch${form.pattern_type === type ? ' selected' : ''}`}
                            onClick={() => set('pattern_type', type)}
                            style={{ ...preview, opacity: 0.85 }}>
                            <span className="pattern-swatch-label">{PATTERN_NAMES[type].split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="form-row" style={{ marginTop: '.75rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '.78rem' }}>Primary</label>
                        <input type="color" value={form.pattern_color_primary} onChange={e => set('pattern_color_primary', e.target.value)} style={{ width: 40, height: 28 }} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '.78rem' }}>Secondary</label>
                        <input type="color" value={form.pattern_color_secondary} onChange={e => set('pattern_color_secondary', e.target.value)} style={{ width: 40, height: 28 }} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '.78rem' }}>Scale</label>
                        <select className="form-select" style={{ fontSize: '.82rem' }} value={form.pattern_scale} onChange={e => set('pattern_scale', e.target.value)}>
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '.78rem' }}>Pattern Opacity: {Math.round(form.pattern_opacity * 100)}%</label>
                      <input type="range" min={10} max={100} value={Math.round(form.pattern_opacity * 100)} onChange={e => set('pattern_opacity', +e.target.value / 100)} style={{ width: '100%' }} />
                    </div>
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
              <div className="form-group">
                <label className="form-label">Wall Privacy</label>
                <select className="form-select" value={form.wall_privacy} onChange={e => set('wall_privacy', e.target.value)}>
                  <option value="everyone">Everyone can post</option>
                  <option value="network">My network only</option>
                  <option value="disabled">Nobody (wall disabled)</option>
                </select>
                <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.2rem' }}>Who can post on your Wall board</p>
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
