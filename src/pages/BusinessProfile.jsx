import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import ImageCropUploader from '../components/ImageCropUploader';

const PATTERN_SCALE_PX = { small: 16, medium: 32, large: 64 };
function getPatternCSS(type, c1, c2, scale) {
  const sz = PATTERN_SCALE_PX[scale] || 32;
  const a = c1 || '#1a1a2e', b = c2 || '#0d0d1a';
  switch (type) {
    case 'diagonal_stripes': return { background: `repeating-linear-gradient(45deg, ${a}, ${a} ${sz/4}px, ${b} ${sz/4}px, ${b} ${sz/2}px)` };
    case 'horizontal_stripes': return { background: `repeating-linear-gradient(0deg, ${a}, ${a} ${sz/2}px, ${b} ${sz/2}px, ${b} ${sz}px)` };
    case 'grid': return { background: b, backgroundImage: `linear-gradient(${a} 1px, transparent 1px), linear-gradient(90deg, ${a} 1px, transparent 1px)`, backgroundSize: `${sz}px ${sz}px` };
    case 'dots': return { background: b, backgroundImage: `radial-gradient(circle, ${a} ${sz/8}px, transparent ${sz/8}px)`, backgroundSize: `${sz}px ${sz}px` };
    case 'checkerboard': return { background: b, backgroundImage: `repeating-conic-gradient(${a} 0% 25%, ${b} 0% 50%)`, backgroundSize: `${sz}px ${sz}px` };
    case 'zigzag': return { backgroundColor: b, backgroundImage: `linear-gradient(135deg, ${a} 25%, transparent 25%) -${sz/2}px 0, linear-gradient(225deg, ${a} 25%, transparent 25%) -${sz/2}px 0, linear-gradient(315deg, ${a} 25%, transparent 25%), linear-gradient(45deg, ${a} 25%, transparent 25%)`, backgroundSize: `${sz}px ${sz}px` };
    case 'diamonds': return { backgroundColor: b, backgroundImage: `linear-gradient(45deg, ${a} 25%, transparent 25%), linear-gradient(-45deg, ${a} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${a} 75%), linear-gradient(-45deg, transparent 75%, ${a} 75%)`, backgroundSize: `${sz}px ${sz}px`, backgroundPosition: `0 0, 0 ${sz/2}px, ${sz/2}px -${sz/2}px, -${sz/2}px 0px` };
    default: return { backgroundColor: a };
  }
}

const BIZ_FONT_STYLES = [
  { value: 'mystical',   label: 'Mystical',   css: "'Cinzel Decorative', cursive" },
  { value: 'modern',     label: 'Modern',     css: "-apple-system, 'Segoe UI', sans-serif" },
  { value: 'classic',    label: 'Classic',    css: "'Georgia', serif" },
  { value: 'typewriter', label: 'Typewriter', css: "'Courier New', monospace" },
];
const BIZ_PATTERN_TYPES = [
  { value: 'solid', label: 'Solid' }, { value: 'diagonal_stripes', label: 'Stripes' },
  { value: 'grid', label: 'Grid' }, { value: 'dots', label: 'Dots' },
  { value: 'checkerboard', label: 'Checkerboard' }, { value: 'zigzag', label: 'Zigzag' }, { value: 'diamonds', label: 'Diamonds' },
];
function buildBizPageStyle(settings) {
  const accent = settings.accent || '#00ff88';
  const style = { '--biz-accent': accent, '--biz-glow': `0 0 12px ${accent}55` };
  const fontEntry = BIZ_FONT_STYLES.find(f => f.value === settings.font);
  if (fontEntry) style['--biz-font'] = fontEntry.css;
  if (settings.pattern_type && settings.pattern_type !== 'solid') {
    Object.assign(style, getPatternCSS(settings.pattern_type, settings.pattern_color_primary, settings.pattern_color_secondary, settings.pattern_scale || 'medium'));
  } else if (settings.background_color) {
    style.backgroundColor = settings.background_color;
  }
  return style;
}

const BIZ_TYPE_LABELS = {
  independently_owned:    'Independently Owned',
  locally_owned_franchise:'Locally Owned Franchise',
  cooperative:            'Cooperative',
  nonprofit:              'Nonprofit',
  sole_proprietor:        'Sole Proprietor',
};
const CATEGORY_LABELS = {
  construction: 'Construction', retail: 'Retail', food_beverage: 'Food & Beverage',
  healthcare: 'Healthcare', legal: 'Legal', creative: 'Creative', trades: 'Trades',
  technology: 'Technology', childcare: 'Childcare', education: 'Education',
  agriculture: 'Agriculture', other: 'Other',
};
const AVAIL_LABELS = {
  available: 'Available for Work', not_taking_clients: 'Not Taking New Clients',
  open_to_opportunities: 'Open to Opportunities', not_applicable: null,
};
const BASE_URL = 'https://mycelium.unprecedentedtimes.org';

function resolveUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${BASE_URL}${url}`;
}

export default function BusinessProfile() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [biz,      setBiz]      = useState(null);
  const [recs,        setRecs]        = useState({ messages: [], thread_id: null });
  const [tab,         setTab]         = useState('about');
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(false);
  const [lightbox,    setLightbox]    = useState(null);
  const [recInput,    setRecInput]    = useState('');
  const [recBusy,     setRecBusy]     = useState(false);
  const [recErr,      setRecErr]      = useState(null);
  const [replyId,     setReplyId]     = useState(null);
  const [replyText,   setReplyText]   = useState('');
  const [reported,    setReported]    = useState(false);
  const [deactivating,setDeactivating]= useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState('');
  const [pageSettings,  setPageSettings]  = useState({});
  const [editingPage,   setEditingPage]   = useState(false);
  const [savingPage,    setSavingPage]    = useState(false);
  const [pageSaved,     setPageSaved]     = useState(false);
  const [bizBannerUrl,  setBizBannerUrl]  = useState(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerFileRef = useRef(null);

  useEffect(() => {
    Promise.all([api.getBusiness(id), api.getBusinessRecommendations(id)])
      .then(([b, r]) => {
        setBiz(b);
        setRecs(r);
        setPageSettings(b.page_settings || {});
        setBizBannerUrl(b.banner_url || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page"><div className="container"><div className="spinner" style={{ marginTop: '4rem' }} /></div></div>;
  if (!biz)    return <div className="page"><div className="container"><p className="error-msg">Business not found.</p></div></div>;

  async function handleDeactivate() {
    if (deactivateConfirm !== biz.business_name) return;
    setRecBusy(true);
    try {
      await api.deleteBusiness(id, token);
      setBiz(b => ({ ...b, is_active: false }));
      setDeactivating(false);
      setDeactivateConfirm('');
    } catch (e) { alert(e.message); }
    finally { setRecBusy(false); }
  }

  const isOwner = user?.id === biz.owner_id;
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';
  const cover   = biz.photos.find(p => p.is_cover) || biz.photos[0];
  const bizPageStyle = buildBizPageStyle(pageSettings);

  async function saveBizPageSettings(updated) {
    setSavingPage(true);
    setPageSaved(false);
    try {
      await api.saveBusinessPageSettings(id, updated, token);
      setPageSettings({ ...updated });
      setPageSaved(true);
      setTimeout(() => setPageSaved(false), 3000);
    } catch (e) { alert(e.message); }
    finally { setSavingPage(false); }
  }

  async function handleBizBannerFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    try {
      const res = await api.uploadBusinessBanner(id, file, token);
      setBizBannerUrl(res.banner_url);
    } catch (e) { alert(e.message); }
    finally { setBannerUploading(false); e.target.value = ''; }
  }

  async function submitRecommendation(e) {
    e.preventDefault();
    if (!recInput.trim()) return;
    setRecBusy(true); setRecErr(null);
    try {
      const msg = await api.postRecommendation(id, recInput.trim(), token);
      setRecs(r => ({ ...r, messages: [...r.messages, msg] }));
      setRecInput('');
    } catch (e) {
      setRecErr(e.message);
    } finally {
      setRecBusy(false);
    }
  }

  async function submitReply(msgId) {
    if (!replyText.trim()) return;
    setRecBusy(true);
    try {
      const reply = await api.replyToRecommendation(id, msgId, replyText.trim(), token);
      setRecs(r => ({
        ...r,
        messages: r.messages.map(m => m.id === msgId ? { ...m, replies: [...(m.replies||[]), reply] } : m),
      }));
      setReplyId(null); setReplyText('');
    } catch (e) { alert(e.message); }
    finally { setRecBusy(false); }
  }

  async function deleteRec(msgId) {
    if (!confirm('Remove this recommendation?')) return;
    try {
      await api.adminDeleteRecommendation(id, msgId, token);
      setRecs(r => ({ ...r, messages: r.messages.filter(m => m.id !== msgId) }));
    } catch (e) { alert(e.message); }
  }

  async function toggleVerify() {
    try {
      const u = await api.adminVerifyBusiness(id, !biz.is_verified_local, token);
      setBiz(b => ({ ...b, is_verified_local: u.is_verified_local }));
    } catch (e) { alert(e.message); }
  }

  const HOURS_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <div className="page biz-profile-page" style={bizPageStyle}>
      <input ref={bannerFileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleBizBannerFile} />
      {!biz.is_active && (
        <div style={{ background: 'var(--red-bg,#fef2f2)', borderBottom: '2px solid var(--red,#dc2626)', padding: '.75rem 1rem', textAlign: 'center', fontSize: '.9rem', fontWeight: 600, color: 'var(--red,#dc2626)' }}>
          This business is no longer active.
        </div>
      )}
      {/* Branded banner (from page settings) */}
      {bizBannerUrl && (
        <div className="biz-brand-banner" style={{ backgroundImage: `url(${bizBannerUrl})` }}>
          {isOwner && (
            <button className="maker-banner-change-btn" onClick={() => bannerFileRef.current?.click()}>
              {bannerUploading ? '…' : '📷 Change Banner'}
            </button>
          )}
        </div>
      )}

      {/* Cover banner (from photo gallery) */}
      <div className="biz-cover-banner" style={cover ? { backgroundImage: `url(${resolveUrl(cover.url)})` } : {}}>
        {!cover && <div className="biz-cover-placeholder">{biz.business_name[0].toUpperCase()}</div>}
        {isOwner && (
          <div className="biz-cover-actions">
            <PhotoUploader bizId={id} token={token} isCover onUploaded={photo => setBiz(b => ({ ...b, photos: [photo, ...b.photos] }))} />
          </div>
        )}
      </div>

      <div className="container" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div className="biz-profile-header">
          <div className="biz-profile-identity">
            <div className="biz-profile-name-row">
              <h1 className="biz-profile-name">{biz.business_name}</h1>
              {biz.is_verified_local && <span className="biz-verified-badge-lg">✓ Verified Local</span>}
            </div>
            <div className="biz-profile-meta-row">
              <span className="biz-type-pill" style={{ background: '#2a5f0a18', color: '#2a5f0a', borderColor: '#2a5f0a44' }}>
                {BIZ_TYPE_LABELS[biz.business_type]}
              </span>
              <span className="biz-cat-pill">{CATEGORY_LABELS[biz.category]}</span>
              {biz.location_label && <span className="biz-profile-location">📍 {biz.location_label}</span>}
            </div>
            <p className="biz-profile-owner-line">
              Listed by{' '}
              <Link to={`/profile/${biz.owner_username}`} className="username-link">
                {biz.owner_username}
              </Link>
              {biz.owner_verified && <span className="verified-badge" style={{ fontSize: '.7rem', marginLeft: '.25rem' }}>✓</span>}
              {biz.owner_founding && <span className="founding-badge" style={{ fontSize: '.7rem', marginLeft: '.25rem' }}>⬡</span>}
            </p>
          </div>
          <div className="biz-profile-actions">
            {isOwner && biz.is_active && <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Edit</button>}
            {isOwner && biz.is_active && (
              <button className="btn btn-sm" style={{ background: 'var(--biz-accent,#00ff88)', color: '#071a0e', boxShadow: 'var(--biz-glow)' }}
                onClick={() => setEditingPage(p => !p)}>
                {editingPage ? '✕ Done' : '✏ Edit Page'}
              </button>
            )}
            {isAdmin && biz.is_active && (
              <button className={`btn btn-sm ${biz.is_verified_local ? 'btn-outline' : 'btn-primary'}`} onClick={toggleVerify}>
                {biz.is_verified_local ? 'Revoke Verification' : '✓ Verify Local'}
              </button>
            )}
            {isOwner && biz.is_active && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', fontSize: '.78rem', borderColor: 'var(--red)' }}
                onClick={() => setDeactivating(true)}>
                Deactivate
              </button>
            )}
            {!reported && user && !isOwner && biz.is_active && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--muted)', fontSize: '.78rem' }}
                onClick={() => { if (confirm('Report this business page?')) setReported(true); }}>
                Report
              </button>
            )}
          </div>
        </div>

        {/* Page customization panel */}
        {isOwner && editingPage && (
          <div className="page-editor-panel maker-page-editor" style={{ marginBottom: '1.5rem' }}>
            <h3 className="page-editor-title">✏ Customize Business Page</h3>
            <div className="page-editor-grid">
              <div className="page-editor-section">
                <label className="page-editor-label">Banner Image</label>
                <p className="page-editor-hint">1200×400px, 3:1 ratio</p>
                <button className="btn btn-outline btn-sm" onClick={() => bannerFileRef.current?.click()}>
                  {bannerUploading ? 'Uploading…' : bizBannerUrl ? 'Change Banner' : 'Upload Banner'}
                </button>
              </div>
              <div className="page-editor-section">
                <label className="page-editor-label">Accent Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <input type="color" value={pageSettings.accent || '#00ff88'}
                    onChange={e => setPageSettings(s => ({ ...s, accent: e.target.value }))}
                    style={{ width: 40, height: 32, cursor: 'pointer', border: 'none', background: 'none' }} />
                  <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{pageSettings.accent || '#00ff88'}</span>
                </div>
              </div>
              <div className="page-editor-section">
                <label className="page-editor-label">Heading Font</label>
                <div className="page-editor-font-pills">
                  {BIZ_FONT_STYLES.map(f => (
                    <button key={f.value}
                      className={'page-editor-pill' + (pageSettings.font === f.value ? ' active' : '')}
                      onClick={() => setPageSettings(s => ({ ...s, font: f.value }))}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="page-editor-section">
                <label className="page-editor-label">Background</label>
                <div className="page-editor-font-pills">
                  {BIZ_PATTERN_TYPES.map(p => (
                    <button key={p.value}
                      className={'page-editor-pill' + ((pageSettings.pattern_type || 'solid') === p.value ? ' active' : '')}
                      onClick={() => setPageSettings(s => ({ ...s, pattern_type: p.value }))}>
                      {p.label}
                    </button>
                  ))}
                </div>
                {pageSettings.pattern_type && pageSettings.pattern_type !== 'solid' ? (
                  <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem', alignItems: 'center' }}>
                    <label className="page-editor-label" style={{ marginBottom: 0 }}>Colors:</label>
                    <input type="color" value={pageSettings.pattern_color_primary || '#1a1a2e'}
                      onChange={e => setPageSettings(s => ({ ...s, pattern_color_primary: e.target.value }))}
                      style={{ width: 32, height: 28, cursor: 'pointer', border: 'none', background: 'none' }} />
                    <input type="color" value={pageSettings.pattern_color_secondary || '#0d0d1a'}
                      onChange={e => setPageSettings(s => ({ ...s, pattern_color_secondary: e.target.value }))}
                      style={{ width: 32, height: 28, cursor: 'pointer', border: 'none', background: 'none' }} />
                  </div>
                ) : (
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
                style={{ background: 'var(--biz-accent,#00ff88)', color: '#071a0e', boxShadow: 'var(--biz-glow)' }}
                onClick={() => saveBizPageSettings(pageSettings)}>
                {savingPage ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingPage(false)}>Cancel</button>
              {pageSaved && <span style={{ fontSize: '.85rem', color: 'var(--biz-accent,#00ff88)', fontWeight: 600 }}>✓ Saved</span>}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
          {[['about','About'],['services','Services'],['gallery','Gallery'],['posts','Posts'],['recommendations','Recommendations']].map(([v,l]) => (
            <button key={v} className={'tab-btn' + (tab === v ? ' active' : '')} onClick={() => setTab(v)}>{l}</button>
          ))}
        </div>

        {/* About tab */}
        {tab === 'about' && (
          <div className="biz-tab-content">
            {biz.description && (
              <div className="biz-about-section">
                <h3 className="biz-section-heading">About</h3>
                <p style={{ lineHeight: 1.7 }}>{biz.description}</p>
              </div>
            )}
            <div className="biz-info-grid">
              {biz.service_area && (
                <div className="biz-info-item">
                  <span className="biz-info-label">Service Area</span>
                  <span>{biz.service_area}</span>
                </div>
              )}
              {biz.website_url && (
                <div className="biz-info-item">
                  <span className="biz-info-label">Website</span>
                  <a href={biz.website_url.startsWith('http') ? biz.website_url : `https://${biz.website_url}`}
                    target="_blank" rel="noopener noreferrer" className="username-link">{biz.website_url}</a>
                </div>
              )}
              {biz.contact_preference === 'phone' && biz.contact_phone && (
                <div className="biz-info-item">
                  <span className="biz-info-label">Phone</span>
                  <a href={`tel:${biz.contact_phone}`}>{biz.contact_phone}</a>
                </div>
              )}
              {biz.contact_preference === 'email' && biz.contact_email && (
                <div className="biz-info-item">
                  <span className="biz-info-label">Email</span>
                  <a href={`mailto:${biz.contact_email}`}>{biz.contact_email}</a>
                </div>
              )}
              {biz.contact_preference === 'platform_message' && user && !isOwner && (
                <div className="biz-info-item">
                  <span className="biz-info-label">Contact</span>
                  <Link to={`/messages?with=${biz.owner_id}`} className="btn btn-outline btn-sm">
                    ✉ Message {biz.owner_username}
                  </Link>
                </div>
              )}
            </div>
            {biz.hours && Object.keys(biz.hours).length > 0 && (
              <div className="biz-about-section">
                <h3 className="biz-section-heading">Hours</h3>
                <div className="biz-hours-grid">
                  {HOURS_DAYS.map(day => biz.hours[day] && (
                    <div key={day} className="biz-hours-row">
                      <span className="biz-hours-day">{day}</span>
                      <span>{biz.hours[day]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {biz.owner_professional && (
              <div className="biz-about-section">
                <h3 className="biz-section-heading">Owner Skills</h3>
                <div className="biz-owner-skills">
                  {biz.owner_professional.occupation && (
                    <p style={{ marginBottom: '.5rem', color: 'var(--muted)', fontSize: '.875rem' }}>{biz.owner_professional.occupation}</p>
                  )}
                  <div className="prof-skill-cloud" style={{ marginTop: '.25rem' }}>
                    {(biz.owner_professional.skills || []).map(s => (
                      <span key={s} className="prof-skill-tag">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Services tab */}
        {tab === 'services' && (
          <div className="biz-tab-content">
            {isOwner && <AddServiceForm bizId={id} token={token} onAdded={svc => setBiz(b => ({ ...b, services: [...b.services, svc] }))} />}
            {biz.services.length === 0 ? (
              <p className="empty">No services listed yet.</p>
            ) : (
              <div className="biz-services-grid">
                {biz.services.map(svc => (
                  <div key={svc.id} className="biz-service-card">
                    <div className="biz-service-name">{svc.name}</div>
                    {svc.price_range && <div className="biz-service-price">{svc.price_range}</div>}
                    {svc.description && <p className="biz-service-desc">{svc.description}</p>}
                    {isOwner && (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', fontSize: '.72rem', marginTop: '.5rem' }}
                        onClick={async () => { if (!confirm('Remove service?')) return; await api.deleteBusinessService(id, svc.id, token); setBiz(b => ({ ...b, services: b.services.filter(s => s.id !== svc.id) })); }}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gallery tab */}
        {tab === 'gallery' && (
          <div className="biz-tab-content">
            {isOwner && <PhotoUploader bizId={id} token={token} onUploaded={photo => setBiz(b => ({ ...b, photos: [...b.photos, photo] }))} />}
            {biz.photos.length === 0 ? (
              <p className="empty">No photos yet.</p>
            ) : (
              <div className="biz-photo-grid">
                {biz.photos.map(photo => (
                  <div key={photo.id} className="biz-photo-item" onClick={() => setLightbox(resolveUrl(photo.url))}>
                    <img src={resolveUrl(photo.url)} alt={photo.caption || ''} loading="lazy" />
                    {photo.is_cover && <span className="biz-cover-tag">Cover</span>}
                    {photo.caption && <div className="biz-photo-caption">{photo.caption}</div>}
                    {isOwner && (
                      <button className="biz-photo-delete" onClick={async e => {
                        e.stopPropagation();
                        if (!confirm('Delete?')) return;
                        await api.deleteBusinessPhoto(id, photo.id, token);
                        setBiz(b => ({ ...b, photos: b.photos.filter(p => p.id !== photo.id) }));
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
        )}

        {/* Posts tab */}
        {tab === 'posts' && (
          <div className="biz-tab-content">
            {biz.posts.length === 0 ? (
              <p className="empty">No posts linked to this business yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {biz.posts.map(p => (
                  <Link key={p.id} to={`/posts/${p.id}`} className="board-post-row">
                    <span className={`badge badge-${p.type} badge-xs`}>{p.type}</span>
                    <span className="board-post-title">{p.title}</span>
                    <span className="board-post-date" style={{ marginLeft: 'auto', fontSize: '.72rem', color: 'var(--muted)', flexShrink: 0 }}>
                      {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recommendations tab */}
        {tab === 'recommendations' && (
          <div className="biz-tab-content">
            {user && !isOwner && (() => {
              const alreadyRec = recs.messages.some(m => m.user_id === user.id);
              return !alreadyRec ? (
                <form onSubmit={submitRecommendation} className="biz-rec-form">
                  <textarea className="form-textarea" rows={3} required value={recInput}
                    onChange={e => setRecInput(e.target.value)}
                    placeholder="Write a recommendation for this business…" />
                  {recErr && <p className="form-error">{recErr}</p>}
                  <button className="btn btn-primary btn-sm" disabled={recBusy || !recInput.trim()}>
                    {recBusy ? '…' : 'Post Recommendation'}
                  </button>
                </form>
              ) : <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>You've already recommended this business.</p>;
            })()}
            {recs.messages.length === 0 ? (
              <p className="empty">No recommendations yet. Be the first!</p>
            ) : (
              <div className="biz-recs-list">
                {recs.messages.map(msg => (
                  <div key={msg.id} className="biz-rec-item">
                    <div className="biz-rec-header">
                      <Link to={`/profile/${msg.username}`} className="username-link">{msg.username}</Link>
                      {msg.verified && <span className="verified-badge" style={{ fontSize: '.65rem' }}>✓</span>}
                      <span style={{ fontSize: '.72rem', color: 'var(--muted)', marginLeft: 'auto' }}>
                        {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                      {isAdmin && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', fontSize: '.72rem', padding: '0 .25rem' }}
                          onClick={() => deleteRec(msg.id)}>✕</button>
                      )}
                    </div>
                    <p className="biz-rec-content">{msg.content}</p>
                    {/* Owner replies */}
                    {(msg.replies || []).map(r => (
                      <div key={r.id} className="biz-rec-reply">
                        <span className="biz-rec-reply-owner">↳ {r.username} <em>(owner)</em></span>
                        <p>{r.content}</p>
                      </div>
                    ))}
                    {isOwner && !msg.replies?.length && (
                      replyId === msg.id ? (
                        <div className="biz-reply-form">
                          <textarea className="form-textarea" rows={2} value={replyText}
                            onChange={e => setReplyText(e.target.value)} placeholder="Reply to this recommendation…" />
                          <div style={{ display: 'flex', gap: '.4rem', marginTop: '.4rem' }}>
                            <button className="btn btn-primary btn-sm" disabled={recBusy || !replyText.trim()}
                              onClick={() => submitReply(msg.id)}>Reply</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setReplyId(null); setReplyText(''); }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.3rem' }}
                          onClick={() => setReplyId(msg.id)}>Reply</button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {deactivating && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeactivating(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span className="modal-title">Deactivate Business</span>
              <button className="modal-close" onClick={() => setDeactivating(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
                This will hide <strong>{biz.business_name}</strong> from the directory. All recommendations and data are preserved. To confirm, type the business name exactly:
              </p>
              <input
                className="form-input"
                value={deactivateConfirm}
                onChange={e => setDeactivateConfirm(e.target.value)}
                placeholder={biz.business_name}
                style={{ marginBottom: '.75rem' }}
              />
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button
                  className="btn btn-danger"
                  disabled={deactivateConfirm !== biz.business_name || recBusy}
                  onClick={handleDeactivate}
                >
                  {recBusy ? '…' : 'Deactivate Business'}
                </button>
                <button className="btn btn-ghost" onClick={() => { setDeactivating(false); setDeactivateConfirm(''); }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editing && (
        <EditBusinessModal biz={biz} token={token}
          onClose={() => setEditing(false)}
          onSaved={updated => { setBiz(b => ({ ...b, ...updated })); setEditing(false); }}
        />
      )}
    </div>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function PhotoUploader({ bizId, token, isCover = false, onUploaded }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(blob, filename) {
    setUploading(true);
    try {
      const file = new File([blob], filename, { type: 'image/jpeg' });
      const photo = await api.uploadBusinessPhoto(bizId, file, { is_cover: isCover }, token);
      onUploaded(photo);
    } catch (e) { alert(e.message); }
    finally { setUploading(false); }
  }

  return (
    <div style={{ marginBottom: isCover ? 0 : '.75rem' }}>
      <ImageCropUploader
        aspect={isCover ? 3 : 4 / 3}
        targetWidth={isCover ? 1200 : 800}
        targetHeight={isCover ? 400 : 600}
        label={isCover ? '📷 Change Cover' : '+ Add Photo'}
        hint={isCover ? '1200×400px landscape' : '800×600px landscape'}
        onFile={handleFile}
        disabled={uploading}
        btnClassName={`btn btn-sm ${isCover ? 'biz-cover-upload-btn' : 'btn-outline'}`}
      />
    </div>
  );
}

function AddServiceForm({ bizId, token, onAdded }) {
  const [form, setForm] = useState({ name: '', description: '', price_range: '' });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const svc = await api.addBusinessService(bizId, form, token);
      onAdded(svc);
      setForm({ name: '', description: '', price_range: '' });
      setOpen(false);
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  if (!open) return <button className="btn btn-outline btn-sm" style={{ marginBottom: '.75rem' }} onClick={() => setOpen(true)}>+ Add Service</button>;

  return (
    <form onSubmit={submit} className="biz-add-service-form">
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Service Name <span className="form-required">*</span></label>
          <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Price Range</label>
          <input className="form-input" value={form.price_range} onChange={e => setForm(f => ({ ...f, price_range: e.target.value }))} placeholder="e.g. $50-$150 / hr" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? '…' : 'Add Service'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

function EditBusinessModal({ biz, token, onClose, onSaved }) {
  const [form, setForm] = useState({
    business_name: biz.business_name, business_type: biz.business_type, category: biz.category,
    description: biz.description || '', location_label: biz.location_label || '',
    service_area: biz.service_area || '', contact_phone: biz.contact_phone || '',
    contact_email: biz.contact_email || '', contact_preference: biz.contact_preference || 'platform_message',
    website_url: biz.website_url || '',
  });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const updated = await api.updateBusiness(biz.id, form, token);
      onSaved(updated);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title">Edit Business</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Business Name</label>
            <input className="form-input" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location_label} onChange={e => setForm(f => ({ ...f, location_label: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Service Area</label>
              <input className="form-input" value={form.service_area} onChange={e => setForm(f => ({ ...f, service_area: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Website</label>
            <input className="form-input" type="url" value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://…" />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Preference</label>
            <select className="form-select" value={form.contact_preference} onChange={e => setForm(f => ({ ...f, contact_preference: e.target.value }))}>
              <option value="platform_message">Message on Mycelium</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
            </select>
          </div>
          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
        </form>
      </div>
    </div>
  );
}
