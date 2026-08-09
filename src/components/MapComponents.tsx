import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
// Fix default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  position: [number, number] | null;
  onPositionChange: (pos: [number, number]) => void;
}

function ClickHandler({ onClick }: { onClick: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456]; // Jakarta

export function MapPicker({ position, onPositionChange }: MapPickerProps) {
  return (
    <MapContainer
      center={position || DEFAULT_CENTER}
      zoom={12}
      style={{ height: '300px', width: '100%' }}
      className="rounded-xl border border-neutral-200"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      <ClickHandler onClick={onPositionChange} />
      {position && (
        <Marker position={position}>
          <Popup>Lokasi laporan</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

interface MapViewProps {
  markers: Array<{
    id: string;
    position: [number, number];
    title: string;
    status: string;
    ticketId: string;
    onClick?: () => void;
  }>;
  center?: [number, number];
  zoom?: number;
}

export function MapView({ markers, center = DEFAULT_CENTER, zoom = 11 }: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      className="rounded-xl"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      {markers.filter((m) => m.position[0] !== null && m.position[1] !== null).map((marker) => (
        <Marker key={marker.id} position={marker.position}>
          <Popup>
            <div className="min-w-[180px]">
              <div className="text-xs text-neutral-500 mb-1">{marker.ticketId}</div>
              <div className="font-semibold text-sm text-neutral-900 mb-1">{marker.title}</div>
              <div className="text-xs text-neutral-600">{marker.status}</div>
              {marker.onClick && (
                <button
                  onClick={marker.onClick}
                  className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  Lihat detail →
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
