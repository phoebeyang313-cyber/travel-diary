import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import './Map.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function Map({ travels, selectedTravel }) {
  const defaultCenter = [20, 105];
  const zoom = 4;

  const center = selectedTravel
    ? [selectedTravel.latitude, selectedTravel.longitude]
    : defaultCenter;

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {travels.map((travel) => (
        <Marker key={travel.id} position={[travel.latitude, travel.longitude]}>
          <Popup>
            <div className="popup-content">
              <h3>{travel.title}</h3>
              <p>{travel.description}</p>
              <p className="address">{travel.address}</p>
              <p className="rating">⭐ {travel.rating}/5</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default Map;
