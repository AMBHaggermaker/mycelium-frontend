import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth';
import api from '../api';
import ImageCropUploader from './ImageCropUploader';
import EventLocationPicker from './EventLocationPicker';

const TYPES = ['need', 'offer', 'event', 'story_card'];
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime';

const PLATFORM_MOODS = [
  'hopeful','determined','reflective','creative','grateful','curious','energized',
  'concerned','frustrated','tired','grieving','resilient','inspired','grounded',
  'anxious','peaceful','angry','joyful','uncertain','connected','overwhelmed','healing','fierce',
];

const COLLAGE_LAYOUTS = [
  { value: 'single',    label: 'Full Width',       for: 1 },
  { value: 'two-side',  label: 'Side by Side',     for: 2 },
  { value: 'three-1l',  label: '1 Left + 2 Right', for: 3 },
  { value: 'four-grid', label: '2×2 Grid',         for: 4 },
  { value: 'five-top',  label: 'Large Top + 4',    for: 5 },
  { value: 'masonry',   label: 'Masonry Grid',     for: 6 },
];

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
    capacity: '', location: '', location_lat: null, location_lng: null,
    starts_at: '', ends_at: '', tags: '',
    category: '', subcategory: '', is_urgent: false, expires_at: '',
    commerce_type: '', price: '', business_id: '',
    rich_content: '', mood_tag: '', collage_layout: 'single',
  });
  const [circles,   setCircles]   = useState([]);
  const [myBizList, setMyBizList] = useState([]);
  const [files,     setFiles]     = useState([]);
  const [previews,  setPreviews]  = useState([]);
  const [storyFiles, setStoryFiles] = useState([]);
  const [storyPreviews, setStoryPreviews] = useState([]);
  const [storyAttachments, setStoryAttachments] = useState([]);
  const [err,  setErr]  = useState(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);
  const storyPhotoRef = useRef(null);
  const storyAttachRef = useRef(null);

  useEffect(() => {
    api.getCircles({ limit: 100 }).then(setCircles).catch(() => {});
    if (user?.id) api.getBusinessesByOwner(user.id).then(setMyBizList).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

  useEffect(() => {
    const urls = storyFiles.map(f => URL.createObjectURL(f));
    setStoryPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [storyFiles]);

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
      const isStory = form.type === 'story_card';
      const payload = {
        type:          form.type,
        title:         form.title.trim(),
        description:   isStory ? (form.rich_content.trim() || undefined) : (form.description.trim() || undefined),
        circle_id:     form.circle_id || undefined,
        capacity:      form.capacity ? parseInt(form.capacity) : undefined,
        location:      form.location.trim() || undefined,
        location_lat:  form.location_lat ?? undefined,
        location_lng:  form.location_lng ?? undefined,
        starts_at:     form.starts_at || undefined,
        ends_at:       form.ends_at || undefined,
        tags:          form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        category:      form.category || undefined,
        subcategory:   form.subcategory.trim() || undefined,
        is_urgent:     form.is_urgent || undefined,
        expires_at:    form.expires_at || undefined,
        commerce_type: form.commerce_type || undefined,
        price:         form.commerce_type === 'commerce' && form.price ? parseFloat(form.price) : undefined,
        business_id:   form.business_id || undefined,
        rich_content:  isStory ? (form.rich_content.trim() || undefined) : undefined,
        mood_tag:      isStory ? (form.mood_tag || undefined) : undefined,
        collage_layout: isStory && storyFiles.length > 1 ? form.collage_layout : undefined,
      };
      const post = await api.createPost(payload, token);
      if (isStory && storyFiles.length) await api.uploadPostMedia(post.id, storyFiles, token);
      else if (files.length) await api.uploadPostMedia(post.id, files, token);
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
            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
              {TYPES.map(t => (
                <button key={t} type="button"
                  className={`btn btn-sm ${form.type === t ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: '1 1 auto', textTransform: 'capitalize', minWidth: 70 }}
                  onClick={() => set('type', t)}>
                  {t === 'story_card' ? '✦ Story' : t}
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

          {/* Story Card composer */}
          {form.type === 'story_card' ? (
            <>
              <div className="form-group">
                <label className="form-label">Story Content</label>
                <textarea className="form-textarea story-rich-textarea" rows={6} value={form.rich_content}
                  onChange={e => set('rich_content', e.target.value)}
                  placeholder="Write your story here…" />
              </div>
              <div className="form-group">
                <label className="form-label">Photos <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(up to 8)</span></label>
                <input ref={storyPhotoRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                  onChange={e => {
                    const sel = Array.from(e.target.files);
                    setStoryFiles(prev => [...prev, ...sel].slice(0, 8));
                    e.target.value = '';
                  }} />
                {storyPreviews.length > 0 && (
                  <div className="story-photo-preview-grid">
                    {storyPreviews.map((url, i) => (
                      <div key={i} className="story-photo-thumb">
                        <img src={url} alt="" />
                        <button type="button" className="story-photo-remove"
                          onClick={() => setStoryFiles(f => f.filter((_, idx) => idx !== i))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => storyPhotoRef.current?.click()}
                  disabled={storyFiles.length >= 8}>
                  + Add Photos
                </button>
                {storyFiles.length > 1 && (
                  <div style={{ marginTop: '.5rem' }}>
                    <label className="form-label" style={{ fontSize: '.8rem' }}>Layout</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.25rem' }}>
                      {COLLAGE_LAYOUTS.filter(l => l.for <= storyFiles.length || l.value === 'masonry').map(l => (
                        <button key={l.value} type="button"
                          className={`btn btn-sm ${form.collage_layout === l.value ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => set('collage_layout', l.value)}>{l.label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Mood <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                  {PLATFORM_MOODS.map(m => (
                    <button key={m} type="button"
                      className={`btn btn-sm ${form.mood_tag === m ? 'btn-primary' : 'btn-outline'}`}
                      style={{ textTransform: 'capitalize', fontSize: '.75rem' }}
                      onClick={() => set('mood_tag', form.mood_tag === m ? '' : m)}>{m}</button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Description */
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description}
                onChange={e => set('description', e.target.value)} />
            </div>
          )}

          {form.type === 'event' ? (
            <div className="form-group">
              <label className="form-label">Location</label>
              <EventLocationPicker
                value={form.location}
                lat={form.location_lat}
                lng={form.location_lng}
                onChange={({ location, location_lat, location_lng }) =>
                  setForm(f => ({ ...f, location, location_lat, location_lng }))
                }
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location}
                onChange={e => set('location', e.target.value)} />
            </div>
          )}

          {form.type === 'event' && (
            <div className="form-group">
              <label className="form-label">Capacity</label>
              <input className="form-input" type="number" min="1" value={form.capacity}
                onChange={e => set('capacity', e.target.value)} placeholder="Unlimited" />
            </div>
          )}

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
