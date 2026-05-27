import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import PasswordInput from '../components/PasswordInput';

function Section({ title, children }) {
  return (
    <section className="settings-section">
      <h2 className="settings-section-title">{title}</h2>
      {children}
    </section>
  );
}

function SaveRow({ busy, saved, onSave, disabled }) {
  return (
    <div className="settings-save-row">
      <button className="btn btn-primary btn-sm" onClick={onSave} disabled={busy || disabled}>
        {busy ? '…' : 'Save'}
      </button>
      {saved && <span className="settings-saved-msg">Saved</span>}
    </div>
  );
}

export default function Settings() {
  const { user, token, login } = useAuth();
  const fileRef = useRef();

  // Fetch fresh user data on mount so state reflects DB reality (important for founder and any stale session)
  const [freshUser, setFreshUser] = useState(user);
  useEffect(() => {
    if (!token) return;
    api.me(token).then(u => {
      setFreshUser(u);
      setUsername(u.username || '');
      setBio(u.bio || '');
      setLocation(u.location || '');
    }).catch(() => {});
  }, [token]);

  const activeUser = freshUser || user;

  // Profile fields
  const [username, setUsername] = useState(user?.username || '');
  const [bio,      setBio]      = useState(user?.bio      || '');
  const [location, setLocation] = useState(user?.location || '');
  const [profileBusy,  setProfileBusy]  = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileErr,   setProfileErr]   = useState(null);

  // Avatar
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr,  setAvatarErr]  = useState(null);

  // Email change — three sub-states: 'view' | 'form' | 'sent'
  const [emailStep,    setEmailStep]    = useState('view');
  const [emailCurPw,   setEmailCurPw]   = useState('');
  const [emailNew,     setEmailNew]     = useState('');
  const [emailBusy,    setEmailBusy]    = useState(false);
  const [emailErr,     setEmailErr]     = useState(null);
  const [emailSentTo,  setEmailSentTo]  = useState('');
  const [cancelBusy,   setCancelBusy]   = useState(false);

  // Password
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [pwBusy,     setPwBusy]     = useState(false);
  const [pwSaved,    setPwSaved]    = useState(false);
  const [pwErr,      setPwErr]      = useState(null);

  if (!activeUser) {
    return (
      <main className="container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <p>You must be signed in to view settings.</p>
      </main>
    );
  }

  // Detect existing pending email change (e.g., user returns to settings after requesting)
  const pendingEmail = activeUser.email_pending;

  // ── Profile ──────────────────────────────────────────────────────────────

  async function saveProfile() {
    setProfileBusy(true); setProfileErr(null); setProfileSaved(false);
    try {
      const updated = await api.updateUser(activeUser.id, { username, bio, location }, token);
      const merged  = { ...activeUser, ...updated };
      setFreshUser(merged);
      login(token, merged);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (e) {
      setProfileErr(e.message);
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true); setAvatarErr(null);
    try {
      const updated = await api.uploadAvatar(activeUser.id, file, token);
      const merged  = { ...activeUser, ...updated };
      setFreshUser(merged);
      login(token, merged);
    } catch (e) {
      setAvatarErr(e.message);
    } finally {
      setAvatarBusy(false);
    }
  }

  // ── Email change ─────────────────────────────────────────────────────────

  async function requestEmailChange(e) {
    e.preventDefault();
    setEmailBusy(true); setEmailErr(null);
    try {
      await api.requestEmailChange({ current_password: emailCurPw, new_email: emailNew }, token);
      setEmailSentTo(emailNew);
      setEmailStep('sent');
      setEmailCurPw(''); setEmailNew('');
      // Update local user to reflect pending state
      const updated = { ...activeUser, email_pending: emailNew };
      setFreshUser(updated);
      login(token, updated);
    } catch (e) {
      setEmailErr(e.message);
    } finally {
      setEmailBusy(false);
    }
  }

  async function cancelEmailChange() {
    setCancelBusy(true);
    try {
      await api.cancelEmailChange(token);
      const updated = { ...activeUser, email_pending: null };
      setFreshUser(updated);
      login(token, updated);
      setEmailStep('view');
    } catch (e) {
      alert(e.message);
    } finally {
      setCancelBusy(false);
    }
  }

  // ── Password ─────────────────────────────────────────────────────────────

  async function savePassword() {
    setPwErr(null);
    if (newPw !== confirmPw) { setPwErr('New passwords do not match'); return; }
    if (newPw.length < 8) { setPwErr('New password must be at least 8 characters'); return; }
    setPwBusy(true); setPwSaved(false);
    try {
      await api.changePassword({ current_password: currentPw, new_password: newPw }, token);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    } catch (e) {
      setPwErr(e.message);
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <main className="container settings-page">
      <div className="settings-header">
        <Link to={`/profile/${activeUser.username}`} className="settings-back">← Profile</Link>
        <h1 className="settings-title">Settings</h1>
      </div>

      {/* Avatar */}
      <Section title="Profile Photo">
        <div className="settings-avatar-row">
          <div className="settings-avatar-wrap" onClick={() => fileRef.current?.click()} title="Change photo">
            {activeUser.avatar_url ? (
              <img src={activeUser.avatar_url} alt={activeUser.username} className="settings-avatar-img" />
            ) : (
              <div className="settings-avatar-placeholder">{activeUser.username?.[0]?.toUpperCase()}</div>
            )}
            <div className="settings-avatar-overlay">{avatarBusy ? '…' : '📷'}</div>
          </div>
          <div>
            <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={avatarBusy}>
              {avatarBusy ? 'Uploading…' : 'Change Photo'}
            </button>
            <p className="settings-hint">JPEG, PNG, WebP or GIF · Max 5 MB</p>
            {avatarErr && <p className="form-error">{avatarErr}</p>}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
      </Section>

      {/* Profile info */}
      <Section title="Profile">
        <div className="settings-fields">
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input className="form-input" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Your name or nickname" />
          </div>
          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea className="form-textarea" rows={3} value={bio} onChange={e => setBio(e.target.value)}
              placeholder="Tell the community a little about yourself…" />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="e.g. North Huntsville, Madison, Downtown" />
          </div>
          {profileErr && <p className="form-error">{profileErr}</p>}
          <SaveRow busy={profileBusy} saved={profileSaved} onSave={saveProfile} />
        </div>
      </Section>

      {/* Email Address */}
      <Section title="Email Address">
        {/* Pending state from a previous request (user returned to settings) */}
        {(pendingEmail || emailStep === 'sent') && (
          <div className="settings-email-pending">
            <p className="settings-email-pending-msg">
              ✉️ Verification email sent to <strong>{pendingEmail || emailSentTo}</strong>.
              Click the link in that email to confirm the change.
            </p>
            <button className="btn btn-ghost btn-sm" disabled={cancelBusy}
              onClick={cancelEmailChange}>
              {cancelBusy ? '…' : 'Cancel change'}
            </button>
          </div>
        )}

        {!pendingEmail && emailStep === 'view' && (
          <div className="settings-fields">
            <div className="form-group">
              <label className="form-label">Current email</label>
              <input className="form-input" type="email" value={activeUser.email} readOnly
                style={{ background: 'var(--surface)', color: 'var(--muted)' }} />
            </div>
            <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}
              onClick={() => setEmailStep('form')}>
              Change Email
            </button>
          </div>
        )}

        {!pendingEmail && emailStep === 'form' && (
          <form className="settings-fields" onSubmit={requestEmailChange}>
            <p style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
              Enter your current password and new email address. We'll send a verification link to the new address before making the change.
            </p>
            <div className="form-group">
              <label className="form-label">Current password</label>
              <PasswordInput required value={emailCurPw}
                onChange={e => setEmailCurPw(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="form-group">
              <label className="form-label">New email address</label>
              <input className="form-input" type="email" required value={emailNew}
                onChange={e => setEmailNew(e.target.value)} />
            </div>
            {emailErr && <p className="form-error">{emailErr}</p>}
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn btn-primary btn-sm" type="submit" disabled={emailBusy}>
                {emailBusy ? '…' : 'Send Verification'}
              </button>
              <button className="btn btn-ghost btn-sm" type="button"
                onClick={() => { setEmailStep('view'); setEmailErr(null); }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Section>

      {/* Password */}
      <Section title="Change Password">
        <div className="settings-fields">
          <div className="form-group">
            <label className="form-label">Current password</label>
            <PasswordInput value={currentPw}
              onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="form-group">
            <label className="form-label">New password</label>
            <PasswordInput value={newPw}
              onChange={e => setNewPw(e.target.value)} autoComplete="new-password" minLength={8} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm new password</label>
            <PasswordInput value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" />
          </div>
          {pwErr && <p className="form-error">{pwErr}</p>}
          <SaveRow busy={pwBusy} saved={pwSaved} onSave={savePassword}
            disabled={!currentPw || !newPw || !confirmPw} />
        </div>
      </Section>
    </main>
  );
}
