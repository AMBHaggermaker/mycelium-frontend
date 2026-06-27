import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import {
  useEnvLocation, LocationControls, DataFreshness, DivergenceAlert,
  QRPanel, PDFExportButton, HowThisWorksPanel, EnvDashNav,
  SeverityBadge, SEV_COLOR, fmtDate, API_BASE,
} from './WatchEnvShared';
import { useAuth } from '../auth';
import { safeArray, safeString, safeNumber } from '../utils/safeData';

export default function WatchSoil({ onRequireAuth }) {
  const { user } = useAuth();
  const { lat, lng, radius, view, setLocation, setRadius, setView } = useEnvLocation();
  const [data,              setData]              = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState(null);
  const [officialUnavailable, setOfficialUnavailable] = useState(false);

  useEffect(() => {
    const prev = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('[WatchSoil] window.onerror', { message, source, lineno, colno, stack: error?.stack });
      if (typeof prev === 'function') return prev(message, source, lineno, colno, error);
    };
    return () => { window.onerror = prev; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setOfficialUnavailable(false);
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 12000);
    try {
      const resp = await fetch(`${API_BASE}/watch-env/soil?lat=${lat}&lng=${lng}&radius=${radius}`, {
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error('Failed to load soil data');
      const json = await resp.json();
      setData(json && typeof json === 'object' && !Array.isArray(json) ? json : null);
    } catch (e) {
      if (e.name === 'AbortError') {
        setOfficialUnavailable(true);
        setData({ official: { tri_facilities: [], usda_available: false }, community: { reports: [], soil_samples: [], trend: [], total: 0 }, freshness: {} });
      } else {
        setError(e.message);
      }
    } finally { clearTimeout(timeoutId); setLoading(false); }
  }, [lat, lng, radius]);

  useEffect(() => { load(); }, [load]);

  let officialScore   = null;
  let communityScore  = null;
  let triChartData    = [];
  let sampleChartData = [];
  let triFacilities   = [];
  let reports         = [];
  let soilSamples     = [];
  try {
    ({ officialScore, communityScore } = scoreSoil(data));
    triChartData    = buildTRIChart(data);
    sampleChartData = buildSampleChart(data);
    triFacilities   = safeArray(data?.official?.tri_facilities);
    reports         = safeArray(data?.community?.reports);
    soilSamples     = safeArray(data?.community?.soil_samples);
  } catch (prepErr) { console.error('[WatchSoil] data-prep error', prepErr); }

  try {
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

          {officialUnavailable && (
            <div className="env-info-notice" style={{ borderColor: 'rgba(245,158,11,.4)', color: '#f59e0b' }}>
              EPA TRI data is temporarily unavailable — official release data could not be loaded. Community data is shown below. Please try again later.
            </div>
          )}

          {data && !loading && (
            <>
              {/* Summary */}
              <div className="env-summary-cards">
                <SummaryCard label="TRI Facilities Nearby" value={triFacilities.length} color={triFacilities.length > 5 ? '#f59e0b' : undefined} />
                <SummaryCard label="Community Reports"     value={safeNumber(data.community?.total)} />
                <SummaryCard label="Soil Samples"          value={soilSamples.length} />
                <SummaryCard label="Elevated Compounds"
                  value={soilSamples.filter(s =>
                    safeNumber(s.aluminum_ppb) > 50 ||
                    safeNumber(s.barium_ppb) > 2 ||
                    safeNumber(s.pfas_ppb) > 0.1).length}
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
                    <div className="env-no-data">No official data available for this area yet</div>
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
                        <Tooltip
                          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '.8rem' }}
                          formatter={(val, name) => [
                            val != null && !isNaN(val) ? `${Number(val).toFixed(2)} ppb` : '—',
                            name,
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="avg_ppb"  name="Average (ppb)"  fill="#4da6ff99" />
                        <Bar dataKey="max_ppb"  name="Peak (ppb)"     fill="#ff606099" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="env-no-data">No community reports yet</div>
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
                  {triFacilities.map((f, i) => {
                    const tlat = parseFloat(f.LATITUDE_MEAS);
                    const tlng = parseFloat(f.LONGITUDE_MEAS);
                    if (isNaN(tlat) || isNaN(tlng) || tlat === 0 || tlng === 0) return null;
                    return (
                      <CircleMarker key={`tri-${i}`}
                        center={[tlat, tlng]}
                        radius={10} pathOptions={{ color: '#f59e0b', fillOpacity: 0.7 }}>
                        <Popup>
                          <strong>TRI: {safeString(f.FACILITY_NAME || f.facility_name) || 'Facility'}</strong><br />
                          {safeString(f.CITY_NAME || f.city_name)}{f.STATE_ABBR ? `, ${f.STATE_ABBR}` : ''}
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                  {reports.map(rep => {
                    const rlat = parseFloat(rep.location_lat);
                    const rlng = parseFloat(rep.location_lng);
                    if (isNaN(rlat) || isNaN(rlng)) return null;
                    return (
                      <CircleMarker key={rep.id}
                        center={[rlat, rlng]}
                        radius={7} pathOptions={{ color: SEV_COLOR[rep.severity] || '#aaa', fillOpacity: 0.7 }}>
                        <Popup>
                          <strong>{safeString(rep.title)}</strong><br />
                          {safeString(rep.severity)} · {fmtDate(rep.created_at)}
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                  {soilSamples.map(s => {
                    const slat = parseFloat(s.location_lat);
                    const slng = parseFloat(s.location_lng);
                    if (isNaN(slat) || isNaN(slng)) return null;
                    return (
                      <CircleMarker key={s.id}
                        center={[slat, slng]}
                        radius={8} pathOptions={{ color: '#00d4aa', fillOpacity: 0.8, dashArray: '4 2' }}>
                        <Popup>
                          <strong>Soil Sample: {safeString(s.sample_type)}</strong><br />
                          Al: {s.aluminum_ppb ?? '–'} ppb · Ba: {s.barium_ppb ?? '–'} ppb<br />
                          {safeString(s.username)} · {fmtDate(s.created_at)}
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
                <p className="env-map-legend">
                  <span style={{ color: '#f59e0b' }}>● TRI Facility</span>{' '}
                  <span style={{ color: '#ff4060' }}>● Critical report</span>{' '}
                  <span style={{ color: '#f59e0b' }}>● Serious report</span>{' '}
                  <span style={{ color: '#00d4aa' }}>◌ Soil sample</span>
                </p>
              </div>

              {/* TRI facilities table */}
              {triFacilities.length > 0 && (
                <div className="env-chart-card">
                  <h3 className="env-card-title">EPA TRI Facilities — Detailed</h3>
                  <div className="env-table-wrap">
                    <table className="env-table">
                      <thead>
                        <tr><th>Facility</th><th>City</th><th>Industry</th><th>Releases to Land</th></tr>
                      </thead>
                      <tbody>
                        {triFacilities.slice(0, 20).map((f, i) => {
                          const name     = safeString(f.FACILITY_NAME    || f.facility_name)    || '—';
                          const city     = safeString(f.CITY_NAME        || f.city_name)        || '—';
                          const sector   = safeString(f.INDUSTRY_SECTOR  || f.industry_sector)  || '—';
                          const releases = f.ON_SITE_RELEASE_TOTAL || f.on_site_release_total;
                          return (
                            <tr key={i}>
                              <td>{name}</td>
                              <td>{city}</td>
                              <td style={{ fontSize: '.78rem' }}>{sector}</td>
                              <td style={{ color: '#f59e0b' }}>
                                {releases ? `${parseFloat(releases).toLocaleString()} lbs` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Community reports + soil samples */}
              <div className="env-two-col">
                <div className="env-chart-card">
                  <h3 className="env-card-title">Community Soil &amp; Environment Reports</h3>
                  {reports.length > 0 ? (
                    <div className="env-report-list">
                      {reports.slice(0, 10).map(rep => (
                        <div key={rep.id} className="env-report-row">
                          <SeverityBadge severity={rep.severity} />
                          <span className="env-report-title">{safeString(rep.title)}</span>
                          <span className="env-report-user">{safeString(rep.username)}</span>
                          <span className="env-report-date">{fmtDate(rep.created_at)}</span>
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
                  {soilSamples.length > 0 && (
                    <div className="env-chart-card" style={{ padding: '.75rem' }}>
                      <strong style={{ fontSize: '.82rem' }}>Recent Soil Samples</strong>
                      {soilSamples.slice(0, 5).map(s => (
                        <div key={s.id} style={{ fontSize: '.78rem', padding: '.3rem 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ fontWeight: 600 }}>
                            {safeString(s.sample_type).replace(/_/g, ' ')} — {fmtDate(s.collection_date || s.created_at)}
                          </div>
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
  } catch (err) {
    console.error('[WatchSoil] render error', err);
    return (
      <div className="page env-dashboard">
        <div className="container env-container">
          <p className="error-msg" style={{ marginTop: '3rem' }}>
            Soil dashboard failed to render. Please refresh the page.
          </p>
        </div>
      </div>
    );
  }
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
  return safeArray(data?.official?.tri_facilities)
    .filter(f => f.ON_SITE_RELEASE_TOTAL)
    .map(f => ({
      name:      safeString(f.FACILITY_NAME).slice(0, 20),
      total_lbs: safeNumber(f.ON_SITE_RELEASE_TOTAL),
    }))
    .sort((a, b) => b.total_lbs - a.total_lbs);
}

function buildSampleChart(data) {
  const samples = safeArray(data?.community?.soil_samples);
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
  }).filter(Boolean).filter(pt => !isNaN(pt.avg_ppb) && !isNaN(pt.max_ppb));
}

function scoreSoil(data) {
  if (!data) return {};
  const triFacilities = safeArray(data.official?.tri_facilities).length;
  const criticalReports = safeArray(data.community?.reports)
    .filter(rep => ['critical', 'serious'].includes(rep.severity)).length;
  return {
    officialScore:  triFacilities + 1,
    communityScore: criticalReports * 2 + 1,
  };
}
