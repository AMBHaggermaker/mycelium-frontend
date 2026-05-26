import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Feed from './pages/Feed';
import Commons from './pages/Commons';
import CirclePage from './pages/CirclePage';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import Watch from './pages/Watch';
import Merch from './pages/Merch';
import InvitePage from './pages/InvitePage';
import Settings from './pages/Settings';
import EmailVerifyPage from './pages/EmailVerifyPage';
import AuthModal from './components/AuthModal';
import InviteModal from './components/InviteModal';
import { useAuth } from './auth';

export default function App() {
  const { ready } = useAuth();
  const [authOpen,   setAuthOpen]   = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  if (!ready) return <div className="spinner" style={{ marginTop: '6rem' }} />;

  return (
    <>
      <Nav onAuthOpen={() => setAuthOpen(true)} onInviteOpen={() => setInviteOpen(true)} />
      <Routes>
        <Route path="/"            element={<Feed onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/commons"     element={<Commons onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/commons/:id" element={<CirclePage onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/chat"        element={<Chat onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/admin"       element={<Admin />} />
        <Route path="/watch"       element={<Watch onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/merch"       element={<Merch />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/settings"     element={<Settings />} />
        <Route path="/verify-email" element={<EmailVerifyPage />} />
      </Routes>
      {authOpen   && <AuthModal onClose={() => setAuthOpen(false)} />}
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
    </>
  );
}
