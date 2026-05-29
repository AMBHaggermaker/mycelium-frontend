import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

const FORMAT_ICONS = { video: '🎬', audio: '🎧', written: '📖', live: '📡', workshop: '🔧' };

export default function CourseDetail({ onRequireAuth }) {
  const { id }         = useParams();
  const [sp]           = useSearchParams();
  const navigate       = useNavigate();
  const { user, token } = useAuth();
  const [course,     setCourse]    = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState('');
  const [enrolled,   setEnrolled]  = useState(sp.get('enrolled') === '1');
  const [enrolling,  setEnrolling] = useState(false);
  const [creating,   setCreating]  = useState(false);
  const [form,       setForm]      = useState({
    title: '', description: '', category: '', skill_level: 'beginner',
    format: 'written', price: '0', duration_minutes: '', tags: '',
  });

  const isCreate = id === 'create';

  useEffect(() => {
    if (isCreate) { setLoading(false); return; }
    api.getProdevCourse(id)
      .then(c => { setCourse(c); setLoading(false); })
      .catch(() => { setError('Course not found'); setLoading(false); });
  }, [id]);

  async function handleEnroll() {
    if (!user) return onRequireAuth?.();
    setEnrolling(true);
    try {
      const result = await api.enrollProdevCourse(id, token);
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        setEnrolled(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setEnrolling(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const result = await api.createProdevCourse({
        ...form,
        price: parseFloat(form.price) || 0,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        tags,
      }, token);
      navigate(`/learn/${result.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="spinner" style={{ margin: '4rem auto' }} />;
  if (error && !isCreate) return <div className="container"><p className="error-text">{error}</p></div>;

  if (isCreate) {
    if (!user) { onRequireAuth?.(); return null; }
    return (
      <div className="container" style={{ maxWidth: 640, padding: '2rem 1rem' }}>
        <Link to="/learn" className="back-link">← Back to Learn</Link>
        <h1 style={{ marginTop: '1rem' }}>Create a Course</h1>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <input className="input" placeholder="Course title *" required
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <textarea className="input" placeholder="Description" rows={5}
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <select className="input" required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            <option value="">Select category *</option>
            {['Local Fabrication and Making','Sovereign AI and Computing','Community Coordination Tools',
              'Food Systems and Agriculture','Energy Independence','Water and Environmental Systems',
              'Investigative Research and OSINT','Community Health and Healing','Legal Literacy and Rights',
              'Communications and Publishing','Governance and Civic Action','Other']
              .map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select className="input" value={form.skill_level} onChange={e => setForm(f => ({ ...f, skill_level: e.target.value }))}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <select className="input" value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
              <option value="written">Written</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="live">Live</option>
              <option value="workshop">Workshop</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input className="input" type="number" min="0" step="0.01" placeholder="Price (0 = free)"
              value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            <input className="input" type="number" min="1" placeholder="Duration (minutes)"
              value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
          </div>
          <input className="input" placeholder="Tags (comma separated)"
            value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Creating…' : 'Publish Course'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="course-detail">
      <div className="course-detail-header">
        <Link to="/learn" className="back-link">← Learn</Link>
        <div className="course-detail-badges">
          <span className="learn-card-category">{course.category}</span>
          <span className={'learn-card-level level-' + course.skill_level}>{course.skill_level}</span>
          <span className="course-format-badge">{FORMAT_ICONS[course.format]} {course.format}</span>
        </div>
        <h1 className="course-detail-title">{course.title}</h1>

        {course.instructor_username && (
          <p className="course-detail-instructor">
            Taught by{' '}
            <Link to={`/profile/${course.instructor_username}`}>{course.instructor_username}</Link>
          </p>
        )}

        <div className="course-detail-meta">
          {course.duration_minutes && <span>{course.duration_minutes} min</span>}
          <span>{course.enrollment_count} enrolled</span>
          <span className={course.is_free ? 'price-free' : 'price-paid'}>
            {course.is_free ? 'Free' : `$${parseFloat(course.price).toFixed(2)}`}
          </span>
        </div>
      </div>

      <div className="course-detail-body">
        <div className="course-detail-main">
          <section>
            <h2>About this course</h2>
            <p className="course-detail-description">{course.description}</p>
          </section>

          {course.resources?.length > 0 && (
            <section>
              <h2>Resources</h2>
              <ul className="course-resources-list">
                {course.resources.map(r => (
                  <li key={r.id} className="course-resource-item">
                    <span className="resource-type-badge">{r.resource_type}</span>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a>
                    ) : (
                      <a href={`/api/media/${r.r2_key}`} target="_blank" rel="noopener noreferrer">{r.title}</a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="course-detail-sidebar">
          {course.instructor_bio && (
            <div className="course-instructor-card">
              <h3>About the Instructor</h3>
              <p>{course.instructor_bio}</p>
            </div>
          )}

          <div className="course-enroll-card">
            {enrolled ? (
              <div className="enrolled-badge">✓ You're enrolled</div>
            ) : (
              <button
                className="btn btn-primary course-enroll-btn"
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling ? 'Processing…' : course.is_free ? 'Enroll Free' : `Enroll · $${parseFloat(course.price).toFixed(2)}`}
              </button>
            )}
            {error && <p className="error-text" style={{ marginTop: '.5rem' }}>{error}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
