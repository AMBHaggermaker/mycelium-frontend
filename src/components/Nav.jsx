import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../auth';

const BOTTOM_TABS = [
  { to: '/',        end: true, icon: '⚡', label: 'Hotlight',     internal: true },
  { to: '/commons',            icon: '⬡',  label: 'Commons',      internal: true },
  { to: '/chat',               icon: '💬', label: 'Chat',         internal: true },
  { to: '/watch',              icon: '◉',  label: 'Watch',        internal: true },
  { href: 'https://lostfound.unprecedentedtimes.org', icon: '🔍', label: 'Lost & Found' },
];

export default function Nav({ onAuthOpen, onInviteOpen }) {
  const { user, logout } = useAuth();
  const isMod = user?.role === 'moderator' || user?.role === 'admin';

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
                <button className="btn btn-outline btn-sm nav-invite-btn" onClick={onInviteOpen}>
                  + Invite
                </button>
                <Link to={`/profile/${user.id}`} className="nav-username">{user.username}</Link>
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
          {BOTTOM_TABS.map(tab =>
            tab.internal ? (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => 'bottom-tab' + (isActive ? ' active' : '')}
              >
                <span className="bottom-tab-icon">{tab.icon}</span>
                <span className="bottom-tab-label">{tab.label}</span>
              </NavLink>
            ) : (
              <a
                key={tab.href}
                href={tab.href}
                className="bottom-tab"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="bottom-tab-icon">{tab.icon}</span>
                <span className="bottom-tab-label">{tab.label}</span>
              </a>
            )
          )}
        </div>
      </nav>
    </>
  );
}
