import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

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
  const navigate = useNavigate();
  const fileRef = useRef();

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

  // Email
  const [email,     setEmail]     = useState(user?.email || '');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailSaved,setEmailSaved]= useState(false);
  const [emailErr,  setEmailErr]  = useState(null);

  // Password
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [pwBusy,     setPwBusy]     = useState(false);
  const [pwSaved,    setPwSaved]    = useState(false);
  const [pwErr,      setPwErr]      = useState(null);

  if (!user) {
    return (
      <main className="container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <p>You must be signed in to view settings.</p>
      </main>
    );
  }

  async function saveProfile() {
    setProfileBusy(true); setProfileErr(null); setProfileSaved(false);
    try {
      const updated = await api.updateUser(user.id, { username, bio, location }, token);
      login(token, { ...user, ...updated });
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
      const updated = await api.uploadAvatar(user.id, file, token);
      login(token, { ...user, ...updated });
    } catch (e) {
      setAvatarErr(e.message);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function saveEmail() {
    setEmailBusy(true); setEmailErr(null); setEmailSaved(false);
    try {
      const updated = await api.updateUser(user.id, { email }, token);
      login(token, { ...user, ...updated });
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 3000);
    } catch (e) {
      setEmailErr(e.message);
    } finally {
      setEmailBusy(false);
    }
  }

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
        <Link to={`/profile/${user.id}`} className="settings-back">← Profile</Link>
        <h1 className="settings-title">Settings</h1>
      </div>

      {/* Avatar */}
      <Section title="Profile Photo">
        <div className="settings-avatar-row">
          <div className="settings-avatar-wrap" onClick={() => fileRef.current?.click()} title="Change photo">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} className="settings-avatar-img" />
            ) : (
              <div className="settings-avatar-placeholder">{user.username?.[0]?.toUpperCase()}</div>
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
            <label className="form-label">Username</label>
            <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea className="form-textarea" rows={3} value={bio} onChange={e => setBio(e.target.value)}
              placeholder="Tell the community a little about yourself…" />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Huntsville, AL" />
          </div>
          {profileErr && <p className="form-error">{profileErr}</p>}
          <SaveRow busy={profileBusy} saved={profileSaved} onSave={saveProfile} />
        </div>
      </Section>

      {/* Email */}
      <Section title="Email Address">
        <div className="settings-fields">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          {emailErr && <p className="form-error">{emailErr}</p>}
          <SaveRow busy={emailBusy} saved={emailSaved} onSave={saveEmail}
            disabled={email === user.email} />
        </div>
      </Section>

      {/* Password */}
      <Section title="Change Password">
        <div className="settings-fields">
          <div className="form-group">
            <label className="form-label">Current password</label>
            <input className="form-input" type="password" value={currentPw}
              onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="form-group">
            <label className="form-label">New password</label>
            <input className="form-input" type="password" value={newPw}
              onChange={e => setNewPw(e.target.value)} autoComplete="new-password" minLength={8} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm new password</label>
            <input className="form-input" type="password" value={confirmPw}
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
