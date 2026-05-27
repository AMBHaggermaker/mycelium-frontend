import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import { getSocket } from '../socket';

export default function Messages({ onRequireAuth }) {
  const { user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeUserId, setActiveUserId] = useState(searchParams.get('with') || null);
  const [loading, setLoading] = useState(true);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try { setConversations(await api.getConversations(token)); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (!user) { onRequireAuth?.(); return; }
    loadConversations();
  }, [user, loadConversations]);

  // Socket: listen for new DMs to refresh conversation list
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    function onDmReceived() { loadConversations(); }
    socket.on('dm_received', onDmReceived);
    socket.on('dm_sent', onDmReceived);
    return () => { socket.off('dm_received', onDmReceived); socket.off('dm_sent', onDmReceived); };
  }, [token, loadConversations]);

  function openConversation(userId) {
    setActiveUserId(userId);
    setShowNewMsg(false);
    navigate(`/messages?with=${userId}`, { replace: true });
  }

  if (!user) return null;

  const showList  = !isMobile || !activeUserId;
  const showThread = !isMobile || !!activeUserId;

  return (
    <div className="messages-layout">
      {showNewMsg && (
        <NewMessageSearch token={token} onSelect={openConversation} onClose={() => setShowNewMsg(false)} />
      )}

      {showList && (
        <div className="messages-sidebar">
          <div className="messages-sidebar-header">
            <h2 className="messages-sidebar-title">Messages</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewMsg(true)}>
              + New
            </button>
          </div>

          {loading ? <div className="spinner" style={{ margin: '1rem auto' }} /> : (
            conversations.length === 0 ? (
              <div className="messages-empty-state">
                <p className="messages-empty">No conversations yet.</p>
                <button className="btn btn-primary" onClick={() => setShowNewMsg(true)}>
                  + New Message
                </button>
              </div>
            ) : (
              <ul className="messages-convo-list">
                {conversations.map(c => (
                  <li key={c.other_user_id}
                    className={'messages-convo-item' + (activeUserId === c.other_user_id ? ' active' : '')}
                    onClick={() => openConversation(c.other_user_id)}
                  >
                    <div className="messages-convo-username">
                      {c.other_username}
                      {c.other_verified && <span className="messages-verified-badge">✓</span>}
                    </div>
                    <div className="messages-convo-preview">{c.last_message}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="messages-convo-time">
                        {formatRelativeTime(c.last_message_at)}
                      </span>
                      {c.unread_count > 0 && (
                        <span className="messages-unread-badge">{c.unread_count}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      )}

      {showThread && (
        <div className="messages-thread-pane">
          {activeUserId ? (
            <ThreadPanel
              userId={activeUserId}
              token={token}
              currentUser={user}
              onBack={() => { setActiveUserId(null); navigate('/messages', { replace: true }); }}
              onConvoUpdate={loadConversations}
              isMobile={isMobile}
            />
          ) : (
            <div className="messages-thread-empty">
              <p style={{ color: 'var(--muted)', marginBottom: '1.25rem' }}>
                Select a conversation or start a new one
              </p>
              <button className="btn btn-primary" onClick={() => setShowNewMsg(true)}>
                + New Message
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ThreadPanel({ userId, token, currentUser, onBack, onConvoUpdate, isMobile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.getDMThread(userId, token)); onConvoUpdate(); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [userId, token]);

  useEffect(() => { load(); }, [load]);

  // Socket: receive new DMs in real time
  useEffect(() => {
    const socket = getSocket(token);
    function onDmReceived(msg) {
      if (
        (msg.sender_id === userId && msg.recipient_id === currentUser.id) ||
        (msg.sender_id === currentUser.id && msg.recipient_id === userId)
      ) {
        setData(d => d ? { ...d, messages: [...d.messages, msg] } : d);
        onConvoUpdate();
      }
    }
    socket.on('dm_received', onDmReceived);
    socket.on('dm_sent',     onDmReceived);
    return () => { socket.off('dm_received', onDmReceived); socket.off('dm_sent', onDmReceived); };
  }, [userId, currentUser.id, token, onConvoUpdate]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages?.length]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true); setErr(null);
    try {
      const msg = await api.sendMessage(userId, { content: message.trim() }, token);
      setData(d => d ? { ...d, messages: [...d.messages, { ...msg, sender_username: currentUser.username }] } : d);
      setMessage('');
      onConvoUpdate();
    } catch (e) { setErr(e.message); }
    finally { setSending(false); }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); }
  }

  if (loading) return <div className="spinner" style={{ margin: '2rem auto' }} />;
  if (!data) return <p className="error-msg">{err || 'Could not load thread'}</p>;

  const { other_user, messages, is_blocked } = data;

  return (
    <div className="messages-thread">
      <div className="messages-thread-header">
        {isMobile && (
          <button className="btn btn-ghost btn-sm" style={{ marginRight: '.5rem' }} onClick={onBack}>
            ← Back
          </button>
        )}
        <div>
          <strong>{other_user.username}</strong>
          {other_user.verified && <span className="messages-verified-badge" style={{ marginLeft: '.3rem' }}>✓</span>}
        </div>
        <BlockReportMenu otherUserId={userId} token={token} isBlocked={is_blocked} onUpdate={load} />
      </div>

      <div className="messages-privacy-notice">
        Messages on Mycelium are private from other members. Platform administrators may access message logs when investigating documented reports of abuse or harassment. This is stated in the Mycelium Covenant. Only verified members can initiate new conversations. Unverified members can only reply to messages they receive.
      </div>

      <div className="messages-scroll-area">
        {messages.length === 0 ? (
          <p className="messages-empty" style={{ textAlign: 'center', marginTop: '2rem' }}>
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map(msg => {
            const isOwn = msg.sender_id === currentUser.id;
            return (
              <div key={msg.id} className={'message-bubble-row' + (isOwn ? ' own' : '')}>
                <div className={'message-bubble' + (isOwn ? ' own' : '')}>
                  <div className="message-text">{msg.content}</div>
                  <div className="message-time">{formatRelativeTime(msg.created_at)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {is_blocked ? (
        <div className="messages-blocked-notice">
          Messaging is blocked between you and this user.
        </div>
      ) : (
        <form className="messages-input-row" onSubmit={sendMessage}>
          <textarea
            className="messages-input"
            placeholder="Type a message…"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={sending}
          />
          <button className="btn btn-primary" disabled={sending || !message.trim()}>
            {sending ? '…' : 'Send'}
          </button>
        </form>
      )}
      {err && <p className="form-error" style={{ padding: '0 1rem .5rem' }}>{err}</p>}
    </div>
  );
}

function BlockReportMenu({ otherUserId, token, isBlocked, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);

  async function handleBlock() {
    if (!confirm(isBlocked ? 'Unblock this user?' : 'Block this user? They will not be able to send you messages.')) return;
    setWorking(true);
    try {
      if (isBlocked) await api.unblockUser(otherUserId, token);
      else await api.blockUser(otherUserId, token);
      onUpdate();
    } catch (e) { alert(e.message); }
    finally { setWorking(false); setOpen(false); }
  }

  return (
    <div style={{ position: 'relative', marginLeft: 'auto' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)} aria-label="More options">⋯</button>
      {open && (
        <div className="messages-menu-popup" onClick={() => setOpen(false)}>
          <button className="messages-menu-item" onClick={handleBlock} disabled={working}>
            {isBlocked ? 'Unblock User' : 'Block User'}
          </button>
        </div>
      )}
    </div>
  );
}

function NewMessageSearch({ token, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.search({ q: query.trim(), type: 'users', limit: 8 });
        setResults((res.users || []).filter(u => u.verified));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <span className="modal-title">New Message</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <p style={{ fontSize: '.85rem', color: 'var(--muted)', margin: 0 }}>
            Search for a verified member by username or display name.
          </p>
          <input className="form-input" autoFocus
            placeholder="Search verified members…"
            value={query} onChange={e => setQuery(e.target.value)} />
          {searching && <div className="spinner" style={{ margin: '.25rem auto', width: '20px', height: '20px' }} />}
          {results.length > 0 && (
            <ul className="messages-search-results">
              {results.map(u => (
                <li key={u.id} className="messages-search-result" onClick={() => onSelect(u.id)}>
                  <span style={{ fontWeight: 600 }}>{u.username}</span>
                  {u.founding_member
                    ? <span style={{ marginLeft: '.4rem', fontSize: '.75rem', color: 'var(--green)' }}>⬡ Founding</span>
                    : <span style={{ marginLeft: '.4rem', fontSize: '.75rem', color: 'var(--blue)' }}>✓ Verified</span>
                  }
                </li>
              ))}
            </ul>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <p style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
              No verified members found matching that name.
            </p>
          )}
          {!query.trim() && (
            <p style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
              Only verified members can receive new messages.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}
