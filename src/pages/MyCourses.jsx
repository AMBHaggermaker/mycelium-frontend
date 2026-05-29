import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';

export default function MyCourses() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/learn'); return; }
    api.getMyProdevCourses(token)
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="spinner" style={{ margin: '4rem auto' }} />;

  return (
    <div className="container" style={{ maxWidth: 900, padding: '2rem 1rem' }}>
      <Link to="/learn" className="back-link">← Learn</Link>
      <h1 style={{ marginTop: '1rem' }}>My Learning</h1>
      {courses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--muted)' }}>
          <p>You haven't enrolled in any courses yet.</p>
          <Link to="/learn" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Courses</Link>
        </div>
      ) : (
        <div className="learn-grid" style={{ marginTop: '1.5rem' }}>
          {courses.map(c => (
            <Link to={`/learn/${c.id}`} key={c.id} className="learn-card">
              <div className="learn-card-header">
                <span className="learn-card-category">{c.category}</span>
                <span className={'learn-card-level level-' + c.skill_level}>{c.skill_level}</span>
              </div>
              <h3 className="learn-card-title">{c.title}</h3>
              {c.instructor_username && (
                <p className="learn-card-instructor">by {c.instructor_username}</p>
              )}
              <div className="learn-card-meta">
                <span>{c.format}</span>
                {c.duration_minutes && <span>{c.duration_minutes}min</span>}
                {c.completed_at
                  ? <span className="completed-badge">✓ Completed</span>
                  : <span className="in-progress-badge">In Progress</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
