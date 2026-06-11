import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import {
  useEnvLocation, LocationControls, DataFreshness, DivergenceAlert,
  QRPanel, PDFExportButton, HowThisWorksPanel, EnvDashNav,
  SeverityBadge, SEV_COLOR, fmtDate, API_BASE,
} from './WatchEnvShared';
import { useAuth } from '../auth';

function aqiColor(aqi) {
  if (!aqi && aqi !== 0) return '#a8b5a0';
  if (aqi <= 50)  return '#00e400';
  if (aqi <= 100) return '#ffff00';
  if (aqi <= 150) return '#ff7e00';
  if (aqi <= 200) return '#ff0000';
  if (aqi <= 300) return '#8f3f97';
  return '#7e0023';
}

function aqiLabel(aqi) {
  if (!aqi && aqi !== 0) return 'Unknown';
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

export default function WatchAir({ onRequireAuth }) {
  const { user } = useAuth();
  const { lat, lng, radius, view, setLocation, setRadius, setView } = useEnvLocation();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API_BASE}/watch-env/air?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (!r.ok) throw new Error('Failed to load air data');
      setData(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [lat, lng, radius]);

  useEffect(() => { load(); }, [load]);

  const aqi  = data?.official?.current_aqi;
  const aqiC = aqiColor(aqi);

  const chartData = buildAirChart(data);
  const { officialScore, communityScore } = scoreAir(data);

  return (
    <div className="page env-dashboard">
      <div className="container env-container">
        <div className="print-header" style={{ display: 'none' }}>
          <h2>Air Quality Dashboard — Mycelium Watch</h2>
          <p>Generated {new Date().toLocaleString()} · EPA AirNow + AQS + Community Observations</p>
          <div className="platform-watermark">mycelium.unprecedentedtimes.org</div>
        </div>

        <EnvDashNav active="air" />

        <div className="env-page-header">
          <div>
            <h1 className="page-title">🌬️ Air Quality</h1>
            <p className="page-subtitle">AirNow AQI · EPA AQS historical · Community observations</p>
          </div>
          <PDFExportButton title="Air Quality" />
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
            {/* AQI Gauge + params */}
            <div className="env-two-col env-two-col--wide-left">
              <div className="env-chart-card">
                <h3 className="env-card-title">Current Air Quality Index</h3>
                {aqi !== null ? (
                  <div className="env-aqi-gauge-wrap">
                    <div className="env-aqi-circle" style={{ borderColor: aqiC, boxShadow: `0 0 24px ${aqiC}66` }}>
                      <span className="env-aqi-value" style={{ color: aqiC }}>{aqi}</span>
                      <span className="env-aqi-label">{aqiLabel(aqi)}</span>
                    </div>
                    <div className="env-aqi-params">
                      {(data.official?.aqi_params || []).map(p => (
                        <div key={p.param} className="env-aqi-param-row">
                          <span>{p.param}</span>
                          <span style={{ color: aqiColor(p.aqi), fontWeight: 700 }}>{p.aqi}</span>
                          <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{p.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
                    AirNow data unavailable. Configure AIRNOW_API_KEY in .env for live AQI.
                  </p>
                )}

                {/* AQI color scale legend */}
                <div className="env-aqi-scale">
                  {[
                    { label: 'Good',            color: '#00e400', range: '0–50' },
                    { label: 'Moderate',         color: '#ffff00', range: '51–100' },
                    { label: 'Unhlthy Sens.',    color: '#ff7e00', range: '101–150' },
                    { label: 'Unhealthy',        color: '#ff0000', range: '151–200' },
                    { label: 'Very Unhealthy',   color: '#8f3f97', range: '201–300' },
                    { label: 'Hazardous',        color: '#7e0023', range: '301+' },
                  ].map(s => (
                    <div key={s.label} className="env-aqi-scale-item">
                      <span className="env-aqi-scale-dot" style={{ background: s.color }} />
                      <span>{s.label}</span>
                      <span className="env-aqi-scale-range">{s.range}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                <SummaryCard label="Community Observations" value={data.community?.total ?? 0} />
                <SummaryCard label="Unexplained / Unidentified"
                  value={(data.community?.observations || []).filter(o =>
                    ['UNEXPLAINED','UNIDENTIFIED'].includes(o.classification)).length}
                  color="#f59e0b" />
                <SummaryCard label="AQS Trend Points" value={data.official?.aqs_trend?.length ?? 0} />
                <QRPanel dashboard="air" lat={lat} lng={lng} radius={radius} />
              </div>
            </div>

            {/* 30-day trend chart */}
            <div className="env-chart-card">
              <h3 className="env-card-title">30-Day AQI Trend</h3>
              <p className="env-card-sub">Blue = EPA AQS official · Green = community observation count</p>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                    <YAxis yAxisId="left" domain={[0, 200]} tick={{ fontSize: 11, fill: '#4da6ff' }} label={{ value: 'AQI', angle: -90, position: 'insideLeft', fill: '#4da6ff', fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#00ff88' }} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '.8rem' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="aqi_official"
                      name="AQI (official)" stroke="#4da6ff" dot={false} strokeWidth={2} />
                    <Bar yAxisId="right" dataKey="community_count"
                      name="Community observations" fill="#00ff8844" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: '.85rem', padding: '1rem 0' }}>No trend data available.</p>
              )}
            </div>

            <div className="env-two-col">
              {/* Map */}
              <div className="env-map-card">
                <h3 className="env-card-title">Observation Map</h3>
                <MapContainer center={[lat, lng]} zoom={10} style={{ height: 300, borderRadius: 8 }}
                  key={`${lat},${lng}`}>
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution="&copy; CartoDB"
                  />
                  {(data.community?.observations || []).filter(o => o.location_lat && o.location_lng).map(o => {
                    const cls = o.classification;
                    const c = cls === 'UNEXPLAINED' ? '#f59e0b' : cls === 'UNIDENTIFIED' ? '#ff4060' : cls === 'EXPLAINED' ? '#00e400' : '#4da6ff';
                    return (
                      <CircleMarker key={o.id}
                        center={[parseFloat(o.location_lat), parseFloat(o.location_lng)]}
                        radius={8} pathOptions={{ color: c, fillOpacity: 0.7 }}>
                        <Popup>
                          <strong>{o.report_type}</strong><br />
                          {o.classification}<br />
                          {fmtDate(o.observed_at)}
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                  {(data.community?.reports || []).filter(r => r.location_lat && r.location_lng).map(r => (
                    <CircleMarker key={r.id}
                      center={[parseFloat(r.location_lat), parseFloat(r.location_lng)]}
                      radius={6} pathOptions={{ color: SEV_COLOR[r.severity] || '#aaa', fillOpacity: 0.6 }}>
                      <Popup>
                        <strong>{r.title}</strong><br />
                        {r.severity} · {fmtDate(r.created_at)}
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
                <p className="env-map-legend">
                  <span style={{ color: '#00e400' }}>● Explained</span>{' '}
                  <span style={{ color: '#f59e0b' }}>● Unexplained</span>{' '}
                  <span style={{ color: '#ff4060' }}>● Unidentified</span>{' '}
                  <span style={{ color: '#4da6ff' }}>● Partial</span>
                </p>
              </div>

              {/* Atmospheric observations list */}
              <div className="env-chart-card" style={{ flex: 1 }}>
                <h3 className="env-card-title">Atmospheric Observations</h3>
                {data.community?.observations?.length > 0 ? (
                  <div className="env-report-list">
                    {data.community.observations.slice(0, 10).map(o => (
                      <div key={o.id} className="env-report-row">
                        <span style={{
                          fontSize: '.68rem', fontWeight: 700, padding: '.1rem .4rem', borderRadius: 99,
                          background: o.classification === 'UNEXPLAINED' ? 'rgba(245,158,11,.15)' :
                                      o.classification === 'UNIDENTIFIED' ? 'rgba(255,64,96,.15)' : 'rgba(0,212,170,.1)',
                          color:      o.classification === 'UNEXPLAINED' ? '#f59e0b' :
                                      o.classification === 'UNIDENTIFIED' ? '#ff4060' : '#00d4aa',
                        }}>
                          {o.classification || 'PENDING'}
                        </span>
                        <span className="env-report-title">{o.report_type?.replace(/_/g, ' ')}</span>
                        <span className="env-report-user">{o.username}</span>
                        <span className="env-report-date">{fmtDate(o.observed_at)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>No observations near this location.</p>}
                <a href="/watch?tab=atmospheric_observations" className="btn btn-sm btn-outline" style={{ marginTop: '.6rem' }}>
                  View full Atmospheric dashboard →
                </a>
              </div>
            </div>

            <HowThisWorksPanel id="air"
              what="Tracks air quality using EPA AirNow real-time AQI, EPA AQS historical concentration data, and community atmospheric observations including the existing Mycelium flight cross-reference and NOAA weather correlation system."
              sources="EPA AirNow: current AQI for PM2.5, PM10, ozone, CO, and NO2 by zip code. EPA AQS: historical daily measurements by county. Community: Mycelium Atmospheric Observations dashboard with OpenSky/Fli flight cross-reference."
              methodology="AQI is pulled in real-time from AirNow using the zip code nearest the selected location. Trend data comes from the EPA AQS public API for Madison County (FIPS 01089). Community trend tracks report and observation submission volume weighted by severity."
              community="Community data comes from Mycelium's Atmospheric Observations dashboard — each submission is cross-referenced with live OpenSky flight data and NOAA humidity/wind conditions. Observations classified UNEXPLAINED or UNIDENTIFIED appear here with their classification badges."
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

function buildAirChart(data) {
  if (!data) return [];
  const map = {};
  (data.official?.aqs_trend || []).forEach(d => {
    const key = d.date?.slice(0, 7); if (!key) return;
    map[key] = map[key] || { date: key };
    if (!map[key].aqi_official || map[key].aqi_official < d.aqi) map[key].aqi_official = d.aqi;
  });
  (data.community?.trend || []).forEach(t => {
    map[t.month] = map[t.month] || { date: t.month };
    map[t.month].community_count = t.count;
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function scoreAir(data) {
  if (!data) return { officialScore: null, communityScore: null };
  const aqi = data.official?.current_aqi;
  const unexplained = (data.community?.observations || []).filter(o =>
    ['UNEXPLAINED','UNIDENTIFIED'].includes(o.classification)).length;
  const totalObs = Math.max(1, data.community?.observations?.length || 1);
  return {
    officialScore:  aqi ? aqi / 100 : null,
    communityScore: (unexplained / totalObs) * 2,
  };
}
