import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const HUNTSVILLE = [34.7304, -86.5861];
const DEFAULT_ZOOM = 11;

// Severity color mapping
const SEV_COLORS = {
  critical:   '#dc2626',
  serious:    '#ea580c',
  moderate:   '#ca8a04',
  minor:      '#2563eb',
  monitoring: '#6b7280',
};

// Dashboard icons (emoji fallback)
const DASH_ICONS = {
  infrastructure: '🏗️',
  environment:    '🌿',
  housing:        '🏠',
  health:         '🏥',
  watershed:      '💧',
  food:           '🌾',
  surveillance:   '📡',
  civic:          '🏛️',
  land_development: '🗺️',
  atmospheric_observations: '🌫️',
};

// Surveillance type icons
const SURV_ICONS = {
  'ALPR/Flock camera': '📷',
  'facial recognition': '👁',
  'cell tower': '📶',
  'drone': '🚁',
  'other': '📡',
};

// Land dev special types
const LLC_TYPES = new Set(['LLC property acquisition','bulk property purchase','eminent domain','easement','probate/property abuse']);

function makeColorIcon(color, emoji = '', pulsing = false) {
  const size = pulsing ? 20 : 16;
  const pulseHtml = pulsing
    ? `<div style="position:absolute;top:50%;left:50%;width:${size*2.5}px;height:${size*2.5}px;margin-left:-${size*1.25}px;margin-top:-${size*1.25}px;border-radius:50%;background:${color}30;animation:watch-map-pulse 1.8s ease-out infinite;z-index:-1;"></div>`
    : '';
  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;background:${color};border:2px solid rgba(255,255,255,.8);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${size*0.6}px;box-shadow:0 2px 6px rgba(0,0,0,.35);">${emoji}${pulseHtml}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -(size/2)],
  });
}

function makeLabelIcon(color, label) {
  return L.divIcon({
    html: `<div style="background:${color};color:#fff;padding:.15rem .4rem;border-radius:4px;font-size:.7rem;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3);">${label}</div>`,
    className: '',
    iconSize: null,
    iconAnchor: [20, 10],
    popupAnchor: [0, -12],
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildPopupHtml(report, dashboard) {
  const color = SEV_COLORS[report.severity] || '#6b7280';
  const dashIcon = DASH_ICONS[dashboard || report.dashboard_type] || '◉';
  const viewLink = dashboard
    ? `/watch?tab=${dashboard || report.dashboard_type}`
    : `/watch?tab=${report.dashboard_type}`;
  return `
    <div style="min-width:200px;max-width:280px;font-family:system-ui,sans-serif;font-size:.82rem;">
      <div style="display:flex;align-items:center;gap:.35rem;margin-bottom:.35rem;flex-wrap:wrap;">
        <span style="padding:.12rem .45rem;border-radius:99px;background:${color}22;color:${color};font-weight:700;font-size:.7rem;border:1px solid ${color}44;text-transform:uppercase;">
          ${report.severity}
        </span>
        <span style="font-size:.75rem;color:#666;">${dashIcon} ${(dashboard || report.dashboard_type || '').replace(/_/g,' ')}</span>
      </div>
      <div style="font-weight:600;color:#1a1a1a;margin-bottom:.2rem;line-height:1.35;">${report.title}</div>
      ${report.location_label ? `<div style="font-size:.77rem;color:#888;margin-bottom:.15rem;">📍 ${report.location_label}</div>` : ''}
      <div style="font-size:.74rem;color:#999;margin-bottom:.35rem;">
        ${report.username ? `by ${report.username} · ` : ''}${formatDate(report.created_at)}
        ${report.verified ? ' · <span style="color:#16a34a;font-weight:700;">✓ Verified</span>' : ''}
      </div>
      ${report.report_type ? `<div style="font-size:.72rem;background:#f3f4f6;padding:.1rem .35rem;border-radius:4px;display:inline-block;margin-bottom:.35rem;color:#555;">${report.report_type}</div>` : ''}
      <a href="${viewLink}" style="display:block;text-align:center;padding:.3rem .5rem;background:#2a7a2a;color:#fff;border-radius:4px;font-weight:600;font-size:.78rem;text-decoration:none;margin-top:.25rem;">
        View Reports →
      </a>
    </div>`;
}

export default function WatchMap({
  reports = [],
  dashboard = null,          // null = all dashboards (overview mode)
  anomalies = [],
  height = '500px',
  center = HUNTSVILLE,
  zoom = DEFAULT_ZOOM,
  showDashboardFilter = false,
  showSeverityFilter = false,
  showDateFilter = false,
  showAnomalyToggle = false,
  onPinClick = null,         // mobile: override popup with bottom-sheet handler
  className = '',
}) {
  const mapRef     = useRef(null);
  const mapInst    = useRef(null);
  const markersRef = useRef(L.layerGroup());
  const anomRef    = useRef(L.layerGroup());

  const [dashFilter, setDashFilter] = useState('');
  const [sevFilter,  setSevFilter]  = useState('');
  const [showAnom,   setShowAnom]   = useState(true);
  const [locating,   setLocating]   = useState(false);
  const [mobilePin,  setMobilePin]  = useState(null); // for mobile bottom sheet

  // Init map once
  useEffect(() => {
    if (mapInst.current) return;
    const map = L.map(mapRef.current, { center, zoom, zoomControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    markersRef.current.addTo(map);
    anomRef.current.addTo(map);
    mapInst.current = map;
    return () => { map.remove(); mapInst.current = null; };
  }, []);

  // Re-render markers when reports/filters change
  useEffect(() => {
    const map = mapInst.current;
    if (!map) return;
    markersRef.current.clearLayers();

    const visible = reports.filter(r => {
      if (!r.location_lat || !r.location_lng) return false;
      if (dashFilter && r.dashboard_type !== dashFilter) return false;
      if (sevFilter  && r.severity        !== sevFilter)  return false;
      return true;
    });

    visible.forEach(r => {
      const color   = SEV_COLORS[r.severity] || '#6b7280';
      const isPulse = r.severity === 'critical';
      const dash    = r.dashboard_type || dashboard;

      // Choose icon based on dashboard type
      let icon;
      if (dash === 'surveillance' && r.report_type) {
        const emoji = SURV_ICONS[r.report_type] || '📡';
        icon = makeColorIcon(color, emoji, isPulse);
      } else if (dash === 'land_development' && LLC_TYPES.has(r.report_type)) {
        icon = makeLabelIcon(color, r.report_type === 'LLC property acquisition' ? 'LLC' : r.report_type.slice(0,8));
      } else {
        icon = makeColorIcon(color, '', isPulse);
      }

      const marker = L.marker([r.location_lat, r.location_lng], { icon });

      if (onPinClick) {
        marker.on('click', () => onPinClick(r));
      } else {
        marker.bindPopup(buildPopupHtml(r, dash), { maxWidth: 290 });
      }

      // Atmospheric drift cone
      if (dash === 'atmospheric_observations' && r.wind_direction) {
        const cone = buildDriftCone(r);
        if (cone) cone.addTo(markersRef.current);
      }

      marker.addTo(markersRef.current);
    });
  }, [reports, dashFilter, sevFilter, onPinClick, dashboard]);

  // Anomaly layer
  useEffect(() => {
    const map = mapInst.current;
    if (!map) return;
    anomRef.current.clearLayers();
    if (!showAnom) return;

    anomalies.forEach(a => {
      if (!a.location_lat && !a.location_lng) return;
      const lat = a.location_lat || HUNTSVILLE[0];
      const lng = a.location_lng || HUNTSVILLE[1];
      const color = SEV_COLORS[a.severity] || '#ca8a04';
      const opacity = a.ai_confidence === 'high' ? 0.8 : a.ai_confidence === 'medium' ? 0.5 : 0.25;
      const radius  = Math.max(200, (a.affected_reports?.length || 1) * 150);

      const circle = L.circle([lat, lng], {
        radius,
        color,
        fillColor: color,
        fillOpacity: opacity * 0.4,
        weight: 2,
        opacity: opacity,
        className: a.severity === 'critical' ? 'anomaly-pulse-circle' : '',
      });
      circle.bindPopup(`
        <div style="min-width:180px;font-family:system-ui,sans-serif;font-size:.82rem;">
          <div style="font-weight:700;margin-bottom:.25rem;">${a.description || 'AI Anomaly'}</div>
          <div style="font-size:.75rem;color:#888;">${a.affected_reports?.length || 0} reports · ${a.ai_confidence} confidence</div>
          <a href="/watch?tab=anomalies" style="display:block;text-align:center;padding:.25rem;background:#2a7a2a;color:#fff;border-radius:4px;font-size:.77rem;margin-top:.35rem;text-decoration:none;">View Anomalies →</a>
        </div>
      `);
      circle.addTo(anomRef.current);
    });
  }, [anomalies, showAnom]);

  function locate() {
    const map = mapInst.current;
    if (!map) return;
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(pos => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 14);
      L.marker([pos.coords.latitude, pos.coords.longitude], {
        icon: makeColorIcon('#2563eb', '◉'),
      }).addTo(map).bindPopup('Your location').openPopup();
      setLocating(false);
    }, () => setLocating(false));
  }

  const DASHBOARDS = ['infrastructure','environment','housing','health','watershed','food','surveillance','civic','land_development','atmospheric_observations'];
  const SEVERITIES = ['critical','serious','moderate','minor','monitoring'];

  const visibleCount = reports.filter(r => {
    if (!r.location_lat || !r.location_lng) return false;
    if (dashFilter && r.dashboard_type !== dashFilter) return false;
    if (sevFilter  && r.severity        !== sevFilter)  return false;
    return true;
  }).length;

  return (
    <div className={`watch-map-container ${className}`}>
      {/* Filter toolbar */}
      {(showDashboardFilter || showSeverityFilter || showDateFilter || showAnomalyToggle) && (
        <div className="watch-map-filters">
          {showDashboardFilter && (
            <select className="watch-map-filter-select" value={dashFilter} onChange={e => setDashFilter(e.target.value)}>
              <option value="">All dashboards</option>
              {DASHBOARDS.map(d => (
                <option key={d} value={d}>{DASH_ICONS[d]} {d.replace(/_/g,' ')}</option>
              ))}
            </select>
          )}
          {showSeverityFilter && (
            <select className="watch-map-filter-select" value={sevFilter} onChange={e => setSevFilter(e.target.value)}>
              <option value="">All severities</option>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {showAnomalyToggle && (
            <label className="watch-map-filter-check">
              <input type="checkbox" checked={showAnom} onChange={e => setShowAnom(e.target.checked)} />
              Show anomalies
            </label>
          )}
          <span className="watch-map-count">{visibleCount} pins</span>
        </div>
      )}

      {/* Map */}
      <div style={{ position: 'relative', height }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }} />

        {/* Locate me button */}
        <button className="watch-map-locate-btn" onClick={locate} title="Center on my location" disabled={locating}>
          {locating ? '…' : '◎'}
        </button>

        {/* Legend */}
        <div className="watch-map-legend">
          {Object.entries(SEV_COLORS).map(([sev, color]) => (
            <div key={sev} className="watch-map-legend-item">
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
              <span>{sev}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {mobilePin && (
        <div className="watch-map-bottom-sheet" onClick={() => setMobilePin(null)}>
          <div className="watch-map-sheet-card" onClick={e => e.stopPropagation()}>
            <div className="watch-map-sheet-handle" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.35rem' }}>
              <span style={{ padding: '.1rem .4rem', borderRadius: 99, background: (SEV_COLORS[mobilePin.severity]||'#888')+'22', color: SEV_COLORS[mobilePin.severity]||'#888', border: `1px solid ${(SEV_COLORS[mobilePin.severity]||'#888')}44`, fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                {mobilePin.severity}
              </span>
              <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                {DASH_ICONS[mobilePin.dashboard_type]} {(mobilePin.dashboard_type||'').replace(/_/g,' ')}
              </span>
            </div>
            <div style={{ fontWeight: 600, fontSize: '.92rem', marginBottom: '.25rem' }}>{mobilePin.title}</div>
            {mobilePin.location_label && <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: '.2rem' }}>📍 {mobilePin.location_label}</div>}
            <div style={{ fontSize: '.77rem', color: 'var(--muted)', marginBottom: '.4rem' }}>
              {mobilePin.username} · {formatDate(mobilePin.created_at)}
              {mobilePin.verified && ' · ✓ Verified'}
            </div>
            <a href={`/watch?tab=${mobilePin.dashboard_type}`} style={{ display: 'block', textAlign: 'center', padding: '.4rem', background: 'var(--green)', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '.85rem', textDecoration: 'none' }}>
              View Reports →
            </a>
            <button style={{ marginTop: '.5rem', width: '100%', padding: '.35rem', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--muted)', fontSize: '.82rem' }} onClick={() => setMobilePin(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Build a semi-transparent cone for atmospheric drift direction
function buildDriftCone(report) {
  if (!report.location_lat || !report.location_lng) return null;
  const COMPASS = { N:0,NNE:22.5,NE:45,ENE:67.5,E:90,ESE:112.5,SE:135,SSE:157.5,S:180,SSW:202.5,SW:225,WSW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5 };
  const bearing = COMPASS[report.wind_direction];
  if (bearing === undefined) return null;

  const lat0 = report.location_lat, lng0 = report.location_lng;
  const distKm = 5;
  const spreadDeg = 30;

  function dest(lat, lng, bearingDeg, km) {
    const R = 6371, d = km / R;
    const b = bearingDeg * Math.PI / 180;
    const lat1 = Math.asin(Math.sin(lat*Math.PI/180)*Math.cos(d) + Math.cos(lat*Math.PI/180)*Math.sin(d)*Math.cos(b));
    const lng1 = lng*Math.PI/180 + Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(lat*Math.PI/180), Math.cos(d)-Math.sin(lat*Math.PI/180)*Math.sin(lat1));
    return [lat1*180/Math.PI, lng1*180/Math.PI];
  }

  const left  = dest(lat0, lng0, bearing - spreadDeg, distKm);
  const right = dest(lat0, lng0, bearing + spreadDeg, distKm);
  const tip   = dest(lat0, lng0, bearing, distKm);

  return L.polygon([[lat0, lng0], left, tip, right], {
    color:       '#3b82f688',
    fillColor:   '#3b82f6',
    fillOpacity: 0.12,
    weight: 1,
  });
}

// Standalone anomalies map (used by AnomaliesView)
export function AnomalyMap({ anomalies = [], height = '420px' }) {
  const mapRef  = useRef(null);
  const mapInst = useRef(null);

  useEffect(() => {
    if (mapInst.current) return;
    const map = L.map(mapRef.current, { center: HUNTSVILLE, zoom: DEFAULT_ZOOM });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    mapInst.current = map;
    return () => { map.remove(); mapInst.current = null; };
  }, []);

  useEffect(() => {
    const map = mapInst.current;
    if (!map) return;
    map.eachLayer(l => { if (l instanceof L.Circle || l instanceof L.Marker) map.removeLayer(l); });

    anomalies.forEach(a => {
      const lat = parseFloat(a.location_lat) || HUNTSVILLE[0] + (Math.random()-.5)*.05;
      const lng = parseFloat(a.location_lng) || HUNTSVILLE[1] + (Math.random()-.5)*.05;
      const color   = SEV_COLORS[a.severity]  || '#ca8a04';
      const opacity = a.ai_confidence === 'high' ? 0.85 : a.ai_confidence === 'medium' ? 0.5 : 0.2;
      const radius  = Math.max(300, (a.affected_reports?.length || 1) * 200);

      L.circle([lat, lng], {
        radius,
        color, fillColor: color,
        fillOpacity: opacity * 0.35,
        weight: a.severity === 'critical' ? 2.5 : 1.5,
        opacity,
      })
      .bindPopup(`<div style="min-width:180px;font-size:.82rem;"><b>${a.description||'Anomaly'}</b><br><small>${a.affected_reports?.length||0} reports · ${a.ai_confidence} confidence</small></div>`)
      .addTo(map);
    });
  }, [anomalies]);

  return <div ref={mapRef} style={{ width: '100%', height, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }} />;
}
