import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Nav({ onAuthOpen }) {
  const { user, logout } = useAuth();
  const isMod = user?.role === 'moderator' || user?.role === 'admin';

  return (
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
              <Link to={`/profile/${user.id}`} className="nav-username">{user.username}</Link>
              <button className="btn btn-ghost btn-sm" onClick={logout}>Sign Out</button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onAuthOpen}>Sign In</button>
          )}
        </div>
      </div>
    </nav>
  );
}
