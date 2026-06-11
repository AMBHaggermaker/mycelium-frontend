import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ComposedChart, Line,
} from 'recharts';
import {
  useEnvLocation, LocationControls, DataFreshness, DivergenceAlert,
  QRPanel, PDFExportButton, HowThisWorksPanel, EnvDashNav,
  SeverityBadge, SEV_COLOR, fmtDate, API_BASE,
} from './WatchEnvShared';
import { useAuth } from '../auth';

export default function WatchSoil({ onRequireAuth }) {
  const { user } = useAuth();
  const { lat, lng, radius, view, setLocation, setRadius, setView } = useEnvLocation();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API_BASE}/watch-env/soil?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!r.ok) throw new Error('Failed to load soil data');
      setData(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [lat, lng, radius]);

  useEffect(() => { load(); }, [load]);

  const { officialScore, communityScore } = scoreSoil(data);
  const triChartData = buildTRIChart(data);
  const sampleChartData = buildSampleChart(data);

  return (
    <div className="page env-dashboard">
      <div className="container env-container">
        <div className="print-header" style={{ display: 'none' }}>
          <h2>Soil Quality Dashboard — Mycelium Watch</h2>
          <p>Generated {new Date().toLocaleString()} · EPA TRI + Community Soil Samples</p>
          <div className="platform-watermark">mycelium.unprecedentedtimes.org</div>
        </div>

        <EnvDashNav active="soil" />

        <div className="env-page-header">
          <div>
            <h1 className="page-title">🌱 Soil Quality</h1>
            <p className="page-subtitle">EPA TRI releases · Community soil samples · Drift corridor overlap</p>
          </div>
          <PDFExportButton title="Soil Quality" />
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
            {/* Summary */}
            <div className="env-summary-cards">
              <SummaryCard label="TRI Facilities Nearby" value={data.official?.tri_facilities?.length ?? 0} color={data.official?.tri_facilities?.length > 5 ? '#f59e0b' : undefined} />
              <SummaryCard label="Community Reports"     value={data.community?.total ?? 0} />
              <SummaryCard label="Soil Samples"          value={data.community?.soil_samples?.length ?? 0} />
              <SummaryCard label="Elevated Compounds"
                value={(data.community?.soil_samples || []).filter(s =>
                  (s.aluminum_ppb > 50) || (s.barium_ppb > 2) || (s.pfas_ppb > 0.1)).length}
                color="#ff4060" />
            </div>

            <div className="env-two-col">
              {/* TRI facilities bar chart */}
              <div className="env-chart-card">
                <h3 className="env-card-title">EPA TRI — Toxic Releases Nearby</h3>
                <p className="env-card-sub">Facilities reporting toxic releases to land near this location</p>
                {triChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={triChartData.slice(0, 10)} layout="vertical"
                      margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted)' }} width={80} />
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '.8rem' }} />
                      <Bar dataKey="total_lbs" name="Releases (lbs)" fill="#f59e0b99" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="env-no-data">
                    {data.official?.tri_facilities?.length > 0
                      ? 'TRI data loaded — no release quantity available in this view.'
                      : 'No EPA TRI facilities found within radius, or API temporarily unavailable.'}
                  </div>
                )}
              </div>

              {/* Soil sample compound levels */}
              <div className="env-chart-card">
                <h3 className="env-card-title">Community Soil Sample Compounds</h3>
                <p className="env-card-sub">ppb levels from submitted lab results · thresholds marked</p>
                {sampleChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={sampleChartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="compound" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '.8rem' }}
                        formatter={(val, name) => [`${val.toFixed(2)} ppb`, name]} />
                      <Legend />
                      <Bar dataKey="avg_ppb"  name="Average (ppb)"  fill="#4da6ff99" />
                      <Bar dataKey="max_ppb"  name="Peak (ppb)"     fill="#ff606099" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="env-no-data">No lab samples submitted yet.</div>
                )}
              </div>
            </div>

            {/* Community report + TRI map */}
            <div className="env-map-card">
              <h3 className="env-card-title">Contamination Map</h3>
              <MapContainer center={[lat, lng]} zoom={10} style={{ height: 340, borderRadius: 8 }}
                key={`${lat},${lng}`}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution="&copy; CartoDB"
                />
                {/* TRI facilities — orange */}
                {(data.official?.tri_facilities || [])
                  .filter(f => f.LATITUDE_MEAS && f.LONGITUDE_MEAS)
                  .map((f, i) => (
                    <CircleMarker key={`tri-${i}`}
                      center={[parseFloat(f.LATITUDE_MEAS), parseFloat(f.LONGITUDE_MEAS)]}
                      radius={10} pathOptions={{ color: '#f59e0b', fillOpacity: 0.7 }}>
                      <Popup>
                        <strong>TRI: {f.FACILITY_NAME}</strong><br />
                        {f.CITY_NAME}, {f.STATE_ABBR}
                      </Popup>
                    </CircleMarker>
                  ))}
                {/* Community reports */}
                {(data.community?.reports || []).filter(r => r.location_lat && r.location_lng).map(r => (
                  <CircleMarker key={r.id}
                    center={[parseFloat(r.location_lat), parseFloat(r.location_lng)]}
                    radius={7} pathOptions={{ color: SEV_COLOR[r.severity] || '#aaa', fillOpacity: 0.7 }}>
                    <Popup>
                      <strong>{r.title}</strong><br />
                      {r.severity} · {fmtDate(r.created_at)}
                    </Popup>
                  </CircleMarker>
                ))}
                {/* Soil samples */}
                {(data.community?.soil_samples || []).filter(s => s.location_lat && s.location_lng).map(s => (
                  <CircleMarker key={s.id}
                    center={[parseFloat(s.location_lat), parseFloat(s.location_lng)]}
                    radius={8} pathOptions={{ color: '#00d4aa', fillOpacity: 0.8, dashArray: '4 2' }}>
                    <Popup>
                      <strong>Soil Sample: {s.sample_type}</strong><br />
                      Al: {s.aluminum_ppb ?? '–'} ppb · Ba: {s.barium_ppb ?? '–'} ppb<br />
                      {s.username} · {fmtDate(s.created_at)}
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
              <p className="env-map-legend">
                <span style={{ color: '#f59e0b' }}>● TRI Facility</span>{' '}
                <span style={{ color: '#ff4060' }}>● Critical report</span>{' '}
                <span style={{ color: '#f59e0b' }}>● Serious report</span>{' '}
                <span style={{ color: '#00d4aa' }}>◌ Soil sample</span>
              </p>
            </div>

            {/* TRI facilities table */}
            {data.official?.tri_facilities?.length > 0 && (
              <div className="env-chart-card">
                <h3 className="env-card-title">EPA TRI Facilities — Detailed</h3>
                <div className="env-table-wrap">
                  <table className="env-table">
                    <thead>
                      <tr><th>Facility</th><th>City</th><th>Industry</th><th>Releases to Land</th></tr>
                    </thead>
                    <tbody>
                      {data.official.tri_facilities.slice(0, 20).map((f, i) => (
                        <tr key={i}>
                          <td>{f.FACILITY_NAME || '—'}</td>
                          <td>{f.CITY_NAME || '—'}</td>
                          <td style={{ fontSize: '.78rem' }}>{f.INDUSTRY_SECTOR || '—'}</td>
                          <td style={{ color: '#f59e0b' }}>{f.ON_SITE_RELEASE_TOTAL ? `${parseFloat(f.ON_SITE_RELEASE_TOTAL).toLocaleString()} lbs` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Community reports + soil samples */}
            <div className="env-two-col">
              <div className="env-chart-card">
                <h3 className="env-card-title">Community Soil &amp; Environment Reports</h3>
                {data.community?.reports?.length > 0 ? (
                  <div className="env-report-list">
                    {data.community.reports.slice(0, 10).map(r => (
                      <div key={r.id} className="env-report-row">
                        <SeverityBadge severity={r.severity} />
                        <span className="env-report-title">{r.title}</span>
                        <span className="env-report-user">{r.username}</span>
                        <span className="env-report-date">{fmtDate(r.created_at)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="env-no-data">No community reports in this area.</p>}
                {user
                  ? <a href="/watch?tab=environment" className="btn btn-sm btn-outline" style={{ marginTop: '.6rem' }}>Submit report →</a>
                  : <button className="btn btn-sm btn-outline" onClick={onRequireAuth} style={{ marginTop: '.6rem' }}>Sign in to submit</button>
                }
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                <QRPanel dashboard="soil" lat={lat} lng={lng} radius={radius} />
                {data.community?.soil_samples?.length > 0 && (
                  <div className="env-chart-card" style={{ padding: '.75rem' }}>
                    <strong style={{ fontSize: '.82rem' }}>Recent Soil Samples</strong>
                    {data.community.soil_samples.slice(0, 5).map(s => (
                      <div key={s.id} style={{ fontSize: '.78rem', padding: '.3rem 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600 }}>{s.sample_type?.replace(/_/g, ' ')} — {fmtDate(s.collection_date || s.created_at)}</div>
                        <div style={{ color: 'var(--muted)' }}>
                          Al: {s.aluminum_ppb ?? '–'} · Ba: {s.barium_ppb ?? '–'} · PFAS: {s.pfas_ppb ?? '–'} ppb
                        </div>
                        {s.ai_confidence && <div style={{ color: '#00d4aa' }}>AI: {s.ai_confidence} confidence</div>}
                      </div>
                    ))}
                    <a href="/watch?tab=atmospheric_observations" className="btn btn-xs btn-outline" style={{ marginTop: '.5rem', fontSize: '.75rem' }}>
                      Submit soil sample →
                    </a>
                  </div>
                )}
              </div>
            </div>

            <HowThisWorksPanel id="soil"
              what="Tracks soil contamination using EPA Toxics Release Inventory (TRI) facility data, community-submitted lab test results for heavy metals and PFAS compounds, and environment/food reports. Cross-references with the Atmospheric Observations drift corridor calculator."
              sources="EPA TRI (data.epa.gov): mandatory self-reported toxic chemical releases by industrial facilities. Community: Mycelium soil/rainwater lab result submissions analyzed by AI for compound origin."
              methodology="EPA TRI data is queried using a geographic bounding box. Community soil samples are pulled from the platform database and charted by compound with AI assessment confidence. Drift corridors from atmospheric observations are cross-referenced to identify downwind deposition risk zones."
              community="Verified members can submit soil and rainwater test results through the Atmospheric Observations dashboard. Lab results showing elevated aluminum, barium, strontium, or PFAS trigger AI compound-origin analysis using Claude, which estimates probable industrial sources."
            />
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="env-summary-card">
      <div className="env-summary-val" style={color ? { color } : {}}>{value}</div>
      <div className="env-summary-label">{label}</div>
    </div>
  );
}

function buildTRIChart(data) {
  return (data?.official?.tri_facilities || [])
    .filter(f => f.ON_SITE_RELEASE_TOTAL)
    .map(f => ({
      name:       (f.FACILITY_NAME || '').slice(0, 20),
      total_lbs:  parseFloat(f.ON_SITE_RELEASE_TOTAL) || 0,
    }))
    .sort((a, b) => b.total_lbs - a.total_lbs);
}

function buildSampleChart(data) {
  const samples = data?.community?.soil_samples || [];
  if (!samples.length) return [];
  const compounds = ['aluminum_ppb', 'barium_ppb', 'strontium_ppb', 'pfas_ppb'];
  return compounds.map(c => {
    const vals = samples.map(s => parseFloat(s[c])).filter(v => !isNaN(v) && v > 0);
    if (!vals.length) return null;
    return {
      compound: c.replace('_ppb', '').replace('_', ' '),
      avg_ppb:  +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3),
      max_ppb:  +Math.max(...vals).toFixed(3),
    };
  }).filter(Boolean);
}

function scoreSoil(data) {
  if (!data) return {};
  const triFacilities = data.official?.tri_facilities?.length || 0;
  const criticalReports = (data.community?.reports || []).filter(r =>
    ['critical', 'serious'].includes(r.severity)).length;
  return {
    officialScore:  triFacilities + 1,
    communityScore: criticalReports * 2 + 1,
  };
}
