import { useState } from 'react';
import { useAuth } from '../auth';
import api from '../api';

export default function AuthModal({ onClose }) {
  const { login } = useAuth();
  const [mode, setMode]     = useState('login');
  const [form, setForm]     = useState({ username: '', email: '', password: '' });
  const [err,  setErr]      = useState(null);
  const [busy, setBusy]     = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = mode === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.register({ username: form.username, email: form.email, password: form.password });
      login(res.token, res.user);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

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
              <label className="form-label">Username</label>
              <input className="form-input" required value={form.username}
                onChange={e => set('username', e.target.value)} autoFocus />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required value={form.email}
              onChange={e => set('email', e.target.value)} autoFocus={mode === 'login'} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" required minLength={8} value={form.password}
              onChange={e => set('password', e.target.value)} />
          </div>
          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
          <p className="auth-toggle">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setErr(null); }}>
              {mode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
