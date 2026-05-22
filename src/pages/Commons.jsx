import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth';
import api from '../api';
import CircleCard from '../components/CircleCard';

export default function Commons({ onRequireAuth }) {
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
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
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
    } catch (e) {
      setNewErr(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Commons</h1>
            <p className="page-subtitle">Community circles and groups</p>
          </div>
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

        <div style={{ marginBottom: '1.5rem' }}>
          <input className="search-input" style={{ maxWidth: '100%', width: '100%' }}
            placeholder="Search circles…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>

        {loading
          ? <div className="spinner" />
          : err
            ? <p className="error-msg">{err}</p>
            : circles.length === 0
              ? <p className="empty">No circles found. Start one!</p>
              : <div className="circle-grid">
                  {circles.map(c => (
                    <CircleCard key={c.id} circle={c}
                      onJoin={user ? join : () => onRequireAuth?.()}
                      joining={joining === c.id} />
                  ))}
                </div>
        }
      </div>
    </div>
  );
}
