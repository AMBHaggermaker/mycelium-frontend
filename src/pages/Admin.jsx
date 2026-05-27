import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

export default function Admin() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('moderation');

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'moderator') {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) return <div className="page"><div className="container"><p className="empty">Access denied.</p></div></div>;
  if (user.role !== 'admin' && user.role !== 'moderator') return null;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Admin</h1>
            <p className="page-subtitle">Platform management</p>
          </div>
        </div>

        <div className="tabs admin-tabs" style={{ marginBottom: '1.5rem' }}>
          <button className={`tab-btn${tab === 'moderation' ? ' active' : ''}`}
            onClick={() => setTab('moderation')}>
            Moderation
          </button>
          <button className={`tab-btn${tab === 'chatrooms' ? ' active' : ''}`}
            onClick={() => setTab('chatrooms')}>
            Chat Rooms
          </button>
          {user.role === 'admin' && (
            <button className={`tab-btn${tab === 'users' ? ' active' : ''}`}
              onClick={() => setTab('users')}>
              Users
            </button>
          )}
          {user.role === 'admin' && (
            <button className={`tab-btn${tab === 'anomalies' ? ' active' : ''}`}
              onClick={() => setTab('anomalies')}>
              Anomalies
            </button>
          )}
          {user.role === 'admin' && (
            <button className={`tab-btn${tab === 'businesses' ? ' active' : ''}`}
              onClick={() => setTab('businesses')}>
              Businesses
            </button>
          )}
        </div>

        {tab === 'moderation' && <ModerationQueue token={token} />}
        {tab === 'chatrooms' && <ChatRoomsTab token={token} userRole={user.role} />}
        {tab === 'users' && user.role === 'admin' && <UsersTab token={token} />}
        {tab === 'anomalies' && user.role === 'admin' && <AnomaliesTab token={token} />}
        {tab === 'businesses' && user.role === 'admin' && <BusinessesTab token={token} />}
      </div>
    </div>
  );
}

function ModerationQueue({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.getModerationQueue(token)
      .then(setItems)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function clearFlag(postId) {
    try {
      await api.clearPostFlag(postId, token);
      setItems(prev => prev.filter(i => i.id !== postId));
    } catch (e) {
      alert(e.message);
    }
  }

  async function removePost(postId) {
    if (!confirm('Remove this post permanently?')) return;
    try {
      await api.removePost(postId, token);
      setItems(prev => prev.filter(i => i.id !== postId));
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return <div className="spinner" />;
  if (err) return <p className="error-msg">{err}</p>;
  if (items.length === 0) return <p className="empty">No flagged posts. The queue is clear.</p>;

  return (
    <div>
      <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        {items.length} flagged {items.length === 1 ? 'post' : 'posts'}
      </p>
      {items.map(item => (
        <div key={item.id} className="mod-item">
          <div className="mod-item-header">
            <span className={`badge badge-${item.type}`}>{item.type}</span>
            <span className="mod-item-title">{item.title}</span>
          </div>
          {item.description && (
            <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.25rem' }}>
              {item.description}
            </p>
          )}
          <div className="mod-item-meta">
            Posted by <strong>{item.author}</strong>
            {' · '}
            {item.report_count} {item.report_count === 1 ? 'report' : 'reports'}
            {item.first_reporter && ` · First reported by ${item.first_reporter}`}
            {' · '}
            {new Date(item.post_created_at).toLocaleDateString()}
          </div>
          <div className="mod-item-actions">
            <button className="btn btn-sm btn-outline" onClick={() => clearFlag(item.id)}>
              Clear Flag
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => removePost(item.id)}>
              Remove Post
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTab({ token }) {
  const { user: me } = useAuth();
  const [users,           setUsers]          = useState([]);
  const [loading,         setLoading]        = useState(true);
  const [err,             setErr]            = useState(null);
  const [actionId,        setActionId]       = useState(null);
  const [founderOnly,     setFounderOnly]    = useState(false);

  useEffect(() => {
    api.getAdminUsers(token)
      .then(setUsers)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function changeRole(userId, role) {
    try {
      const updated = await api.setUserRole(userId, role, token);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: updated.role } : u));
    } catch (e) {
      alert(e.message);
    }
  }

  async function deleteUser(u) {
    if (!confirm(
      `Soft-delete @${u.username}?\n\nThis anonymizes their account and prevents login. Posts remain intact. This can be reversed with Restore.`
    )) return;
    setActionId(u.id);
    try {
      const updated = await api.deleteUser(u.id, token);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ...updated } : x));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  }

  async function restoreUser(u) {
    const displayName = u.preserved_display_name || u.original_username || '[unknown]';
    if (!confirm(`Restore ${displayName}?\n\nThis will reactivate the account and send them a welcome-back email.`)) return;
    setActionId(u.id);
    try {
      const updated = await api.restoreUser(u.id, token);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ...updated, original_username: null } : x));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  }

  async function sendPasswordReset(u) {
    if (!confirm(`Send a password reset email to @${u.username}?`)) return;
    setActionId(u.id);
    try {
      await api.adminSendPasswordReset(u.id, token);
      alert(`Password reset email sent to ${u.username}.`);
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  }

  async function toggleFoundingMember(u, grant) {
    if (!grant && !confirm(`Revoke founding member status from @${u.username}?`)) return;
    setActionId(u.id);
    try {
      const updated = await api.setFoundingMember(u.id, grant, token);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, founding_member: updated.founding_member } : x));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  }

  async function markCovenantAgreed(u) {
    if (!confirm(`Mark covenant agreement for @${u.username}?\n\nThis records that they have agreed to The Mycelium Covenant.`)) return;
    setActionId(u.id);
    try {
      const updated = await api.adminMarkCovenantAgreed(u.id, token);
      setUsers(prev => prev.map(x => x.id === u.id
        ? { ...x, covenant_agreed: updated.covenant_agreed, covenant_agreed_at: updated.covenant_agreed_at }
        : x
      ));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  }

  if (loading) return <div className="spinner" />;
  if (err) return <p className="error-msg">{err}</p>;

  const activeUsers  = users.filter(u => u.is_active !== false);
  const deletedUsers = users.filter(u => u.is_active === false);

  const UserRow = ({ u }) => {
    const isMe             = u.id === me?.id;
    const isFounder        = u.username === 'AMBHaggermaker';
    const canDelete        = !isFounder && !isMe;
    const canRevokeFounder = !isFounder;
    const busy             = actionId === u.id;

    return (
      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
        <td style={{ padding: '.5rem .75rem', fontWeight: 600 }}>
          {u.username}
          {u.founding_member && (
            <span style={{ marginLeft: '.4rem', fontSize: '.65rem', background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green)', padding: '.1rem .35rem', borderRadius: 99, fontWeight: 700, verticalAlign: 'middle' }}>
              ⬡ Founding
            </span>
          )}
          {u.covenant_agreed ? (
            <span style={{ marginLeft: '.4rem', fontSize: '.65rem', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', padding: '.1rem .35rem', borderRadius: 99, fontWeight: 700, verticalAlign: 'middle' }}
              title={u.covenant_agreed_at ? `Agreed ${new Date(u.covenant_agreed_at).toLocaleDateString()}` : 'Covenant agreed'}>
              ✓ Covenant
            </span>
          ) : (
            <span style={{ marginLeft: '.4rem', fontSize: '.65rem', background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', padding: '.1rem .35rem', borderRadius: 99, verticalAlign: 'middle' }}>
              No Covenant
            </span>
          )}
        </td>
        <td style={{ padding: '.5rem .75rem', color: 'var(--muted)' }}>
          {new Date(u.created_at).toLocaleDateString()}
        </td>
        <td style={{ padding: '.5rem .75rem', color: 'var(--muted)' }}>{u.post_count}</td>
        <td style={{ padding: '.5rem .75rem', color: u.flag_count > 0 ? 'var(--red)' : 'var(--muted)' }}>
          {u.flag_count}
        </td>
        <td style={{ padding: '.5rem .75rem' }}>
          {isFounder || isMe ? (
            <span className={`role-badge role-${u.role}`}>{u.role}</span>
          ) : (
            <select className="form-select" style={{ padding: '.2rem .5rem', fontSize: '.8rem' }}
              value={u.role} onChange={e => changeRole(u.id, e.target.value)}>
              <option value="member">member</option>
              <option value="moderator">moderator</option>
              <option value="admin">admin</option>
            </select>
          )}
        </td>
        <td style={{ padding: '.5rem .75rem' }}>
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
            {u.founding_member ? (
              canRevokeFounder && (
                <button className="btn btn-sm btn-outline" disabled={busy}
                  style={{ fontSize: '.72rem', color: 'var(--muted)', borderColor: 'var(--border)' }}
                  onClick={() => toggleFoundingMember(u, false)}
                  title="Revoke founding member status">
                  {busy ? '…' : 'Revoke Founding'}
                </button>
              )
            ) : (
              <button className="btn btn-sm btn-outline" disabled={busy}
                style={{ fontSize: '.72rem', color: 'var(--green)', borderColor: 'var(--green)' }}
                onClick={() => toggleFoundingMember(u, true)}
                title="Grant founding member status">
                {busy ? '…' : '⬡ Grant Founding'}
              </button>
            )}
            {!u.covenant_agreed && (
              <button className="btn btn-sm btn-outline" disabled={busy}
                style={{ fontSize: '.72rem', color: '#2e7d32', borderColor: '#a5d6a7' }}
                onClick={() => markCovenantAgreed(u)}
                title="Mark covenant as agreed (for founding accounts)">
                {busy ? '…' : '✓ Mark Covenant'}
              </button>
            )}
            <button className="btn btn-sm btn-outline" disabled={busy}
              onClick={() => sendPasswordReset(u)}
              title="Send password reset email">
              {busy ? '…' : 'Reset PW'}
            </button>
            {canDelete ? (
              <button className="btn btn-sm btn-danger" disabled={busy}
                onClick={() => deleteUser(u)}>
                {busy ? '…' : 'Delete'}
              </button>
            ) : (
              <span style={{ fontSize: '.75rem', color: 'var(--muted)', alignSelf: 'center' }}>—</span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const tableHead = (
    <thead>
      <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
        <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Username</th>
        <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Joined</th>
        <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Posts</th>
        <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Flags</th>
        <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Role</th>
        <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Actions</th>
      </tr>
    </thead>
  );

  const foundingMembers = activeUsers.filter(u => u.founding_member);
  const displayedActive = founderOnly ? foundingMembers : activeUsers;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', margin: 0 }}>
          {activeUsers.length} active · {deletedUsers.length} deleted · {foundingMembers.length} founding members
        </p>
        <button
          className={`btn btn-sm${founderOnly ? ' btn-primary' : ' btn-outline'}`}
          style={{ fontSize: '.78rem', ...(founderOnly ? {} : { color: 'var(--green)', borderColor: 'var(--green)' }) }}
          onClick={() => setFounderOnly(v => !v)}
        >
          ⬡ {founderOnly ? 'Showing Founding Members' : 'Filter: Founding Members'}
        </button>
      </div>

      <div className="table-scroll-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
          {tableHead}
          <tbody>
            {displayedActive.map(u => <UserRow key={u.id} u={u} />)}
          </tbody>
        </table>
      </div>

      {deletedUsers.length > 0 && (
        <>
          <h3 style={{ fontSize: '.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', margin: '1.75rem 0 .75rem' }}>
            Deleted Accounts
          </h3>
          <div className="table-scroll-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem', opacity: .8 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Original name</th>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Joined</th>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Posts</th>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Deleted</th>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deletedUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <td style={{ padding: '.5rem .75rem', fontWeight: 600, color: 'var(--muted)' }}>
                      {u.preserved_display_name || u.original_username
                        ? <>{u.preserved_display_name || u.original_username}<br /><span style={{ fontStyle: 'italic', fontSize: '.8rem' }}>@{u.original_username || '—'}</span></>
                        : <span style={{ fontStyle: 'italic' }}>[no data]</span>
                      }
                    </td>
                    <td style={{ padding: '.5rem .75rem', color: 'var(--muted)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '.5rem .75rem', color: 'var(--muted)' }}>{u.post_count}</td>
                    <td style={{ padding: '.5rem .75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {u.deleted_at ? new Date(u.deleted_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '.5rem .75rem' }}>
                      <button className="btn btn-sm btn-outline" disabled={actionId === u.id}
                        onClick={() => restoreUser(u)}
                        title={u.original_username
                          ? `Restore and send welcome-back email`
                          : 'Restore account (original name was not preserved)'
                        }>
                        {actionId === u.id ? '…' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ChatRoomsTab({ token, userRole }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.getAdminChatRooms(token)
      .then(setRooms)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function deleteRoom(roomId, name) {
    if (!confirm(`Delete room "${name}" and all its messages? This cannot be undone.`)) return;
    try {
      await api.deleteAdminChatRoom(roomId, token);
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch (e) {
      alert(e.message);
    }
  }

  async function toggleFlag(roomId) {
    try {
      const updated = await api.flagAdminChatRoom(roomId, token);
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, flagged: updated.flagged } : r));
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return <div className="spinner" />;
  if (err) return <p className="error-msg">{err}</p>;

  const flaggedCount = rooms.filter(r => r.flagged).length;

  return (
    <div>
      <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        {rooms.length} room{rooms.length !== 1 ? 's' : ''}
        {flaggedCount > 0 && (
          <span style={{ marginLeft: '.5rem', color: 'var(--red)', fontWeight: 700 }}>
            · {flaggedCount} flagged
          </span>
        )}
      </p>
      <div className="table-scroll-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Room</th>
              <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Creator</th>
              <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Messages</th>
              <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Reports</th>
              <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Created</th>
              <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map(room => (
              <tr key={room.id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: room.flagged ? 'rgba(181,36,36,.04)' : undefined,
                }}>
                <td style={{ padding: '.5rem .75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <span style={{ fontWeight: 600 }}>#{room.name}</span>
                    {room.pinned && (
                      <span style={{
                        fontSize: '.65rem', fontWeight: 700, padding: '.1rem .35rem',
                        borderRadius: 99, background: 'var(--green-bg)', color: 'var(--green)',
                        textTransform: 'uppercase', letterSpacing: '.04em',
                      }}>protected</span>
                    )}
                    {room.flagged && (
                      <span style={{
                        fontSize: '.65rem', fontWeight: 700, padding: '.1rem .35rem',
                        borderRadius: 99, background: 'var(--red-bg)', color: 'var(--red)',
                        textTransform: 'uppercase', letterSpacing: '.04em',
                      }}>flagged</span>
                    )}
                  </div>
                  {room.description && (
                    <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.1rem' }}>
                      {room.description}
                    </div>
                  )}
                </td>
                <td style={{ padding: '.5rem .75rem', color: 'var(--muted)' }}>
                  {room.creator ?? <em>system</em>}
                </td>
                <td style={{ padding: '.5rem .75rem', color: 'var(--muted)' }}>{room.message_count}</td>
                <td style={{ padding: '.5rem .75rem', color: room.report_count > 0 ? 'var(--red)' : 'var(--muted)' }}>
                  {room.report_count}
                </td>
                <td style={{ padding: '.5rem .75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {new Date(room.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '.5rem .75rem' }}>
                  <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                    {!room.pinned && (
                      <button
                        className={`btn btn-sm ${room.flagged && userRole === 'admin' ? 'btn-outline' : 'btn-outline'}`}
                        style={room.flagged ? { color: 'var(--red)', borderColor: 'var(--red)' } : {}}
                        onClick={() => toggleFlag(room.id)}
                        title={room.flagged && userRole === 'admin' ? 'Unflag room' : 'Flag for review'}
                      >
                        {room.flagged && userRole === 'admin' ? 'Unflag' : 'Flag'}
                      </button>
                    )}
                    {!room.pinned && userRole === 'admin' && (
                      <button className="btn btn-sm btn-danger"
                        onClick={() => deleteRoom(room.id, room.name)}>
                        Delete
                      </button>
                    )}
                    {room.pinned && (
                      <span style={{ fontSize: '.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                        protected
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Anomalies Tab ─────────────────────────────────────────────────────────────

const SEVERITY_COLORS = {
  critical: '#dc2626', serious: '#ea580c',
  moderate: '#ca8a04', minor: '#2563eb', monitoring: '#6b7280',
};
const ANOMALY_TYPE_LABELS = {
  location_cluster:    'Location Cluster',
  severity_escalation: 'Severity Escalation',
  cross_dashboard:     'Cross-Dashboard',
  temporal_pattern:    'Temporal Pattern',
  sensitive_location:  'Near Sensitive Location',
};

function AnomaliesTab({ token }) {
  const [anomalies, setAnomalies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [err,       setErr]       = useState(null);
  const [actionId,  setActionId]  = useState(null);

  useEffect(() => {
    api.getAdminWatchAnomalies(token)
      .then(setAnomalies)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function markReviewed(id) {
    setActionId(id);
    try {
      const updated = await api.reviewAnomaly(id, token);
      setAnomalies(prev => prev.map(a => a.id === id ? updated : a));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  }

  async function deleteAnomaly(id) {
    if (!confirm('Delete this anomaly record?')) return;
    setActionId(id);
    try {
      await api.deleteAnomaly(id, token);
      setAnomalies(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  }

  if (loading) return <div className="spinner" />;
  if (err) return <p className="error-msg">{err}</p>;

  const pending  = anomalies.filter(a => !a.reviewed);
  const reviewed = anomalies.filter(a => a.reviewed);

  const renderAnomaly = (a) => {
    const color = SEVERITY_COLORS[a.severity] || '#6b7280';
    const typeLabel = ANOMALY_TYPE_LABELS[a.anomaly_type] || a.anomaly_type;
    const confColors = { high: '#16a34a', medium: '#ca8a04', low: '#6b7280' };
    return (
      <div key={a.id} className="watch-anomaly-card" style={{ borderLeftColor: color, opacity: a.reviewed ? .7 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.35rem', alignItems: 'center' }}>
              <span style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', background: color + '22', color, border: `1px solid ${color}44`, padding: '.15rem .55rem', borderRadius: 99 }}>
                {a.severity}
              </span>
              <span style={{ fontSize: '.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>{typeLabel}</span>
              <span style={{ fontSize: '.72rem', color: confColors[a.ai_confidence], fontWeight: 600 }}>
                {a.ai_confidence} confidence
              </span>
              {a.reviewed && (
                <span style={{ fontSize: '.68rem', color: 'var(--green)', fontWeight: 700 }}>✓ Reviewed</span>
              )}
            </div>
            <p style={{ margin: '0 0 .4rem', fontSize: '.875rem', color: 'var(--text)', lineHeight: 1.5 }}>{a.description}</p>
            <div style={{ fontSize: '.78rem', color: 'var(--muted)', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
              {a.location_label && <span>📍 {a.location_label}</span>}
              {a.dashboard_types?.length > 0 && <span>{a.dashboard_types.join(', ')}</span>}
              <span>{a.affected_reports?.length || 0} reports</span>
              <span>{new Date(a.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
            {!a.reviewed && (
              <button className="btn btn-sm btn-outline" disabled={actionId === a.id}
                onClick={() => markReviewed(a.id)}>
                {actionId === a.id ? '…' : 'Mark Reviewed'}
              </button>
            )}
            <button className="btn btn-sm btn-danger" disabled={actionId === a.id}
              onClick={() => deleteAnomaly(a.id)}>
              {actionId === a.id ? '…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        {pending.length} pending · {reviewed.length} reviewed
        <span style={{ marginLeft: '.5rem', fontSize: '.8rem', color: 'var(--muted)' }}>
          (AI analysis runs every 30 min — add ANTHROPIC_API_KEY to .env to enable)
        </span>
      </p>

      {pending.length === 0 && reviewed.length === 0 && (
        <p className="empty">No anomalies detected yet.</p>
      )}

      {pending.length > 0 && (
        <div className="watch-report-list">{pending.map(renderAnomaly)}</div>
      )}

      {reviewed.length > 0 && (
        <>
          <h3 style={{ fontSize: '.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', margin: '1.75rem 0 .75rem' }}>
            Reviewed
          </h3>
          <div className="watch-report-list">{reviewed.map(renderAnomaly)}</div>
        </>
      )}
    </div>
  );
}

// ── Businesses Tab ─────────────────────────────────────────────────────────────

function BusinessesTab({ token }) {
  const [businesses,   setBusinesses]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [err,          setErr]          = useState(null);
  const [actionId,     setActionId]     = useState(null);
  const [showDeleted,  setShowDeleted]  = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getAdminBusinesses(token, showDeleted)
      .then(setBusinesses)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token, showDeleted]);

  async function toggleVerify(biz) {
    const next = !biz.is_verified_local;
    if (!next && !confirm(`Revoke "Verified Local" from "${biz.business_name}"?`)) return;
    setActionId(biz.id);
    try {
      const updated = await api.adminVerifyBusiness(biz.id, next, token);
      setBusinesses(prev => prev.map(b => b.id === biz.id
        ? { ...b, is_verified_local: updated.is_verified_local }
        : b
      ));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  }

  async function deactivateBusiness(biz) {
    if (!confirm(`Deactivate "${biz.business_name}"? It will be hidden from the directory and marked inactive.`)) return;
    setActionId(biz.id);
    try {
      await api.adminDeactivateBusiness(biz.id, token);
      setBusinesses(prev => prev.map(b => b.id === biz.id ? { ...b, is_active: false } : b));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  }

  if (loading) return <div className="spinner" />;
  if (err) return <p className="error-msg">{err}</p>;

  const active   = businesses.filter(b => b.is_active);
  const verified = active.filter(b => b.is_verified_local);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', margin: 0 }}>
          {active.length} active · {verified.length} verified local
          {showDeleted && businesses.filter(b => !b.is_active).length > 0 && (
            <span style={{ marginLeft: '.5rem', color: 'var(--red)' }}>
              · {businesses.filter(b => !b.is_active).length} deactivated
            </span>
          )}
        </p>
        <button
          className={`btn btn-sm ${showDeleted ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '.78rem' }}
          onClick={() => setShowDeleted(s => !s)}
        >
          {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
        </button>
      </div>
      <div className="table-scroll-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Business</th>
              <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Owner</th>
              <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Type</th>
              <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Category</th>
              <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Recs</th>
              <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Verified</th>
              <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map(biz => {
              const busy     = actionId === biz.id;
              const inactive = !biz.is_active;
              return (
                <tr key={biz.id} style={{ borderBottom: '1px solid var(--border)', opacity: inactive ? .55 : 1 }}>
                  <td style={{ padding: '.5rem .75rem', fontWeight: 600 }}>
                    {biz.business_name}
                    {biz.is_verified_local && (
                      <span style={{ marginLeft: '.4rem', fontSize: '.65rem', background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9', padding: '.1rem .35rem', borderRadius: 99, fontWeight: 700 }}>
                        ✓ Verified Local
                      </span>
                    )}
                    {inactive && (
                      <span style={{ marginLeft: '.4rem', fontSize: '.65rem', background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red)', padding: '.1rem .35rem', borderRadius: 99, fontWeight: 700 }}>
                        Deactivated
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '.5rem .75rem', color: 'var(--muted)' }}>
                    {biz.owner_username}
                  </td>
                  <td style={{ padding: '.5rem .75rem', color: 'var(--muted)', textTransform: 'capitalize' }}>
                    {biz.business_type?.replace(/_/g, ' ')}
                  </td>
                  <td style={{ padding: '.5rem .75rem', color: 'var(--muted)', textTransform: 'capitalize' }}>
                    {biz.category?.replace(/_/g, ' ')}
                  </td>
                  <td style={{ padding: '.5rem .75rem', color: 'var(--muted)' }}>
                    {biz.recommendation_count ?? 0}
                  </td>
                  <td style={{ padding: '.5rem .75rem' }}>
                    {biz.is_verified_local
                      ? <span style={{ color: '#1565c0', fontWeight: 600, fontSize: '.8rem' }}>✓ Yes</span>
                      : <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>No</span>
                    }
                  </td>
                  <td style={{ padding: '.5rem .75rem' }}>
                    <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
                      {!inactive && (
                        <button
                          className="btn btn-sm btn-outline"
                          disabled={busy}
                          style={biz.is_verified_local
                            ? { fontSize: '.72rem', color: 'var(--muted)', borderColor: 'var(--border)' }
                            : { fontSize: '.72rem', color: '#1565c0', borderColor: '#90caf9' }
                          }
                          onClick={() => toggleVerify(biz)}
                        >
                          {busy ? '…' : biz.is_verified_local ? 'Revoke Verified' : '✓ Verify Local'}
                        </button>
                      )}
                      {!inactive && (
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={busy}
                          style={{ fontSize: '.72rem' }}
                          onClick={() => deactivateBusiness(biz)}
                        >
                          {busy ? '…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {businesses.length === 0 && <p className="empty">No businesses registered yet.</p>}
    </div>
  );
}
