import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth';
import api from '../api';

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
  const { token } = useAuth();
  const [form, setForm] = useState({
    type: 'offer', title: '', description: '', circle_id: defaultCircleId || '',
    capacity: '', location: '', starts_at: '', ends_at: '', tags: '',
    category: '', subcategory: '',
  });
  const [circles,  setCircles]  = useState([]);
  const [files,    setFiles]    = useState([]);
  const [previews, setPreviews] = useState([]);
  const [err,  setErr]  = useState(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.getCircles({ limit: 100 }).then(setCircles).catch(() => {});
  }, []);

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
        type:        form.type,
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        circle_id:   form.circle_id || undefined,
        capacity:    form.capacity ? parseInt(form.capacity) : undefined,
        location:    form.location.trim() || undefined,
        starts_at:   form.starts_at || undefined,
        ends_at:     form.ends_at || undefined,
        tags:        form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        category:    form.category || undefined,
        subcategory: form.subcategory.trim() || undefined,
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

          {/* Media */}
          <div className="form-group">
            <label className="form-label">Photos / Videos {files.length > 0 && `(${files.length}/5)`}</label>
            <div className="media-upload-area" onClick={() => fileInputRef.current?.click()}>
              Click to add images or videos (up to 5)
            </div>
            <input ref={fileInputRef} type="file" multiple accept={ACCEPT}
              style={{ display: 'none' }} onChange={handleFiles} />
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
