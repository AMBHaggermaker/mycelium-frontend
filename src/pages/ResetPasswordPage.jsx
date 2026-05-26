import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import PasswordInput from '../components/PasswordInput';

export default function ResetPasswordPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token');

  const [newPw,    setNewPw]    = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState('');
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    if (!token) setErr('No reset token found. Please use the full link from your email.');
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPw !== confirmPw) { setErr('Passwords do not match'); return; }
    if (newPw.length < 8)    { setErr('Password must be at least 8 characters'); return; }
    setBusy(true); setErr('');
    try {
      await api.resetPassword({ token, new_password: newPw });
      setDone(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 480, paddingTop: '3rem', paddingBottom: '4rem' }}>
        <div style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          padding: '2.5rem 2rem',
          border: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          {done ? (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '.75rem', color: 'var(--green)' }}>⬡</div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.5rem' }}>Password updated</h1>
              <p style={{ color: 'var(--muted)', marginBottom: '1.75rem' }}>
                Your password has been changed. You can now sign in with your new password.
              </p>
              <Link to="/" className="btn btn-primary">Go to Mycelium</Link>
            </>
          ) : (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '.75rem', color: 'var(--green)' }}>⬡</div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.5rem' }}>Set new password</h1>
              {!token ? (
                <>
                  <p style={{ color: 'var(--muted)', marginBottom: '1.75rem' }}>{err}</p>
                  <Link to="/" className="btn btn-outline">Go to Mycelium</Link>
                </>
              ) : (
                <form onSubmit={handleSubmit} style={{ textAlign: 'left', marginTop: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">New password</label>
                    <PasswordInput required minLength={8} value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      autoComplete="new-password" placeholder="At least 8 characters" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm new password</label>
                    <PasswordInput required minLength={8} value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      autoComplete="new-password" />
                  </div>
                  {err && <p className="form-error">{err}</p>}
                  <button className="btn btn-primary btn-full" disabled={busy}>
                    {busy ? '…' : 'Set New Password'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
