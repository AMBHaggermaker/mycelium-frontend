import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

const COVENANT = [
  { icon: '🤝', text: 'Show up with integrity — your word is your bond here, and your reliability score reflects it.' },
  { icon: '🌱', text: 'Give more than you take — this community grows stronger when everyone contributes.' },
  { icon: '🏡', text: 'Keep it family-friendly — no adult content, no harassment, no exploitation of any kind.' },
  { icon: '💛', text: 'Respect the humans — behind every post is a real person. Treat them accordingly.' },
  { icon: '🛡️', text: 'Protect the network — do not use this platform for spam, manipulation, or surveillance. Report what feels wrong.' },
  { icon: '🌿', text: 'Hold this place as sacred — Huntsville is our home. Mycelium is our infrastructure. Take care of both.' },
];

const BASE_URL = 'https://mycelium.unprecedentedtimes.org';

export default function InvitePage({ onRequireAuth }) {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [invite,  setInvite]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);

  useEffect(() => {
    api.getInviteByToken(token)
      .then(setInvite)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="invite-page"><div className="spinner" style={{ marginTop: '6rem' }} /></div>;

  if (err || !invite) {
    return (
      <div className="invite-page">
        <div className="invite-card invite-error-card">
          <div className="invite-error-icon">🍄</div>
          <h1 className="invite-error-title">Invitation not found</h1>
          <p className="invite-error-body">This invitation link is invalid, has already been used, or has expired.</p>
          <button className="btn btn-outline" onClick={() => navigate('/')}>Go to Mycelium</button>
        </div>
      </div>
    );
  }

  if (invite.status === 'accepted') {
    return (
      <div className="invite-page">
        <div className="invite-card invite-error-card">
          <div className="invite-error-icon">✅</div>
          <h1 className="invite-error-title">Already accepted</h1>
          <p className="invite-error-body">This invitation has already been used to create an account.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Go to Mycelium</button>
        </div>
      </div>
    );
  }

  if (invite.status === 'expired') {
    return (
      <div className="invite-page">
        <div className="invite-card invite-error-card">
          <div className="invite-error-icon">⏳</div>
          <h1 className="invite-error-title">Invitation expired</h1>
          <p className="invite-error-body">This invitation was valid for 14 days and has now expired. Ask {invite.inviter_username} to send a new one.</p>
          <button className="btn btn-outline" onClick={() => navigate('/')}>Go to Mycelium</button>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="invite-page">
        <div className="invite-card invite-error-card">
          <div className="invite-error-icon">⬡</div>
          <h1 className="invite-error-title">You're already a member</h1>
          <p className="invite-error-body">You're signed in as <strong>{user.username}</strong>. This invitation is for someone who doesn't have an account yet.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Go to Mycelium</button>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-page">
      <div className="invite-card">

        {/* Header */}
        <div className="invite-card-header">
          <div className="invite-logo">⬡ Mycelium</div>
          <h1 className="invite-heading">You've been invited</h1>
        </div>

        {/* Inviter */}
        <div className="invite-from-section">
          <div className="invite-from-avatar">
            {invite.inviter_avatar
              ? <img src={`${BASE_URL}${invite.inviter_avatar}`} alt={invite.inviter_username} />
              : invite.inviter_username[0].toUpperCase()
            }
          </div>
          <div>
            <p className="invite-from-label">Invited by</p>
            <p className="invite-from-name">{invite.inviter_username}</p>
          </div>
        </div>

        {/* Personal note */}
        {invite.personal_note && (
          <div className="invite-personal-note">
            <p className="invite-personal-note-label">Personal note</p>
            <p className="invite-personal-note-body">"{invite.personal_note}"</p>
          </div>
        )}

        {/* What is Mycelium */}
        <div className="invite-about">
          <p>
            <strong>Mycelium</strong> is a community platform for mutual aid, needs, offers, and events in Huntsville, Alabama.
            It is built by and for the people who live here — a place to share resources, skills, and care across the network.
          </p>
        </div>

        {/* Covenant */}
        <div className="invite-covenant">
          <p className="invite-covenant-heading">The Mycelium Covenant</p>
          <p className="invite-covenant-subhead">By joining, you agree to:</p>
          <ul className="invite-covenant-list">
            {COVENANT.map((item, i) => (
              <li key={i} className="invite-covenant-item">
                <span className="invite-covenant-icon">{item.icon}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Expiry notice */}
        <p className="invite-expires">
          This invitation expires on{' '}
          {new Date(invite.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        {/* CTA */}
        <InviteRegisterForm inviteToken={token} inviterName={invite.inviter_username} />

      </div>
    </div>
  );
}

function InviteRegisterForm({ inviteToken, inviterName }) {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,  setForm]  = useState({ username: '', email: '', password: '' });
  const [err,   setErr]   = useState(null);
  const [busy,  setBusy]  = useState(false);
  const [mode,  setMode]  = useState('register');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      let res;
      if (mode === 'login') {
        res = await api.login({ email: form.email, password: form.password });
      } else {
        res = await api.register({
          username: form.username,
          email: form.email,
          password: form.password,
          invite_token: inviteToken,
        });
      }
      login(res.token, res.user);
      navigate('/');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="invite-register-section">
      {mode === 'register' ? (
        <>
          <div className="invite-register-banner">
            <span className="invite-register-banner-icon">✉️</span>
            <span>You've been invited by <strong>{inviterName}</strong> — create your account to join</span>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" required value={form.username}
                onChange={e => set('username', e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" required value={form.email}
                onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" required minLength={8} value={form.password}
                onChange={e => set('password', e.target.value)} />
            </div>
            {err && <p className="form-error">{err}</p>}
            <button className="btn btn-primary btn-full" disabled={busy}>
              {busy ? '…' : 'Join Mycelium'}
            </button>
          </form>

          <p className="invite-toggle-mode">
            Already have an account?{' '}
            <button type="button" className="link-btn" onClick={() => { setMode('login'); setErr(null); }}>
              Sign in instead
            </button>
          </p>
        </>
      ) : (
        <>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" required value={form.email}
                onChange={e => set('email', e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" required value={form.password}
                onChange={e => set('password', e.target.value)} />
            </div>
            {err && <p className="form-error">{err}</p>}
            <button className="btn btn-primary btn-full" disabled={busy}>
              {busy ? '…' : 'Sign In'}
            </button>
          </form>

          <p className="invite-toggle-mode">
            <button type="button" className="link-btn" onClick={() => { setMode('register'); setErr(null); }}>
              ← Back to registration
            </button>
          </p>
        </>
      )}
    </div>
  );
}
