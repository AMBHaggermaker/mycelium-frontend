import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

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
  const [recs,     setRecs]     = useState({ messages: [], thread_id: null });
  const [tab,      setTab]      = useState('about');
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [recInput, setRecInput] = useState('');
  const [recBusy,  setRecBusy]  = useState(false);
  const [recErr,   setRecErr]   = useState(null);
  const [replyId,  setReplyId]  = useState(null);
  const [replyText,setReplyText]= useState('');
  const [reported, setReported] = useState(false);

  useEffect(() => {
    Promise.all([api.getBusiness(id), api.getBusinessRecommendations(id)])
      .then(([b, r]) => { setBiz(b); setRecs(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page"><div className="container"><div className="spinner" style={{ marginTop: '4rem' }} /></div></div>;
  if (!biz)    return <div className="page"><div className="container"><p className="error-msg">Business not found.</p></div></div>;

  const isOwner = user?.id === biz.owner_id;
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';
  const cover   = biz.photos.find(p => p.is_cover) || biz.photos[0];

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
    <div className="page biz-profile-page">
      {/* Cover banner */}
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
            {isOwner && <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Edit</button>}
            {isAdmin && (
              <button className={`btn btn-sm ${biz.is_verified_local ? 'btn-outline' : 'btn-primary'}`} onClick={toggleVerify}>
                {biz.is_verified_local ? 'Revoke Verification' : '✓ Verify Local'}
              </button>
            )}
            {!reported && user && !isOwner && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--muted)', fontSize: '.78rem' }}
                onClick={() => { if (confirm('Report this business page?')) setReported(true); }}>
                Report
              </button>
            )}
          </div>
        </div>

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
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const photo = await api.uploadBusinessPhoto(bizId, file, { is_cover: isCover }, token);
      onUploaded(photo);
    } catch (e) { alert(e.message); }
    finally { setUploading(false); e.target.value = ''; }
  }

  return (
    <div style={{ marginBottom: isCover ? 0 : '.75rem' }}>
      <button className={`btn btn-sm ${isCover ? 'biz-cover-upload-btn' : 'btn-outline'}`}
        onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? '…' : isCover ? '📷 Change Cover' : '+ Add Photo'}
      </button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFile} />
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
