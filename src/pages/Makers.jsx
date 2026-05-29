import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

const CATEGORIES = [
  'Music', 'Visual Art', 'Handmade Goods', 'Writing',
  'Spoken Word and Breathwork', 'Food and Herbal', 'Fiber Arts',
  'Woodworking', 'Electronics', 'Other',
];

const TIER_INFO = [
  { tier: 'basic',    price: '$5/mo', storage: '1 GB',  audio: '50 MB/file',  video: 'No video',       desc: 'Audio and images' },
  { tier: 'standard', price: '$10/mo', storage: '5 GB', audio: '200 MB/file', video: '500 MB/file',    desc: 'Audio and video' },
  { tier: 'pro',      price: '$25/mo', storage: '20 GB', audio: '1 GB/file',  video: '1 GB/file',      desc: 'Full pro access' },
];

export default function Makers({ onRequireAuth }) {
  const { user, token } = useAuth();
  const [makers,    setMakers]   = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [category,  setCategory] = useState('');
  const [search,    setSearch]   = useState('');
  const [showModal, setShowModal] = useState(false);
  const [subscribing, setSubscribing] = useState('');
  const [subError,  setSubError]  = useState('');

  useEffect(() => {
    setLoading(true);
    api.getMakers({ category, search })
      .then(setMakers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, search]);

  async function handleSubscribe(tier) {
    if (!user) { onRequireAuth?.(); return; }
    setSubscribing(tier);
    setSubError('');
    try {
      const result = await api.subscribeMakerTier(tier, token);
      if (result.checkout_url) window.location.href = result.checkout_url;
    } catch (e) {
      setSubError(e.message);
    } finally {
      setSubscribing('');
    }
  }

  return (
    <div className="makers-page">
      <div className="makers-hero">
        <h1 className="makers-hero-title">Maker's Guild</h1>
        <p className="makers-hero-sub">
          Sovereign original content market. No algorithms, no content ID strikes, no corporate cut.
          Files live on infrastructure owned by this platform.
        </p>
        <div className="makers-hero-actions">
          <button className="btn btn-primary" onClick={() => { if (!user) { onRequireAuth?.(); return; } setShowModal(true); }}>
            Subscribe to Become a Maker
          </button>
          {user && (
            <Link to="/makers/upload" className="btn btn-outline">Upload Work</Link>
          )}
        </div>
      </div>

      {/* Category filters */}
      <div className="makers-filters">
        <input className="input makers-search" placeholder="Search makers…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="makers-category-pills">
          <button className={'pill' + (!category ? ' active' : '')} onClick={() => setCategory('')}>All</button>
          {CATEGORIES.map(c => (
            <button key={c} className={'pill' + (category === c ? ' active' : '')} onClick={() => setCategory(c === category ? '' : c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="spinner" style={{ margin: '3rem auto' }} />}

      {!loading && makers.length === 0 && (
        <div className="makers-empty">
          <p>No makers yet. Be the first.</p>
          <button className="btn btn-primary" onClick={() => { if (!user) { onRequireAuth?.(); return; } setShowModal(true); }}>
            Become a Maker
          </button>
        </div>
      )}

      <div className="makers-grid">
        {makers.map(m => (
          <Link to={`/makers/${m.username}`} key={m.id} className="maker-card">
            <div className="maker-card-avatar">
              {m.avatar_url
                ? <img src={m.avatar_url} alt={m.maker_name} />
                : <div className="maker-card-avatar-placeholder">{m.maker_name[0]}</div>}
            </div>
            <div className="maker-card-body">
              <h3 className="maker-card-name">{m.maker_name}</h3>
              <div className="maker-card-specialties">
                {(m.specialties || []).slice(0, 3).map(s => (
                  <span key={s} className="maker-specialty-tag">{s}</span>
                ))}
              </div>
              {m.bio && <p className="maker-card-bio">{m.bio.slice(0, 100)}{m.bio.length > 100 ? '…' : ''}</p>}
              {m.work_count > 0 && <p className="maker-card-works">{m.work_count} work{m.work_count !== 1 ? 's' : ''}</p>}
              {m.featured_work && m.featured_work.work_type === 'audio' && (
                <div className="maker-card-preview">
                  <span className="maker-card-preview-icon">♪</span>
                  <span className="maker-card-preview-title">{m.featured_work.title}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Tier selection modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            <h2>Choose Your Maker Tier</h2>
            <p className="modal-sub">Upload your original work to the sovereign content market. Files are stored on platform infrastructure — no corporate intermediaries.</p>
            {subError && <p className="error-text">{subError}</p>}
            <div className="tier-cards">
              {TIER_INFO.map(t => (
                <div key={t.tier} className="tier-card">
                  <div className="tier-card-name">{t.tier[0].toUpperCase() + t.tier.slice(1)}</div>
                  <div className="tier-card-price">{t.price}</div>
                  <ul className="tier-card-features">
                    <li>{t.storage} storage</li>
                    <li>Audio: {t.audio}</li>
                    <li>Video: {t.video}</li>
                    <li>{t.desc}</li>
                  </ul>
                  <button
                    className="btn btn-primary tier-card-btn"
                    disabled={subscribing === t.tier}
                    onClick={() => handleSubscribe(t.tier)}
                  >
                    {subscribing === t.tier ? 'Redirecting…' : `Choose ${t.tier[0].toUpperCase() + t.tier.slice(1)}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
