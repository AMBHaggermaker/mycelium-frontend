import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

const CATEGORIES = [
  { value: 'environmental', label: 'Environmental violation' },
  { value: 'institutional', label: 'Institutional abuse' },
  { value: 'civic',         label: 'Civic corruption' },
  { value: 'workplace',     label: 'Workplace misconduct' },
  { value: 'trafficking',   label: 'Trafficking / exploitation' },
  { value: 'marketplace',   label: 'Marketplace anomaly' },
  { value: 'medical',       label: 'Medical / public health' },
  { value: 'other',         label: 'Other' },
];

const TIERS = [
  { value: 'named',        label: 'Named',        blurb: 'Signed in. Highest credibility — and highest risk.' },
  { value: 'pseudonymous', label: 'Pseudonymous', blurb: 'No account. Optional contact of your choice. IP not logged.' },
  { value: 'anonymous',    label: 'Anonymous',    blurb: 'No account, no contact, no IP. AI-summarized follow-ups.' },
];

const DOC_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/gif';

export default function Whistleblower({ onRequireAuth }) {
  const { user, token } = useAuth();
  const [tier, setTier] = useState('pseudonymous');
  const [category, setCategory] = useState('environmental');
  const [title, setTitle]   = useState('');
  const [summary, setSummary] = useState('');
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState('');
  const [display, setDisplay] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);

  // Track-by-token panel
  const [trackToken, setTrackToken] = useState('');
  const [tracked, setTracked] = useState(null);
  const [trackErr, setTrackErr] = useState(null);
  const [reply, setReply] = useState('');

  function handleFiles(e) {
    setFiles(prev => [...prev, ...Array.from(e.target.files)].slice(0, 10));
    e.target.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    if (tier === 'named' && !user) { onRequireAuth?.(); return; }
    if (!title.trim() || !summary.trim()) { setErr('Title and description are required'); return; }
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append('tier', tier);
      fd.append('category', category);
      fd.append('title', title.trim());
      fd.append('summary', summary.trim());
      if (location.trim()) fd.append('location_label', location.trim());
      if (tier === 'pseudonymous' && contact.trim()) fd.append('submitter_contact', contact.trim());
      if (tier !== 'anonymous' && display.trim()) fd.append('submitter_display', display.trim());
      files.forEach(f => fd.append('documents', f));
      const res = await api.submitWhistleblower(fd, tier === 'named' ? token : undefined);
      setResult(res);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doTrack(e) {
    e?.preventDefault();
    setTrackErr(null); setTracked(null);
    try { setTracked(await api.getWhistleblowerStatus(trackToken.trim())); }
    catch (e) { setTrackErr(e.message); }
  }

  async function sendReply() {
    if (!reply.trim()) return;
    try {
      const msg = await api.postWhistleblowerReply(trackToken.trim(), reply.trim());
      setTracked(prev => ({ ...prev, messages: [...(prev.messages || []), msg] }));
      setReply('');
    } catch (e) { alert(e.message); }
  }

  if (result) {
    return (
      <div className="page"><div className="container" style={{ maxWidth: 680 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '.5rem' }}>Submission received</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
            Your submission has been logged for review by the accountability team.
          </p>
          {result.tier !== 'named' && (
            <div style={{ background: 'var(--green-bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: '.35rem' }}>
                SAVE THIS TOKEN — it is the only way to return, check status, or answer questions:
              </p>
              <code style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--green)', wordBreak: 'break-all' }}>
                {result.submission_token}
              </code>
            </div>
          )}
          <button className="btn btn-outline" onClick={() => { setResult(null); setTitle(''); setSummary(''); setFiles([]); setContact(''); }}>
            Submit another
          </button>
        </div>
      </div></div>
    );
  }

  return (
    <div className="page"><div className="container" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Whistleblower Forum</h1>
          <p className="page-subtitle">Community accountability documentation — choose how much to reveal.</p>
        </div>
        <Link to="/accountability" className="btn btn-outline btn-sm">Accountability Forum →</Link>
      </div>

      {/* Tier selector */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <p className="form-label" style={{ marginBottom: '.5rem' }}>Submission tier</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '.5rem' }}>
          {TIERS.map(t => (
            <button key={t.value} type="button" onClick={() => setTier(t.value)}
              className="card" style={{
                textAlign: 'left', cursor: 'pointer', padding: '.7rem .8rem',
                border: `1px solid ${tier === t.value ? 'var(--green)' : 'var(--border)'}`,
                boxShadow: tier === t.value ? 'var(--glow-green)' : 'none',
              }}>
              <p style={{ fontWeight: 700 }}>{t.label}</p>
              <p style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{t.blurb}</p>
            </button>
          ))}
        </div>

        {/* Tier-specific messaging */}
        {tier === 'named' && (
          <div className="card" style={{ marginTop: '.75rem', borderColor: 'var(--green)' }}>
            <p style={{ fontSize: '.88rem', lineHeight: 1.6 }}>
              You are choosing to attach your name to this submission. That takes courage. Named submissions
              carry the most weight and the most risk. We honor both.
            </p>
            {!user && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: '.6rem' }} onClick={onRequireAuth}>
                Sign in to continue
              </button>
            )}
          </div>
        )}
        {tier === 'pseudonymous' && (
          <div className="card" style={{ marginTop: '.75rem' }}>
            <p style={{ fontSize: '.85rem', lineHeight: 1.6, color: 'var(--muted)' }}>
              No account required. Provide an optional contact method of your choice — an email, a Signal
              number, or nothing. Your IP address is not logged. You'll receive a token to return, check
              status, or answer questions.
            </p>
          </div>
        )}
        {tier === 'anonymous' && (
          <div className="card" style={{ marginTop: '.75rem', borderColor: 'var(--amber)' }}>
            <p style={{ fontSize: '.82rem', lineHeight: 1.65, color: 'var(--text)' }}>
              <strong>Read before you submit.</strong> Anonymous submission protects your writing style but
              not the facts you share. If you are the only person who witnessed what you are describing, the
              content itself may identify you regardless of anonymity settings. Do not submit information that
              only you could know if you face serious risk. For high-risk disclosures involving law enforcement
              or government agencies, consider Signal or SecureDrop — this platform is not a substitute for
              those tools. Do not submit if your safety depends on perfect anonymity.
            </p>
          </div>
        )}
      </div>

      {/* Shared form */}
      <form className="card" onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Title <span className="form-required">*</span></label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
            maxLength={300} placeholder="A short, factual headline" required />
        </div>
        <div className="form-group">
          <label className="form-label">Detailed description <span className="form-required">*</span></label>
          <textarea className="form-textarea" value={summary} onChange={e => setSummary(e.target.value)}
            rows={7} placeholder="What happened, who is involved, when and where (general). Stick to facts." required />
        </div>
        <div className="form-group">
          <label className="form-label">Location (city or county only)</label>
          <input className="form-input" value={location} onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Madison County — never a precise address" />
        </div>

        {tier !== 'anonymous' && (
          <div className="form-group">
            <label className="form-label">Display name (optional)</label>
            <input className="form-input" value={display} onChange={e => setDisplay(e.target.value)}
              maxLength={60} placeholder={tier === 'named' ? 'Defaults to your account name' : 'How to refer to you'} />
          </div>
        )}
        {tier === 'pseudonymous' && (
          <div className="form-group">
            <label className="form-label">Contact (optional)</label>
            <input className="form-input" value={contact} onChange={e => setContact(e.target.value)}
              placeholder="Email, Signal number, or leave blank" />
            <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.3rem' }}>
              Stored encrypted and visible only to reviewers. Optional.
            </p>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Documents (PDFs or images, up to 10)</label>
          <input type="file" multiple accept={DOC_ACCEPT} onChange={handleFiles} />
          {files.length > 0 && (
            <ul style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: '.4rem', listStyle: 'none', padding: 0 }}>
              {files.map((f, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '.15rem 0' }}>
                  <span>📄 {f.name}</span>
                  <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {err && <p className="form-error">{err}</p>}
        <button className="btn btn-primary btn-full" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit'}
        </button>
      </form>

      {/* Track by token */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Return with a token</h2>
        <form onSubmit={doTrack} style={{ display: 'flex', gap: '.5rem' }}>
          <input className="form-input" value={trackToken} onChange={e => setTrackToken(e.target.value)}
            placeholder="Paste your submission token" style={{ flex: 1 }} />
          <button className="btn btn-outline">Check status</button>
        </form>
        {trackErr && <p className="form-error" style={{ marginTop: '.5rem' }}>{trackErr}</p>}

        {tracked && (
          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '.85rem' }}>
              <strong>{tracked.submission.title}</strong> — status:{' '}
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>{tracked.submission.status.replace('_', ' ')}</span>
            </p>
            {tracked.submission.reject_reason && (
              <p style={{ fontSize: '.82rem', color: 'var(--red)', marginTop: '.3rem' }}>
                Reason: {tracked.submission.reject_reason}
              </p>
            )}

            <div style={{ marginTop: '.75rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {(tracked.messages || []).map(m => (
                <div key={m.id} className="card" style={{ padding: '.6rem .75rem',
                  borderColor: m.is_from_submitter ? 'var(--border)' : 'var(--green)' }}>
                  <p style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: '.2rem' }}>
                    {m.is_from_submitter ? 'You' : m.sender_type}
                    {m.ai_summarized && ' · AI-summarized'}
                  </p>
                  <p style={{ fontSize: '.85rem' }}>{m.content}</p>
                </div>
              ))}
            </div>

            {tracked.submission.tier === 'anonymous' && (
              <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.5rem' }}>
                Even with AI summarization, the facts you share may be identifying if you are the only person
                with that knowledge.
              </p>
            )}

            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.6rem' }}>
              <input className="form-input" value={reply} onChange={e => setReply(e.target.value)}
                placeholder="Respond to a question…" style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={sendReply}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div></div>
  );
}
