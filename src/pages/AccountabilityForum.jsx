import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const API_HOST = 'https://mycelium.unprecedentedtimes.org';
const CATEGORY_LABELS = {
  environmental: 'Environmental', institutional: 'Institutional', civic: 'Civic',
  workplace: 'Workplace', trafficking: 'Trafficking', marketplace: 'Marketplace',
  medical: 'Medical', other: 'Other',
};

export default function AccountabilityForum() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.getPublishedWhistleblower()
      .then(setItems).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page"><div className="container" style={{ maxWidth: 820 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Accountability Forum</h1>
          <p className="page-subtitle">
            Whistleblower submissions reviewed and published by the community accountability team.
          </p>
        </div>
        <Link to="/whistleblower" className="btn btn-outline btn-sm">Submit a report →</Link>
      </div>

      {loading ? <div className="spinner" /> :
       err ? <p className="error-msg">{err}</p> :
       items.length === 0 ? <p className="empty">No published submissions yet.</p> :
       <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
         {items.map(it => (
           <article key={it.id} className="card">
             <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '.4rem' }}>
               <span className="tag" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                 {CATEGORY_LABELS[it.category] || it.category}
               </span>
               {it.location_label && <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>📍 {it.location_label}</span>}
               {it.published_at && (
                 <span style={{ fontSize: '.75rem', color: 'var(--muted)', marginLeft: 'auto' }}>
                   {new Date(it.published_at).toLocaleDateString()}
                 </span>
               )}
             </div>
             <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '.35rem' }}>{it.title}</h2>
             {it.attribution && (
               <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '.35rem' }}>
                 Submitted by {it.attribution}
               </p>
             )}
             <p style={{ fontSize: '.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{it.summary}</p>
             {it.ai_summary && (
               <details style={{ marginTop: '.5rem' }}>
                 <summary style={{ cursor: 'pointer', fontSize: '.8rem', color: 'var(--muted)' }}>AI summary</summary>
                 <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.3rem' }}>{it.ai_summary}</p>
               </details>
             )}
             {it.documents?.length > 0 && (
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginTop: '.6rem' }}>
                 {it.documents.map(d => (
                   <a key={d.id} href={`${API_HOST}${d.url}`} target="_blank" rel="noreferrer"
                     className="btn btn-outline btn-sm">📄 {d.filename || 'Document'}</a>
                 ))}
               </div>
             )}
           </article>
         ))}
       </div>}
    </div></div>
  );
}
