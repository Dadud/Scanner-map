import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MarkerClusterGroup } from 'react-leaflet-cluster';
import L from 'leaflet';
import { useStore } from '../store';
import type { Call } from '../types';
import 'leaflet/dist/leaflet.css';

const fireIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const policeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function MapController() {
  const { mapCenter, mapZoom } = useStore();
  const map = useMap();

  map.setView(mapCenter, mapZoom);
  return null;
}

interface CallMarkerProps {
  call: Call;
}

function CallMarker({ call }: CallMarkerProps) {
  const { setSelectedCall, user, isAuthenticated } = useStore();

  if (!call.lat || !call.lon) return null;

  const icon = call.category === 'fire' ? fireIcon :
               call.category === 'police' ? policeIcon : defaultIcon;

  const handleClick = () => {
    setSelectedCall(call);
  };

  return (
    <Marker position={[call.lat, call.lon]} icon={icon} eventHandlers={{ click: handleClick }}>
      <Popup className="scanner-popup">
        <div className="min-w-[200px]">
          <h3 className="font-bold text-lg">{call.talkgroup?.alphaTag || call.talkgroupId}</h3>
          <p className="text-sm text-gray-300">{new Date(call.timestamp).toLocaleString()}</p>
          {call.transcription && (
            <p className="mt-2 text-sm">{call.transcription.slice(0, 200)}...</p>
          )}
          {call.address && (
            <p className="mt-1 text-sm text-blue-300">{call.address}</p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export function Map() {
  const { calls, mapCenter, mapZoom } = useStore();

  const callsWithLocation = calls.filter(c => c.lat && c.lon);

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      className="h-full w-full"
      style={{ background: '#0a0a15' }}
    >
      <MapController />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={50}
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
      >
        {callsWithLocation.map(call => (
          <CallMarker key={call.id} call={call} />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}