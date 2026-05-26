import { useState } from 'react';
import { useAuth } from '../auth';
import api from '../api';

const HOW_FOUND_OPTIONS = [
  { value: '',            label: 'How did you find Mycelium? *' },
  { value: 'invited',     label: 'Invited by someone' },
  { value: 'newsletter',  label: 'unprecedentedtimes.org' },
  { value: 'lostfound',   label: 'Lost & Found' },
  { value: 'other',       label: 'Other' },
];

export default function AuthModal({ onClose }) {
  const { login } = useAuth();
  const [mode,    setMode]    = useState('login');
  const [form,    setForm]    = useState({ username: '', email: '', password: '', location: '', how_found: '', covenant: false });
  const [err,     setErr]     = useState(null);
  const [busy,    setBusy]    = useState(false);

  // deleted account state
  const [deletedInfo, setDeletedInfo] = useState(null); // { deleted_user_id, original_username }
  const [deletedMode, setDeletedMode] = useState(null); // null | 'restore' | 'fresh'
  const [restorePw,   setRestorePw]   = useState('');
  const [covenantRestore, setCovenantRestore] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function switchMode(m) { setMode(m); setErr(null); setDeletedInfo(null); setDeletedMode(null); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (mode === 'login') {
        const res = await api.login({ email: form.email, password: form.password });
        login(res.token, res.user);
        onClose();
      } else {
        // register
        if (!form.covenant) { setErr('You must agree to The Mycelium Covenant to join.'); setBusy(false); return; }
        if (!form.how_found) { setErr('Please tell us how you found Mycelium.'); setBusy(false); return; }
        const res = await api.register({
          username:  form.username.trim(),
          email:     form.email,
          password:  form.password,
          location:  form.location.trim(),
          how_found: form.how_found,
        });
        login(res.token, res.user);
        onClose();
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitRestore(e) {
    e.preventDefault();
    if (!covenantRestore) { setErr('You must agree to The Mycelium Covenant to restore your account.'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await api.restoreAccount(deletedInfo.deleted_user_id, { new_password: restorePw });
      login(res.token, res.user);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  // ── deleted account restore sub-form ────────────────────────────────────

  if (deletedMode === 'restore') {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal">
          <div className="modal-header">
            <span className="modal-title">Restore your account</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <form className="modal-body" onSubmit={submitRestore}>
            <p style={{ fontSize: '.875rem', color: 'var(--muted)', marginBottom: '.75rem' }}>
              Restoring <strong>@{deletedInfo.original_username}</strong>. Your posts and history will be reactivated.
            </p>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} readOnly
                style={{ background: 'var(--surface)', color: 'var(--muted)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Set a new password</label>
              <input className="form-input" type="password" required minLength={8}
                value={restorePw} onChange={e => setRestorePw(e.target.value)}
                autoComplete="new-password" placeholder="At least 8 characters" />
            </div>
            <label className="invite-covenant-check" style={{ fontSize: '.85rem' }}>
              <input type="checkbox" checked={covenantRestore} onChange={e => setCovenantRestore(e.target.checked)} />
              {' '}I agree to{' '}
              <a href="https://unprecedentedtimes.org/the-mycelium-covenant" target="_blank" rel="noopener noreferrer">
                The Mycelium Covenant
              </a>
            </label>
            {err && <p className="form-error">{err}</p>}
            <button className="btn btn-primary btn-full" disabled={busy}>{busy ? '…' : 'Restore Account'}</button>
            <p className="auth-toggle">
              <button type="button" onClick={() => { setDeletedMode(null); setErr(null); }}>← Back</button>
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ── deleted account choice prompt ────────────────────────────────────────

  if (deletedInfo && !deletedMode) {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal">
          <div className="modal-header">
            <span className="modal-title">Previous account found</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <p style={{ fontSize: '.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              The email <strong>{form.email}</strong> is linked to a deleted account
              {deletedInfo.original_username ? <> (@{deletedInfo.original_username})</> : null}.
              What would you like to do?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              <button className="invite-deleted-choice" onClick={() => { setDeletedMode('restore'); setErr(null); }}>
                <span className="invite-deleted-choice-icon">↩</span>
                <div>
                  <strong>Restore your account</strong>
                  <p>Reactivate @{deletedInfo.original_username}. Your posts and history will be restored.</p>
                </div>
              </button>
              <button className="invite-deleted-choice" onClick={() => { setDeletedMode('fresh'); setDeletedInfo(null); setErr(null); }}>
                <span className="invite-deleted-choice-icon">✦</span>
                <div>
                  <strong>Create a fresh account</strong>
                  <p>Start over with a new account using this email.</p>
                </div>
              </button>
            </div>
            <p className="auth-toggle" style={{ marginTop: '.75rem' }}>
              <button type="button" onClick={() => { setDeletedInfo(null); setErr(null); }}>← Back</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── main modal ───────────────────────────────────────────────────────────

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Display Name <span className="form-required">*</span></label>
              <input className="form-input" required value={form.username}
                onChange={e => set('username', e.target.value)}
                placeholder="Your name or nickname" />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required value={form.email}
              onChange={e => set('email', e.target.value)} />
          </div>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Location <span className="form-required">*</span></label>
                <input className="form-input" required value={form.location}
                  onChange={e => set('location', e.target.value)}
                  placeholder="e.g. North Huntsville, Madison, Downtown" />
              </div>
              <div className="form-group">
                <select className="form-select" required value={form.how_found}
                  onChange={e => set('how_found', e.target.value)}>
                  {HOW_FOUND_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} disabled={o.value === ''}>{o.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" required minLength={8} value={form.password}
              onChange={e => set('password', e.target.value)} />
          </div>
          {mode === 'register' && (
            <label className="invite-covenant-check" style={{ fontSize: '.85rem' }}>
              <input type="checkbox" checked={form.covenant} onChange={e => set('covenant', e.target.checked)} />
              {' '}I have read and agree to{' '}
              <a href="https://unprecedentedtimes.org/the-mycelium-covenant" target="_blank" rel="noopener noreferrer">
                The Mycelium Covenant
              </a>
            </label>
          )}
          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
          <p className="auth-toggle">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
