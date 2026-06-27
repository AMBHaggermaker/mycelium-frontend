import { useState, useEffect, Component } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Nav from './components/Nav';
import Feed from './pages/Feed';
import Commons from './pages/Commons';
import CirclePage from './pages/CirclePage';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import Watch from './pages/Watch';
import WatchWater  from './pages/WatchWater';
import WatchAir    from './pages/WatchAir';
import WatchSoil   from './pages/WatchSoil';
import WatchEnergy from './pages/WatchEnergy';
import Merch from './pages/Merch';
import InvitePage from './pages/InvitePage';
import Settings from './pages/Settings';
import ThemeSettings from './pages/ThemeSettings';
import EmailVerifyPage from './pages/EmailVerifyPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PostDetailPage from './pages/PostDetailPage';
import Advocate from './pages/Advocate';
import Messages from './pages/Messages';
import Covenant from './pages/Covenant';
import MyPosts from './pages/MyPosts';
import Businesses from './pages/Businesses';
import BusinessProfile from './pages/BusinessProfile';
import Legislature from './pages/Legislature';
import DonationThanks from './pages/DonationThanks';
import Learn from './pages/Learn';
import CourseDetail from './pages/CourseDetail';
import MyCourses from './pages/MyCourses';
import Makers from './pages/Makers';
import MakerProfile from './pages/MakerProfile';
import WorkDetail from './pages/WorkDetail';
import MakerUpload from './pages/MakerUpload';
import GuildThanks from './pages/GuildThanks';
import CopyrightPolicy from './pages/CopyrightPolicy';
import Whistleblower from './pages/Whistleblower';
import AccountabilityForum from './pages/AccountabilityForum';
import AuthModal from './components/AuthModal';
import InviteModal from './components/InviteModal';
import FeedbackButton from './components/FeedbackButton';
import DidYouKnow from './components/DidYouKnow';
import MiniPlayer from './components/MiniPlayer';
import SpaceBackground from './components/SpaceBackground';
import { PlayerProvider } from './contexts/PlayerContext';
import { PresenceProvider } from './contexts/PresenceContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './auth';
import api from './api';

class PageErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="page">
          <div className="container" style={{ maxWidth: 700, paddingTop: '3rem' }}>
            <p className="error-msg">Something went wrong loading this page. Please try refreshing.</p>
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: '.5rem', fontFamily: 'monospace' }}>
              {this.state.error.message}
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function CriticalAnomalyBanner() {
  const { user } = useAuth();
  const [anomaly,   setAnomaly]   = useState(null);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('critical_anomaly_dismissed') === '1'
  );

  useEffect(() => {
    if (!user || dismissed) return;
    api.getWatchAnomalies({ severity: 'critical', reviewed: false, limit: 1 })
      .then(list => { if (list.length > 0) setAnomaly(list[0]); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--banner-h', (anomaly && !dismissed) ? '44px' : '0px'
    );
    return () => document.documentElement.style.setProperty('--banner-h', '0px');
  }, [anomaly, dismissed]);

  if (!anomaly || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    sessionStorage.setItem('critical_anomaly_dismissed', '1');
  }

  const dashboards = anomaly.dashboard_types || [];
  const reports    = anomaly.affected_reports || [];
  let watchHref;
  if (dashboards.length === 1) {
    const params = new URLSearchParams({ tab: dashboards[0] });
    if (reports.length > 0) params.set('highlight', reports.join(','));
    watchHref = `/watch?${params.toString()}`;
  } else {
    watchHref = '/watch?tab=anomalies';
  }

  return (
    <div className="critical-anomaly-banner">
      <span className="critical-anomaly-banner-text">
        ⚠ Critical Alert: {anomaly.description.length > 120
          ? anomaly.description.slice(0, 120) + '…'
          : anomaly.description}
      </span>
      <Link to={watchHref} className="critical-anomaly-banner-link">
        View in Watch →
      </Link>
      <button className="critical-anomaly-banner-close" onClick={dismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}

export default function App() {
  const { ready } = useAuth();
  const [authOpen,   setAuthOpen]   = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  if (!ready) return <div className="spinner" style={{ marginTop: '6rem' }} />;

  return (
    <ThemeProvider>
    <SpaceBackground />
    <PresenceProvider>
    <PlayerProvider>
      <CriticalAnomalyBanner />
      <Nav onAuthOpen={() => setAuthOpen(true)} onInviteOpen={() => setInviteOpen(true)} />
      <FeedbackButton />
      <DidYouKnow />
      <Routes>
        <Route path="/"            element={<Feed onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/commons"     element={<Commons onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/commons/:id" element={<CirclePage onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/chat"        element={<Chat onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/admin"       element={<Admin />} />
        <Route path="/watch"        element={<Watch onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/watch/water"  element={<PageErrorBoundary><WatchWater  onRequireAuth={() => setAuthOpen(true)} /></PageErrorBoundary>} />
        <Route path="/watch/air"    element={<PageErrorBoundary><WatchAir    onRequireAuth={() => setAuthOpen(true)} /></PageErrorBoundary>} />
        <Route path="/watch/soil"   element={<PageErrorBoundary><WatchSoil   onRequireAuth={() => setAuthOpen(true)} /></PageErrorBoundary>} />
        <Route path="/watch/energy" element={<PageErrorBoundary><WatchEnergy onRequireAuth={() => setAuthOpen(true)} /></PageErrorBoundary>} />
        <Route path="/merch"       element={<Merch />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/settings"        element={<Settings />} />
        <Route path="/theme"           element={<ThemeSettings />} />
        <Route path="/verify-email"    element={<EmailVerifyPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/posts/:id"       element={<PageErrorBoundary><PostDetailPage onRequireAuth={() => setAuthOpen(true)} /></PageErrorBoundary>} />
        <Route path="/advocate"        element={<Advocate onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/messages"        element={<Messages onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/covenant"        element={<Covenant />} />
        <Route path="/whistleblower"   element={<Whistleblower onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/accountability"  element={<AccountabilityForum />} />
        <Route path="/my-posts"        element={<MyPosts />} />
        <Route path="/businesses"      element={<Businesses onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/businesses/:id"  element={<BusinessProfile />} />
        <Route path="/legislature"     element={<Legislature onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/donate/thanks"   element={<DonationThanks />} />
        {/* Learn / Professional Development Hub */}
        <Route path="/learn"           element={<Learn onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/learn/my-courses" element={<MyCourses />} />
        <Route path="/learn/create"    element={<CourseDetail onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/learn/:id"       element={<CourseDetail onRequireAuth={() => setAuthOpen(true)} />} />
        {/* Maker's Guild — static routes BEFORE dynamic :username */}
        <Route path="/makers/upload"        element={<MakerUpload />} />
        <Route path="/makers/guild-thanks"  element={<GuildThanks />} />
        <Route path="/makers/copyright"     element={<CopyrightPolicy />} />
        <Route path="/makers/works/:id"     element={<WorkDetail onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/makers"               element={<Makers onRequireAuth={() => setAuthOpen(true)} />} />
        <Route path="/makers/:username"     element={<MakerProfile onRequireAuth={() => setAuthOpen(true)} />} />
      </Routes>
      {authOpen   && <AuthModal onClose={() => setAuthOpen(false)} />}
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
      <MiniPlayer />
    </PlayerProvider>
    </PresenceProvider>
    </ThemeProvider>
  );
}
