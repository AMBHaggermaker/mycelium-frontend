import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { usePlayer } from '../contexts/PlayerContext';
import api from '../api';

function CopyrightReportForm({ workId, onClose }) {
  const [form, setForm] = useState({ claimant_name: '', claimant_email: '', original_work_desc: '', good_faith: false });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.good_faith) { setError('You must confirm the good faith statement'); return; }
    setSubmitting(true); setError('');
    try {
      await api.reportCopyrightViolation({ work_id: workId, ...form });
      setDone(true);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  if (done) return (
    <div className="copyright-report-panel">
      <p className="success-text">Your claim has been submitted. Our team will review it within 5 business days.</p>
      <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ marginTop: '.75rem' }}>Close</button>
    </div>
  );

  return (
    <form className="copyright-report-panel" onSubmit={handleSubmit}>
      <h3>Report Copyright Violation</h3>
      <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginBottom: '1rem' }}>
        Only file a claim if you own rights to the work being infringed. False claims are a violation of the Mycelium Covenant.
        Read our <Link to="/makers/copyright">Copyright Policy</Link> for details.
      </p>
      <input className="input" required placeholder="Your full name *"
        value={form.claimant_name} onChange={e => setForm(f => ({ ...f, claimant_name: e.target.value }))} />
      <input className="input" type="email" required placeholder="Your contact email *"
        value={form.claimant_email} onChange={e => setForm(f => ({ ...f, claimant_email: e.target.value }))} />
      <textarea className="input" rows={4} required
        placeholder="Describe the original work you own and how this upload infringes on it *"
        value={form.original_work_desc} onChange={e => setForm(f => ({ ...f, original_work_desc: e.target.value }))} />
      <label className="toggle-label" style={{ alignItems: 'flex-start', gap: '.75rem' }}>
        <input type="checkbox" checked={form.good_faith}
          onChange={e => setForm(f => ({ ...f, good_faith: e.target.checked }))} />
        <span style={{ fontSize: '.85rem' }}>
          I have a good faith belief that the use of the material is not authorized by the copyright owner,
          its agent, or the law. I understand that filing a false DMCA claim violates the Mycelium Covenant
          and may have legal consequences.
        </span>
      </label>
      {error && <p className="error-text">{error}</p>}
      <div style={{ display: 'flex', gap: '.75rem' }}>
        <button type="submit" className="btn btn-danger" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Claim'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

const LICENSE_INFO = {
  all_rights_reserved:            { label: 'All Rights Reserved', desc: 'All rights reserved by the creator. Ask before using.' },
  creative_commons_attribution:   { label: 'CC Attribution',      desc: 'Free to use with credit to the creator.' },
  creative_commons_sharealike:    { label: 'CC ShareAlike',        desc: 'Free to use and share with same license.' },
  public_domain:                  { label: 'Public Domain',        desc: 'Free for any use, no restrictions.' },
};

export default function WorkDetail({ onRequireAuth }) {
  const { id }              = useParams();
  const { user, token }     = useAuth();
  const { setTrack, track, isPlaying, toggle } = usePlayer();
  const [work,         setWork]        = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [error,        setError]       = useState('');
  const [showReport,   setShowReport]  = useState(false);
  const waveRef      = useRef(null);
  const wsRef        = useRef(null);

  const isCurrentTrack = track?.id === parseInt(id);

  useEffect(() => {
    api.getMakerWork(id)
      .then(w => {
        setWork(w);
        setLoading(false);
        api.incrementWorkPlay(id).catch(() => {});
      })
      .catch(() => { setError('Work not found'); setLoading(false); });
  }, [id]);

  // Initialize WaveSurfer for audio works
  useEffect(() => {
    if (!work || work.work_type !== 'audio' || !waveRef.current) return;

    let ws;
    import('wavesurfer.js').then(({ default: WaveSurfer }) => {
      ws = WaveSurfer.create({
        container:   waveRef.current,
        waveColor:   '#4a7c59',
        progressColor: '#1a1a1a',
        height:      80,
        barWidth:    2,
        barGap:      1,
        cursorColor: '#4a7c59',
        backend:     'WebAudio',
      });
      ws.load(work.r2_url);
      wsRef.current = ws;
    }).catch(() => {});

    return () => { if (wsRef.current) { wsRef.current.destroy(); wsRef.current = null; } };
  }, [work]);

  // Sync wavesurfer play state with PlayerContext
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    if (isCurrentTrack && isPlaying) ws.play();
    else ws.pause();
  }, [isCurrentTrack, isPlaying]);

  function handlePlayBtn() {
    if (!work) return;
    if (isCurrentTrack) {
      toggle();
    } else {
      setTrack({ id: work.id, title: work.title, maker_name: work.maker_name, username: work.username, r2_url: work.r2_url });
    }
  }

  if (loading) return <div className="spinner" style={{ margin: '4rem auto' }} />;
  if (error)   return <div className="container"><p className="error-text">{error}</p></div>;

  const license = LICENSE_INFO[work.license] || LICENSE_INFO.all_rights_reserved;

  return (
    <div className="work-detail-page">
      <div className="work-detail-breadcrumb">
        <Link to="/makers">Maker's Guild</Link> /{' '}
        <Link to={`/makers/${work.username}`}>{work.maker_name}</Link>
      </div>

      <div className="work-detail-header">
        <h1 className="work-detail-title">{work.title}</h1>
        <p className="work-detail-maker">
          by <Link to={`/makers/${work.username}`}>{work.maker_name}</Link>
        </p>
        <div className="work-detail-meta">
          <span className="work-type-badge">{work.work_type}</span>
          {work.category && <span className="work-category-badge">{work.category}</span>}
          <span>{work.play_count} plays</span>
          <span className={work.is_free ? 'price-free' : 'price-paid'}>
            {work.is_free ? 'Free' : `$${parseFloat(work.price).toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* Audio player */}
      {work.work_type === 'audio' && (
        <div className="work-audio-player">
          <div ref={waveRef} className="work-waveform" />
          <div className="work-audio-controls">
            <button className="btn btn-primary work-play-main" onClick={handlePlayBtn}>
              {isCurrentTrack && isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            {work.duration_seconds && (
              <span className="work-duration">
                {Math.floor(work.duration_seconds / 60)}:{String(work.duration_seconds % 60).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Image viewer */}
      {work.work_type === 'image' && work.r2_url && (
        <div className="work-image-viewer">
          <img src={work.r2_url} alt={work.title} style={{ maxWidth: '100%', borderRadius: 8 }} />
        </div>
      )}

      {/* Video player */}
      {work.work_type === 'video' && work.r2_url && (
        <div className="work-video-viewer">
          <video src={work.r2_url} controls style={{ maxWidth: '100%', borderRadius: 8 }} />
        </div>
      )}

      {/* Document download */}
      {work.work_type === 'document' && work.r2_url && (
        <div className="work-document-section">
          <a href={work.r2_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
            📄 View / Download Document
          </a>
        </div>
      )}

      <div className="work-detail-body">
        {work.description && (
          <section className="work-detail-description">
            <h2>About this work</h2>
            <p>{work.description}</p>
          </section>
        )}

        <section className="work-detail-license">
          <h3>License</h3>
          <p><strong>{license.label}</strong> — {license.desc}</p>
        </section>

        {work.tags?.length > 0 && (
          <div className="work-tags">
            {work.tags.map(t => <span key={t} className="work-tag">{t}</span>)}
          </div>
        )}

        {/* Download button if free */}
        {work.is_free && work.r2_url && work.work_type !== 'image' && (
          <a href={work.r2_url} download className="btn btn-outline work-download-btn">
            ↓ Download
          </a>
        )}

        {/* Copyright report */}
        <div className="work-copyright-section">
          {!showReport ? (
            <button className="btn btn-ghost btn-sm work-report-btn" onClick={() => setShowReport(true)}>
              🚩 Report Copyright Violation
            </button>
          ) : (
            <CopyrightReportForm workId={work.id} onClose={() => setShowReport(false)} />
          )}
        </div>
      </div>
    </div>
  );
}
