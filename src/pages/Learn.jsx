import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

const CATEGORIES = [
  'Local Fabrication and Making',
  'Sovereign AI and Computing',
  'Community Coordination Tools',
  'Food Systems and Agriculture',
  'Energy Independence',
  'Water and Environmental Systems',
  'Investigative Research and OSINT',
  'Community Health and Healing',
  'Legal Literacy and Rights',
  'Communications and Publishing',
  'Governance and Civic Action',
  'Other',
];

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'];
const FORMATS      = ['video', 'audio', 'written', 'live', 'workshop'];

const FEATURED_TRACKS = [
  { label: 'Skills That Function When Institutions Don\'t', desc: 'Practical curriculum for building community infrastructure outside institutional dependency', filter: 'featured' },
  { label: 'Sovereignty Stack', desc: 'Local AI, sovereign tools, digital independence' },
  { label: 'Maker Skills', desc: 'Fabrication, electronics, woodworking, fiber arts' },
  { label: 'Healing and Body', desc: 'Breathwork, somatic practice, herbal medicine, nutrition' },
  { label: 'Community Infrastructure', desc: 'Coordination, governance, food systems, energy' },
];

export default function Learn({ onRequireAuth }) {
  const { user, token } = useAuth();
  const [courses,    setCourses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [category,   setCategory]   = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [format,     setFormat]     = useState('');
  const [search,     setSearch]     = useState('');

  useEffect(() => {
    setLoading(true);
    api.getProdevCourses({ category, skill_level: skillLevel, format, search })
      .then(setCourses)
      .catch(() => setError('Failed to load courses'))
      .finally(() => setLoading(false));
  }, [category, skillLevel, format, search]);

  function clearFilters() {
    setCategory(''); setSkillLevel(''); setFormat(''); setSearch('');
  }

  return (
    <div className="learn-page">
      <div className="learn-hero">
        <h1 className="learn-hero-title">Skills That Function<br />When Institutions Don't</h1>
        <p className="learn-hero-sub">
          Community-taught curriculum for building and sustaining infrastructure outside institutional dependency.
          Not career ladders. Sovereignty-oriented skill building.
        </p>
        {user ? (
          <Link to="/learn/my-courses" className="btn btn-primary learn-hero-btn">My Learning</Link>
        ) : (
          <button className="btn btn-primary learn-hero-btn" onClick={onRequireAuth}>Sign in to Enroll</button>
        )}
      </div>

      {/* Featured curriculum tracks */}
      <section className="learn-tracks-section">
        <h2 className="learn-section-heading">Curriculum Tracks</h2>
        <div className="learn-tracks-grid">
          {FEATURED_TRACKS.map(t => (
            <button
              key={t.label}
              className={'learn-track-card' + (category === t.label ? ' active' : '')}
              onClick={() => setCategory(c => c === t.label ? '' : t.label)}
            >
              <div className="learn-track-label">{t.label}</div>
              <div className="learn-track-desc">{t.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Teach button */}
      {user?.verified && (
        <div className="learn-teach-bar">
          <Link to="/learn/create" className="btn btn-outline">+ Teach on Mycelium</Link>
          <span className="learn-teach-hint">Verified members can publish their own courses</span>
        </div>
      )}

      {/* Filters */}
      <div className="learn-filters">
        <input
          className="learn-search input"
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input" value={skillLevel} onChange={e => setSkillLevel(e.target.value)}>
          <option value="">Any Level</option>
          {SKILL_LEVELS.map(l => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
        </select>
        <select className="input" value={format} onChange={e => setFormat(e.target.value)}>
          <option value="">Any Format</option>
          {FORMATS.map(f => <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>)}
        </select>
        {(category || skillLevel || format || search) && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
        )}
      </div>

      {loading && <div className="spinner" style={{ margin: '3rem auto' }} />}
      {error   && <p className="error-text">{error}</p>}

      {!loading && !error && courses.length === 0 && (
        <div className="learn-empty">
          <p>No courses yet.{user?.verified ? ' Be the first to teach one.' : ''}</p>
          {user?.verified && <Link to="/learn/create" className="btn btn-primary">Create a Course</Link>}
        </div>
      )}

      <div className="learn-grid">
        {courses.map(c => (
          <Link to={`/learn/${c.id}`} key={c.id} className="learn-card">
            <div className="learn-card-header">
              <span className="learn-card-category">{c.category}</span>
              <span className={'learn-card-level level-' + c.skill_level}>{c.skill_level}</span>
            </div>
            <h3 className="learn-card-title">{c.title}</h3>
            {c.instructor_username && (
              <p className="learn-card-instructor">
                by <Link to={`/profile/${c.instructor_username}`} onClick={e => e.stopPropagation()}>
                  {c.instructor_username}
                </Link>
              </p>
            )}
            <p className="learn-card-desc">{c.description?.slice(0, 120)}{c.description?.length > 120 ? '…' : ''}</p>
            <div className="learn-card-meta">
              <span className="learn-card-format">{c.format}</span>
              {c.duration_minutes && <span>{c.duration_minutes}min</span>}
              <span>{c.enrollment_count} enrolled</span>
              <span className={'learn-card-price' + (c.is_free ? ' free' : '')}>
                {c.is_free ? 'Free' : `$${parseFloat(c.price).toFixed(2)}`}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
