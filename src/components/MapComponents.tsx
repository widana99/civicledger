import { useMap, MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import { ReportStatus, ReportCategory } from '../types';

// Fix default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom status pin colors and SVG icons
export const STATUS_PIN_CONFIG: Record<
  string,
  {
    color: string;
    bg: string;
    border: string;
    label: string;
    svgIcon: string;
    isPulse?: boolean;
  }
> = {
  pending: {
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#F59E0B',
    label: 'Menunggu Verifikasi',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    isPulse: true,
  },
  verified: {
    color: '#0284C7',
    bg: '#E0F2FE',
    border: '#0EA5E9',
    label: 'Terverifikasi',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
  },
  assigned: {
    color: '#2563EB',
    bg: '#DBEAFE',
    border: '#3B82F6',
    label: 'Petugas Ditugaskan',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`,
  },
  in_progress: {
    color: '#7C3AED',
    bg: '#EDE9FE',
    border: '#8B5CF6',
    label: 'Sedang Dikerjakan',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
    isPulse: true,
  },
  completed: {
    color: '#059669',
    bg: '#D1FAE5',
    border: '#10B981',
    label: 'Selesai Teratasi',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  },
  rejected: {
    color: '#DC2626',
    bg: '#FEE2E2',
    border: '#EF4444',
    label: 'Ditolak',
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  },
};

export function createStatusDivIcon(status: string) {
  const config = STATUS_PIN_CONFIG[status] || STATUS_PIN_CONFIG.pending;
  const pulseHtml = config.isPulse
    ? `<span class="absolute -inset-1 rounded-full animate-ping opacity-60" style="background-color: ${config.border};"></span>`
    : '';

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group" style="width: 38px; height: 38px;">
      ${pulseHtml}
      <div 
        class="relative w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110"
        style="background-color: ${config.bg}; border: 2.5px solid ${config.border}; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
      >
        ${config.svgIcon}
      </div>
      <div 
        class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
        style="background-color: ${config.border};"
      ></div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-status-marker',
    html,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -36],
  });
}

function ChangeView({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

function AutoFitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [positions, map]);
  return null;
}

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
      zoom={14}
      style={{ height: '300px', width: '100%' }}
      className="rounded-xl border border-[#E2E4E0] z-0"
    >
      {position && <ChangeView center={position} zoom={15} />}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      <ClickHandler onClick={onPositionChange} />
      {position && (
        <Marker position={position} icon={createStatusDivIcon('pending')}>
          <Popup>
            <div className="font-semibold text-xs text-[#0A1628]">Lokasi Laporan Terpilih</div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

import 'leaflet.heat';

export function HeatmapLayer({ points }: { points: Array<[number, number, number?]> }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    // @ts-ignore
    const heat = (L as any).heatLayer(points, {
      radius: 28,
      blur: 18,
      maxZoom: 16,
      max: 1.0,
      gradient: {
        0.2: '#3B82F6',
        0.4: '#06B6D4',
        0.6: '#10B981',
        0.8: '#F59E0B',
        1.0: '#EF4444',
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

export interface MapMarkerItem {
  id: string;
  position: [number, number];
  title: string;
  status: ReportStatus;
  statusLabel: string;
  ticketId: string;
  category?: ReportCategory;
  categoryLabel?: string;
  address?: string;
  photoUrl?: string | null;
  createdAt?: string;
  onClick?: () => void;
}

interface MapViewProps {
  markers: MapMarkerItem[];
  center?: [number, number];
  zoom?: number;
  autoFit?: boolean;
  onSelectMarker?: (marker: MapMarkerItem) => void;
  showHeatmap?: boolean;
  className?: string;
}

export function MapView({
  markers,
  center = DEFAULT_CENTER,
  zoom = 13,
  autoFit = false,
  onSelectMarker,
  showHeatmap = false,
  className,
}: MapViewProps) {
  const validMarkers = markers.filter(
    (m) =>
      m.position &&
      typeof m.position[0] === 'number' &&
      typeof m.position[1] === 'number' &&
      !isNaN(m.position[0]) &&
      !isNaN(m.position[1])
  );

  const positions = validMarkers.map((m) => m.position);
  const heatmapPoints: Array<[number, number, number]> = validMarkers.map((m) => [
    m.position[0],
    m.position[1],
    m.status === 'pending' || m.status === 'verified' ? 0.9 : 0.4,
  ]);

  return (
    <MapContainer
      center={positions.length > 0 ? positions[0] : center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      className={`rounded-xl z-0 ${className || ''}`}
    >
      {autoFit && positions.length > 1 ? (
        <AutoFitBounds positions={positions} />
      ) : (
        <ChangeView center={center} zoom={zoom} />
      )}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />

      {showHeatmap && <HeatmapLayer points={heatmapPoints} />}

      {!showHeatmap && validMarkers.map((marker) => {
        const icon = createStatusDivIcon(marker.status);
        return (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={icon}
            eventHandlers={{
              click: () => {
                if (marker.onClick) marker.onClick();
                if (onSelectMarker) onSelectMarker(marker);
              },
            }}
          >
            <Popup className="custom-report-popup">
              <div className="min-w-[200px] max-w-[260px] p-1 space-y-2">
                {marker.photoUrl && (
                  <div className="w-full h-24 rounded overflow-hidden bg-neutral-100">
                    <img
                      src={marker.photoUrl}
                      alt={marker.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-[#0A1628] text-white rounded">
                    {marker.ticketId}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: STATUS_PIN_CONFIG[marker.status]?.bg || '#FEF3C7',
                      color: STATUS_PIN_CONFIG[marker.status]?.color || '#D97706',
                    }}
                  >
                    {marker.statusLabel}
                  </span>
                </div>
                <div className="font-bold text-xs text-[#0A1628] line-clamp-2 leading-snug">
                  {marker.title}
                </div>
                {marker.address && (
                  <div className="text-[11px] text-[#5A6372] line-clamp-1 flex items-center gap-1">
                    <span>📍 {marker.address}</span>
                  </div>
                )}
                {marker.onClick && (
                  <button
                    onClick={marker.onClick}
                    className="w-full mt-1.5 py-1 text-xs font-bold text-center text-white bg-[#0A1628] hover:bg-[#D4A843] hover:text-[#0A1628] transition-colors rounded"
                  >
                    Lihat Detail Tiket →
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export function MapLegend() {
  return (
    <div className="bg-white/95 backdrop-blur-md p-3 rounded-lg border border-[#E2E4E0] shadow-md text-xs space-y-2">
      <div className="font-bold text-[#0A1628] text-[11px] uppercase tracking-wider font-mono">
        Status Penanda Peta:
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(STATUS_PIN_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0 border"
              style={{ backgroundColor: cfg.color, borderColor: cfg.border }}
            />
            <span className="text-[11px] text-[#5A6372] font-medium">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
