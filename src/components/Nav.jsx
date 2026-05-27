import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

const BOTTOM_TABS = [
  { to: '/',        end: true, icon: '⚡', label: 'Hotlight' },
  { to: '/commons',            icon: '⬡',  label: 'Commons'  },
  { to: '/chat',               icon: '💬', label: 'Chat'     },
  { to: '/watch',              icon: '◉',  label: 'Watch'    },
];

export default function Nav({ onAuthOpen, onInviteOpen }) {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const isMod = user?.role === 'moderator' || user?.role === 'admin';
  const [meOpen, setMeOpen] = useState(false);
  const [unreadDMs, setUnreadDMs] = useState(0);

  // Poll unread DM count
  useEffect(() => {
    if (!user || !token) { setUnreadDMs(0); return; }
    let cancelled = false;
    function fetchUnread() {
      api.getUnreadCount(token)
        .then(res => { if (!cancelled) setUnreadDMs(res.count || 0); })
        .catch(() => {});
    }
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [user, token]);

  function handleLogout() {
    setMeOpen(false);
    logout();
  }

  function handleNavigate(to) {
    setMeOpen(false);
    navigate(to);
  }

  return (
    <>
      {/* Desktop / header nav */}
      <nav className="nav">
        <div className="container nav-inner">
          <Link to="/" className="nav-logo">⬡ Mycelium</Link>
          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              Hotlight
            </NavLink>
            <NavLink to="/commons" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              Commons
            </NavLink>
            <NavLink to="/chat" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              Chat
            </NavLink>
            <a href="https://lostfound.unprecedentedtimes.org" className="nav-link" target="_blank" rel="noopener noreferrer">
              Lost &amp; Found
            </a>
            <NavLink to="/watch" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              Watch
            </NavLink>
            <NavLink to="/advocate" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              Advocate
            </NavLink>
            <NavLink to="/merch" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              Merch
            </NavLink>
            <a href="https://unprecedentedtimes.org" className="nav-link" target="_blank" rel="noopener noreferrer">
              Newsletter
            </a>
            {isMod && (
              <NavLink to="/admin" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                Admin
              </NavLink>
            )}
          </div>
          <div className="nav-auth">
            {user ? (
              <>
                <NavLink to="/messages" className={({ isActive }) => 'nav-link nav-messages-link' + (isActive ? ' active' : '')}>
                  Messages{unreadDMs > 0 && <span className="nav-unread-badge">{unreadDMs}</span>}
                </NavLink>
                <button className="btn btn-outline btn-sm nav-invite-btn" onClick={onInviteOpen}>
                  + Invite
                </button>
                <Link to={`/profile/${user.id}`} className="nav-username">{user.username}</Link>
                <Link to="/settings" className="btn btn-ghost btn-sm">Settings</Link>
                <button className="btn btn-ghost btn-sm" onClick={logout}>Sign Out</button>
              </>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={onAuthOpen}>Sign In</button>
            )}
          </div>
          {/* Mobile: auth in top nav */}
          <div className="nav-auth-mobile">
            {user ? (
              <Link to={`/profile/${user.id}`} className="nav-username" style={{ fontSize: '.85rem' }}>
                {user.username}
              </Link>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={onAuthOpen}>Sign In</button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="bottom-nav" aria-label="Main navigation">
        <div className="bottom-nav-inner">
          {BOTTOM_TABS.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => 'bottom-tab' + (isActive ? ' active' : '')}
            >
              <span className="bottom-tab-icon">{tab.icon}</span>
              <span className="bottom-tab-label">{tab.label}</span>
            </NavLink>
          ))}

          {/* Me tab */}
          {user ? (
            <button
              className={'bottom-tab' + (meOpen ? ' active' : '')}
              onClick={() => setMeOpen(o => !o)}
              aria-label="Account menu"
            >
              <span className="bottom-tab-icon" style={{ position: 'relative' }}>
                👤
                {unreadDMs > 0 && (
                  <span className="bottom-tab-unread-dot" aria-label={`${unreadDMs} unread messages`} />
                )}
              </span>
              <span className="bottom-tab-label">Me</span>
            </button>
          ) : (
            <button className="bottom-tab" onClick={onAuthOpen}>
              <span className="bottom-tab-icon">👤</span>
              <span className="bottom-tab-label">Sign In</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Me sheet */}
      {meOpen && (
        <div className="me-sheet-overlay" onClick={() => setMeOpen(false)}>
          <div className="me-sheet" onClick={e => e.stopPropagation()}>
            <div className="me-sheet-handle" />
            <div className="me-sheet-header">
              <span className="me-sheet-username">{user?.username}</span>
            </div>
            <nav className="me-sheet-nav">
              <button className="me-sheet-item" onClick={() => handleNavigate(`/profile/${user?.id}`)}>
                <span className="me-sheet-item-icon">⬡</span> My Profile
              </button>
              <button className="me-sheet-item" onClick={() => handleNavigate('/messages')}>
                <span className="me-sheet-item-icon">✉</span> Messages
                {unreadDMs > 0 && <span className="nav-unread-badge" style={{ marginLeft: '.5rem' }}>{unreadDMs}</span>}
              </button>
              <button className="me-sheet-item" onClick={() => handleNavigate('/advocate')}>
                <span className="me-sheet-item-icon">⚖</span> Advocate
              </button>
              <button className="me-sheet-item" onClick={() => handleNavigate('/settings')}>
                <span className="me-sheet-item-icon">⚙</span> Settings
              </button>
              <button className="me-sheet-item" onClick={() => { setMeOpen(false); onInviteOpen(); }}>
                <span className="me-sheet-item-icon">+</span> Invite Someone
              </button>
              <a
                className="me-sheet-item"
                href="https://lostfound.unprecedentedtimes.org"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMeOpen(false)}
              >
                <span className="me-sheet-item-icon">🔍</span> Lost &amp; Found
              </a>
              {isMod && (
                <button className="me-sheet-item" onClick={() => handleNavigate('/admin')}>
                  <span className="me-sheet-item-icon">🛡</span> Admin
                </button>
              )}
              <button className="me-sheet-item me-sheet-item--danger" onClick={handleLogout}>
                <span className="me-sheet-item-icon">↩</span> Sign Out
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
