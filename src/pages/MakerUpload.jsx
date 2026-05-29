import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

const CATEGORIES = [
  'Music', 'Visual Art', 'Handmade Goods', 'Writing',
  'Spoken Word and Breathwork', 'Food and Herbal', 'Fiber Arts',
  'Woodworking', 'Electronics', 'Other',
];

const LICENSE_OPTIONS = [
  { value: 'all_rights_reserved',            label: 'All Rights Reserved',   desc: 'You retain full copyright. Others must ask permission.' },
  { value: 'creative_commons_attribution',   label: 'CC Attribution',         desc: 'Free to use with credit. Most permissive with attribution.' },
  { value: 'creative_commons_sharealike',    label: 'CC ShareAlike',           desc: 'Use freely but any derivatives must use the same license.' },
  { value: 'public_domain',                  label: 'Public Domain',           desc: 'No rights reserved. Free for all uses.' },
];

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

export default function MakerUpload() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const fileRef  = useRef(null);
  const [maker,    setMaker]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [file,     setFile]     = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error,    setError]    = useState('');
  const [form,     setForm]     = useState({
    title: '', description: '', category: '', is_free: true, price: '0',
    tags: '', license: 'all_rights_reserved',
  });

  useEffect(() => {
    if (!user) { navigate('/makers'); return; }
    api.getMyMakerProfile(token)
      .then(m => { setMaker(m); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [user]);

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer?.files[0] || e.target.files[0];
    if (f) setFile(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }
    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('is_free', String(form.is_free));
      formData.append('price', form.is_free ? '0' : form.price);
      formData.append('tags', JSON.stringify(form.tags.split(',').map(t => t.trim()).filter(Boolean)));
      formData.append('license', form.license);

      const result = await api.uploadMakerWork(formData, token, pct => setProgress(pct));
      navigate(`/makers/works/${result.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="spinner" style={{ margin: '4rem auto' }} />;

  if (!maker || maker.storage_tier === 'free') {
    return (
      <div className="container" style={{ maxWidth: 560, padding: '2rem 1rem', textAlign: 'center' }}>
        <h2>Upgrade to Upload</h2>
        <p style={{ color: 'var(--muted)', margin: '1rem 0' }}>
          You need a paid Maker tier to upload works. Free accounts can browse and listen.
        </p>
        <Link to="/makers" className="btn btn-primary">View Maker Tiers</Link>
      </div>
    );
  }

  const quotaUsed = maker.storage_used_bytes || 0;
  const quotaMax  = maker.quota_bytes || 1;
  const quotaPct  = Math.min(100, Math.round(quotaUsed / quotaMax * 100));
  const nearLimit = quotaPct >= 90;

  return (
    <div className="maker-upload-page">
      <Link to="/makers" className="back-link">← Maker's Guild</Link>
      <h1 style={{ marginTop: '1rem' }}>Upload Work</h1>

      {/* Storage quota */}
      <div className="upload-quota">
        <div className="upload-quota-bar-wrap">
          <div className="upload-quota-bar" style={{ width: quotaPct + '%', background: nearLimit ? '#e53e3e' : 'var(--green)' }} />
        </div>
        <span className="upload-quota-label" style={{ color: nearLimit ? '#e53e3e' : undefined }}>
          {formatBytes(quotaUsed)} / {formatBytes(quotaMax)} used ({quotaPct}%)
        </span>
        {nearLimit && <p className="upload-quota-warning">⚠ You're within 10% of your storage limit.</p>}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
        {/* Drop zone */}
        <div
          className={'upload-dropzone' + (file ? ' has-file' : '')}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onDrop} />
          {file ? (
            <div className="upload-file-info">
              <span className="upload-file-name">{file.name}</span>
              <span className="upload-file-size">{formatBytes(file.size)}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setFile(null); }}>Remove</button>
            </div>
          ) : (
            <p>Drag and drop your file here, or click to browse</p>
          )}
        </div>

        <input className="input" required placeholder="Title *"
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

        <textarea className="input" rows={4} placeholder="Description"
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

        <select className="input" required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          <option value="">Select category *</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* License picker */}
        <div>
          <label className="form-label">License</label>
          <div className="license-options">
            {LICENSE_OPTIONS.map(l => (
              <label key={l.value} className={'license-option' + (form.license === l.value ? ' selected' : '')}>
                <input type="radio" name="license" value={l.value}
                  checked={form.license === l.value}
                  onChange={() => setForm(f => ({ ...f, license: l.value }))} />
                <div>
                  <div className="license-option-label">{l.label}</div>
                  <div className="license-option-desc">{l.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Free/paid toggle */}
        <div className="upload-price-row">
          <label className="toggle-label">
            <input type="checkbox" checked={form.is_free}
              onChange={e => setForm(f => ({ ...f, is_free: e.target.checked }))} />
            Free to access
          </label>
          {!form.is_free && (
            <input className="input" type="number" min="0.50" step="0.01" placeholder="Price (USD)"
              value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          )}
        </div>

        <input className="input" placeholder="Tags (comma separated)"
          value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />

        {uploading && (
          <div className="upload-progress-wrap">
            <div className="upload-progress-bar" style={{ width: progress + '%' }} />
            <span className="upload-progress-label">{progress}%</span>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        <p className="upload-preview-notice">
          Audio files: a preview clip will be auto-generated from the full file.
        </p>

        <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
          {uploading ? 'Uploading…' : 'Publish Work'}
        </button>
      </form>
    </div>
  );
}
