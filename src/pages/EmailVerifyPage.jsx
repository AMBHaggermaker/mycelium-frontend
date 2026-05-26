import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

export default function EmailVerifyPage() {
  const [params]           = useSearchParams();
  const { user, token: authToken, login } = useAuth();
  const [status,  setStatus]  = useState('loading');
  const [newEmail, setNewEmail] = useState('');
  const [err,     setErr]     = useState('');

  useEffect(() => {
    const changeToken = params.get('token');
    if (!changeToken) {
      setStatus('error');
      setErr('No verification token found in the link. Please use the full link from your email.');
      return;
    }
    api.verifyEmailChange(changeToken)
      .then(data => {
        setNewEmail(data.email);
        setStatus('success');
        // If the currently-logged-in user is the one who changed their email, update their session
        if (user && authToken) {
          login(authToken, { ...user, email: data.email, email_pending: null });
        }
      })
      .catch(e => {
        setStatus('error');
        setErr(e.message);
      });
  }, []);

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
          {status === 'loading' && <div className="spinner" />}

          {status === 'success' && (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '.75rem', color: 'var(--green)' }}>⬡</div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.5rem' }}>Email confirmed</h1>
              <p style={{ color: 'var(--muted)', marginBottom: '1.75rem' }}>
                Your Mycelium email address is now <strong style={{ color: 'var(--text)' }}>{newEmail}</strong>.
                Use it to sign in going forward.
              </p>
              <Link to="/settings" className="btn btn-primary">Back to Settings</Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>⚠️</div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '.5rem' }}>Verification failed</h1>
              <p style={{ color: 'var(--muted)', marginBottom: '1.75rem' }}>{err}</p>
              <Link to="/settings" className="btn btn-outline">Go to Settings</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
