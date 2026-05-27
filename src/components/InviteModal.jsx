import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

const STATUS_LABEL = { pending: 'Pending', accepted: 'Accepted', expired: 'Expired' };
const STATUS_CLASS = { pending: 'badge-gray', accepted: 'badge-green', expired: 'badge-red' };

export default function InviteModal({ onClose }) {
  const { token } = useAuth();
  const [tab,         setTab]         = useState('send');
  const [email,       setEmail]       = useState('');
  const [note,        setNote]        = useState('');
  const [err,         setErr]         = useState(null);
  const [busy,        setBusy]        = useState(false);
  const [sent,        setSent]        = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actionBusy,  setActionBusy]  = useState(null); // invite id being acted on

  function loadList() {
    setLoadingList(true);
    api.getMyInvitations(token)
      .then(setInvitations)
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }

  useEffect(() => {
    if (tab === 'sent') loadList();
  }, [tab, token]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const inv = await api.sendInvitation({ email, personal_note: note }, token);
      setSent(inv);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(inv) {
    if (!window.confirm(`Delete invitation to ${inv.email}? This will allow re-inviting them.`)) return;
    setActionBusy(inv.id);
    try {
      await api.deleteInvitation(inv.id, token);
      setInvitations(list => list.filter(i => i.id !== inv.id));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleResend(inv) {
    setActionBusy(inv.id);
    try {
      const updated = await api.resendInvitation(inv.id, token);
      setInvitations(list => list.map(i => i.id === inv.id ? { ...i, ...updated } : i));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">Invite Someone to Mycelium</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tabs" style={{ padding: '0 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <button className={`tab-btn${tab === 'send' ? ' active' : ''}`} onClick={() => setTab('send')}>
            Send Invite
          </button>
          <button className={`tab-btn${tab === 'sent' ? ' active' : ''}`} onClick={() => setTab('sent')}>
            Sent Invitations
          </button>
        </div>

        <div className="modal-body">
          {tab === 'send' && (
            sent ? (
              <div className="invite-sent-confirmation">
                <div className="invite-sent-icon">✉️</div>
                <h3 className="invite-sent-title">Invitation sent!</h3>
                <p className="invite-sent-body">
                  An invitation has been sent to <strong>{sent.email}</strong>.
                  {' '}Share this link with them directly:
                </p>
                <div className="invite-link-box">
                  <code className="invite-link-text">
                    {`https://mycelium.unprecedentedtimes.org/invite/${sent.token}`}
                  </code>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => navigator.clipboard?.writeText(
                      `https://mycelium.unprecedentedtimes.org/invite/${sent.token}`
                    )}
                  >
                    Copy
                  </button>
                </div>
                <p className="invite-sent-expiry">Expires in 14 days.</p>
                <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setSent(null); setEmail(''); setNote(''); }}>
                    Send Another
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={onClose}>Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                <p style={{ fontSize: '.875rem', color: 'var(--muted)', marginBottom: '.25rem' }}>
                  Invite someone you know and trust. They will receive a verified account and be vouched for by you.
                </p>
                <div className="form-group">
                  <label className="form-label">Email address *</label>
                  <input className="form-input" type="email" required value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="friend@example.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Personal note <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                  <textarea className="form-textarea" rows={3} value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Tell them a little about Mycelium and why you're inviting them…" />
                </div>
                {err && <p className="form-error">{err}</p>}
                <button className="btn btn-primary btn-full" disabled={busy}>
                  {busy ? '…' : 'Send Invitation'}
                </button>
              </form>
            )
          )}

          {tab === 'sent' && (
            loadingList ? (
              <div className="spinner" />
            ) : invitations.length === 0 ? (
              <p className="empty">You haven't sent any invitations yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {invitations.map(inv => (
                  <div key={inv.id} className="invite-list-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="invite-list-email">{inv.email}</p>
                      {inv.personal_note && (
                        <p className="invite-list-note">"{inv.personal_note}"</p>
                      )}
                      <p className="invite-list-date">
                        Sent {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {inv.status === 'accepted' && inv.accepted_by_username && (
                          <> · Joined as{' '}
                            <Link to={`/profile/${inv.accepted_by_username}`} onClick={onClose} style={{ color: 'var(--green)' }}>
                              {inv.accepted_by_username}
                            </Link>
                          </>
                        )}
                        {inv.status === 'pending' && (
                          <> · Expires {new Date(inv.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                        )}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.35rem' }}>
                      <span className={`badge ${STATUS_CLASS[inv.status]}`}>
                        {STATUS_LABEL[inv.status]}
                      </span>
                      {(inv.status === 'pending' || inv.status === 'expired') && (
                        <div style={{ display: 'flex', gap: '.3rem' }}>
                          <button
                            className="btn btn-xs btn-outline"
                            disabled={actionBusy === inv.id}
                            onClick={() => handleResend(inv)}
                            title="Resend — generates a new link and resets the 14-day expiry"
                          >
                            {actionBusy === inv.id ? '…' : 'Resend'}
                          </button>
                          {inv.status === 'pending' && (
                            <button
                              className="btn btn-xs btn-ghost btn-danger"
                              disabled={actionBusy === inv.id}
                              onClick={() => handleDelete(inv)}
                              title="Delete this invitation"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
