import { useState, useEffect, useRef, useCallback } from 'react';
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
          {user.role === 'admin' && (
            <FeedbackTabButton active={tab === 'feedback'} onClick={() => setTab('feedback')} token={token} />
          )}
          <button className={`tab-btn${tab === 'copyright' ? ' active' : ''}`}
            onClick={() => setTab('copyright')}>
            Copyright Claims
          </button>
        </div>

        {tab === 'moderation' && <ModerationQueue token={token} />}
        {tab === 'chatrooms' && <ChatRoomsTab token={token} userRole={user.role} />}
        {tab === 'users' && user.role === 'admin' && <UsersTab token={token} />}
        {tab === 'anomalies' && user.role === 'admin' && <AnomaliesTab token={token} />}
        {tab === 'businesses' && user.role === 'admin' && <BusinessesTab token={token} />}
        {tab === 'feedback' && user.role === 'admin' && <FeedbackTab token={token} />}
        {tab === 'copyright' && <CopyrightClaimsTab token={token} />}
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
  const [users,        setUsers]       = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [err,          setErr]         = useState(null);
  const [actionId,     setActionId]    = useState(null);
  const [founderOnly,  setFounderOnly] = useState(false);
  const [search,       setSearch]      = useState('');
  const [profilePanel, setProfilePanel] = useState(null); // { userId, data|null, loading, err }

  useEffect(() => {
    api.getAdminUsers(token)
      .then(setUsers)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function openProfile(u) {
    setProfilePanel({ userId: u.id, username: u.username, data: null, loading: true, err: null });
    try {
      const data = await api.getAdminUserProfile(u.id, token);
      setProfilePanel(p => p?.userId === u.id ? { ...p, data, loading: false } : p);
    } catch (e) {
      setProfilePanel(p => p?.userId === u.id ? { ...p, loading: false, err: e.message } : p);
    }
  }

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
  const foundingMembers = activeUsers.filter(u => u.founding_member);

  const q = search.trim().toLowerCase();
  const displayed = (founderOnly ? foundingMembers : activeUsers).filter(u => {
    if (!q) return true;
    return (
      u.username?.toLowerCase().includes(q) ||
      u.location?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const BadgeSmall = ({ color, bg, border, children, title }) => (
    <span title={title} style={{
      fontSize: '.62rem', background: bg, color, border: `1px solid ${border}`,
      padding: '.1rem .3rem', borderRadius: 99, fontWeight: 700,
      verticalAlign: 'middle', whiteSpace: 'nowrap',
    }}>{children}</span>
  );

  const UserRow = ({ u }) => {
    const isMe             = u.id === me?.id;
    const isFounder        = u.username === 'AMBHaggermaker';
    const canDelete        = !isFounder && !isMe;
    const canRevokeFounder = !isFounder;
    const busy             = actionId === u.id;
    const isSelected       = profilePanel?.userId === u.id;

    return (
      <tr style={{
        borderBottom: '1px solid var(--border)',
        background: isSelected ? 'var(--surface)' : undefined,
      }}>
        {/* Username + badges */}
        <td style={{ padding: '.5rem .75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
          <span>{u.username}</span>
          <div style={{ display: 'flex', gap: '.25rem', flexWrap: 'wrap', marginTop: '.2rem' }}>
            {u.founding_member && <BadgeSmall color="var(--green)" bg="var(--green-bg)" border="var(--green)">⬡ Founding</BadgeSmall>}
            {u.verified && <BadgeSmall color="#1565c0" bg="#e3f2fd" border="#90caf9">✓ Verified</BadgeSmall>}
            {u.covenant_agreed
              ? <BadgeSmall color="#2e7d32" bg="#e8f5e9" border="#a5d6a7" title={u.covenant_agreed_at ? `Agreed ${new Date(u.covenant_agreed_at).toLocaleDateString()}` : ''}>✓ Covenant</BadgeSmall>
              : <BadgeSmall color="var(--muted)" bg="var(--surface)" border="var(--border)">No Covenant</BadgeSmall>
            }
          </div>
        </td>
        {/* Location */}
        <td style={{ padding: '.5rem .75rem', color: 'var(--muted)', fontSize: '.8rem', maxWidth: 120 }}>
          {u.location || <span style={{ opacity: .4 }}>—</span>}
        </td>
        {/* How found */}
        <td style={{ padding: '.5rem .75rem', color: 'var(--muted)', fontSize: '.8rem', maxWidth: 140 }}>
          <span title={u.how_found || ''} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
            {u.how_found || <span style={{ opacity: .4 }}>—</span>}
          </span>
        </td>
        {/* Joined */}
        <td style={{ padding: '.5rem .75rem', color: 'var(--muted)', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
          {new Date(u.created_at).toLocaleDateString()}
        </td>
        {/* Vouched by */}
        <td style={{ padding: '.5rem .75rem', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
          {u.inviter_username
            ? <span style={{ color: 'var(--accent)' }}>@{u.inviter_username}</span>
            : <span style={{ color: 'var(--muted)', opacity: .4 }}>—</span>
          }
        </td>
        {/* Last active */}
        <td style={{ padding: '.5rem .75rem', color: 'var(--muted)', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
          {u.last_active ? new Date(u.last_active).toLocaleDateString() : '—'}
        </td>
        {/* Posts / Flags */}
        <td style={{ padding: '.5rem .75rem', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
          <span style={{ color: 'var(--muted)' }}>{u.post_count}</span>
          {u.flag_count > 0 && <span style={{ color: 'var(--red)', marginLeft: '.35rem' }}>▲{u.flag_count}</span>}
        </td>
        {/* Role */}
        <td style={{ padding: '.5rem .75rem' }}>
          {isFounder || isMe ? (
            <span className={`role-badge role-${u.role}`}>{u.role}</span>
          ) : (
            <select className="form-select" style={{ padding: '.2rem .5rem', fontSize: '.78rem' }}
              value={u.role} onChange={e => changeRole(u.id, e.target.value)}>
              <option value="member">member</option>
              <option value="moderator">moderator</option>
              <option value="admin">admin</option>
            </select>
          )}
        </td>
        {/* Actions */}
        <td style={{ padding: '.5rem .75rem' }}>
          <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
            <button className={`btn btn-sm${isSelected ? ' btn-primary' : ' btn-outline'}`}
              style={{ fontSize: '.72rem' }}
              onClick={() => isSelected ? setProfilePanel(null) : openProfile(u)}>
              {isSelected ? 'Close' : 'View'}
            </button>
            {u.founding_member ? (
              canRevokeFounder && (
                <button className="btn btn-sm btn-outline" disabled={busy}
                  style={{ fontSize: '.72rem', color: 'var(--muted)', borderColor: 'var(--border)' }}
                  onClick={() => toggleFoundingMember(u, false)}>
                  {busy ? '…' : 'Revoke ⬡'}
                </button>
              )
            ) : (
              <button className="btn btn-sm btn-outline" disabled={busy}
                style={{ fontSize: '.72rem', color: 'var(--green)', borderColor: 'var(--green)' }}
                onClick={() => toggleFoundingMember(u, true)}>
                {busy ? '…' : '⬡ Grant'}
              </button>
            )}
            {!u.covenant_agreed && (
              <button className="btn btn-sm btn-outline" disabled={busy}
                style={{ fontSize: '.72rem', color: '#2e7d32', borderColor: '#a5d6a7' }}
                onClick={() => markCovenantAgreed(u)}>
                {busy ? '…' : '✓ Cov.'}
              </button>
            )}
            <button className="btn btn-sm btn-outline" disabled={busy}
              style={{ fontSize: '.72rem' }}
              onClick={() => sendPasswordReset(u)}>
              {busy ? '…' : 'Reset PW'}
            </button>
            {canDelete ? (
              <button className="btn btn-sm btn-danger" disabled={busy}
                style={{ fontSize: '.72rem' }}
                onClick={() => deleteUser(u)}>
                {busy ? '…' : 'Delete'}
              </button>
            ) : (
              <span style={{ fontSize: '.72rem', color: 'var(--muted)', alignSelf: 'center' }}>—</span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', margin: 0 }}>
          {activeUsers.length} active · {deletedUsers.length} deleted · {foundingMembers.length} founding members
        </p>
        <input
          type="search"
          className="form-input"
          placeholder="Search username, location, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240, padding: '.35rem .65rem', fontSize: '.85rem' }}
        />
        <button
          className={`btn btn-sm${founderOnly ? ' btn-primary' : ' btn-outline'}`}
          style={{ fontSize: '.78rem', ...(founderOnly ? {} : { color: 'var(--green)', borderColor: 'var(--green)' }) }}
          onClick={() => setFounderOnly(v => !v)}
        >
          ⬡ {founderOnly ? 'Founding Only' : 'Filter: Founding'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="table-scroll-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Username</th>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Location</th>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>How Found</th>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Joined</th>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Vouched By</th>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Last Active</th>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Posts</th>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Role</th>
                  <th style={{ padding: '.5rem .75rem', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0
                  ? <tr><td colSpan={9} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)' }}>No users match your search.</td></tr>
                  : displayed.map(u => <UserRow key={u.id} u={u} />)
                }
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
                            onClick={() => restoreUser(u)}>
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

        {/* Profile side panel */}
        {profilePanel && (
          <UserProfilePanel
            panel={profilePanel}
            onClose={() => setProfilePanel(null)}
          />
        )}
      </div>
    </div>
  );
}

function UserProfilePanel({ panel, onClose }) {
  const { loading, err, data, username } = panel;

  return (
    <aside style={{
      width: 340, flexShrink: 0, border: '1px solid var(--border)', borderRadius: 8,
      background: 'var(--surface)', padding: '1rem', fontSize: '.85rem',
      position: 'sticky', top: '1rem', maxHeight: 'calc(100vh - 6rem)',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
        <strong style={{ fontSize: '.95rem' }}>@{username}</strong>
        <button className="btn btn-sm btn-ghost" onClick={onClose} style={{ fontSize: '1rem', lineHeight: 1 }}>✕</button>
      </div>

      {loading && <div className="spinner" />}
      {err && <p className="error-msg">{err}</p>}

      {data && (() => {
        const u = data.user;
        return (
          <>
            {u.avatar_url && (
              <img src={u.avatar_url} alt={u.username}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', marginBottom: '.75rem' }} />
            )}

            {/* Identity */}
            <section style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginBottom: '.5rem' }}>
                {u.founding_member && <span style={{ fontSize: '.65rem', background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green)', padding: '.1rem .35rem', borderRadius: 99, fontWeight: 700 }}>⬡ Founding</span>}
                {u.verified && <span style={{ fontSize: '.65rem', background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9', padding: '.1rem .35rem', borderRadius: 99, fontWeight: 700 }}>✓ Verified</span>}
                {u.covenant_agreed && <span style={{ fontSize: '.65rem', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', padding: '.1rem .35rem', borderRadius: 99, fontWeight: 700 }}>✓ Covenant</span>}
                {u.is_veteran && <span style={{ fontSize: '.65rem', background: '#fce4ec', color: '#c62828', border: '1px solid #ef9a9a', padding: '.1rem .35rem', borderRadius: 99, fontWeight: 700 }}>Veteran</span>}
                <span className={`role-badge role-${u.role}`} style={{ fontSize: '.65rem' }}>{u.role}</span>
              </div>
              <div style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                {u.location && <div>📍 {u.location}</div>}
                {u.how_found && <div>🔎 {u.how_found}</div>}
                <div>📅 Joined {new Date(u.created_at).toLocaleDateString()}</div>
                <div>⏱ Last active {new Date(u.last_active).toLocaleDateString()}</div>
                {u.inviter_username && <div>🤝 Vouched by <strong>@{u.inviter_username}</strong></div>}
              </div>
            </section>

            {/* Bio */}
            {u.bio && (
              <section style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: '.35rem' }}>Bio</h4>
                <p style={{ margin: 0, color: 'var(--text)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{u.bio}</p>
              </section>
            )}

            {/* Vouching chain */}
            {data.vouch_chain.length > 1 && (
              <section style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: '.35rem' }}>Vouching Chain</h4>
                <ol style={{ margin: 0, padding: '0 0 0 1.1rem', lineHeight: 1.8 }}>
                  {data.vouch_chain.map((node, i) => (
                    <li key={node.id} style={{ color: i === 0 ? 'var(--text)' : 'var(--muted)' }}>
                      <span style={{ fontWeight: i === 0 ? 700 : 400 }}>@{node.username}</span>
                      {i === 0 && <span style={{ color: 'var(--muted)', fontSize: '.75rem' }}> (this user)</span>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Circles */}
            {data.circles.length > 0 && (
              <section style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: '.35rem' }}>Circles ({data.circles.length})</h4>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {data.circles.map(c => (
                    <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '.2rem 0', borderBottom: '1px solid var(--border)' }}>
                      <span>{c.name}</span>
                      <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{c.role}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Recent posts */}
            {data.posts.length > 0 && (
              <section>
                <h4 style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: '.35rem' }}>Recent Posts ({data.posts.length})</h4>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {data.posts.map(p => (
                    <li key={p.id} style={{ padding: '.3rem 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 600, fontSize: '.82rem' }}>
                        {p.title || <span style={{ fontStyle: 'italic', color: 'var(--muted)' }}>[no title]</span>}
                      </div>
                      <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                        {p.type} · {new Date(p.created_at).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.circles.length === 0 && data.posts.length === 0 && (
              <p style={{ color: 'var(--muted)', fontStyle: 'italic', margin: 0 }}>No circles or posts yet.</p>
            )}
          </>
        );
      })()}
    </aside>
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

// ── Feedback tab button with new-count badge ──────────────────────────────────

function FeedbackTabButton({ active, onClick, token }) {
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    api.getAdminFeedback(token)
      .then(items => setNewCount(items.filter(i => i.status === 'new').length))
      .catch(() => {});
  }, [token]);

  return (
    <button className={`tab-btn${active ? ' active' : ''}`} onClick={onClick} style={{ position: 'relative' }}>
      Feedback
      {newCount > 0 && (
        <span style={{
          marginLeft: '.35rem',
          fontSize: '.65rem', fontWeight: 700,
          background: 'var(--red)', color: '#fff',
          borderRadius: 99, padding: '.1rem .38rem',
          verticalAlign: 'middle',
        }}>{newCount}</span>
      )}
    </button>
  );
}

// ── Feedback Tab ──────────────────────────────────────────────────────────────

const FEEDBACK_TYPE_LABELS = {
  bug_report:         'Bug Report',
  feature_suggestion: 'Feature Suggestion',
  content_issue:      'Content Issue',
  general_feedback:   'General Feedback',
  other:              'Other',
};

const FEEDBACK_TYPE_COLORS = {
  bug_report:         { bg: '#fce8e8', color: '#b52424', border: '#b52424' },
  feature_suggestion: { bg: '#e4edf8', color: '#1a52a0', border: '#1a52a0' },
  content_issue:      { bg: '#fdf2e3', color: '#b86b10', border: '#b86b10' },
  general_feedback:   { bg: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green)' },
  other:              { bg: 'var(--surface)', color: 'var(--muted)', border: 'var(--border)' },
};

const STATUS_OPTIONS = ['new', 'reviewing', 'in_progress', 'completed', 'wont_fix'];
const STATUS_LABELS  = {
  new:         'New',
  reviewing:   'Reviewing',
  in_progress: 'In Progress',
  completed:   'Completed',
  wont_fix:    "Won't Fix",
};

function FeedbackTab({ token }) {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState(null);
  const [notes,    setNotes]    = useState({});   // id -> string
  const [saving,   setSaving]   = useState({});   // id -> bool
  const [deleting, setDeleting] = useState({});   // id -> bool

  useEffect(() => {
    api.getAdminFeedback(token)
      .then(data => {
        setItems(data);
        // Pre-populate notes state from existing admin_notes
        const n = {};
        data.forEach(i => { n[i.id] = i.admin_notes || ''; });
        setNotes(n);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function updateStatus(id, status) {
    try {
      const updated = await api.updateFeedback(id, { status }, token);
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
    } catch (e) {
      alert(e.message);
    }
  }

  async function saveNotes(id) {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      const updated = await api.updateFeedback(id, { admin_notes: notes[id] }, token);
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this feedback submission?')) return;
    setDeleting(s => ({ ...s, [id]: true }));
    try {
      await api.deleteFeedback(id, token);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(s => ({ ...s, [id]: false }));
    }
  }

  if (loading) return <div className="spinner" />;
  if (err)     return <p className="error-msg">{err}</p>;

  const newCount = items.filter(i => i.status === 'new').length;

  return (
    <div>
      <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
        {items.length} submission{items.length !== 1 ? 's' : ''}
        {newCount > 0 && (
          <span style={{ marginLeft: '.5rem', color: 'var(--red)', fontWeight: 700 }}>
            · {newCount} new
          </span>
        )}
      </p>

      {items.length === 0 && <p className="empty">No feedback submissions yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map(item => {
          const typeStyle = FEEDBACK_TYPE_COLORS[item.type] || FEEDBACK_TYPE_COLORS.other;
          const typeLabel = FEEDBACK_TYPE_LABELS[item.type] || item.type;
          const noteVal   = notes[item.id] ?? item.admin_notes ?? '';
          const isSaving  = saving[item.id];
          const isDeleting = deleting[item.id];

          return (
            <div key={item.id} style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '1rem 1.1rem',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem', flexWrap: 'wrap', marginBottom: '.6rem' }}>
                <span style={{
                  fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
                  background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}`,
                  padding: '.15rem .55rem', borderRadius: 99, whiteSpace: 'nowrap',
                }}>{typeLabel}</span>

                <span style={{ fontSize: '.8rem', color: 'var(--muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>

                {/* Status badge */}
                <span style={{
                  fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em',
                  background: item.status === 'new' ? 'var(--green-bg)' : 'var(--surface)',
                  color: item.status === 'new' ? 'var(--green)' : 'var(--muted)',
                  border: `1px solid ${item.status === 'new' ? 'var(--green)' : 'var(--border)'}`,
                  padding: '.15rem .5rem', borderRadius: 99,
                }}>{STATUS_LABELS[item.status] || item.status}</span>
              </div>

              {/* Submitter */}
              <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: '.5rem' }}>
                {item.submitter_username
                  ? <>Submitted by <strong>@{item.submitter_username}</strong></>
                  : <em>Unknown user</em>
                }
              </p>

              {/* Description */}
              <p style={{ fontSize: '.9rem', color: 'var(--text)', lineHeight: 1.55, marginBottom: '.65rem', whiteSpace: 'pre-wrap' }}>
                {item.description}
              </p>

              {/* Screenshot link */}
              {item.screenshot_url && (
                <p style={{ marginBottom: '.65rem', fontSize: '.82rem' }}>
                  <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--green)', textDecoration: 'underline' }}>
                    View screenshot
                  </a>
                </p>
              )}

              {/* Controls row */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start', borderTop: '1px solid var(--border)', paddingTop: '.75rem', marginTop: '.5rem' }}>
                {/* Status dropdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                  <label style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>
                    Status
                  </label>
                  <select
                    className="form-select"
                    value={item.status}
                    onChange={e => updateStatus(item.id, e.target.value)}
                    style={{ fontSize: '.82rem', padding: '.25rem .5rem' }}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                {/* Admin notes */}
                <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                  <label style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>
                    Admin Notes
                  </label>
                  <div style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start' }}>
                    <textarea
                      className="form-textarea"
                      value={noteVal}
                      onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                      rows={2}
                      placeholder="Internal notes or user-facing update…"
                      style={{ flex: 1, fontSize: '.82rem', padding: '.3rem .5rem', resize: 'vertical' }}
                    />
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => saveNotes(item.id)}
                      disabled={isSaving}
                      style={{ whiteSpace: 'nowrap', marginTop: '2px' }}
                    >
                      {isSaving ? '…' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Delete */}
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(item.id)}
                  disabled={isDeleting}
                  style={{ alignSelf: 'flex-end' }}
                >
                  {isDeleting ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Copyright Claims tab ──────────────────────────────────────────────────────

function CopyrightClaimsTab({ token }) {
  const [claims, setClaims] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('claims');
  const [updating, setUpdating] = useState('');
  const [notes, setNotes] = useState({});

  async function load() {
    setLoading(true);
    try {
      const [c, f] = await Promise.all([
        api.getCopyrightClaims(statusFilter, token),
        api.getCopyrightFlagged(token),
      ]);
      setClaims(c);
      setFlagged(f);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function handleStatus(claimId, status) {
    setUpdating(claimId + status);
    try {
      await api.updateCopyrightClaim(claimId, { status, admin_notes: notes[claimId] }, token);
      await load();
    } catch (e) { alert(e.message); }
    finally { setUpdating(''); }
  }

  async function handleCounterNotice(claimId, decision) {
    setUpdating(claimId + decision);
    try {
      await api.actOnCounterNotice(claimId, decision, token);
      await load();
    } catch (e) { alert(e.message); }
    finally { setUpdating(''); }
  }

  const STATUS_COLORS = {
    pending:      '#f59e0b',
    under_review: '#3b82f6',
    removed:      '#ef4444',
    dismissed:    '#6b7280',
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="tabs" style={{ flexShrink: 0 }}>
          <button className={`tab-btn${activeTab === 'claims' ? ' active' : ''}`} onClick={() => setActiveTab('claims')}>
            Claims ({claims.length})
          </button>
          <button className={`tab-btn${activeTab === 'flagged' ? ' active' : ''}`} onClick={() => setActiveTab('flagged')}>
            Auto-Flagged ({flagged.length})
          </button>
        </div>
        {activeTab === 'claims' && (
          <select className="input" style={{ maxWidth: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="removed">Removed</option>
            <option value="dismissed">Dismissed</option>
          </select>
        )}
      </div>

      {loading && <div className="spinner" style={{ margin: '2rem auto' }} />}

      {activeTab === 'claims' && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {claims.length === 0 && <p className="empty">No copyright claims.</p>}
          {claims.map(c => (
            <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '.75rem' }}>
                <span style={{ fontWeight: 700 }}>Work: "{c.work_title}"</span>
                <span style={{ color: STATUS_COLORS[c.status] || '#888', fontWeight: 600, fontSize: '.82rem', textTransform: 'uppercase' }}>{c.status}</span>
                {c.counter_notice_status !== 'none' && (
                  <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '.78rem', padding: '.1rem .45rem', borderRadius: 4 }}>
                    Counter-notice: {c.counter_notice_status}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '.75rem' }}>
                <div><strong>Maker:</strong> {c.maker_name} (@{c.maker_username})</div>
                <div><strong>Claimant:</strong> {c.claimant_name} &lt;{c.claimant_email}&gt;</div>
                <div><strong>Claimed work:</strong> {c.original_work_desc}</div>
                <div><strong>Filed:</strong> {new Date(c.created_at).toLocaleDateString()}</div>
                {c.admin_notes && <div><strong>Admin notes:</strong> {c.admin_notes}</div>}
              </div>

              {c.counter_notice_text && (
                <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 6, padding: '.75rem', marginBottom: '.75rem', fontSize: '.85rem' }}>
                  <strong>Counter-notice:</strong> {c.counter_notice_text}
                  {c.counter_notice_status === 'received' && (
                    <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => handleCounterNotice(c.id, 'accepted')} disabled={!!updating}>Accept (Republish)</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleCounterNotice(c.id, 'rejected')} disabled={!!updating}>Reject</button>
                    </div>
                  )}
                </div>
              )}

              <textarea
                className="input"
                placeholder="Admin notes…"
                rows={2}
                style={{ width: '100%', marginBottom: '.5rem', fontSize: '.85rem' }}
                value={notes[c.id] || c.admin_notes || ''}
                onChange={e => setNotes(n => ({ ...n, [c.id]: e.target.value }))}
              />

              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                {c.status !== 'under_review' && (
                  <button className="btn btn-sm btn-outline" disabled={!!updating} onClick={() => handleStatus(c.id, 'under_review')}>Mark Under Review</button>
                )}
                {c.status !== 'removed' && (
                  <button className="btn btn-sm btn-danger" disabled={!!updating} onClick={() => handleStatus(c.id, 'removed')}>Remove Content</button>
                )}
                {c.status !== 'dismissed' && (
                  <button className="btn btn-sm btn-ghost" disabled={!!updating} onClick={() => handleStatus(c.id, 'dismissed')}>Dismiss Claim</button>
                )}
                {c.r2_url && (
                  <a href={c.r2_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">View Work</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'flagged' && !loading && (
        <div>
          <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: '1rem' }}>
            These works were automatically flagged because their title matches a known copyrighted work. Review before keeping or removing.
          </p>
          {flagged.length === 0 && <p className="empty">No auto-flagged works.</p>}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '.5rem' }}>Work</th>
                <th style={{ padding: '.5rem' }}>Maker</th>
                <th style={{ padding: '.5rem' }}>Type</th>
                <th style={{ padding: '.5rem' }}>Uploaded</th>
                <th style={{ padding: '.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {flagged.map(w => (
                <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '.5rem' }}>{w.title}</td>
                  <td style={{ padding: '.5rem' }}>{w.maker_name}</td>
                  <td style={{ padding: '.5rem' }}>{w.work_type}</td>
                  <td style={{ padding: '.5rem' }}>{new Date(w.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '.5rem' }}>
                    <a href={`/makers/works/${w.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline" style={{ marginRight: '.35rem' }}>View</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
