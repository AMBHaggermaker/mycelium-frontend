import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth';
import api from '../api';
import CircleCard from '../components/CircleCard';

const COMMONS_TABS = ['circles', 'veterans', 'first_responders', 'schools', 'homeschool'];
const TAB_LABELS = {
  circles:         'Circles',
  veterans:        'Veterans',
  first_responders:'First Responders',
  schools:         'Schools',
  homeschool:      'Homeschool Hub',
};

export default function Commons({ onRequireAuth }) {
  const [tab, setTab] = useState('circles');

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Commons</h1>
            <p className="page-subtitle">Community circles, resources, and support networks</p>
          </div>
        </div>

        <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
          {COMMONS_TABS.map(t => (
            <button key={t} className={'tab-btn' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {tab === 'circles'          && <CirclesTab onRequireAuth={onRequireAuth} />}
        {tab === 'veterans'         && <VeteransTab onRequireAuth={onRequireAuth} />}
        {tab === 'first_responders' && <FirstRespondersTab onRequireAuth={onRequireAuth} />}
        {tab === 'schools'          && <SchoolsTab />}
        {tab === 'homeschool'       && <HomeschoolTab onRequireAuth={onRequireAuth} />}
      </div>
    </div>
  );
}

// ── Circles Tab ───────────────────────────────────────────────────────────────

function CirclesTab({ onRequireAuth }) {
  const { user, token } = useAuth();
  const [circles,  setCircles]  = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState(null);
  const [joining,  setJoining]  = useState(null);
  const [showNew,  setShowNew]  = useState(false);
  const [newForm,  setNewForm]  = useState({ name: '', description: '', is_private: false });
  const [newErr,   setNewErr]   = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await api.getCircles({ search: search.trim() || undefined, limit: 60 });
      setCircles(res);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function join(id) {
    if (!user) { onRequireAuth?.(); return; }
    setJoining(id);
    try { await api.joinCircle(id, token); await load(); }
    catch (e) { alert(e.message); }
    finally { setJoining(null); }
  }

  async function createCircle(e) {
    e.preventDefault();
    if (!user) { onRequireAuth?.(); return; }
    setCreating(true); setNewErr(null);
    try {
      await api.createCircle(newForm, token);
      setShowNew(false);
      setNewForm({ name: '', description: '', is_private: false });
      load();
    } catch (e) { setNewErr(e.message); }
    finally { setCreating(false); }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <input className="search-input" style={{ flex: 1, minWidth: '160px' }}
          placeholder="Search circles…" value={search}
          onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-primary"
          onClick={() => user ? setShowNew(v => !v) : onRequireAuth?.()}>
          {showNew ? 'Cancel' : '+ New Circle'}
        </button>
      </div>

      {showNew && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={createCircle} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <h3 className="section-title">Create a Circle</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" required value={newForm.name}
                  onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end', paddingBottom: '.1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', fontSize: '.85rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={newForm.is_private}
                    onChange={e => setNewForm(f => ({ ...f, is_private: e.target.checked }))} />
                  Private
                </label>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={newForm.description}
                onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            {newErr && <p className="form-error">{newErr}</p>}
            <div><button className="btn btn-primary" disabled={creating}>{creating ? '…' : 'Create Circle'}</button></div>
          </form>
        </div>
      )}

      {loading ? <div className="spinner" />
        : err ? <p className="error-msg">{err}</p>
        : circles.length === 0 ? <p className="empty">No circles found. Start one!</p>
        : <div className="circle-grid">
            {circles.map(c => (
              <CircleCard key={c.id} circle={c}
                onJoin={user ? join : () => onRequireAuth?.()}
                joining={joining === c.id} />
            ))}
          </div>
      }
    </>
  );
}

// ── Veterans Tab ──────────────────────────────────────────────────────────────

function VeteransTab({ onRequireAuth }) {
  const { user, token } = useAuth();
  const [declaring, setDeclaring] = useState(false);
  const [declareErr, setDeclareErr] = useState(null);
  const [veteranStatus, setVeteranStatus] = useState(null);
  const [veteranCircles, setVeteranCircles] = useState([]);
  const [loadingCircles, setLoadingCircles] = useState(true);
  const [joining, setJoining] = useState(null);

  useEffect(() => {
    if (user) setVeteranStatus({ is_veteran: user.is_veteran, veteran_confirmed: user.veteran_confirmed });
    api.getCircles({ circle_type: 'veteran_circle', limit: 20 })
      .then(setVeteranCircles)
      .catch(() => {})
      .finally(() => setLoadingCircles(false));
  }, [user]);

  async function declareVeteran() {
    if (!user) { onRequireAuth?.(); return; }
    setDeclaring(true); setDeclareErr(null);
    try {
      const res = await api.declareVeteran(user.id, { is_veteran: true }, token);
      setVeteranStatus(res);
    } catch (e) { setDeclareErr(e.message); }
    finally { setDeclaring(false); }
  }

  async function joinCircle(id) {
    if (!user) { onRequireAuth?.(); return; }
    setJoining(id);
    try {
      await api.joinCircle(id, token);
      setVeteranCircles(prev => prev.map(c => c.id === id ? { ...c, is_member: true } : c));
    } catch (e) { alert(e.message); }
    finally { setJoining(null); }
  }

  return (
    <div className="commons-section">
      <div className="commons-section-intro">
        <h2 className="commons-section-title">Veterans Resource &amp; Support Network</h2>
        <p>Resources, support, and community for veterans. Veteran-owned businesses and veteran-friendly services in the community are listed in the Hotlight feed with a special badge.</p>
      </div>

      {/* Veteran status */}
      {user && (
        <div className="veteran-status-card">
          {veteranStatus?.veteran_confirmed ? (
            <div className="veteran-confirmed-badge">
              <span className="veteran-hex">⬡</span>
              <div>
                <strong>Veteran status confirmed</strong>
                <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--text-muted)' }}>
                  Your veteran status has been confirmed by community members.
                </p>
              </div>
            </div>
          ) : veteranStatus?.is_veteran ? (
            <div className="veteran-pending-badge">
              <span>○</span>
              <div>
                <strong>Veteran status pending confirmation</strong>
                <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--text-muted)' }}>
                  Two verified community members need to vouch for your veteran status to confirm it.
                  This is an honor system — no documents required. Community accountability applies.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '.75rem', fontSize: '.9rem' }}>
                Declare your veteran status to access veteran-specific resources and be listed in the community veteran directory.
                This uses a community honor system — two verified members confirm your status. No documents are uploaded.
              </p>
              {declareErr && <p className="form-error">{declareErr}</p>}
              <button className="btn btn-outline btn-sm" onClick={declareVeteran} disabled={declaring}>
                {declaring ? '…' : 'Declare Veteran Status'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resource directory */}
      <div className="veteran-resources-grid">
        <VeteranResourceSection title="VA Services" items={[
          { name: 'Huntsville VA Clinic', detail: '8200 SW 71st Street, Madison, AL 35758 · (256) 535-3100' },
          { name: 'VA Benefits & Disability Claims', url: 'https://va.gov/disability/', detail: 'va.gov/disability' },
          { name: 'Veterans Crisis Line', detail: 'Call 988, Press 1 · Text 838255 · Chat at veteranscrisisline.net' },
          { name: 'Veterans Benefits Administration', url: 'https://benefits.va.gov', detail: 'benefits.va.gov' },
        ]} />
        <VeteranResourceSection title="Housing" items={[
          { name: 'HUD-VASH (Housing Voucher)', url: 'https://va.gov/homeless/hud-vash.asp', detail: 'VA rental assistance for homeless veterans' },
          { name: 'SSVF (Supportive Services)', url: 'https://va.gov/homeless/ssvf/', detail: 'Homelessness prevention and rapid rehousing' },
          { name: 'Huntsville Housing Authority', url: 'https://huntsvillehousing.org', detail: 'Local housing assistance programs' },
        ]} />
        <VeteranResourceSection title="Employment" items={[
          { name: 'Hire Heroes USA', url: 'https://hireheroesusa.org', detail: 'Free career coaching for veterans' },
          { name: 'American Job Center', url: 'https://careeronestop.org', detail: 'Veterans Employment Priority services' },
          { name: 'Redstone Arsenal — Civilian Careers', url: 'https://www.usajobs.gov', detail: 'Federal civilian jobs with veteran preference' },
          { name: 'Department of Labor VETS', url: 'https://dol.gov/agencies/vets', detail: 'Veteran employment programs' },
        ]} />
        <VeteranResourceSection title="Mental Health" items={[
          { name: 'Vet Centers', url: 'https://va.gov/find-locations/?facilityType=vet_center', detail: 'Community-based readjustment counseling' },
          { name: 'Veterans Crisis Line', detail: 'Call 988, Press 1 — 24/7 confidential support' },
          { name: 'Make the Connection', url: 'https://maketheconnection.net', detail: 'Mental health resources and peer stories' },
          { name: 'Give an Hour', url: 'https://giveanhour.org', detail: 'Free mental health care for veterans' },
        ]} />
        <VeteranResourceSection title="Legal Aid" items={[
          { name: 'Alabama Legal Services — Veterans', url: 'https://alsp.org', detail: 'Free civil legal aid for veterans' },
          { name: 'DAV (Disabled American Veterans)', url: 'https://dav.org', detail: 'Benefits claims assistance' },
          { name: 'Veterans Legal Clinic', url: 'https://alabar.org', detail: 'Pro bono legal services for veterans' },
        ]} />
        <VeteranResourceSection title="Local Organizations" items={[
          { name: 'American Legion — Huntsville', detail: 'Local post serving veterans and community' },
          { name: 'VFW — Veterans of Foreign Wars', detail: 'Local post, comradeship and advocacy' },
          { name: 'Redstone Arsenal Community', detail: 'Military community resources and support — connect through the base' },
        ]} />
      </div>

      {/* Veteran circles */}
      <div className="veteran-circles-section">
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Veteran Circles</h3>
        {loadingCircles ? <div className="spinner" /> : (
          veteranCircles.length === 0 ? (
            <p className="empty">No veteran circles yet. Create one from the Circles tab!</p>
          ) : (
            <div className="circle-grid">
              {veteranCircles.map(c => (
                <CircleCard key={c.id} circle={c}
                  onJoin={user ? joinCircle : () => onRequireAuth?.()}
                  joining={joining === c.id} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function VeteranResourceSection({ title, items }) {
  return (
    <div className="veteran-resource-section">
      <h4 className="veteran-resource-title">{title}</h4>
      <ul className="veteran-resource-list">
        {items.map((item, i) => (
          <li key={i}>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer">{item.name}</a>
            ) : (
              <strong>{item.name}</strong>
            )}
            {item.detail && <span className="veteran-resource-detail"> — {item.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── First Responders Tab ──────────────────────────────────────────────────────

function FirstRespondersTab({ onRequireAuth }) {
  const { user, token } = useAuth();
  const [miForm, setMiForm] = useState({ fr_role: '', institution_name: '', institution_type: '', description: '', is_anonymous: true });
  const [miSubmitting, setMiSubmitting] = useState(false);
  const [miErr, setMiErr] = useState(null);
  const [miSubmitted, setMiSubmitted] = useState(false);
  const [showMiForm, setShowMiForm] = useState(false);
  const [frCircles, setFrCircles] = useState([]);
  const [joining, setJoining] = useState(null);

  useEffect(() => {
    api.getCircles({ circle_type: 'first_responder', limit: 20 })
      .then(setFrCircles)
      .catch(() => {});
  }, []);

  async function submitMoralInjury(e) {
    e.preventDefault();
    if (!user) { onRequireAuth?.(); return; }
    setMiSubmitting(true); setMiErr(null);
    try {
      await api.submitMoralInjury(miForm, token);
      setMiSubmitted(true);
      setShowMiForm(false);
    } catch (e) { setMiErr(e.message); }
    finally { setMiSubmitting(false); }
  }

  async function joinCircle(id) {
    if (!user) { onRequireAuth?.(); return; }
    setJoining(id);
    try {
      await api.joinCircle(id, token);
      setFrCircles(prev => prev.map(c => c.id === id ? { ...c, is_member: true } : c));
    } catch (e) { alert(e.message); }
    finally { setJoining(null); }
  }

  return (
    <div className="commons-section">
      <div className="fr-statement">
        This space supports the human being behind the badge or scrubs. The accountability dashboards elsewhere on this platform hold institutions responsible. This space holds space for the people doing the work. Those are different things and both matter.
      </div>

      <h2 className="commons-section-title" style={{ marginTop: '1.5rem' }}>First Responder &amp; Healthcare Professional Support</h2>

      <div className="fr-anonymous-notice">
        <strong>Anonymous Participation:</strong> When posting in First Responder peer support circles, you can choose to display as "First Responder" or "Healthcare Worker" instead of your display name. This is the only place on Mycelium where your display name can be hidden. Your identity is known to administrators.
      </div>

      {/* Resource categories */}
      <div className="veteran-resources-grid">
        <FRResourceSection title="Peer Support — Law Enforcement" items={[
          { name: 'CopLine', url: 'https://copline.org', detail: '(800) 267-5463 — 24/7 peer support' },
          { name: 'National Law Enforcement Officers Memorial Fund', url: 'https://nleomf.org/programs/cop2cop', detail: 'Peer support program' },
          { name: 'Safe Call Now', url: 'https://safecallnow.org', detail: '(206) 459-3020 — confidential support' },
        ]} />
        <FRResourceSection title="Peer Support — Fire & EMS" items={[
          { name: 'Code Green Campaign', url: 'https://codegreencampaign.org', detail: 'Mental health for emergency responders' },
          { name: 'First Responder Support Network', url: 'https://frsn.org', detail: 'Trauma treatment programs' },
          { name: 'IAFC Behavioral Health', url: 'https://iafc.org', detail: 'Fire service behavioral health resources' },
        ]} />
        <FRResourceSection title="Healthcare Worker Support" items={[
          { name: 'Physician Support Line', url: 'https://physiciansupportline.com', detail: '(888) 409-0141 — free, confidential, peers' },
          { name: 'Emotional PPE Project', url: 'https://emotionalppe.org', detail: 'Free mental health care for healthcare workers' },
          { name: 'American Foundation for Suicide Prevention — Healthcare', url: 'https://afsp.org/healthcare-professionals', detail: 'Resources for healthcare professionals' },
        ]} />
        <FRResourceSection title="Mental Health & Burnout" items={[
          { name: 'National Alliance on Mental Illness (NAMI)', url: 'https://nami.org', detail: 'Crisis line and local resources' },
          { name: 'Headington Institute', url: 'https://headington-institute.org', detail: 'Resilience training for first responders' },
          { name: '988 Suicide & Crisis Lifeline', detail: 'Call or text 988 — 24/7' },
        ]} />
        <FRResourceSection title="Moral Injury Resources" items={[
          { name: 'Moral Injury Project', url: 'https://moralinjuryproject.syr.edu', detail: 'Research, resources, and understanding' },
          { name: 'Moral Injury: The War Within (VA)', url: 'https://www.research.va.gov/pubs/docs/va_infographics/moral-injury.pdf', detail: 'VA resource on moral injury' },
          { name: 'Give an Hour', url: 'https://giveanhour.org', detail: 'Free mental health care for first responders' },
        ]} />
        <FRResourceSection title="Chaplaincy & Spiritual Support" items={[
          { name: 'International Conference of Police Chaplains', url: 'https://icpc4cops.org', detail: 'Chaplaincy resources and directory' },
          { name: 'Fire & EMS Chaplain Corps', detail: 'Contact your department for assigned chaplain' },
          { name: 'Healthcare Chaplaincy Network', url: 'https://healthcarechaplaincy.org', detail: 'Spiritual support in clinical settings' },
        ]} />
        <FRResourceSection title="Whistleblower Protections" items={[
          { name: 'Government Accountability Project', url: 'https://whistleblower.org', detail: 'Whistleblower protection and legal support' },
          { name: 'National Whistleblower Center', url: 'https://whistleblowers.org', detail: 'Legal resources and advocacy' },
          { name: 'OSHA Whistleblower Protection Program', url: 'https://whistleblowers.gov', detail: 'Federal whistleblower protections' },
          { name: 'Government Employees Rights', url: 'https://nlrb.gov', detail: 'NLRB protections for public sector workers' },
        ]} />
      </div>

      {/* Peer support circles */}
      {frCircles.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>Peer Support Circles</h3>
          <div className="circle-grid">
            {frCircles.map(c => (
              <CircleCard key={c.id} circle={c}
                onJoin={user ? joinCircle : () => onRequireAuth?.()}
                joining={joining === c.id} />
            ))}
          </div>
        </div>
      )}

      {/* Moral injury documentation */}
      <div className="fr-moral-injury-section">
        <h3 className="section-title" style={{ marginBottom: '.5rem' }}>Healthcare Worker: Document Moral Injury</h3>
        <p style={{ fontSize: '.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          If you have experienced moral injury from institutional medical practices, you can document it privately here.
          Your account is required but your identity is not shown publicly — anonymous submissions are fully protected.
          Reports contribute anonymously to institutional pattern detection via the Advocate section.
        </p>

        {miSubmitted && (
          <div className="advocate-submitted" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <strong>Report submitted. </strong>Thank you for documenting this. Your report is private and will contribute to anonymous pattern analysis.
          </div>
        )}

        {!showMiForm ? (
          <button className="btn btn-outline btn-sm" onClick={() => user ? setShowMiForm(true) : onRequireAuth?.()}>
            {miSubmitted ? '+ Document Another' : '+ Document Moral Injury'}
          </button>
        ) : (
          <form onSubmit={submitMoralInjury} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', maxWidth: '560px' }}>
            <div className="form-group">
              <label className="form-label">Your Role *</label>
              <select className="form-select" value={miForm.fr_role}
                onChange={e => setMiForm(f => ({ ...f, fr_role: e.target.value }))} required>
                <option value="">Select…</option>
                <option value="law_enforcement">Law Enforcement</option>
                <option value="fire">Fire Service</option>
                <option value="ems">EMS / Paramedic</option>
                <option value="healthcare">Healthcare Worker</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Institution Name (optional)</label>
              <input className="form-input" value={miForm.institution_name}
                onChange={e => setMiForm(f => ({ ...f, institution_name: e.target.value }))}
                placeholder="Hospital, agency, or facility name" />
            </div>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-textarea" required rows={4} value={miForm.description}
                onChange={e => setMiForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the situation that caused moral injury. This is stored privately." />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={miForm.is_anonymous}
                onChange={e => setMiForm(f => ({ ...f, is_anonymous: e.target.checked }))} />
              Keep my identity anonymous in any pattern reports (recommended)
            </label>
            {miErr && <p className="form-error">{miErr}</p>}
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn btn-primary btn-sm" disabled={miSubmitting}>{miSubmitting ? '…' : 'Submit Privately'}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowMiForm(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function FRResourceSection({ title, items }) {
  return (
    <div className="veteran-resource-section">
      <h4 className="veteran-resource-title">{title}</h4>
      <ul className="veteran-resource-list">
        {items.map((item, i) => (
          <li key={i}>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer">{item.name}</a>
            ) : (
              <strong>{item.name}</strong>
            )}
            {item.detail && <span className="veteran-resource-detail"> — {item.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Schools Tab ───────────────────────────────────────────────────────────────

function SchoolsTab() {
  const { user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.getSchools().then(setSchools).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (selected) {
    return <SchoolDetail schoolId={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="commons-section">
      <h2 className="commons-section-title">School Pages</h2>
      <p style={{ marginBottom: '1.25rem', fontSize: '.9rem', color: 'var(--text-muted)' }}>
        School pages are managed by designated school representatives. Contact an administrator to establish a school page for your school.
      </p>

      {loading ? <div className="spinner" /> : (
        schools.length === 0 ? (
          <p className="empty">No school pages yet.{user?.role === 'admin' ? ' Create one from the admin panel.' : ' Check back soon.'}</p>
        ) : (
          <div className="school-grid">
            {schools.map(s => (
              <div key={s.id} className="school-card" onClick={() => setSelected(s.id)}>
                <h3 className="school-card-name">{s.name}</h3>
                <div className="school-card-type">{s.school_type.charAt(0).toUpperCase() + s.school_type.slice(1)} School</div>
                {s.address && <p className="school-card-address">{s.address}</p>}
                {s.rep_username && (
                  <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: '.3rem' }}>
                    Rep: @{s.rep_username}
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function SchoolDetail({ schoolId, onBack }) {
  const { user, token } = useAuth();
  const [school, setSchool] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [showPost, setShowPost] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getSchool(schoolId),
      api.getSchoolPosts(schoolId, { limit: 60 }),
    ]).then(([s, p]) => { setSchool(s); setPosts(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [schoolId]);

  if (loading) return <div className="spinner" />;
  if (!school) return <p className="error-msg">School not found</p>;

  const isRep = user?.id === school.rep_user_id || user?.role === 'admin';
  const filteredPosts = activeType === 'all' ? posts : posts.filter(p => p.post_type === activeType);

  const POST_TYPES = ['all','announcement','lost_found','volunteer_need','lunch_balance','supply_drive','event'];
  const POST_TYPE_LABELS = { all:'All', announcement:'Announcements', lost_found:'Lost & Found', volunteer_need:'Volunteer', lunch_balance:'Lunch Balance', supply_drive:'Supply Drives', event:'Events' };

  return (
    <div className="commons-section">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }} onClick={onBack}>← Back</button>

      <div className="school-detail-header">
        <div>
          <h2 style={{ margin: 0 }}>{school.name}</h2>
          <p style={{ margin: '.2rem 0 0', color: 'var(--text-muted)', fontSize: '.88rem' }}>
            {school.school_type.charAt(0).toUpperCase() + school.school_type.slice(1)} School
            {school.address && ` · ${school.address}`}
            {school.principal_name && ` · Principal: ${school.principal_name}`}
          </p>
        </div>
        {isRep && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowPost(v => !v)}>
            {showPost ? 'Cancel' : '+ Post'}
          </button>
        )}
      </div>

      {school.phone && <p style={{ fontSize: '.85rem', marginTop: '.4rem' }}>📞 {school.phone}</p>}
      {school.website && (
        <p style={{ fontSize: '.85rem' }}>
          🔗 <a href={school.website} target="_blank" rel="noopener noreferrer">{school.website}</a>
        </p>
      )}

      {showPost && isRep && (
        <SchoolPostForm schoolId={schoolId} token={token}
          onCreated={p => { setPosts(prev => [p, ...prev]); setShowPost(false); }} />
      )}

      <div className="tab-bar" style={{ margin: '1rem 0' }}>
        {POST_TYPES.map(t => (
          <button key={t} className={'tab-btn' + (activeType === t ? ' active' : '')} onClick={() => setActiveType(t)}>
            {POST_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <p className="empty">No {activeType === 'all' ? '' : POST_TYPE_LABELS[activeType] + ' '}posts yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {filteredPosts.map(p => (
            <SchoolPostCard key={p.id} post={p} schoolId={schoolId} isRep={isRep} token={token}
              onDeleted={id => setPosts(prev => prev.filter(x => x.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}

function SchoolPostForm({ schoolId, token, onCreated }) {
  const [form, setForm] = useState({ post_type: 'announcement', title: '', content: '', count_only: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append('post_type', form.post_type);
      fd.append('title', form.title);
      if (form.content) fd.append('content', form.content);
      if (form.post_type === 'lunch_balance' && form.count_only) fd.append('count_only', form.count_only);
      const res = await api.createSchoolPost(schoolId, fd, token);
      onCreated(res);
    } catch (e) { setErr(e.message); }
    finally { setSubmitting(false); }
  }

  const POST_TYPES = ['announcement','lost_found','volunteer_need','lunch_balance','supply_drive','event'];
  const POST_TYPE_LABELS = { announcement:'Announcement', lost_found:'Lost & Found', volunteer_need:'Volunteer Need', lunch_balance:'Lunch Balance', supply_drive:'Supply Drive', event:'Event' };

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        <h3 className="section-title">New Post</h3>
        <div className="form-group">
          <label className="form-label">Post Type *</label>
          <select className="form-select" value={form.post_type} onChange={e => setForm(f => ({ ...f, post_type: e.target.value }))}>
            {POST_TYPES.map(t => <option key={t} value={t}>{POST_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        {form.post_type === 'lunch_balance' ? (
          <>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Students with low lunch balances this week" />
            </div>
            <div className="form-group">
              <label className="form-label">Number of students needing help</label>
              <input type="number" min="0" className="form-input" style={{ maxWidth: '120px' }} value={form.count_only}
                onChange={e => setForm(f => ({ ...f, count_only: e.target.value }))} placeholder="0" />
              <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                Only the count is shown — no student names or identifying information.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Details</label>
              <textarea className="form-textarea" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} />
            </div>
          </>
        )}
        {err && <p className="form-error">{err}</p>}
        <div><button className="btn btn-primary" disabled={submitting}>{submitting ? '…' : 'Post'}</button></div>
      </form>
    </div>
  );
}

function SchoolPostCard({ post: p, schoolId, isRep, token, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm('Delete this post?')) return;
    setDeleting(true);
    try { await api.deleteSchoolPost(schoolId, p.id, token); onDeleted(p.id); }
    catch (e) { alert(e.message); setDeleting(false); }
  }

  const typeColors = { lunch_balance: '#f8d7da', lost_found: '#fff3cd', volunteer_need: '#d1e7dd', supply_drive: '#cfe2ff', event: '#e2d9f3', announcement: 'var(--surface)' };
  const typeLabels = { announcement:'Announcement', lost_found:'Lost & Found', volunteer_need:'Volunteer Need', lunch_balance:'🍽 Lunch Balance', supply_drive:'Supply Drive', event:'Event' };

  return (
    <div className="school-post-card" style={{ borderLeft: p.is_urgent ? '3px solid var(--danger)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '.72rem', padding: '.1rem .4rem', borderRadius: '4px', background: typeColors[p.post_type] || 'var(--surface)', marginBottom: '.35rem', display: 'inline-block' }}>
            {typeLabels[p.post_type]}
            {p.is_urgent && <span style={{ marginLeft: '.3rem', color: 'var(--danger)', fontWeight: 700 }}>URGENT</span>}
          </span>
          <h4 style={{ margin: '.1rem 0 .3rem', fontSize: '.95rem' }}>{p.title}</h4>
          {p.post_type === 'lunch_balance' && p.count_only !== null && (
            <p style={{ margin: 0, fontSize: '.9rem' }}>
              <strong>{p.count_only}</strong> student{p.count_only !== 1 ? 's' : ''} need lunch account help this week.
              If you can contribute, contact the school office.
            </p>
          )}
          {p.content && <p style={{ margin: '.25rem 0 0', fontSize: '.88rem', color: 'var(--text-muted)' }}>{p.content}</p>}
          {p.expires_at && (
            <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.25rem' }}>
              Expires {new Date(p.expires_at).toLocaleDateString()}
            </p>
          )}
        </div>
        {isRep && (
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', fontSize: '.75rem' }}
            onClick={handleDelete} disabled={deleting}>
            {deleting ? '…' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Homeschool Hub Tab ────────────────────────────────────────────────────────

function HomeschoolTab({ onRequireAuth }) {
  const { user } = useAuth();
  const [circles, setCircles] = useState([]);
  const [joining, setJoining] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    api.getCircles({ circle_type: 'homeschool_co_op', limit: 20 })
      .then(setCircles)
      .catch(() => {});
  }, []);

  async function joinCircle(id) {
    if (!user) { onRequireAuth?.(); return; }
    setJoining(id);
    try {
      await api.joinCircle(id, token);
      setCircles(prev => prev.map(c => c.id === id ? { ...c, is_member: true } : c));
    } catch (e) { alert(e.message); }
    finally { setJoining(null); }
  }

  return (
    <div className="commons-section">
      <h2 className="commons-section-title">Homeschool Hub</h2>
      <p style={{ marginBottom: '1.25rem', fontSize: '.9rem', color: 'var(--text-muted)' }}>
        Resources, co-ops, curriculum sharing, and community for homeschool families in North Alabama.
      </p>

      {/* Alabama legal requirements */}
      <div className="homeschool-legal-card">
        <h3 style={{ margin: '0 0 .75rem', fontSize: '1rem' }}>Alabama Homeschool Requirements</h3>
        <p style={{ fontSize: '.88rem', margin: '0 0 .6rem' }}>
          Alabama law allows homeschooling under three options: (1) church school, (2) private tutor, or (3) home-based program equivalent.
          Most Alabama homeschool families operate under a church school umbrella program.
        </p>
        <ul style={{ fontSize: '.88rem', margin: '0 0 .75rem', paddingLeft: '1.25rem' }}>
          <li>No state registration required under church school umbrella</li>
          <li>No state testing requirements for homeschool students</li>
          <li>Attendance records must be kept (church school programs handle this)</li>
          <li>Compulsory age: 6–17</li>
        </ul>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <a href="https://hslda.org/legal/alabama" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
            HSLDA Alabama Law Overview
          </a>
          <a href="https://www.alabamahomeschooling.com" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
            Alabama Homeschool Resources
          </a>
        </div>
      </div>

      {/* Resources */}
      <div className="veteran-resources-grid" style={{ marginTop: '1.5rem' }}>
        <FRResourceSection title="Curriculum & Teaching" items={[
          { name: 'Khan Academy', url: 'https://khanacademy.org', detail: 'Free K-12 curriculum, all subjects' },
          { name: 'Easy Peasy All-in-One Homeschool', url: 'https://allinonehomeschool.com', detail: 'Free complete homeschool program' },
          { name: 'Ambleside Online', url: 'https://amblesideonline.org', detail: 'Free Charlotte Mason curriculum' },
          { name: 'Cathy Duffy Reviews', url: 'https://cathyduffyreviews.com', detail: 'Curriculum reviews and comparisons' },
        ]} />
        <FRResourceSection title="Alabama Co-op Resources" items={[
          { name: 'CHEF of Alabama', url: 'https://chefofalabama.org', detail: 'Christian Home Educators Fellowship of Alabama' },
          { name: 'North Alabama Homeschool Network', detail: 'Connect through Homeschool Hub circles below' },
          { name: 'HSLDA', url: 'https://hslda.org', detail: 'Legal support and resources' },
        ]} />
        <FRResourceSection title="Field Trip & Activities" items={[
          { name: 'U.S. Space & Rocket Center', url: 'https://rocketcenter.com', detail: 'Homeschool days and programs — Huntsville' },
          { name: 'EarlyWorks Family of Museums', url: 'https://earlyworks.com', detail: 'History museums in Huntsville' },
          { name: 'Burritt on the Mountain', url: 'https://burrittonthemountain.com', detail: 'Living history site — Huntsville' },
          { name: 'Alabama Department of Conservation', url: 'https://outdooralabama.com', detail: 'State parks and nature education' },
        ]} />
      </div>

      {/* Homeschool co-op circles */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '.5rem' }}>Homeschool Co-op Circles</h3>
        <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Join or create a homeschool co-op circle. Co-op circles support curriculum sharing, field trip coordination, and resource exchange.
          Create a co-op circle from the <button className="btn btn-ghost btn-sm" style={{ display: 'inline', padding: '0 .25rem' }} onClick={() => onRequireAuth?.()}>Circles tab</button> using the type "Homeschool Co-op".
        </p>
        {circles.length === 0 ? (
          <p className="empty">No homeschool co-op circles yet. Create one from the Circles tab!</p>
        ) : (
          <div className="circle-grid">
            {circles.map(c => (
              <CircleCard key={c.id} circle={c}
                onJoin={user ? joinCircle : () => onRequireAuth?.()}
                joining={joining === c.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
