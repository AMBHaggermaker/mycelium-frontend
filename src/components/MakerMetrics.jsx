import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';
import WhyThisWorks from './WhyThisWorks';

export default function MakerMetrics({ username, token }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);

  useEffect(() => {
    setLoading(true);
    api.getMakerMetrics(username, token)
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="spinner" style={{ margin: '2rem auto' }} />;
  if (err)     return <p style={{ color: 'var(--muted)', padding: '1rem' }}>Could not load metrics: {err}</p>;
  if (!data)   return null;

  const { totals, works, time_series, most_played, most_completed } = data;

  return (
    <div className="maker-metrics">
      <WhyThisWorks id="maker-metrics-why">
        These numbers show you what actually matters — whether people are listening, finishing, coming back, and
        reaching out. We do not show you how you compare to other makers. We do not show you a score designed
        to make you post more. Your work speaks for itself.
      </WhyThisWorks>

      {/* Summary cards */}
      <div className="maker-metrics-cards">
        <MetricCard label="Total Plays"       value={totals.total_plays} />
        <MetricCard label="Unique Listeners"  value={totals.unique_listeners} />
        <MetricCard label="Avg Completion"    value={`${totals.avg_completion_rate}%`} />
        <MetricCard label="Downloads"         value={totals.total_downloads} />
        <MetricCard label="Commission Requests" value={totals.commission_requests} />
      </div>

      {/* Highlights */}
      {(most_played || most_completed) && (
        <div className="maker-metrics-highlights">
          {most_played && (
            <div className="maker-metric-highlight">
              <span className="maker-metric-highlight-label">Most Played</span>
              <span className="maker-metric-highlight-value">{most_played.title}</span>
              <span className="maker-metric-highlight-sub">{most_played.plays} plays</span>
            </div>
          )}
          {most_completed && (
            <div className="maker-metric-highlight">
              <span className="maker-metric-highlight-label">Most Finished</span>
              <span className="maker-metric-highlight-value">{most_completed.title}</span>
              <span className="maker-metric-highlight-sub">{most_completed.completion_rate}% completion</span>
            </div>
          )}
        </div>
      )}

      {/* 30-day chart */}
      <div className="maker-metrics-section">
        <h3 className="maker-metrics-section-title">Plays — Last 30 Days</h3>
        {time_series.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>No play data in the last 30 days.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={time_series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a8b5a0' }}
                tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#a8b5a0' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: '#a8b5a0' }}
                itemStyle={{ color: '#00ff88' }}
              />
              <Line type="monotone" dataKey="plays" stroke="#00ff88" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-work breakdown */}
      {works.length > 0 && (
        <div className="maker-metrics-section">
          <h3 className="maker-metrics-section-title">Per Work Breakdown</h3>
          <div className="maker-metrics-table-wrap">
            <table className="maker-metrics-table">
              <thead>
                <tr>
                  <th>Work</th>
                  <th>Type</th>
                  <th>Plays</th>
                  <th>Unique</th>
                  <th>Return</th>
                  <th>Completion</th>
                  <th>Downloads</th>
                </tr>
              </thead>
              <tbody>
                {works.map(w => (
                  <tr key={w.id}>
                    <td className="maker-metrics-work-title">{w.title}</td>
                    <td><span className="maker-metrics-type">{w.work_type}</span></td>
                    <td>{w.total_plays}</td>
                    <td>{w.unique_listeners}</td>
                    <td>{w.return_listeners}</td>
                    <td>{w.completion_rate}%</td>
                    <td>{w.download_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* What this means */}
      <div className="maker-metrics-section maker-metrics-explainer">
        <h3 className="maker-metrics-section-title">What This Means</h3>
        <div className="maker-metrics-explain-grid">
          <div>
            <strong>Completion Rate</strong>
            <p>The percentage of people who played more than 80% of a work. A high completion rate means people stayed for the whole thing — that's meaningful engagement, not just a click.</p>
          </div>
          <div>
            <strong>Return Listeners</strong>
            <p>People who played the same work more than once. Return listeners chose to come back. That's the truest signal that your work mattered to someone.</p>
          </div>
          <div>
            <strong>Unique Listeners</strong>
            <p>The count of distinct people who played your work — not counting repeats. This tells you how many individuals your work has actually reached.</p>
          </div>
          <div>
            <strong>Downloads</strong>
            <p>How many times your work was downloaded. This means someone wanted to keep it — for offline listening, sharing with someone, or archiving it. That's a strong signal of value.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="maker-metric-card">
      <span className="maker-metric-card-value">{value}</span>
      <span className="maker-metric-card-label">{label}</span>
    </div>
  );
}
