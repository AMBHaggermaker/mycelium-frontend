import { useState, useRef, useEffect } from 'react';

const DONATION_LINK = import.meta.env.VITE_STRIPE_DONATION_LINK;

export default function DonateButton({ className = 'btn btn-primary', label = 'Donate' }) {
  const [tipVisible, setTipVisible] = useState(false);
  const tipRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!tipVisible) return;
    function onOutside(e) {
      if (tipRef.current && !tipRef.current.contains(e.target) && !btnRef.current?.contains(e.target)) {
        setTipVisible(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [tipVisible]);

  if (DONATION_LINK) {
    return (
      <a href={DONATION_LINK} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={btnRef}
        className={className}
        onClick={() => setTipVisible(v => !v)}
        aria-haspopup="true"
        aria-expanded={tipVisible}
      >
        {label}
      </button>
      {tipVisible && (
        <div ref={tipRef} className="donate-coming-soon-tip" role="tooltip">
          <strong>Coming Soon</strong>
          <p>Stripe donations are being set up. Check back soon or contact us to contribute directly.</p>
          <button className="donate-tip-close" onClick={() => setTipVisible(false)} aria-label="Close">✕</button>
        </div>
      )}
    </span>
  );
}
