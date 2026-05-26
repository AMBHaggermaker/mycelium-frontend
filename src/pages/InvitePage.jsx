import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import PasswordInput from '../components/PasswordInput';

const BASE_URL = 'https://mycelium.unprecedentedtimes.org';

const HOW_FOUND_OPTIONS = [
  { value: 'invited',     label: 'Invited by someone' },
  { value: 'newsletter',  label: 'unprecedentedtimes.org' },
  { value: 'lostfound',   label: 'Lost & Found' },
  { value: 'other',       label: 'Other' },
];

export default function InvitePage() {
  const { token }           = useParams();
  const { user, logout }    = useAuth();
  const navigate            = useNavigate();

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
          <p className="invite-error-body">
            This invitation was valid for 14 days and has now expired.
            Ask {invite.inviter_username} to send a new one.
          </p>
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
          <h1 className="invite-error-title">You're signed in</h1>
          <p className="invite-error-body">
            You're currently signed in as <strong>{user.username}</strong>.
            This invitation is for a new account
            {invite?.email ? <> for <strong>{invite.email}</strong></> : null}.
            Sign out to register the invited account.
          </p>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={logout}>
              Sign Out &amp; Register
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/')}>
              Stay Signed In
            </button>
          </div>
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

        {/* About blurb */}
        <div className="invite-about">
          <p>
            <strong>Mycelium</strong> is a community platform for mutual aid, needs, offers, and events
            in Huntsville, Alabama — built by and for the people who live here.
          </p>
        </div>

        {/* Expiry notice */}
        <p className="invite-expires">
          Invitation expires{' '}
          {new Date(invite.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        {/* Registration form section */}
        <InviteRegisterForm
          inviteToken={token}
          inviterName={invite.inviter_username}
          lockedEmail={invite.email}
        />

      </div>
    </div>
  );
}

// ─── Registration form ────────────────────────────────────────────────────────

function InviteRegisterForm({ inviteToken, inviterName, lockedEmail }) {
  const { login } = useAuth();
  const navigate  = useNavigate();

  // email status check
  const [emailStatus, setEmailStatus] = useState(null); // null | 'checking' | 'none' | 'deleted' | 'active'
  const [deletedInfo, setDeletedInfo] = useState(null); // { deleted_user_id, original_username }

  // sub-modes: 'register' | 'login' | 'restore' | 'create_fresh'
  const [mode, setMode] = useState('register');

  // success
  const [done, setDone] = useState(false);
  const [restored, setRestored] = useState(false);

  // form state
  const [form, setForm] = useState({
    username:  '',
    password:  '',
    location:  '',
    how_found: 'invited',
    covenant:  false,
    // login mode
    loginEmail: lockedEmail || '',
    loginPw:    '',
    // restore mode
    newPw: '',
  });
  const [err,  setErr]  = useState(null);
  const [busy, setBusy] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  // Check email status on mount if email is locked from invite
  useEffect(() => {
    if (!lockedEmail) return;
    setEmailStatus('checking');
    api.checkEmail(lockedEmail)
      .then(r => {
        setEmailStatus(r.status);
        if (r.status === 'deleted') {
          setDeletedInfo({ deleted_user_id: r.deleted_user_id, original_username: r.original_username });
        }
      })
      .catch(() => setEmailStatus('none'));
  }, [lockedEmail]);

  // ── submit handlers ──────────────────────────────────────────────────────

  async function submitRegister(e) {
    e.preventDefault();
    if (!form.covenant) { setErr('You must agree to The Mycelium Covenant to join.'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await api.register({
        username:     form.username.trim(),
        email:        lockedEmail,
        password:     form.password,
        location:     form.location.trim(),
        how_found:    form.how_found,
        invite_token: inviteToken,
      });
      login(res.token, res.user);
      setDone(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitLogin(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = await api.login({ email: form.loginEmail, password: form.loginPw });
      login(res.token, res.user);
      navigate('/');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitRestore(e) {
    e.preventDefault();
    if (!form.covenant) { setErr('You must agree to The Mycelium Covenant to restore your account.'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await api.restoreAccount(deletedInfo.deleted_user_id, {
        new_password: form.newPw,
        invite_token: inviteToken,
      });
      login(res.token, res.user);
      setDone(true);
      setRestored(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  // ── success screen ───────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="invite-register-section">
        <div className="invite-welcome-screen">
          <div className="invite-welcome-logo">⬡</div>
          <h2 className="invite-welcome-title">Welcome to Mycelium.</h2>
          <p className="invite-welcome-tagline">The chain grows.</p>
          {restored && (
            <p className="invite-welcome-sub">Your account and history have been restored.</p>
          )}
          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/')}>
            Enter Mycelium
          </button>
        </div>
      </div>
    );
  }

  // ── deleted account detection ────────────────────────────────────────────

  if (emailStatus === 'deleted' && mode === 'register') {
    return (
      <div className="invite-register-section">
        <div className="invite-deleted-notice">
          <p className="invite-deleted-title">We found a previous account</p>
          <p className="invite-deleted-body">
            The email <strong>{lockedEmail}</strong> is linked to a deleted account
            {deletedInfo?.original_username ? <> (@{deletedInfo.original_username})</> : null}.
            What would you like to do?
          </p>
          <div className="invite-deleted-choices">
            <button className="invite-deleted-choice" onClick={() => setMode('restore')}>
              <span className="invite-deleted-choice-icon">↩</span>
              <div>
                <strong>Restore your account</strong>
                <p>Reactivate @{deletedInfo?.original_username}. Your posts and community history will be restored.</p>
              </div>
            </button>
            <button className="invite-deleted-choice" onClick={() => setMode('create_fresh')}>
              <span className="invite-deleted-choice-icon">✦</span>
              <div>
                <strong>Create a fresh account</strong>
                <p>Start over with a brand new account. Your previous history stays archived.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── restore form ─────────────────────────────────────────────────────────

  if (mode === 'restore') {
    return (
      <div className="invite-register-section">
        <div className="invite-register-banner">
          <span className="invite-register-banner-icon">↩</span>
          <span>Restoring <strong>@{deletedInfo?.original_username}</strong></span>
        </div>
        <form onSubmit={submitRestore} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={lockedEmail} readOnly
              style={{ background: 'var(--surface)', color: 'var(--muted)' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Set a new password</label>
            <PasswordInput required minLength={8}
              value={form.newPw} onChange={e => set('newPw', e.target.value)}
              autoComplete="new-password" placeholder="At least 8 characters" />
          </div>
          <label className="invite-covenant-check">
            <input type="checkbox" checked={form.covenant} onChange={e => set('covenant', e.target.checked)} />
            {' '}I have read and agree to{' '}
            <a href="https://unprecedentedtimes.org/the-mycelium-covenant" target="_blank" rel="noopener noreferrer">
              The Mycelium Covenant
            </a>
          </label>
          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? '…' : 'Restore Account'}
          </button>
        </form>
        <p className="invite-toggle-mode">
          <button type="button" className="link-btn" onClick={() => { setMode('register'); setErr(null); }}>
            ← Back
          </button>
        </p>
      </div>
    );
  }

  // ── login form ───────────────────────────────────────────────────────────

  if (mode === 'login') {
    return (
      <div className="invite-register-section">
        <div className="invite-register-banner">
          <span className="invite-register-banner-icon">⬡</span>
          <span>Sign in to your existing account</span>
        </div>
        <form onSubmit={submitLogin} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required value={form.loginEmail}
              onChange={e => set('loginEmail', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <PasswordInput required value={form.loginPw}
              onChange={e => set('loginPw', e.target.value)}
              autoComplete="current-password" />
          </div>
          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? '…' : 'Sign In'}
          </button>
        </form>
        <p className="invite-toggle-mode">
          <button type="button" className="link-btn"
            onClick={() => { setMode('register'); setErr(null); }}>
            ← Back to registration
          </button>
        </p>
      </div>
    );
  }

  // ── main registration form (register or create_fresh) ───────────────────

  const isCheckingEmail = emailStatus === 'checking';

  return (
    <div className="invite-register-section">
      {emailStatus !== 'active' && (
        <>
          <div className="invite-register-banner">
            <span className="invite-register-banner-icon">✉️</span>
            <span>
              Invited by <strong>{inviterName}</strong>
              {mode === 'create_fresh' && ' · Creating fresh account'}
            </span>
          </div>

          <form onSubmit={submitRegister} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <div className="form-group">
              <label className="form-label">Display Name <span className="form-required">*</span></label>
              <input className="form-input" required value={form.username}
                onChange={e => set('username', e.target.value)}
                placeholder="Your name or nickname" />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={lockedEmail} readOnly
                style={{ background: 'var(--surface)', color: 'var(--muted)' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Location <span className="form-required">*</span></label>
              <input className="form-input" required value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. North Huntsville, Madison, Downtown" />
            </div>

            <div className="form-group">
              <label className="form-label">How did you find Mycelium? <span className="form-required">*</span></label>
              <select className="form-select" required value={form.how_found}
                onChange={e => set('how_found', e.target.value)}>
                {HOW_FOUND_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Password <span className="form-required">*</span></label>
              <PasswordInput required minLength={8}
                value={form.password} onChange={e => set('password', e.target.value)}
                autoComplete="new-password" placeholder="At least 8 characters" />
            </div>

            <label className="invite-covenant-check">
              <input type="checkbox" checked={form.covenant} onChange={e => set('covenant', e.target.checked)} />
              {' '}I have read and agree to{' '}
              <a href="https://unprecedentedtimes.org/the-mycelium-covenant" target="_blank" rel="noopener noreferrer">
                The Mycelium Covenant
              </a>
            </label>

            {err && <p className="form-error">{err}</p>}

            <button className="btn btn-primary btn-full" disabled={busy || isCheckingEmail}>
              {busy ? '…' : isCheckingEmail ? 'Checking…' : 'Join Mycelium'}
            </button>
          </form>

          <p className="invite-toggle-mode">
            Already have an account?{' '}
            <button type="button" className="link-btn"
              onClick={() => { setMode('login'); setErr(null); }}>
              Sign in instead
            </button>
          </p>
        </>
      )}

      {emailStatus === 'active' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <p style={{ fontSize: '.95rem', color: 'var(--muted)' }}>
            An active account already exists for <strong>{lockedEmail}</strong>.
          </p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }}
            onClick={() => setMode('login')}>
            Sign In
          </button>
        </div>
      )}
    </div>
  );
}
