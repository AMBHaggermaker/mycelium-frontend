import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

// Copyright confirmation required on every upload
const COPYRIGHT_STATEMENT = 'I confirm this is my original work or I have the legal right to distribute it. I understand that uploading copyrighted content I do not own violates the Mycelium Covenant and may result in removal of content and my account.';

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
  const [copyrightConfirmed, setCopyrightConfirmed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subError, setSubError] = useState('');

  async function handleSubscribe(tier) {
    if (!user) { navigate('/makers/upload'); return; }
    setSubscribing(tier); setSubError('');
    try {
      const { checkout_url } = await api.subscribeMakerTier(tier, token);
      window.location.href = checkout_url;
    } catch (e) {
      setSubError(e.message);
      setSubscribing(false);
    }
  }

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
    const TIERS = [
      {
        tier: 'basic',
        name: 'Basic',
        price: '$5/mo',
        storage: '1 GB total',
        features: ['Audio up to 50 MB/file', 'Images up to 50 MB/file', 'No video uploads'],
        highlight: false,
      },
      {
        tier: 'standard',
        name: 'Standard',
        price: '$10/mo',
        storage: '5 GB total',
        features: ['Audio up to 200 MB/file', 'Video up to 500 MB/file', 'Images up to 50 MB/file'],
        highlight: true,
      },
      {
        tier: 'pro',
        name: 'Pro',
        price: '$25/mo',
        storage: '20 GB total',
        features: ['Audio up to 1 GB/file', 'Video up to 2 GB/file', 'Images up to 50 MB/file'],
        highlight: false,
      },
    ];

    return (
      <div className="maker-gate-page">
        <h1 className="maker-gate-heading">Become a Maker on Mycelium</h1>
        <p className="maker-gate-sub">Choose your plan to start sharing your original work.</p>

        {subError && <p className="error-text" style={{ textAlign: 'center', marginBottom: '1rem' }}>{subError}</p>}

        <div className="maker-tier-cards">
          {TIERS.map(t => (
            <div key={t.tier} className={'maker-tier-card' + (t.highlight ? ' maker-tier-card--highlight' : '')}>
              {t.highlight && <div className="maker-tier-badge">Most Popular</div>}
              <div className="maker-tier-name">{t.name}</div>
              <div className="maker-tier-price">{t.price}</div>
              <div className="maker-tier-storage">{t.storage}</div>
              <ul className="maker-tier-features">
                {t.features.map(f => <li key={f}>{f}</li>)}
              </ul>
              <button
                className={'btn btn-primary maker-tier-btn' + (t.highlight ? '' : ' btn-outline')}
                disabled={subscribing === t.tier}
                onClick={() => handleSubscribe(t.tier)}
              >
                {subscribing === t.tier ? 'Redirecting…' : 'Subscribe Now'}
              </button>
            </div>
          ))}
        </div>

        <p className="maker-gate-note">
          Already a subscriber? Make sure you are logged in and your subscription is active.
        </p>
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

        {/* Required copyright confirmation */}
        <div className="upload-copyright-confirm">
          <label className="toggle-label" style={{ alignItems: 'flex-start', gap: '.75rem' }}>
            <input type="checkbox" required checked={copyrightConfirmed}
              onChange={e => setCopyrightConfirmed(e.target.checked)} />
            <span style={{ fontSize: '.85rem', lineHeight: 1.5 }}>
              {COPYRIGHT_STATEMENT}
            </span>
          </label>
          <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '.5rem' }}>
            Read our <Link to="/makers/copyright">Copyright Policy</Link> to understand what qualifies as original work.
          </p>
        </div>

        <button type="submit" className="btn btn-primary" disabled={uploading || !file || !copyrightConfirmed}>
          {uploading ? 'Uploading…' : 'Publish Work'}
        </button>
      </form>
    </div>
  );
}
