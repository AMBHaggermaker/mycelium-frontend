import { useState } from 'react';

const BranchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="1.8" fill="currentColor"/>
    <path d="M8 8L8 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M8 8L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M8 8L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M8 4L5 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M8 4L11 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M5.5 10.5L3.5 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M10.5 10.5L12.5 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

export default function WhyThisWorks({ id, children }) {
  const key = `why-${id}`;
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(key) === 'open'; } catch { return false; }
  });

  function toggle() {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(key, next ? 'open' : 'closed'); } catch {}
  }

  return (
    <div className="why-panel">
      <button className="why-panel-btn" onClick={toggle} aria-expanded={open}>
        <BranchIcon />
        <span className="why-panel-title">Why this works this way</span>
        <span className="why-panel-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="why-panel-body">{children}</div>}
    </div>
  );
}
