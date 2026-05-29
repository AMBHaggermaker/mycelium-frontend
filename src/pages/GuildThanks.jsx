import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

const TIER_NAMES = { basic: 'Basic', standard: 'Standard', pro: 'Pro' };

export default function GuildThanks() {
  const [sp]             = useSearchParams();
  const { user, token }  = useAuth();
  const [maker,   setMaker]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ maker_name: user?.username || '', bio: '', specialties: '' });
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  const tier = sp.get('tier') || 'basic';

  useEffect(() => {
    if (!user || !token) { setLoading(false); return; }
    api.getMyMakerProfile(token)
      .then(m => { setMaker(m); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  async function handleProfileCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const specialties = form.specialties.split(',').map(s => s.trim()).filter(Boolean);
      const result = await api.createMakerProfile({ maker_name: form.maker_name, bio: form.bio, specialties }, token);
      setMaker(result);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="spinner" style={{ margin: '4rem auto' }} />;

  return (
    <div className="guild-thanks-page">
      <div className="guild-thanks-card">
        <div className="guild-thanks-icon">⬡</div>
        <h1>Welcome to the Maker's Guild</h1>
        <p className="guild-thanks-tier">
          {TIER_NAMES[tier] || tier} tier activated
        </p>
        <p>Your subscription is live. Files you upload are stored on platform infrastructure — no corporate intermediaries, no content ID strikes.</p>

        {!maker || saved ? (
          saved ? (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <p className="success-text">Maker profile created!</p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                <Link to="/makers/upload" className="btn btn-primary">Upload Your First Work</Link>
                <Link to={`/makers/${user?.username}`} className="btn btn-outline">View Your Profile</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem', textAlign: 'left' }}>
              <h2>Set Up Your Maker Profile</h2>
              <input className="input" required placeholder="Maker name (public display name)"
                value={form.maker_name} onChange={e => setForm(f => ({ ...f, maker_name: e.target.value }))} />
              <textarea className="input" rows={3} placeholder="Bio (optional)"
                value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
              <input className="input" placeholder="Specialties (comma separated, e.g. Music, Visual Art)"
                value={form.specialties} onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))} />
              {error && <p className="error-text">{error}</p>}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create Profile'}
              </button>
            </form>
          )
        ) : (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/makers/upload" className="btn btn-primary">Upload Work</Link>
              <Link to={`/makers/${user?.username}`} className="btn btn-outline">My Maker Page</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
