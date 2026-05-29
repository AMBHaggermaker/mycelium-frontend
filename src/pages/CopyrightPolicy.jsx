import { Link } from 'react-router-dom';

export default function CopyrightPolicy() {
  return (
    <div className="copyright-policy-page">
      <div className="container" style={{ maxWidth: 760, padding: '2rem 1.25rem 6rem' }}>
        <Link to="/makers" className="back-link">← Maker's Guild</Link>

        <h1 style={{ marginTop: '1.5rem', marginBottom: '.5rem' }}>Copyright Policy</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2.5rem' }}>Effective: {new Date().getFullYear()} — Mycelium Community Platform</p>

        <section className="policy-section">
          <h2>What Is Original Work?</h2>
          <p>Original work is creative content you made yourself — music you composed and recorded, art you created, writing you authored, photographs you took, or handmade goods you fabricated. Original work means the creative expression originated with you.</p>
          <p>It does not matter if you were inspired by other work. What matters is that the expression — the actual sound recording, the brushstrokes, the words on the page — came from you.</p>
        </section>

        <section className="policy-section">
          <h2>What Is Allowed</h2>
          <ul className="policy-list">
            <li>Your own original music compositions and recordings</li>
            <li>Your own visual art, illustrations, photography, and digital work</li>
            <li>Writing you authored: essays, poetry, stories, documentation</li>
            <li>Recordings of your own performances</li>
            <li>Handmade goods and crafts you fabricated</li>
            <li>Work you have explicit, documented permission to distribute</li>
            <li>Public domain works (works with expired copyright or explicitly released to public domain)</li>
            <li>Work under Creative Commons license that permits redistribution</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>What Is Not Allowed</h2>
          <ul className="policy-list">
            <li>Recordings or covers of songs you did not write or obtain a mechanical license for</li>
            <li>Uploading commercially released music you did not create</li>
            <li>Art, photographs, or writing you did not create and do not have rights to</li>
            <li>Samples of copyrighted recordings you did not license</li>
            <li>Any content uploaded with intent to circumvent copyright</li>
          </ul>
          <p>Covers and derivative works are complicated. If you recorded a cover of someone else's song, you may have rights to the performance recording but not to the underlying composition. Contact a music attorney if you are unsure.</p>
        </section>

        <section className="policy-section">
          <h2>The Mycelium Covenant and Copyright</h2>
          <p>The <a href="https://unprecedentedtimes.org/the-mycelium-covenant" target="_blank" rel="noopener noreferrer">Mycelium Covenant</a> commits platform members to building sovereign community infrastructure, not extracting or exploiting others' work. Uploading copyrighted content you don't own violates the spirit of the Covenant and will result in content removal and may result in account action.</p>
        </section>

        <section className="policy-section">
          <h2>DMCA Takedown Process</h2>
          <p>Mycelium follows the DMCA safe harbor process for handling copyright claims:</p>
          <ol className="policy-list">
            <li><strong>File a claim:</strong> Use the "Report Copyright Violation" button on any work detail page. Provide your name, contact email, description of the original work you own, and a good faith statement.</li>
            <li><strong>Review:</strong> Admins review the claim and may mark it Under Review, contact the maker, and investigate.</li>
            <li><strong>Removal:</strong> If the claim is upheld, the content is removed and the maker is notified by email with instructions for filing a counter-notice.</li>
            <li><strong>Counter-notice:</strong> The maker has 14 days to file a counter-notice through the platform. Counter-notices must include a statement under penalty of perjury that the removal was a mistake.</li>
            <li><strong>Appeal outcome:</strong> If the counter-notice is accepted, content is restored. If rejected or not filed within 14 days, removal stands.</li>
          </ol>
        </section>

        <section className="policy-section">
          <h2>Consequences for Violations</h2>
          <ul className="policy-list">
            <li>First violation: content removed, warning issued</li>
            <li>Second violation: content removed, maker account suspended pending review</li>
            <li>Third violation or willful infringement: permanent account termination</li>
            <li>All takedown records are retained permanently for audit purposes</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>False Claims</h2>
          <p>Filing a false copyright claim — claiming to own work you don't own — is also a violation of the Mycelium Covenant and may constitute abuse of the DMCA process, which carries legal penalties.</p>
        </section>

        <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 'var(--radius)' }}>
          <p><strong>Questions?</strong> If you're unsure whether your work qualifies for upload, contact the platform team before uploading. It is always better to ask first.</p>
          <Link to="/makers/upload" className="btn btn-primary" style={{ marginTop: '1rem' }}>Upload Original Work</Link>
        </div>
      </div>
    </div>
  );
}
