import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import { usePresence, STATUS_LABELS } from '../contexts/PresenceContext';
import PresenceDot from './PresenceDot';

const BOTTOM_TABS = [
  { to: '/',        end: true, icon: '⚡', label: 'Hotlight' },
  { to: '/commons',            icon: '⬡',  label: 'Commons'  },
  { to: '/chat',               icon: '💬', label: 'Chat'     },
  { to: '/watch',              icon: '◉',  label: 'Watch'    },
];

const MORE_LINKS = [
  { to: '/businesses', label: 'Businesses', icon: '🏢' },
  { to: '/learn',      label: 'Learn',      icon: '📚' },
  { to: '/makers',     label: 'Makers',     icon: '⚒' },
  { to: '/advocate',   label: 'Advocate',   icon: '⚖' },
  { to: '/legislature', label: 'Legislature', icon: '🏛️' },
  { href: 'https://unprecedentedtimes.org/the-mycelium-covenant', label: 'Covenant', icon: '⬡', external: true, covenant: true },
  { to: '/merch',      label: 'Merch',      icon: '🛍' },
  { href: 'https://unprecedentedtimes.org', label: 'Newsletter', icon: '📰', external: true },
];

export default function Nav({ onAuthOpen, onInviteOpen }) {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const isMod = user?.role === 'moderator' || user?.role === 'admin';
  const [meOpen, setMeOpen] = useState(false);
  const [unreadDMs, setUnreadDMs] = useState(0);
  const { myStatus, setMyStatus } = usePresence();
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const moreRef = useRef(null);
  const userRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
    setUserMenuOpen(false);
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

          {/* Primary nav links */}
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
            <NavLink to="/watch" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              Watch
            </NavLink>
            <a href="https://lostfound.unprecedentedtimes.org" className="nav-link" target="_blank" rel="noopener noreferrer">
              Lost &amp; Found
            </a>

            {/* More dropdown */}
            <div className="nav-more-wrap" ref={moreRef}>
              <button
                className={'nav-link nav-more-btn' + (moreOpen ? ' active' : '')}
                onClick={() => setMoreOpen(v => !v)}
                aria-expanded={moreOpen}
              >
                More <span className="nav-more-chevron">▾</span>
              </button>
              {moreOpen && (
                <div className="nav-more-dropdown">
                  {MORE_LINKS.map(item =>
                    item.external ? (
                      <a
                        key={item.label}
                        href={item.href}
                        className={'nav-more-item' + (item.covenant ? ' nav-more-item--covenant' : '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMoreOpen(false)}
                      >
                        <span className="nav-more-icon">{item.icon}</span>
                        {item.label}
                      </a>
                    ) : (
                      <NavLink
                        key={item.label}
                        to={item.to}
                        className={({ isActive }) => 'nav-more-item' + (isActive ? ' active' : '')}
                        onClick={() => setMoreOpen(false)}
                      >
                        <span className="nav-more-icon">{item.icon}</span>
                        {item.label}
                      </NavLink>
                    )
                  )}
                  {isMod && (
                    <NavLink
                      to="/admin"
                      className={({ isActive }) => 'nav-more-item' + (isActive ? ' active' : '')}
                      onClick={() => setMoreOpen(false)}
                    >
                      <span className="nav-more-icon">🛡</span>
                      Admin
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Auth area */}
          <div className="nav-auth">
            {user ? (
              <>
                <NavLink to="/messages" className={({ isActive }) => 'nav-link nav-messages-link' + (isActive ? ' active' : '')}>
                  Messages{unreadDMs > 0 && <span className="nav-unread-badge">{unreadDMs}</span>}
                </NavLink>
                <button className="btn btn-outline btn-sm nav-invite-btn" onClick={onInviteOpen}>
                  + Invite
                </button>

                {/* User dropdown */}
                <div className="nav-user-wrap" ref={userRef}>
                  <button
                    className={'nav-user-btn' + (userMenuOpen ? ' open' : '')}
                    onClick={() => setUserMenuOpen(v => !v)}
                    aria-expanded={userMenuOpen}
                  >
                    <PresenceDot status={myStatus} size={9} border="transparent" />
                    <span className="nav-username">{user.username}</span>
                    <span className="nav-user-chevron">▾</span>
                  </button>
                  {userMenuOpen && (
                    <div className="nav-user-dropdown">
                      <div className="nav-user-dropdown-section">
                        {Object.entries(STATUS_LABELS).map(([s, label]) => (
                          <button
                            key={s}
                            className={'nav-status-option' + (myStatus === s ? ' active' : '')}
                            onClick={() => setMyStatus(s)}
                          >
                            <PresenceDot
                              status={s === 'offline' ? null : s}
                              size={9}
                              border="transparent"
                              style={{ background: s === 'offline' ? '#d1d5db' : undefined }}
                            />
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="nav-user-dropdown-divider" />
                      <Link
                        to={`/profile/${user.username}`}
                        className="nav-user-dropdown-item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="nav-user-dropdown-item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <div className="nav-user-dropdown-divider" />
                      <button
                        className="nav-user-dropdown-item nav-user-dropdown-item--danger"
                        onClick={handleLogout}
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={onAuthOpen}>Sign In</button>
            )}
          </div>

          {/* Mobile: auth in top nav */}
          <div className="nav-auth-mobile">
            {user ? (
              <Link to={`/profile/${user.username}`} className="nav-username" style={{ fontSize: '.85rem' }}>
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
              <div className="me-sheet-status-row">
                {Object.entries(STATUS_LABELS).map(([s, label]) => (
                  <button
                    key={s}
                    className={'me-sheet-status-btn' + (myStatus === s ? ' active' : '')}
                    onClick={() => setMyStatus(s)}
                  >
                    <PresenceDot
                      status={s === 'offline' ? null : s}
                      size={8}
                      border="transparent"
                      style={{ background: s === 'offline' ? '#d1d5db' : undefined }}
                    />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <nav className="me-sheet-nav">
              <button className="me-sheet-item" onClick={() => handleNavigate(`/profile/${user?.username}`)}>
                <span className="me-sheet-item-icon">⬡</span> My Profile
              </button>
              <button className="me-sheet-item" onClick={() => handleNavigate('/messages')}>
                <span className="me-sheet-item-icon">✉</span> Messages
                {unreadDMs > 0 && <span className="nav-unread-badge" style={{ marginLeft: '.5rem' }}>{unreadDMs}</span>}
              </button>
              <button className="me-sheet-item" onClick={() => { setMeOpen(false); onInviteOpen(); }}>
                <span className="me-sheet-item-icon">+</span> Invite Someone
              </button>

              <div className="me-sheet-section-label">Explore</div>
              <button className="me-sheet-item" onClick={() => handleNavigate('/businesses')}>
                <span className="me-sheet-item-icon">🏢</span> Businesses
              </button>
              <button className="me-sheet-item" onClick={() => handleNavigate('/learn')}>
                <span className="me-sheet-item-icon">📚</span> Learn
              </button>
              <button className="me-sheet-item" onClick={() => handleNavigate('/makers')}>
                <span className="me-sheet-item-icon">⚒</span> Maker's Guild
              </button>
              <button className="me-sheet-item" onClick={() => handleNavigate('/advocate')}>
                <span className="me-sheet-item-icon">⚖</span> Advocate
              </button>
              <button className="me-sheet-item" onClick={() => handleNavigate('/legislature')}>
                <span className="me-sheet-item-icon">🏛️</span> Legislature
              </button>
              <button className="me-sheet-item" onClick={() => handleNavigate('/merch')}>
                <span className="me-sheet-item-icon">🛍</span> Merch
              </button>
              <a
                className="me-sheet-item"
                href="https://unprecedentedtimes.org"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMeOpen(false)}
              >
                <span className="me-sheet-item-icon">📰</span> Newsletter
              </a>
              <a
                className="me-sheet-item"
                href="https://lostfound.unprecedentedtimes.org"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMeOpen(false)}
              >
                <span className="me-sheet-item-icon">🔍</span> Lost &amp; Found
              </a>
              <a
                className="me-sheet-item me-sheet-item--covenant"
                href="https://unprecedentedtimes.org/the-mycelium-covenant"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMeOpen(false)}
              >
                <span className="me-sheet-item-icon">⬡</span> The Mycelium Covenant
              </a>

              <div className="me-sheet-section-label">Account</div>
              <button className="me-sheet-item" onClick={() => handleNavigate('/settings')}>
                <span className="me-sheet-item-icon">⚙</span> Settings
              </button>
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
