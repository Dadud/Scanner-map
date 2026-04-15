import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MarkerClusterGroup } from 'react-leaflet-cluster';
import L from 'leaflet';
import { useStore } from '../store';
import 'leaflet/dist/leaflet.css';

const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  iconSize: [25, 41], iconAnchor: [12, 41]
});

export function Map() {
  const { calls, setSelectedCall } = useStore();

  return (
    <MapContainer center={[39.8283, -98.5795]} zoom={5} className="h-full w-full">
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MarkerClusterGroup chunkedLoading>
        {calls.filter(c => c.lat && c.lon).map(call => (
          <Marker
            key={call.id}
            position={[call.lat!, call.lon!]}
            icon={defaultIcon}
            eventHandlers={{ click: () => setSelectedCall(call) }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <h3 className="font-bold">{call.talkgroup?.alphaTag || call.talkgroupId}</h3>
                <p className="text-sm">{new Date(call.timestamp).toLocaleString()}</p>
                {call.transcription && <p className="mt-2 text-sm">{call.transcription.slice(0, 200)}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}