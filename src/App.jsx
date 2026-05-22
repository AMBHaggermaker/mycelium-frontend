import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Feed from './pages/Feed';
import Commons from './pages/Commons';
import CirclePage from './pages/CirclePage';
import Profile from './pages/Profile';
import AuthModal from './components/AuthModal';
import { useAuth } from './auth';

export default function App() {
  const { ready } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  if (!ready) return <div className="spinner" style={{ marginTop: '6rem' }} />;

  return (
    <>
      <Nav onAuthOpen={() => setAuthOpen(true)} />
      <Routes>
        <Route path="/"            element={<Feed onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/commons"     element={<Commons onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/commons/:id" element={<CirclePage onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/profile/:id" element={<Profile />} />
      </Routes>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
