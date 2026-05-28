import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth';
import api from '../api';
import ImageCropUploader from './ImageCropUploader';

const TYPES = ['need', 'offer', 'event'];
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime';

const CATEGORIES = [
  { value: 'jobs_services',  label: 'Jobs & Services' },
  { value: 'goods_supplies', label: 'Goods & Supplies' },
  { value: 'community',      label: 'Community' },
];

const SUBCATEGORY_SUGGESTIONS = {
  jobs_services:  ['skilled trades', 'tech', 'healthcare', 'legal', 'creative', 'childcare', 'restaurant/food', 'promotion', 'other'],
  goods_supplies: ['free', 'for sale', 'trade', 'tools', 'clothing', 'furniture', 'seeds/plants', 'building materials', 'other'],
  community:      ['mutual aid', 'housing', 'rides', 'food', 'childcare', 'labor', 'emotional support', 'other'],
};

export default function NewPostModal({ onClose, onCreated, defaultCircleId }) {
  const { user, token } = useAuth();
  const [form, setForm] = useState({
    type: 'offer', title: '', description: '', circle_id: defaultCircleId || '',
    capacity: '', location: '', starts_at: '', ends_at: '', tags: '',
    category: '', subcategory: '', is_urgent: false, expires_at: '',
    commerce_type: '', price: '', business_id: '',
  });
  const [circles,   setCircles]   = useState([]);
  const [myBizList, setMyBizList] = useState([]);
  const [files,     setFiles]     = useState([]);
  const [previews,  setPreviews]  = useState([]);
  const [err,  setErr]  = useState(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.getCircles({ limit: 100 }).then(setCircles).catch(() => {});
    if (user?.id) api.getBusinessesByOwner(user.id).then(setMyBizList).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function selectCategory(val) {
    setForm(f => ({ ...f, category: f.category === val ? '' : val, subcategory: '' }));
  }

  function handleFiles(e) {
    const selected = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selected].slice(0, 5));
    e.target.value = '';
  }

  function removeFile(i) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const payload = {
        type:          form.type,
        title:         form.title.trim(),
        description:   form.description.trim() || undefined,
        circle_id:     form.circle_id || undefined,
        capacity:      form.capacity ? parseInt(form.capacity) : undefined,
        location:      form.location.trim() || undefined,
        starts_at:     form.starts_at || undefined,
        ends_at:       form.ends_at || undefined,
        tags:          form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        category:      form.category || undefined,
        subcategory:   form.subcategory.trim() || undefined,
        is_urgent:     form.is_urgent || undefined,
        expires_at:    form.expires_at || undefined,
        commerce_type: form.commerce_type || undefined,
        price:       form.commerce_type === 'commerce' && form.price ? parseFloat(form.price) : undefined,
        business_id: form.business_id || undefined,
      };
      const post = await api.createPost(payload, token);
      if (files.length) await api.uploadPostMedia(post.id, files, token);
      onCreated();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const suggestions = form.category ? (SUBCATEGORY_SUGGESTIONS[form.category] ?? []) : [];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title">New Post</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={submit}>

          <div className="community-notice">
            <strong>unprecedentedtimes.org is a family-friendly platform.</strong> No adult content.
            You own what you say here — say it with your name on it.
          </div>

          {/* Type */}
          <div className="form-group">
            <label className="form-label">Type</label>
            <div style={{ display: 'flex', gap: '.4rem' }}>
              {TYPES.map(t => (
                <button key={t} type="button"
                  className={`btn btn-sm ${form.type === t ? `badge badge-${t}` : 'btn-outline'}`}
                  style={{ flex: 1, textTransform: 'capitalize' }}
                  onClick={() => set('type', t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Category <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <div style={{ display: 'flex', gap: '.4rem' }}>
              {CATEGORIES.map(c => (
                <button key={c.value} type="button"
                  className={`btn btn-sm ${form.category === c.value ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, fontSize: '.78rem' }}
                  onClick={() => selectCategory(c.value)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory */}
          <div className="form-group">
            <label className="form-label">Subcategory <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <input className="form-input" value={form.subcategory}
              onChange={e => set('subcategory', e.target.value)}
              placeholder={form.category ? 'Type or pick below…' : 'Select a category first'} />
            {suggestions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.4rem' }}>
                {suggestions.map(s => (
                  <button key={s} type="button"
                    onClick={() => set('subcategory', s)}
                    style={{
                      padding: '.2rem .55rem', fontSize: '.75rem', borderRadius: 99,
                      border: '1px solid var(--border)',
                      background: form.subcategory === s ? 'var(--accent)' : 'var(--surface)',
                      color: form.subcategory === s ? '#fff' : 'var(--text)',
                      cursor: 'pointer', lineHeight: 1.4,
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Link to a business (Local Commerce only, if user owns businesses) */}
          {myBizList.length > 0 && (
            <div className="form-group">
              <label className="form-label">Link to a Business <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
              <select className="form-select" value={form.business_id} onChange={e => set('business_id', e.target.value)}>
                <option value="">No linked business</option>
                {myBizList.filter(b => b.is_active).map(b => (
                  <option key={b.id} value={b.id}>{b.business_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" required value={form.title}
              onChange={e => set('title', e.target.value)} />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description}
              onChange={e => set('description', e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location}
                onChange={e => set('location', e.target.value)} />
            </div>
            {form.type === 'event' && (
              <div className="form-group">
                <label className="form-label">Capacity</label>
                <input className="form-input" type="number" min="1" value={form.capacity}
                  onChange={e => set('capacity', e.target.value)} placeholder="Unlimited" />
              </div>
            )}
          </div>

          {form.type === 'event' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Starts *</label>
                <input className="form-input" type="datetime-local" required={form.type === 'event'}
                  value={form.starts_at} onChange={e => set('starts_at', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Ends</label>
                <input className="form-input" type="datetime-local"
                  value={form.ends_at} onChange={e => set('ends_at', e.target.value)} />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Circle</label>
              <select className="form-select" value={form.circle_id}
                onChange={e => set('circle_id', e.target.value)}>
                <option value="">Public (no circle)</option>
                {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tags</label>
              <input className="form-input" value={form.tags} placeholder="food, tools, …"
                onChange={e => set('tags', e.target.value)} />
            </div>
          </div>

          {/* Commerce type — needs and offers */}
          {(form.type === 'need' || form.type === 'offer') && (
            <div className="form-group">
              <label className="form-label">Exchange Type</label>
              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                {[
                  { value: '',         label: 'Default' },
                  { value: 'exchange', label: 'Community Exchange' },
                  { value: 'commerce', label: 'Local Commerce' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    className={`btn btn-sm ${form.commerce_type === opt.value ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => set('commerce_type', opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {form.commerce_type === 'exchange' && (
                <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '.3rem' }}>Free, barter, or mutual aid — no money expected</p>
              )}
              {form.commerce_type === 'commerce' && (
                <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '.3rem' }}>Priced goods or paid services</p>
              )}
            </div>
          )}

          {/* Price — commerce only */}
          {form.commerce_type === 'commerce' && (
            <div className="form-group">
              <label className="form-label">Price ($)</label>
              <input className="form-input" type="number" min="0" step="0.01"
                value={form.price} onChange={e => set('price', e.target.value)}
                placeholder="e.g. 25.00" style={{ maxWidth: 160 }} />
            </div>
          )}

          {/* Urgency / Expiry — needs and offers only */}
          {(form.type === 'need' || form.type === 'offer') && (
            <div className="form-row" style={{ alignItems: 'flex-start' }}>
              {form.type === 'need' && (
                <div className="form-group" style={{ flex: 'none' }}>
                  <label className="form-label" style={{ marginBottom: '.5rem' }}>Urgency</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '.45rem', cursor: 'pointer', fontSize: '.88rem' }}>
                    <input type="checkbox" checked={form.is_urgent}
                      onChange={e => set('is_urgent', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--amber, #f59e0b)' }} />
                    This is an urgent need
                  </label>
                </div>
              )}
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Need by / Expires</label>
                <input className="form-input" type="date" value={form.expires_at.slice(0, 10) || ''}
                  onChange={e => set('expires_at', e.target.value ? `${e.target.value}T00:00:00Z` : '')} />
              </div>
            </div>
          )}

          {/* Media */}
          <div className="form-group">
            <label className="form-label">Photos / Videos {files.length > 0 && `(${files.length}/5)`}</label>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {files.length < 5 && (
                <ImageCropUploader
                  aspect={1200 / 630}
                  targetWidth={1200}
                  targetHeight={630}
                  label="+ Add Photo"
                  hint="1200×630px landscape recommended"
                  onFile={(blob, name) => setFiles(prev => [...prev, new File([blob], name, { type: 'image/jpeg' })].slice(0, 5))}
                  btnClassName="btn btn-outline btn-sm"
                />
              )}
              {files.length < 5 && (
                <>
                  <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>or</span>
                  <div className="media-upload-area" style={{ display: 'inline-block', padding: '.3rem .75rem', cursor: 'pointer', fontSize: '.8rem' }}
                    onClick={() => fileInputRef.current?.click()}>
                    Add Video
                  </div>
                  <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/quicktime"
                    style={{ display: 'none' }} onChange={handleFiles} />
                </>
              )}
            </div>
            {previews.length > 0 && (
              <div className="media-preview-strip">
                {previews.map((url, i) => (
                  <div key={i} className="media-preview-item">
                    {files[i]?.type.startsWith('video/')
                      ? <video src={url} />
                      : <img src={url} alt="" />
                    }
                    <button type="button" className="media-preview-remove"
                      onClick={() => removeFile(i)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? '…' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
}
