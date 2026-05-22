import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import PostCard from '../components/PostCard';
import NewPostModal from '../components/NewPostModal';

export default function CirclePage({ onRequireAuth }) {
  const { id } = useParams();
  const { user, token } = useAuth();

  const [circle,  setCircle]  = useState(null);
  const [members, setMembers] = useState([]);
  const [posts,   setPosts]   = useState([]);
  const [threads, setThreads] = useState([]);
  const [thread,  setThread]  = useState(null);   // open thread
  const [msg,     setMsg]     = useState('');
  const [tab,     setTab]     = useState('posts');
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);
  const [membership, setMembership] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newThread, setNewThread] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');

  const isMember = !!membership;
  const isAdmin  = membership?.role === 'admin';

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    setLoading(true); setErr(null);
    try {
      const [c, m, p, t] = await Promise.all([
        api.getCircle(id),
        api.getCircleMembers(id),
        api.getCirclePosts(id, { status: 'active' }),
        api.getCircleThreads(id),
      ]);
      setCircle(c); setMembers(m); setPosts(p); setThreads(t);
      if (user) setMembership(m.find(x => x.id === user.id) ?? null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function joinLeave() {
    if (!user) { onRequireAuth?.(); return; }
    try {
      if (isMember) await api.leaveCircle(id, token);
      else          await api.joinCircle(id, token);
      loadAll();
    } catch (e) { alert(e.message); }
  }

  async function openThread(t) {
    const full = await api.getThread(t.id);
    setThread(full);
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!msg.trim()) return;
    try {
      await api.addMessage(thread.id, { content: msg.trim() }, token);
      setMsg('');
      const full = await api.getThread(thread.id);
      setThread(full);
    } catch (e) { alert(e.message); }
  }

  async function startThread(e) {
    e.preventDefault();
    if (!threadTitle.trim()) return;
    try {
      await api.createThread({ title: threadTitle.trim(), circle_id: id }, token);
      setThreadTitle(''); setNewThread(false);
      const t = await api.getCircleThreads(id);
      setThreads(t);
    } catch (e) { alert(e.message); }
  }

  if (loading) return <div className="page"><div className="container"><div className="spinner" /></div></div>;
  if (err)     return <div className="page"><div className="container"><p className="error-msg">{err}</p></div></div>;

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: '.75rem' }}>
          <Link to="/commons" style={{ fontSize: '.85rem', color: 'var(--muted)' }}>← Commons</Link>
        </div>

        <div className="circle-header">
          <div className="circle-header-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
              <h1 className="circle-header-title">{circle.name}</h1>
              {circle.is_private && <span className="badge badge-gray">Private</span>}
            </div>
            {circle.description && <p className="circle-header-desc">{circle.description}</p>}
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: '.4rem' }}>
              {circle.member_count} member{circle.member_count !== 1 ? 's' : ''}
              {circle.creator_username && ` · created by ${circle.creator_username}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
            {isMember && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ Post</button>
            )}
            <button
              className={`btn btn-sm ${isMember ? 'btn-outline' : 'btn-primary'}`}
              onClick={joinLeave}>
              {isMember ? (isAdmin ? 'Admin' : 'Leave') : 'Join'}
            </button>
          </div>
        </div>

        <div className="tabs">
          {['posts','threads','members'].map(t => (
            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`}
              onClick={() => { setTab(t); setThread(null); }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'members' && ` (${members.length})`}
            </button>
          ))}
        </div>

        {/* POSTS TAB */}
        {tab === 'posts' && (
          posts.length === 0
            ? <p className="empty">{isMember ? 'No posts yet. Add the first one!' : 'No posts yet.'}</p>
            : <div className="post-grid">
                {posts.map(p => (
                  <PostCard key={p.id} post={p} onRequireAuth={onRequireAuth} onReserved={loadAll} />
                ))}
              </div>
        )}

        {/* THREADS TAB */}
        {tab === 'threads' && (
          <>
            {thread ? (
              <div>
                <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}
                  onClick={() => setThread(null)}>← Back to threads</button>
                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{thread.title}</h3>
                <div className="message-list">
                  {thread.messages?.length === 0 && <p className="empty">No messages yet.</p>}
                  {thread.messages?.map(m => (
                    <div key={m.id} className="message-item">
                      <div className="message-header">
                        <Link to={`/profile/${m.user_id}`} className="message-author username-link">{m.username}</Link>
                        <span className="message-time">{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <p className="message-body">{m.content}</p>
                    </div>
                  ))}
                </div>
                {user && (
                  <form className="message-composer" onSubmit={sendMessage}>
                    <textarea className="form-textarea" placeholder="Write a message…"
                      value={msg} onChange={e => setMsg(e.target.value)} />
                    <button className="btn btn-primary btn-sm" type="submit">Send</button>
                  </form>
                )}
              </div>
            ) : (
              <>
                <div className="section-header">
                  <span />
                  {isMember && (
                    <button className="btn btn-outline btn-sm" onClick={() => setNewThread(v => !v)}>
                      {newThread ? 'Cancel' : '+ New Thread'}
                    </button>
                  )}
                </div>
                {newThread && (
                  <form onSubmit={startThread} style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
                    <input className="form-input" style={{ flex: 1 }} required
                      placeholder="Thread title…" value={threadTitle}
                      onChange={e => setThreadTitle(e.target.value)} autoFocus />
                    <button className="btn btn-primary btn-sm" type="submit">Start</button>
                  </form>
                )}
                {threads.length === 0
                  ? <p className="empty">No threads yet.</p>
                  : <div className="thread-list">
                      {threads.map(t => (
                        <div key={t.id} className="thread-row" onClick={() => openThread(t)}>
                          <div>
                            <p className="thread-title">{t.title}</p>
                            <p className="thread-meta">by {t.creator_username}</p>
                          </div>
                          <span className="thread-msgs">{t.message_count ?? 0} msgs →</span>
                        </div>
                      ))}
                    </div>
                }
              </>
            )}
          </>
        )}

        {/* MEMBERS TAB */}
        {tab === 'members' && (
          <div className="member-list">
            {members.map(m => (
              <div key={m.id} className="member-row">
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '.85rem', color: 'var(--green)', flexShrink: 0 }}>
                  {m.username[0].toUpperCase()}
                </div>
                <Link to={`/profile/${m.id}`} className="member-name username-link">{m.username}</Link>
                <span className="score">★ {parseFloat(m.reliability_score || 5).toFixed(1)}</span>
                {m.role === 'admin' && <span className="badge badge-green">Admin</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <NewPostModal defaultCircleId={id}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); loadAll(); }} />
      )}
    </div>
  );
}
