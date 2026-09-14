import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import './MapView.css';

function makeIcon(emoji, cls) {
  return L.divIcon({
    html: `<span class="pin ${cls}">${emoji}</span>`,
    className: 'pin-wrap',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

const travelIcon = makeIcon('📍', 'pin-travel');
const travelIconActive = makeIcon('📍', 'pin-travel pin-active');
const foodIcon = makeIcon('🍽️', 'pin-food');
const sightIcon = makeIcon('🏞️', 'pin-sight');

function MapController({ focus }) {
  const map = useMap();

  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.latitude, focus.longitude], focus.zoom || 13, { duration: 0.9 });
  }, [focus?.key]);

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);

  return null;
}

export default function MapView({ travels, selectedId, onSelectTravel, focus, pois = [], myLocation }) {
  const hasData = travels.length > 0;
  const center = useMemo(() => {
    if (myLocation) return [myLocation.latitude, myLocation.longitude];
    if (hasData) return [travels[0].latitude, travels[0].longitude];
    return [34.5, 108.9];
  }, [myLocation, hasData, travels]);

  return (
    <MapContainer center={center} zoom={hasData ? 5 : 4} scrollWheelZoom className="map-view">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController focus={focus} />

      {myLocation && (
        <>
          <Circle
            center={[myLocation.latitude, myLocation.longitude]}
            radius={Math.max(myLocation.accuracy || 60, 40)}
            pathOptions={{ color: '#4f46e5', fillColor: '#6366f1', fillOpacity: 0.16, weight: 1 }}
          />
          <Marker
            position={[myLocation.latitude, myLocation.longitude]}
            icon={L.divIcon({
              html: '<span class="me-dot"></span>',
              className: 'me-wrap',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          >
            <Popup>我的当前位置</Popup>
          </Marker>
        </>
      )}

      {travels.map((t) => (
        <Marker
          key={t.id}
          position={[t.latitude, t.longitude]}
          icon={selectedId === t.id ? travelIconActive : travelIcon}
          eventHandlers={{ click: () => onSelectTravel?.(t) }}
        >
          <Popup>
            <div className="map-popup">
              <strong>{t.title}</strong>
              {t.address && <p className="mp-addr">{t.address}</p>}
              <p className="mp-meta">
                {'★'.repeat(t.rating || 0)}
                <span>{(t.visitedAt || t.createdAt || '').slice(0, 10)}</span>
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {pois.map((p) => (
        <Marker
          key={p.id}
          position={[p.latitude, p.longitude]}
          icon={p.category === 'food' ? foodIcon : sightIcon}
        >
          <Popup>
            <div className="map-popup">
              <strong>
                {p.category === 'food' ? '🍽️' : '🏞️'} {p.name}
              </strong>
              <p className="mp-meta">
                <span>{p.label}</span>
                {p.distanceText && <span>{p.distanceText}</span>}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
