import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export default function EventLocationMap({ lat, lng, address, title }) {
  const [copied, setCopied] = useState(false);

  const la = parseFloat(lat);
  const lo = parseFloat(lng);
  if (isNaN(la) || isNaN(lo)) return null;

  const googleMapsDir  = `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}`;
  const appleMapsUrl   = `maps://maps.apple.com/?daddr=${la},${lo}`;
  const googleMapsUrl  = `https://maps.google.com/?daddr=${la},${lo}`;
  const openInMapsUrl  = isIOS() ? appleMapsUrl : googleMapsUrl;

  function copyAddress() {
    const text = address || `${la}, ${lo}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="event-location-map-display">
      <MapContainer
        center={[la, lo]}
        zoom={15}
        style={{ height: 260, width: '100%', borderRadius: 10 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <Marker position={[la, lo]}>
          {title && <Popup>{title}</Popup>}
        </Marker>
      </MapContainer>

      <div className="event-location-actions">
        <a
          href={googleMapsDir}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-primary"
        >
          🧭 Get Directions
        </a>
        <a
          href={openInMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline"
        >
          🗺 Open in Maps
        </a>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={copyAddress}
        >
          {copied ? '✓ Copied' : '📋 Copy Address'}
        </button>
      </div>
    </div>
  );
}
