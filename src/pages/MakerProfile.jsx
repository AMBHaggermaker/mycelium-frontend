import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { usePlayer } from '../contexts/PlayerContext';
import api from '../api';

const WORK_TYPE_ICONS = { audio: '♪', image: '🖼', video: '▶', document: '📄', other: '📦' };

const LICENSE_LABELS = {
  all_rights_reserved:            'All Rights Reserved',
  creative_commons_attribution:   'CC Attribution',
  creative_commons_sharealike:    'CC ShareAlike',
  public_domain:                  'Public Domain',
};

export default function MakerProfile({ onRequireAuth }) {
  const { username }     = useParams();
  const { user, token }  = useAuth();
  const { setTrack }     = usePlayer();
  const [data,       setData]      = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState('');
  const [commission, setCommission] = useState({ description: '', budget: '' });
  const [commSent,   setCommSent]   = useState(false);
  const [commErr,    setCommErr]    = useState('');
  const [activeTab,  setActiveTab]  = useState('works');

  useEffect(() => {
    api.getMakerProfile(username)
      .then(setData)
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

  if (loading) return <div className="spinner" style={{ margin: '4rem auto' }} />;
  if (error)   return <div className="container"><p className="error-text">{error}</p></div>;

  const { maker, user: makerUser, works } = data;
  const audioWorks   = works.filter(w => w.work_type === 'audio');
  const nonAudioWorks = works.filter(w => w.work_type !== 'audio');

  const tierBadgeColor = { free: '#888', basic: '#4a7c59', standard: '#2563eb', pro: '#7c3aed' };

  return (
    <div className="maker-profile-page">
      <div className="maker-profile-header">
        <Link to="/makers" className="back-link">← Maker's Guild</Link>
        <div className="maker-profile-identity">
          {makerUser.avatar_url
            ? <img src={makerUser.avatar_url} className="maker-profile-avatar" alt={maker.maker_name} />
            : <div className="maker-profile-avatar-placeholder">{maker.maker_name[0]}</div>}
          <div>
            <h1 className="maker-profile-name">{maker.maker_name}</h1>
            <Link to={`/profile/${makerUser.username}`} className="maker-profile-username">
              @{makerUser.username}
            </Link>
            <span className="maker-tier-badge" style={{ backgroundColor: tierBadgeColor[maker.storage_tier] }}>
              {maker.storage_tier} maker
            </span>
          </div>
        </div>
        {maker.bio && <p className="maker-profile-bio">{maker.bio}</p>}
        <div className="maker-profile-specialties">
          {(maker.specialties || []).map(s => (
            <span key={s} className="maker-specialty-tag">{s}</span>
          ))}
        </div>
      </div>

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
    </div>
  );
}
