import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { usePlayer } from '../contexts/PlayerContext';
import api from '../api';
import MakerMetrics from '../components/MakerMetrics';

const WORK_TYPE_ICONS = { audio: '♪', image: '🖼', video: '▶', document: '📄', other: '📦' };

const LICENSE_LABELS = {
  all_rights_reserved:            'All Rights Reserved',
  creative_commons_attribution:   'CC Attribution',
  creative_commons_sharealike:    'CC ShareAlike',
  public_domain:                  'Public Domain',
};

const PATTERN_SCALE_PX = { small: 16, medium: 32, large: 64 };

function getPatternCSS(type, c1, c2, scale) {
  const sz = PATTERN_SCALE_PX[scale] || 32;
  const a = c1 || '#1a1a2e', b = c2 || '#0d0d1a';
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
      return { backgroundColor: b, backgroundImage: `radial-gradient(circle farthest-side at 0% 50%, transparent 23%, ${a} 24%, ${a} 35%, transparent 36%), radial-gradient(circle farthest-side at 100% 50%, transparent 23%, ${a} 24%, ${a} 35%, transparent 36%)`, backgroundSize: `${sz}px ${sz/2}px` };
    default:
      return { backgroundColor: a };
  }
}

const PATTERN_TYPES = [
  { value: 'solid',             label: 'Solid' },
  { value: 'diagonal_stripes',  label: 'Stripes' },
  { value: 'grid',              label: 'Grid' },
  { value: 'dots',              label: 'Dots' },
  { value: 'checkerboard',      label: 'Checkerboard' },
  { value: 'zigzag',            label: 'Zigzag' },
  { value: 'diamonds',          label: 'Diamonds' },
  { value: 'honeycomb',         label: 'Honeycomb' },
];

const FONT_STYLES = [
  { value: 'mystical',    label: 'Mystical',    css: "'Cinzel Decorative', cursive" },
  { value: 'modern',      label: 'Modern',      css: "-apple-system, 'Segoe UI', sans-serif" },
  { value: 'classic',     label: 'Classic',     css: "'Georgia', serif" },
  { value: 'typewriter',  label: 'Typewriter',  css: "'Courier New', monospace" },
];

function buildPageStyle(settings) {
  const accent = settings.accent || '#ff3366';
  const style = { '--maker-accent': accent, '--maker-glow': `0 0 12px ${accent}55` };
  const fontEntry = FONT_STYLES.find(f => f.value === settings.font);
  if (fontEntry) style['--maker-font'] = fontEntry.css;
  if (settings.pattern_type && settings.pattern_type !== 'solid') {
    const bg = getPatternCSS(settings.pattern_type, settings.pattern_color_primary, settings.pattern_color_secondary, settings.pattern_scale || 'medium');
    Object.assign(style, bg);
  } else if (settings.background_color) {
    style.backgroundColor = settings.background_color;
  }
  return style;
}

export default function MakerProfile({ onRequireAuth }) {
  const { username }     = useParams();
  const { user, token }  = useAuth();
  const { setTrack }     = usePlayer();
  const [data,         setData]        = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [error,        setError]       = useState('');
  const [commission,   setCommission]  = useState({ description: '', budget: '' });
  const [commSent,     setCommSent]    = useState(false);
  const [commErr,      setCommErr]     = useState('');
  const [activeTab,    setActiveTab]   = useState('works');
  const [pageSettings, setPageSettings] = useState({});
  const [editingPage,  setEditingPage]  = useState(false);
  const [savingPage,   setSavingPage]   = useState(false);
  const [pageSaved,    setPageSaved]    = useState(false);
  const [bannerUrl,    setBannerUrl]    = useState(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerFileRef = useRef(null);

  useEffect(() => {
    api.getMakerProfile(username)
      .then(d => {
        setData(d);
        setPageSettings(d.maker.page_settings || {});
        setBannerUrl(d.maker.banner_url || null);
      })
      .catch(() => setError('Maker not found'))
      .finally(() => setLoading(false));
  }, [username]);

  async function handleCommission(e) {
    e.preventDefault();
    if (!user) { onRequireAuth?.(); return; }
    setCommErr('');
    try {
      await api.requestCommission({ maker_id: data.maker.id, ...commission }, token);
      setCommSent(true);
    } catch (e) {
      setCommErr(e.message);
    }
  }

  async function savePageSettings(updated) {
    setSavingPage(true);
    setPageSaved(false);
    try {
      await api.saveMakerPageSettings(username, updated, token);
      setPageSettings(updated);
      setPageSaved(true);
      setTimeout(() => setPageSaved(false), 3000);
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingPage(false);
    }
  }

  async function handleBannerFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    try {
      const res = await api.uploadMakerBanner(username, file, token);
      setBannerUrl(res.banner_url);
    } catch (e) {
      alert(e.message);
    } finally {
      setBannerUploading(false);
      e.target.value = '';
    }
  }

  if (loading) return <div className="spinner" style={{ margin: '4rem auto' }} />;
  if (error)   return <div className="container"><p className="error-text">{error}</p></div>;

  const { maker, user: makerUser, works } = data;
  const audioWorks    = works.filter(w => w.work_type === 'audio');
  const nonAudioWorks = works.filter(w => w.work_type !== 'audio'); // eslint-disable-line no-unused-vars
  const isOwner       = user?.username?.toLowerCase() === makerUser.username?.toLowerCase();

  const tierBadgeColor = { free: '#888', basic: '#4a7c59', standard: '#2563eb', pro: '#7c3aed' };
  const pageStyle = buildPageStyle(pageSettings);

  return (
    <div className="maker-profile-page" style={pageStyle}>
      {/* Banner */}
      {bannerUrl && (
        <div className="maker-profile-banner" style={{ backgroundImage: `url(${bannerUrl})` }}>
          {isOwner && (
            <button className="maker-banner-change-btn" onClick={() => bannerFileRef.current?.click()}>
              {bannerUploading ? '…' : '📷 Change Banner'}
            </button>
          )}
        </div>
      )}

      <div className="maker-profile-header">
        <Link to="/makers" className="back-link">← Maker's Guild</Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem' }}>
          <div className="maker-profile-identity">
            {makerUser.avatar_url
              ? <img src={makerUser.avatar_url} className="maker-profile-avatar" alt={maker.maker_name} />
              : <div className="maker-profile-avatar-placeholder">{maker.maker_name[0]}</div>}
            <div>
              <h1 className="maker-profile-name" style={{ fontFamily: pageStyle['--maker-font'] || undefined }}>
                {maker.maker_name}
              </h1>
              <Link to={`/profile/${makerUser.username}`} className="maker-profile-username">
                @{makerUser.username}
              </Link>
              <span className="maker-tier-badge" style={{ backgroundColor: tierBadgeColor[maker.storage_tier] }}>
                {maker.storage_tier} maker
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {isOwner && !bannerUrl && (
              <button className="btn btn-outline btn-sm" onClick={() => bannerFileRef.current?.click()}>
                {bannerUploading ? '…' : '+ Add Banner'}
              </button>
            )}
            {isOwner && (
              <button className="btn btn-sm" style={{ background: 'var(--maker-accent,#ff3366)', color: '#fff', boxShadow: 'var(--maker-glow)' }}
                onClick={() => setEditingPage(p => !p)}>
                {editingPage ? '✕ Done' : '✏ Edit Page'}
              </button>
            )}
          </div>
        </div>

        {maker.bio && <p className="maker-profile-bio">{maker.bio}</p>}
        <div className="maker-profile-specialties">
          {(maker.specialties || []).map(s => (
            <span key={s} className="maker-specialty-tag">{s}</span>
          ))}
        </div>
      </div>

      {/* Page customization panel */}
      {isOwner && editingPage && (
        <div className="page-editor-panel maker-page-editor">
          <h3 className="page-editor-title">✏ Customize Maker Page</h3>
          <div className="page-editor-grid">

            {/* Banner upload */}
            <div className="page-editor-section">
              <label className="page-editor-label">Banner Image</label>
              <p className="page-editor-hint">1200×400px, 3:1 ratio</p>
              <button className="btn btn-outline btn-sm" onClick={() => bannerFileRef.current?.click()}>
                {bannerUploading ? 'Uploading…' : bannerUrl ? 'Change Banner' : 'Upload Banner'}
              </button>
            </div>

            {/* Accent color */}
            <div className="page-editor-section">
              <label className="page-editor-label">Accent Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <input type="color" value={pageSettings.accent || '#ff3366'}
                  onChange={e => setPageSettings(s => ({ ...s, accent: e.target.value }))}
                  style={{ width: 40, height: 32, cursor: 'pointer', border: 'none', background: 'none' }} />
                <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{pageSettings.accent || '#ff3366'}</span>
              </div>
            </div>

            {/* Font */}
            <div className="page-editor-section">
              <label className="page-editor-label">Heading Font</label>
              <div className="page-editor-font-pills">
                {FONT_STYLES.map(f => (
                  <button key={f.value}
                    className={'page-editor-pill' + (pageSettings.font === f.value ? ' active' : '')}
                    onClick={() => setPageSettings(s => ({ ...s, font: f.value }))}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background pattern */}
            <div className="page-editor-section">
              <label className="page-editor-label">Background</label>
              <div className="page-editor-font-pills">
                {PATTERN_TYPES.map(p => (
                  <button key={p.value}
                    className={'page-editor-pill' + ((pageSettings.pattern_type || 'solid') === p.value ? ' active' : '')}
                    onClick={() => setPageSettings(s => ({ ...s, pattern_type: p.value }))}>
                    {p.label}
                  </button>
                ))}
              </div>
              {pageSettings.pattern_type && pageSettings.pattern_type !== 'solid' && (
                <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem', alignItems: 'center' }}>
                  <label className="page-editor-label" style={{ marginBottom: 0 }}>Colors:</label>
                  <input type="color" value={pageSettings.pattern_color_primary || '#1a1a2e'}
                    onChange={e => setPageSettings(s => ({ ...s, pattern_color_primary: e.target.value }))}
                    style={{ width: 32, height: 28, cursor: 'pointer', border: 'none', background: 'none' }} />
                  <input type="color" value={pageSettings.pattern_color_secondary || '#0d0d1a'}
                    onChange={e => setPageSettings(s => ({ ...s, pattern_color_secondary: e.target.value }))}
                    style={{ width: 32, height: 28, cursor: 'pointer', border: 'none', background: 'none' }} />
                </div>
              )}
              {(pageSettings.pattern_type === 'solid' || !pageSettings.pattern_type) && (
                <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem', alignItems: 'center' }}>
                  <label className="page-editor-label" style={{ marginBottom: 0 }}>Color:</label>
                  <input type="color" value={pageSettings.background_color || '#0d0d1a'}
                    onChange={e => setPageSettings(s => ({ ...s, background_color: e.target.value }))}
                    style={{ width: 32, height: 28, cursor: 'pointer', border: 'none', background: 'none' }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <button type="button" className="btn btn-primary btn-sm" disabled={savingPage}
              style={{ background: 'var(--maker-accent,#ff3366)', boxShadow: 'var(--maker-glow)' }}
              onClick={() => savePageSettings(pageSettings)}>
              {savingPage ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingPage(false)}>Cancel</button>
            {pageSaved && <span style={{ fontSize: '.85rem', color: '#00ff88', fontWeight: 600 }}>✓ Saved</span>}
          </div>
        </div>
      )}

      <div className="maker-profile-tabs">
        <button className={'maker-tab' + (activeTab === 'works' ? ' active' : '')} onClick={() => setActiveTab('works')}>
          Works ({works.length})
        </button>
        {audioWorks.length > 0 && (
          <button className={'maker-tab' + (activeTab === 'music' ? ' active' : '')} onClick={() => setActiveTab('music')}>
            Music ({audioWorks.length})
          </button>
        )}
        <button className={'maker-tab' + (activeTab === 'commission' ? ' active' : '')} onClick={() => setActiveTab('commission')}>
          Commission
        </button>
        {isOwner && (
          <button className={'maker-tab' + (activeTab === 'metrics' ? ' active' : '')} onClick={() => setActiveTab('metrics')}>
            My Metrics
          </button>
        )}
      </div>

      {activeTab === 'works' && (
        <div className="maker-works-grid">
          {works.length === 0 && <p style={{ color: 'var(--muted)', padding: '2rem' }}>No works uploaded yet.</p>}
          {works.map(w => (
            <Link to={`/makers/works/${w.id}`} key={w.id} className="work-card">
              {w.work_type === 'image' && w.r2_url && (
                <div className="work-card-image">
                  <img src={w.r2_url} alt={w.title} loading="lazy" />
                </div>
              )}
              <div className="work-card-body">
                <div className="work-card-type">{WORK_TYPE_ICONS[w.work_type]} {w.work_type}</div>
                <h3 className="work-card-title">{w.title}</h3>
                <div className="work-card-meta">
                  <span>{w.play_count} plays</span>
                  <span className="work-license">{LICENSE_LABELS[w.license]}</span>
                  <span className={w.is_free ? 'price-free' : 'price-paid'}>
                    {w.is_free ? 'Free' : `$${parseFloat(w.price).toFixed(2)}`}
                  </span>
                </div>
                {w.work_type === 'audio' && (
                  <button
                    className="btn btn-sm btn-outline work-play-btn"
                    onClick={e => {
                      e.preventDefault();
                      setTrack({ id: w.id, title: w.title, maker_name: maker.maker_name, username: makerUser.username, r2_url: w.r2_url });
                    }}
                  >
                    ▶ Play
                  </button>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'music' && (
        <div className="maker-music-playlist">
          {audioWorks.map(w => (
            <div key={w.id} className="playlist-item">
              <button
                className="playlist-play-btn"
                onClick={() => setTrack({ id: w.id, title: w.title, maker_name: maker.maker_name, username: makerUser.username, r2_url: w.r2_url })}
              >
                ▶
              </button>
              <div className="playlist-item-info">
                <Link to={`/makers/works/${w.id}`} className="playlist-title">{w.title}</Link>
                <div className="playlist-meta">
                  <span>{w.play_count} plays</span>
                  {w.duration_seconds && <span>{Math.floor(w.duration_seconds / 60)}:{String(w.duration_seconds % 60).padStart(2, '0')}</span>}
                  <span className={w.is_free ? 'price-free' : 'price-paid'}>{w.is_free ? 'Free' : `$${parseFloat(w.price).toFixed(2)}`}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'commission' && (
        <div className="maker-commission-panel" style={{ maxWidth: 560, padding: '1.5rem 0' }}>
          {commSent ? (
            <p className="success-text">Commission request sent! The maker will get back to you.</p>
          ) : (
            <form onSubmit={handleCommission} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2>Request a Commission</h2>
              <p style={{ color: 'var(--muted)' }}>Describe what you're looking for and your budget. {maker.maker_name} will respond via direct message.</p>
              <textarea className="input" rows={5} required placeholder="Describe your project…"
                value={commission.description} onChange={e => setCommission(c => ({ ...c, description: e.target.value }))} />
              <input className="input" type="number" min="0" step="0.01" placeholder="Budget (optional, USD)"
                value={commission.budget} onChange={e => setCommission(c => ({ ...c, budget: e.target.value }))} />
              {commErr && <p className="error-text">{commErr}</p>}
              <button type="submit" className="btn btn-primary">Send Request</button>
            </form>
          )}
        </div>
      )}

      {activeTab === 'metrics' && isOwner && (
        <div style={{ paddingTop: '1rem' }}>
          <MakerMetrics username={makerUser.username} token={token} />
        </div>
      )}

      {/* Hidden banner file input */}
      <input ref={bannerFileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleBannerFile} />
    </div>
  );
}
