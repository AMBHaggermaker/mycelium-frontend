import { useState, useEffect, useRef } from 'react';

const TIPS = [
  'Did you know your profile page is fully customizable — click Edit Profile to get started.',
  'Did you know atmospheric observations are automatically cross-referenced with live flight data from the OpenSky Network.',
  'Did you know you can earn skill endorsements from community members on your Professional board.',
  'Did you know you can install Mycelium on your phone as an app — look for "Add to Home Screen" in your browser menu.',
  'Did you know the Watch dashboards use AI to detect patterns across community reports.',
  'Did you know you can create a Business Page and link it to your profile.',
  'Did you know founding members who were personally invited by AMBHaggermaker have a special hexagon badge.',
  'Did you know chat rooms under Circles and Homeschool Hub are separate from the main chat rooms.',
  'Did you know you can customize your profile background with photos, gradients, or CSS patterns.',
  'Did you know the Lost and Found platform has an AI briefing feature for active search cases.',
  'Did you know you can submit soil and rainwater lab results through the Atmospheric Observations dashboard.',
  'Did you know every Watch report is geo-tagged and plotted on a live community map.',
  'Did you know you can drag and reorder your profile boards — click "Edit Layout" on your profile.',
  'Did you know the Legislature section tracks active bills relevant to North Alabama community issues.',
  'Did you know you can place emoji stickers, custom badges, and text on your profile page.',
  'Did you know you can subscribe to alerts for specific bills or representatives in the Legislature section.',
  'Did you know the Land Development dashboard tracks LLC property acquisitions and rezoning patterns.',
  'Did you know you can add a rotating network sidebar to your profile showing your circle connections.',
  'Did you know you can submit a feedback or feature suggestion using the speech bubble button in the bottom right corner.',
  'Did you know Watch reports can trigger AI anomaly detection when multiple similar reports cluster in one area.',
];

export default function DidYouKnow() {
  const storageKey = 'dyk-dismissed';
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; }
  });
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (dismissed) return;
    timerRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % TIPS.length);
        setVisible(true);
      }, 500);
    }, 10000);
    return () => clearInterval(timerRef.current);
  }, [dismissed]);

  if (dismissed) return null;

  function dismiss() {
    try { localStorage.setItem(storageKey, 'true'); } catch { /* ignore */ }
    setDismissed(true);
  }

  return (
    <div className="dyk-bar">
      <span className="dyk-label">💡</span>
      <p className={`dyk-tip${visible ? ' dyk-visible' : ' dyk-hidden'}`}>{TIPS[index]}</p>
      <button className="dyk-dismiss" onClick={dismiss} title="Dismiss forever" aria-label="Dismiss tip bar">✕</button>
    </div>
  );
}
