import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon path broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const REVERSE   = 'https://nominatim.openstreetmap.org/reverse';

function DraggableMarker({ position, onMove }) {
  useMapEvents({
    click(e) { onMove(e.latlng.lat, e.latlng.lng); },
  });
  if (!position) return null;
  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{ dragend: e => { const ll = e.target.getLatLng(); onMove(ll.lat, ll.lng); } }}
    />
  );
}

export default function EventLocationPicker({ value, lat, lng, onChange }) {
  const [address,    setAddress]    = useState(value || '');
  const [coords,     setCoords]     = useState(lat && lng ? [parseFloat(lat), parseFloat(lng)] : null);
  const [searching,  setSearching]  = useState(false);
  const [suggestions,setSuggestions]= useState([]);
  const [showMap,    setShowMap]    = useState(!!(lat && lng));
  const debounceRef = useRef(null);
  const mapRef      = useRef(null);

  // Sync internal state when parent resets the form
  useEffect(() => {
    setAddress(value || '');
    setCoords(lat && lng ? [parseFloat(lat), parseFloat(lng)] : null);
    setShowMap(!!(lat && lng));
  }, [value, lat, lng]);

  function notify(addr, la, lo) {
    onChange({ location: addr, location_lat: la ?? null, location_lng: lo ?? null });
  }

  async function geocode(query) {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' },
      });
      const data = await res.json();
      setSuggestions(data);
    } catch { /* ignore */ }
    finally { setSearching(false); }
  }

  async function reverseGeocode(la, lo) {
    try {
      const res = await fetch(`${REVERSE}?lat=${la}&lon=${lo}&format=json`, {
        headers: { 'Accept-Language': 'en' },
      });
      const data = await res.json();
      const display = data.display_name || `${la.toFixed(5)}, ${lo.toFixed(5)}`;
      setAddress(display);
      notify(display, la, lo);
    } catch { /* ignore */ }
  }

  function handleAddressChange(e) {
    const v = e.target.value;
    setAddress(v);
    setSuggestions([]);
    if (!v.trim()) {
      setCoords(null);
      setShowMap(false);
      notify('', null, null);
      return;
    }
    notify(v, coords?.[0] ?? null, coords?.[1] ?? null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => geocode(v), 500);
  }

  function pickSuggestion(s) {
    const la = parseFloat(s.lat), lo = parseFloat(s.lon);
    const display = s.display_name;
    setAddress(display);
    setCoords([la, lo]);
    setShowMap(true);
    setSuggestions([]);
    notify(display, la, lo);
    if (mapRef.current) mapRef.current.setView([la, lo], 15);
  }

  const handlePinMove = useCallback((la, lo) => {
    setCoords([la, lo]);
    reverseGeocode(la, lo);
    if (mapRef.current) mapRef.current.setView([la, lo], mapRef.current.getZoom());
  }, []);

  const defaultCenter = coords || [34.7304, -86.5861]; // Huntsville, AL

  return (
    <div className="event-location-picker">
      <div style={{ position: 'relative' }}>
        <input
          className="form-input"
          value={address}
          onChange={handleAddressChange}
          placeholder="Enter address or click map to drop a pin"
        />
        {searching && (
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '.75rem', color: 'var(--muted)' }}>
            searching…
          </span>
        )}
        {suggestions.length > 0 && (
          <ul className="location-suggestions">
            {suggestions.map((s, i) => (
              <li key={i} onClick={() => pickSuggestion(s)}>
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: 'flex', gap: '.5rem', marginTop: '.4rem', alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          style={{ fontSize: '.75rem' }}
          onClick={() => setShowMap(v => !v)}
        >
          {showMap ? 'Hide map' : 'Show map / drop pin'}
        </button>
        {coords && (
          <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
            📍 {coords[0].toFixed(4)}, {coords[1].toFixed(4)}
          </span>
        )}
      </div>

      {showMap && (
        <div className="event-location-map-picker" style={{ marginTop: '.5rem' }}>
          <MapContainer
            center={defaultCenter}
            zoom={coords ? 15 : 11}
            style={{ height: 220, width: '100%', borderRadius: 8 }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            <DraggableMarker position={coords} onMove={handlePinMove} />
          </MapContainer>
          <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.25rem' }}>
            Click the map or drag the pin to set the exact location.
          </p>
        </div>
      )}
    </div>
  );
}
