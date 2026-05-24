import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../auth';
import api from '../api';

const SOCKET_URL = 'https://mycelium.unprecedentedtimes.org';
const FIVE_MIN = 5 * 60 * 1000;

function fmt(date) {
  const d = new Date(date);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function slugify(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function Chat({ onRequireAuth }) {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const activeSlugRef = useRef(null);
  const prevSlugRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [activeSlug, setActiveSlug] = useState(null);
  const [messages, setMessages] = useState([]);
  const [roomCounts, setRoomCounts] = useState({});
  const [lastActivity, setLastActivity] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [composer, setComposer] = useState('');
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Keep ref in sync for socket handler closures
  useEffect(() => { activeSlugRef.current = activeSlug; }, [activeSlug]);

  // Connect socket
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('chat_message', (msg) => {
      setLastActivity(prev => ({ ...prev, [msg.room_slug]: msg.created_at }));
      if (msg.room_slug === activeSlugRef.current) {
        setMessages(prev => [...prev, msg]);
      }
    });

    socket.on('room_list_update', ({ counts, lastActivity: la }) => {
      setRoomCounts(counts);
      setLastActivity(la);
    });

    socket.on('room_presence', ({ slug, users }) => {
      if (slug === activeSlugRef.current) setOnlineUsers(users);
    });

    return () => socket.disconnect();
  }, [token]);

  // Load rooms on mount
  useEffect(() => {
    api.getChatRooms().then(data => {
      setRooms(data);
      // Seed lastActivity from DB timestamps
      const la = {};
      data.forEach(r => { if (r.last_message_at) la[r.slug] = r.last_message_at; });
      setLastActivity(prev => ({ ...la, ...prev }));
      if (!activeSlugRef.current && data.length) {
        setActiveSlug((data.find(r => r.pinned) || data[0]).slug);
      }
    }).catch(console.error);
  }, []);

  // Join/leave room and load messages
  useEffect(() => {
    const socket = socketRef.current;
    if (prevSlugRef.current && socket) socket.emit('leave_room', prevSlugRef.current);
    setOnlineUsers([]);

    if (activeSlug) {
      if (socket) socket.emit('join_room', activeSlug);
      setLoadingMsgs(true);
      api.getChatMessages(activeSlug)
        .then(setMessages)
        .catch(() => setMessages([]))
        .finally(() => setLoadingMsgs(false));
    }
    prevSlugRef.current = activeSlug;
  }, [activeSlug]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    if (!composer.trim() || !activeSlug) return;
    if (!user) { onRequireAuth?.(); return; }
    socketRef.current?.emit('chat_message', { room_slug: activeSlug, content: composer });
    setComposer('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const activeRoom = rooms.find(r => r.slug === activeSlug);

  function isRecentlyActive(slug) {
    const t = lastActivity[slug];
    return t ? Date.now() - new Date(t).getTime() < FIVE_MIN : false;
  }

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <span className="chat-sidebar-title">Rooms</span>
          {user && (
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '1.1rem', lineHeight: 1 }}
              onClick={() => setShowNewRoom(true)} title="New room">+</button>
          )}
        </div>
        <div className="chat-room-list">
          {rooms.map(room => (
            <button key={room.slug}
              className={`chat-room-item${activeSlug === room.slug ? ' active' : ''}`}
              onClick={() => setActiveSlug(room.slug)}>
              <div className="chat-room-row">
                {isRecentlyActive(room.slug) && <span className="activity-dot" />}
                <span className="chat-room-name">{room.name}</span>
                {(roomCounts[room.slug] ?? 0) > 0 && (
                  <span className="chat-room-count">{roomCounts[room.slug]}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="chat-main">
        {activeRoom ? (
          <>
            <div className="chat-header">
              <div>
                <span className="chat-room-title">{activeRoom.name}</span>
                {activeRoom.description && (
                  <span className="chat-room-desc"> — {activeRoom.description}</span>
                )}
              </div>
              {onlineUsers.length > 0 && (
                <div className="chat-online">
                  <span className="online-dot" />
                  <span className="online-label">{onlineUsers.length} online:</span>
                  <div className="online-list">
                    {onlineUsers.map(u => (
                      <span key={u.id} className="online-user">{u.username}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="chat-messages">
              {loadingMsgs ? (
                <div className="spinner" />
              ) : messages.length === 0 ? (
                <p className="empty">No messages yet — say hello!</p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="chat-msg">
                    <div className="chat-msg-header">
                      <span className="chat-msg-author">{msg.username}</span>
                      <span className="chat-msg-time">{fmt(msg.created_at)}</span>
                    </div>
                    <div className="chat-msg-body">{msg.content}</div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-composer">
              {user ? (
                <>
                  <textarea
                    className="chat-input"
                    placeholder={`Message #${activeRoom.name}… (Enter to send, Shift+Enter for newline)`}
                    value={composer}
                    onChange={e => setComposer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                  />
                  <button className="btn btn-primary" onClick={sendMessage}
                    disabled={!composer.trim()}>
                    Send
                  </button>
                </>
              ) : (
                <div className="chat-signin-prompt">
                  <button className="btn btn-primary" onClick={onRequireAuth}>
                    Sign in to chat
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="chat-empty">
            <p>Select a room to start chatting</p>
          </div>
        )}
      </div>

      {showNewRoom && (
        <NewRoomModal
          token={token}
          onClose={() => setShowNewRoom(false)}
          onCreated={room => {
            setRooms(prev => [...prev, room]);
            setShowNewRoom(false);
            setActiveSlug(room.slug);
          }}
        />
      )}
    </div>
  );
}

function NewRoomModal({ token, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const room = await api.createChatRoom({ name, description }, token);
      onCreated(room);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const previewSlug = slugify(name);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">New Room</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Room Name *</label>
            <input className="form-input" required value={name}
              onChange={e => setName(e.target.value)} />
            {previewSlug && (
              <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>slug: #{previewSlug}</span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={description}
              onChange={e => setDescription(e.target.value)} />
          </div>
          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? '…' : 'Create Room'}
          </button>
        </form>
      </div>
    </div>
  );
}
