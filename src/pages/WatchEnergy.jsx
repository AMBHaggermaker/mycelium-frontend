import { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  useEnvLocation, LocationControls, DataFreshness, DivergenceAlert,
  QRPanel, PDFExportButton, HowThisWorksPanel, EnvDashNav,
  SeverityBadge, fmtDate, API_BASE,
} from './WatchEnvShared';
import { useAuth } from '../auth';

const FUEL_COLORS = {
  COL: '#888',   NG: '#f59e0b',   NUC: '#8b5cf6',
  SUN: '#fbbf24', WND: '#34d399',  WAT: '#4da6ff',
  OTH: '#a8b5a0',
};
const FUEL_LABELS = {
  COL: 'Coal', NG: 'Natural Gas', NUC: 'Nuclear',
  SUN: 'Solar', WND: 'Wind', WAT: 'Hydro', OTH: 'Other',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function WatchEnergy({ onRequireAuth }) {
  const { user, token } = useAuth();
  const { lat, lng, radius, view, setLocation, setRadius, setView } = useEnvLocation();
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [showBill,  setShowBill]  = useState(false);
  const [billForm,  setBillForm]  = useState({ bill_month: '', kwh_used: '', total_amount: '', utility_provider: 'Huntsville Utilities', zip_code: '', has_smart_meter: false, notes: '' });
  const [billBusy,  setBillBusy]  = useState(false);
  const [billErr,   setBillErr]   = useState(null);
  const [billOk,    setBillOk]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API_BASE}/watch-env/energy`);
      if (!r.ok) throw new Error('Failed to load energy data');
      setData(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitBill(e) {
    e.preventDefault();
    if (!token) { onRequireAuth?.(); return; }
    setBillBusy(true); setBillErr(null);
    try {
      const r = await fetch(`${API_BASE}/watch-env/energy-bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...billForm,
          kwh_used:     parseFloat(billForm.kwh_used),
          total_amount: parseFloat(billForm.total_amount),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Submit failed');
      setBillOk(true);
      setShowBill(false);
      load();
    } catch (e) { setBillErr(e.message); }
    finally { setBillBusy(false); }
  }

  const fuelMixChart = buildFuelMix(data);
  const priceChart   = buildPriceChart(data);
  const billChart    = buildBillChart(data);
  const { officialScore, communityScore } = scoreEnergy(data);

  return (
    <div className="page env-dashboard">
      <div className="container env-container">
        <div className="print-header" style={{ display: 'none' }}>
          <h2>Energy Dashboard — Mycelium Watch</h2>
          <p>Generated {new Date().toLocaleString()} · EIA · TVA · Community Bill Tracker</p>
          <div className="platform-watermark">mycelium.unprecedentedtimes.org</div>
        </div>

        <EnvDashNav active="energy" />

        <div className="env-page-header">
          <div>
            <h1 className="page-title">⚡ Energy</h1>
            <p className="page-subtitle">TVA generation mix · EIA price trends · Community bill tracker</p>
          </div>
          <PDFExportButton title="Energy" />
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
            {!data.official?.eia_available && (
              <div className="env-info-notice">
                EIA API key configured. Prices and generation data are loading from the U.S. Energy Information Administration.
              </div>
            )}

            {/* Summary cards */}
            <div className="env-summary-cards">
              <SummaryCard label="Community Bills Tracked" value={data.community?.bill_aggregate?.reduce((s, r) => s + r.submissions, 0) ?? 0} />
              <SummaryCard label="Avg $/kWh (latest)"
                value={data.community?.bill_aggregate?.[0]?.avg_rate_per_kwh
                  ? `$${data.community.bill_aggregate[0].avg_rate_per_kwh}`
                  : '—'} />
              <SummaryCard label="Infra Reports" value={data.community?.reports?.length ?? 0} />
              <SummaryCard label="TVA Region" value="TN Valley" sub="official source: EIA" />
            </div>

            <div className="env-two-col">
              {/* TVA generation mix donut */}
              <div className="env-chart-card">
                <h3 className="env-card-title">TVA Generation Mix (Latest)</h3>
                {fuelMixChart.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <PieChart width={200} height={200}>
                      <Pie data={fuelMixChart} cx={95} cy={95} innerRadius={55} outerRadius={85}
                        dataKey="value" nameKey="name" paddingAngle={2}>
                        {fuelMixChart.map((entry, i) => (
                          <Cell key={i} fill={FUEL_COLORS[entry.key] || '#aaa'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v.toFixed(1)} GWh`, '']}
                        contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '.8rem' }} />
                    </PieChart>
                    <div className="env-fuel-legend">
                      {fuelMixChart.map(f => (
                        <div key={f.key} className="env-fuel-legend-item">
                          <span className="env-fuel-dot" style={{ background: FUEL_COLORS[f.key] || '#aaa' }} />
                          <span>{f.name}</span>
                          <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{((f.value / fuelMixChart.reduce((s,x)=>s+x.value,0))*100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="env-no-data">EIA generation data not available.</p>
                )}
              </div>

              {/* QR panel */}
              <div className="env-side-panel">
                <h3 className="env-card-title">Share This View</h3>
                <QRPanel dashboard="energy" lat={lat} lng={lng} radius={radius} />
                {user ? (
                  <button className="btn btn-sm btn-primary btn-full" style={{ marginTop: '.75rem' }}
                    onClick={() => setShowBill(v => !v)}>
                    {showBill ? '✕ Cancel' : '+ Submit My Bill'}
                  </button>
                ) : (
                  <button className="btn btn-sm btn-outline btn-full" style={{ marginTop: '.75rem' }}
                    onClick={onRequireAuth}>
                    Sign in to submit bill data
                  </button>
                )}
                {billOk && <p style={{ color: 'var(--green)', fontSize: '.8rem', marginTop: '.5rem', textAlign: 'center' }}>✓ Bill submitted — thank you!</p>}
              </div>
            </div>

            {/* Energy bill submission form */}
            {showBill && user && (
              <div className="env-chart-card">
                <h3 className="env-card-title">Submit Your Electricity Bill</h3>
                <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: '.75rem' }}>
                  Individual bills are never shown publicly. Only anonymized aggregate trends are displayed. Helps the community track whether rates are rising.
                </p>
                <form onSubmit={submitBill} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
                  <div>
                    <label className="form-label">Bill Month *</label>
                    <input className="form-input" type="month" required
                      value={billForm.bill_month}
                      onChange={e => setBillForm(f => ({ ...f, bill_month: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">kWh Used *</label>
                    <input className="form-input" type="number" min="1" required
                      placeholder="e.g. 1200"
                      value={billForm.kwh_used}
                      onChange={e => setBillForm(f => ({ ...f, kwh_used: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Total Billed ($) *</label>
                    <input className="form-input" type="number" min="0.01" step="0.01" required
                      placeholder="e.g. 145.50"
                      value={billForm.total_amount}
                      onChange={e => setBillForm(f => ({ ...f, total_amount: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Utility Provider</label>
                    <input className="form-input"
                      value={billForm.utility_provider}
                      onChange={e => setBillForm(f => ({ ...f, utility_provider: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Your Zip Code</label>
                    <input className="form-input" maxLength={10}
                      placeholder="35801"
                      value={billForm.zip_code}
                      onChange={e => setBillForm(f => ({ ...f, zip_code: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', paddingTop: '1.5rem' }}>
                    <input type="checkbox" id="smart-meter"
                      checked={billForm.has_smart_meter}
                      onChange={e => setBillForm(f => ({ ...f, has_smart_meter: e.target.checked }))} />
                    <label htmlFor="smart-meter" style={{ fontSize: '.85rem', cursor: 'pointer' }}>I have a smart meter</label>
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Notes (optional)</label>
                    <input className="form-input"
                      placeholder="Any unusual charges, outages this month, etc."
                      value={billForm.notes}
                      onChange={e => setBillForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  {billErr && <p className="form-error" style={{ gridColumn: '1/-1' }}>{billErr}</p>}
                  <div style={{ gridColumn: '1/-1', display: 'flex', gap: '.5rem' }}>
                    <button className="btn btn-primary btn-sm" type="submit" disabled={billBusy}>
                      {billBusy ? 'Submitting…' : 'Submit Bill Data'}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowBill(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Price trend: EIA official + community bill average */}
            <div className="env-chart-card">
              <h3 className="env-card-title">Electricity Price Trends</h3>
              <p className="env-card-sub">Blue = EIA official Alabama residential (¢/kWh) · Green = community-reported average rate ($/kWh)</p>
              {(priceChart.length > 0 || billChart.length > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={mergeByPeriod(priceChart, billChart)}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#4da6ff' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#00ff88' }} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '.8rem' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="eia_price"
                      name="EIA official (¢/kWh)" stroke="#4da6ff" dot={false} strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="community_rate"
                      name="Community avg ($/kWh)" stroke="#00ff88" dot={{ r: 3 }} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <p className="env-no-data">No price data available yet.</p>
              )}
            </div>

            {/* Community bill aggregate table */}
            {data.community?.bill_aggregate?.length > 0 && (
              <div className="env-chart-card">
                <h3 className="env-card-title">Community Bill Aggregate</h3>
                <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '.5rem' }}>
                  Anonymized aggregate — individual bills are private.
                </p>
                <div className="env-table-wrap">
                  <table className="env-table">
                    <thead>
                      <tr>
                        <th>Month</th><th>Submissions</th><th>Avg kWh</th><th>Avg Bill</th><th>Avg ¢/kWh</th><th>Smart Meters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.community.bill_aggregate.slice(0, 12).map(r => (
                        <tr key={r.bill_month}>
                          <td>{r.bill_month}</td>
                          <td>{r.submissions}</td>
                          <td>{r.avg_kwh}</td>
                          <td>${r.avg_amount}</td>
                          <td>${r.avg_rate_per_kwh ? (r.avg_rate_per_kwh * 100).toFixed(2) : '—'}¢</td>
                          <td>{r.smart_meter_count} / {r.submissions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Data center / large consumer panel */}
            <div className="env-chart-card">
              <h3 className="env-card-title">⚡ Large Industrial Consumers — Huntsville Area</h3>
              <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: '.75rem' }}>
                Known high-draw facilities that affect local grid stress and peak pricing.
              </p>
              <div className="env-industrial-list">
                {[
                  { name: 'Meta Data Center', loc: 'Huntsville, AL', note: 'Large-scale hyperscale data center — significant grid draw, ongoing expansion', impact: 'high' },
                  { name: 'Redstone Arsenal', loc: 'Huntsville, AL', note: 'Federal research and military facility — classified energy profile', impact: 'high' },
                  { name: 'Toyota Motor Manufacturing Alabama', loc: 'Huntsville, AL', note: 'Automotive manufacturing plant', impact: 'moderate' },
                ].map((f, i) => (
                  <div key={i} className="env-industrial-row">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{f.name}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{f.loc} · {f.note}</div>
                    </div>
                    <span style={{
                      fontSize: '.7rem', fontWeight: 700, padding: '.15rem .45rem', borderRadius: 99,
                      background: f.impact === 'high' ? 'rgba(245,158,11,.15)' : 'rgba(77,166,255,.1)',
                      color:      f.impact === 'high' ? '#f59e0b' : '#4da6ff',
                    }}>
                      {f.impact} impact
                    </span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.5rem' }}>
                Cross-reference community brownout/outage reports with peak draw periods from large facilities. Submit infrastructure reports at <a href="/watch?tab=infrastructure" style={{ color: 'var(--blue)' }}>Watch → Infrastructure</a>.
              </p>
            </div>

            {/* Community infrastructure reports */}
            {data.community?.reports?.length > 0 && (
              <div className="env-chart-card">
                <h3 className="env-card-title">Community Infrastructure Reports</h3>
                <div className="env-report-list">
                  {data.community.reports.slice(0, 8).map(r => (
                    <div key={r.id} className="env-report-row">
                      <SeverityBadge severity={r.severity} />
                      <span className="env-report-title">{r.title}</span>
                      <span className="env-report-user">{r.username}</span>
                      <span className="env-report-date">{fmtDate(r.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <HowThisWorksPanel id="energy"
              what="Tracks the Tennessee Valley Authority (TVA) generation mix, Alabama residential electricity prices from EIA, grid reliability data, and community-submitted bill data to show whether local electricity costs are rising and how the region's power generation is changing."
              sources="EIA API (api.eia.gov): TVA monthly generation by fuel type, Alabama residential electricity prices, and grid reliability data. TVA public environmental reports. Community: anonymized energy bill submissions from verified members."
              methodology="EIA data is queried using the official API with a valid API key. Generation mix shows the most recent monthly TVA figures. Community bill tracker collects individual bills from verified members and shows only the anonymized aggregate trend — no individual bill is ever shown publicly."
              community="Verified members can submit monthly electricity bills (kWh, total cost, utility, zip code). This builds an independent price database for the area. The community rate line on the price chart is the aggregate average $/kWh from submitted bills. Smart meter vs non-smart meter comparisons are shown when enough data exists."
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

function buildFuelMix(data) {
  const mix = data?.official?.fuel_mix;
  if (!Array.isArray(mix) || !mix.length) return [];
  const agg = {};
  mix.forEach(d => {
    const key = d.fueltype || d['fuel-type'] || 'OTH';
    agg[key] = (agg[key] || 0) + (parseFloat(d.generation) || 0);
  });
  return Object.entries(agg).map(([key, value]) => ({
    key, value,
    name: FUEL_LABELS[key] || key,
  })).filter(e => e.value > 0).sort((a, b) => b.value - a.value);
}

function buildPriceChart(data) {
  return (data?.official?.price_trend || [])
    .filter(d => d.price)
    .map(d => ({ period: d.period, eia_price: parseFloat(d.price) }))
    .reverse();
}

function buildBillChart(data) {
  return (data?.community?.bill_aggregate || [])
    .filter(r => r.avg_rate_per_kwh)
    .map(r => ({
      period:        r.bill_month,
      community_rate: parseFloat(r.avg_rate_per_kwh) * 100,
    }))
    .reverse();
}

function mergeByPeriod(a, b) {
  const map = {};
  a.forEach(d => { map[d.period] = { ...map[d.period], ...d }; });
  b.forEach(d => { map[d.period] = { ...map[d.period], ...d }; });
  return Object.values(map).sort((x, y) => x.period.localeCompare(y.period));
}

function scoreEnergy(data) {
  if (!data) return {};
  const communityRate = data.community?.bill_aggregate?.[0]?.avg_rate_per_kwh;
  const eiaPrice      = data.official?.price_trend?.[0]?.price;
  if (!communityRate || !eiaPrice) return {};
  const centsPerKwh  = communityRate * 100;
  return { officialScore: parseFloat(eiaPrice), communityScore: centsPerKwh };
}
