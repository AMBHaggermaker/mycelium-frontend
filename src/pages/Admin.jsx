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
        </div>

        {tab === 'moderation' && <ModerationQueue token={token} />}
        {tab === 'chatrooms' && <ChatRoomsTab token={token} userRole={user.role} />}
        {tab === 'users' && user.role === 'admin' && <UsersTab token={token} />}
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
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [err,        setErr]        = useState(null);
  const [actionId,   setActionId]   = useState(null);

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
    if (!confirm(`Restore @${u.original_username || '[unknown]'}?\n\nThis will reactivate the account and send them a welcome-back email.`)) return;
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

  if (loading) return <div className="spinner" />;
  if (err) return <p className="error-msg">{err}</p>;

  const activeUsers  = users.filter(u => u.is_active !== false);
  const deletedUsers = users.filter(u => u.is_active === false);

  const UserRow = ({ u }) => {
    const isMe      = u.id === me?.id;
    const isFounder = u.username === 'AMBHaggermaker';
    const canDelete = !isFounder && !isMe;

    return (
      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
        <td style={{ padding: '.5rem .75rem', fontWeight: 600 }}>
          {u.username}
          {isFounder && (
            <span style={{ marginLeft: '.4rem', fontSize: '.68rem', color: 'var(--green)', fontWeight: 700 }}>
              FOUNDER
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
          {canDelete ? (
            <button className="btn btn-sm btn-danger" disabled={actionId === u.id}
              onClick={() => deleteUser(u)}>
              {actionId === u.id ? '…' : 'Delete'}
            </button>
          ) : (
            <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>—</span>
          )}
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

  return (
    <div>
      <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        {activeUsers.length} active · {deletedUsers.length} deleted
      </p>

      <div className="table-scroll-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
          {tableHead}
          <tbody>
            {activeUsers.map(u => <UserRow key={u.id} u={u} />)}
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
                    <td style={{ padding: '.5rem .75rem', fontWeight: 600, color: 'var(--muted)', fontStyle: 'italic' }}>
                      {u.original_username ? `@${u.original_username}` : '[no data]'}
                    </td>
                    <td style={{ padding: '.5rem .75rem', color: 'var(--muted)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '.5rem .75rem', color: 'var(--muted)' }}>{u.post_count}</td>
                    <td style={{ padding: '.5rem .75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {u.deleted_at ? new Date(u.deleted_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '.5rem .75rem' }}>
                      {u.original_username ? (
                        <button className="btn btn-sm btn-outline" disabled={actionId === u.id}
                          onClick={() => restoreUser(u)}
                          title="Restore this account and send welcome-back email">
                          {actionId === u.id ? '…' : 'Restore'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '.75rem', color: 'var(--muted)', fontStyle: 'italic' }}>cannot restore</span>
                      )}
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
