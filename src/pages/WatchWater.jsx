import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import {
  useEnvLocation, LocationControls, DataFreshness, DivergenceAlert,
  QRPanel, PDFExportButton, HowThisWorksPanel, EnvDashNav,
  SeverityBadge, SEV_COLOR, fmtDate, API_BASE,
} from './WatchEnvShared';
import { useAuth } from '../auth';

const PARAM_COLORS = { pH: '#4da6ff', 'Dissolved oxygen': '#00d4aa', Turbidity: '#f59e0b', Nitrate: '#ff6b6b' };

export default function WatchWater({ onRequireAuth }) {
  const { user, token } = useAuth();
  const { lat, lng, radius, view, setLocation, setRadius, setView } = useEnvLocation();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [billForm, setBillForm] = useState({ show: false });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API_BASE}/watch-env/water?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!r.ok) throw new Error('Failed to load water data');
      setData(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [lat, lng, radius]);

  useEffect(() => { load(); }, [load]);

  // Build unified time-series chart data (official + community on same x-axis)
  const chartData = buildWaterChart(data);
  const { officialScore, communityScore } = scoreWater(data);

  return (
    <div className="page env-dashboard">
      <div className="container env-container">
        <div className="print-header" style={{ display: 'none' }}>
          <h2>Water Quality Dashboard — Mycelium Watch</h2>
          <p>Generated {new Date().toLocaleString()} · Source: USGS Water Quality Portal + EPA ECHO + Community Reports</p>
          <div className="platform-watermark">mycelium.unprecedentedtimes.org</div>
        </div>

        <EnvDashNav active="water" />

        <div className="env-page-header">
          <div>
            <h1 className="page-title">💧 Water Quality</h1>
            <p className="page-subtitle">USGS monitoring · EPA ECHO violations · Community reports</p>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
            <PDFExportButton title="Water Quality" />
          </div>
        </div>

        <LocationControls lat={lat} lng={lng} radius={radius} view={view}
          onLocation={setLocation} onRadius={setRadius} onView={setView} />

        {data && (
          <DataFreshness officialTs={data.freshness?.official_updated}
            communityTs={data.freshness?.community_latest} />
        )}

        <DivergenceAlert officialScore={officialScore} communityScore={communityScore} />

        {loading && <div className="spinner" style={{ margin: '3rem auto' }} />}
        {error   && <p className="error-msg">{error}</p>}

        {data && !loading && (
          <>
            {/* Summary cards */}
            <div className="env-summary-cards">
              <SummaryCard label="Community Reports" value={data.community?.total ?? 0} sub="watershed + environment" />
              <SummaryCard label="USGS Parameters" value={data.official?.usgs_params?.length ?? 0} sub="monitored" />
              <SummaryCard label="Nearby Violations" value={data.official?.echo_facilities?.length ?? 0} sub="EPA ECHO" color="#f59e0b" />
              <SummaryCard label="Data Source" value="USGS WQP" sub="live query" />
            </div>

            {/* Time-series chart */}
            <div className="env-chart-card">
              <h3 className="env-card-title">Water Parameters Over Time</h3>
              <p className="env-card-sub">Blue = official USGS · Green = community report trend</p>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#4da6ff' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#00ff88' }} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '.8rem' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="ph_official"
                      name="pH (official)" stroke="#4da6ff" dot={false} strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="do_official"
                      name="DO (official)" stroke="#00d4aa" dot={false} strokeWidth={2} />
                    <Bar yAxisId="right" dataKey="community_count"
                      name="Community reports" fill="#00ff8844" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', padding: '1rem 0' }}>
                  No time-series data available for this location.
                </p>
              )}
            </div>

            {/* USGS parameter breakdown */}
            {data.official?.usgs_params?.length > 0 && (
              <div className="env-chart-card">
                <h3 className="env-card-title">USGS Parameter Readings</h3>
                {data.official.usgs_params.map(p => {
                  const latest = p.points?.slice(-1)[0];
                  return (
                    <div key={p.name} className="env-param-row">
                      <span className="env-param-name" style={{ color: PARAM_COLORS[p.name] || '#aaa' }}>{p.name}</span>
                      <span className="env-param-val">{latest?.value?.toFixed(2) ?? '–'}</span>
                      <span className="env-param-date">{fmtDate(latest?.date)}</span>
                      <span className="env-param-count">{p.points?.length} readings</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="env-two-col">
              {/* Map */}
              <div className="env-map-card">
                <h3 className="env-card-title">Map</h3>
                <MapContainer center={[lat, lng]} zoom={10} style={{ height: 320, borderRadius: 8 }}
                  key={`${lat},${lng}`}>
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution="&copy; CartoDB"
                  />
                  {/* Community reports */}
                  {data.community?.reports?.filter(r => r.location_lat && r.location_lng).map(r => (
                    <CircleMarker key={r.id}
                      center={[parseFloat(r.location_lat), parseFloat(r.location_lng)]}
                      radius={8} pathOptions={{ color: SEV_COLOR[r.severity] || '#aaa', fillOpacity: 0.7 }}>
                      <Popup>
                        <strong>{r.title}</strong><br />
                        {r.report_type} · {r.severity}<br />
                        {fmtDate(r.created_at)}
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
                <p className="env-map-legend">
                  <span style={{ color: SEV_COLOR.critical }}>● Critical</span>{' '}
                  <span style={{ color: SEV_COLOR.serious }}>● Serious</span>{' '}
                  <span style={{ color: SEV_COLOR.moderate }}>● Moderate</span>{' '}
                  <span style={{ color: SEV_COLOR.minor }}>● Minor</span>
                </p>
              </div>

              {/* QR code */}
              <div className="env-side-panel">
                <h3 className="env-card-title">Share This View</h3>
                <QRPanel dashboard="water" lat={lat} lng={lng} radius={radius} />
                <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.5rem', textAlign: 'center' }}>
                  Scan to open this dashboard with current location
                </p>
                <div style={{ marginTop: '.75rem' }}>
                  <a href="https://www.huntsvilleal.gov/residents/utilities"
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn-sm btn-outline btn-full">
                    Huntsville Utilities CCR →
                  </a>
                </div>
              </div>
            </div>

            {/* EPA ECHO violations */}
            {data.official?.echo_facilities?.length > 0 && (
              <div className="env-chart-card">
                <h3 className="env-card-title">EPA ECHO — Nearby CWA Facilities</h3>
                <div className="env-table-wrap">
                  <table className="env-table">
                    <thead>
                      <tr>
                        <th>Facility</th><th>City</th><th>Type</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.official.echo_facilities.map((f, i) => (
                        <tr key={i}>
                          <td>{f.FacilityName || '—'}</td>
                          <td>{f.FacilityCity || '—'}</td>
                          <td>{f.PermitTypes?.join(', ') || '—'}</td>
                          <td style={{ color: f.ViolationStatus === 'No Violation' ? 'var(--green)' : '#f59e0b' }}>
                            {f.ViolationStatus || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Community reports */}
            {data.community?.reports?.length > 0 && (
              <div className="env-chart-card">
                <h3 className="env-card-title">Community Reports — Water &amp; Watershed</h3>
                <div className="env-report-list">
                  {data.community.reports.map(r => (
                    <div key={r.id} className="env-report-row">
                      <SeverityBadge severity={r.severity} />
                      <span className="env-report-title">{r.title}</span>
                      <span className="env-report-type">{r.report_type}</span>
                      <span className="env-report-user">{r.username}</span>
                      <span className="env-report-date">{fmtDate(r.created_at)}</span>
                    </div>
                  ))}
                </div>
                {user ? (
                  <a href="/watch?tab=watershed" className="btn btn-sm btn-outline" style={{ marginTop: '.75rem' }}>
                    Submit a watershed report →
                  </a>
                ) : (
                  <button className="btn btn-sm btn-outline" onClick={onRequireAuth} style={{ marginTop: '.75rem' }}>
                    Sign in to submit a report
                  </button>
                )}
              </div>
            )}

            <HowThisWorksPanel id="water"
              what="Tracks water quality across streams, lakes, and municipal systems using official USGS monitoring station data and community-submitted observations. Includes EPA discharge monitoring and violation data for industrial facilities near the location."
              sources="USGS Water Quality Portal (waterqualitydata.us): real-time and historical readings from monitoring stations. EPA ECHO: Clean Water Act facility compliance and violation records."
              methodology="USGS station data is queried using a bounding box around the selected location. EPA ECHO queries by latitude/longitude radius. Community trend is computed from report counts weighted by severity."
              community="Community reports come from Mycelium's Watershed and Environment dashboards. Verified members report taste/odor/color issues, observed contamination, illness clusters, and infrastructure concerns. These supplement official monitoring especially in areas without nearby USGS stations."
            />
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="env-summary-card">
      <div className="env-summary-val" style={color ? { color } : {}}>{value}</div>
      <div className="env-summary-label">{label}</div>
      {sub && <div className="env-summary-sub">{sub}</div>}
    </div>
  );
}

function buildWaterChart(data) {
  if (!data) return [];
  // Build by month: pH official, DO official, community count
  const map = {};

  (data.official?.usgs_params || []).forEach(param => {
    param.points?.forEach(pt => {
      const m = pt.date?.slice(0, 7); if (!m) return;
      map[m] = map[m] || { date: m };
      if (param.name === 'pH') map[m].ph_official = pt.value;
      if (param.name === 'Dissolved oxygen') map[m].do_official = pt.value;
    });
  });

  (data.community?.trend || []).forEach(t => {
    map[t.month] = map[t.month] || { date: t.month };
    map[t.month].community_count = t.count;
  });

  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function scoreWater(data) {
  if (!data) return { officialScore: null, communityScore: null };
  const violations = data.official?.echo_facilities?.filter(f => f.ViolationStatus !== 'No Violation').length || 0;
  const communitySerious = (data.community?.reports || []).filter(r =>
    ['critical', 'serious'].includes(r.severity)).length;
  const total = data.community?.total || 1;
  return {
    officialScore:  violations + 1,
    communityScore: (communitySerious / total) * 10 + 1,
  };
}
