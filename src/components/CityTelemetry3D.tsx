import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { supabase } from '../lib/supabase';
import { Report, ReportCategory } from '../types';
import {
  RotateCw, Eye, EyeOff, Radio, Sparkles, MapPin,
  Maximize2, Minimize2, Activity,
  CloudRain, Sun, Moon, Wrench, Waves, Zap, Trash2,
  ChevronRight, X, Play, CheckCircle, ShieldCheck
} from 'lucide-react';

/* ───── Sektor Telemetri & Status Pekerja Lapangan ───── */
export type TelemetrySector = 'all' | 'infrastruktur' | 'drainase' | 'penerangan' | 'kebersihan';
export type WeatherTimeMode = 'night' | 'day' | 'rain';
export type IncidentWorkerStatus = 'pending' | 'in_progress' | 'completed';

export interface TelemetryIncident {
  id: string;
  ticketId: string;
  title: string;
  category: ReportCategory;
  sector: 'infrastruktur' | 'drainase' | 'penerangan' | 'kebersihan';
  status: IncidentWorkerStatus;
  sla: string;
  locationName: string;
  district: string;
  position: [number, number, number]; // x, y, z in 3D space
  color: number;
  reportId?: string;
  officerName?: string;
  progressPercent: number;
}

/* Default Telemetry Incidents (Karakteristik Kota Indonesia) */
const INITIAL_INCIDENTS: TelemetryIncident[] = [
  {
    id: 'inc-1',
    ticketId: 'TKT-8921',
    title: 'Amblas Jalan Protokol Koridor Barat',
    category: 'infrastruktur',
    sector: 'infrastruktur',
    status: 'in_progress', // Sedang Dikerjakan (Armada & Barikade Aktif)
    sla: 'Target 2 Jam (Sisa 45 Mnt)',
    locationName: 'Jl. Pemuda No. 42 (Koridor Barat)',
    district: 'Zona Koridor Barat',
    position: [-3.8, 1.4, -2.2],
    color: 0xef4444, // Crimson
    officerName: 'Tim Satgas Bina Marga Unit 03',
    progressPercent: 65,
  },
  {
    id: 'inc-2',
    ticketId: 'TKT-8924',
    title: 'Pembersihan Pintu Air & Tanggul Kali',
    category: 'lingkungan',
    sector: 'drainase',
    status: 'completed', // Selesai Ditangani (Lencana Hijau Teratasi)
    sla: 'Selesai Tepat Waktu',
    locationName: 'Pintu Air Manggarai Sektor 4',
    district: 'Zona Aliran Timur',
    position: [3.2, 0.4, 2.6],
    color: 0x0ea58d, // Emerald Green
    officerName: 'Dinas Sumber Daya Air Regu 2',
    progressPercent: 100,
  },
  {
    id: 'inc-3',
    ticketId: 'TKT-8930',
    title: 'Tiang PJU Koridor Transit Padam',
    category: 'pelayanan',
    sector: 'penerangan',
    status: 'in_progress', // Sedang Dikerjakan
    sla: 'Target 4 Jam (Sisa 1.5 Jam)',
    locationName: 'Flyover Sudirman KM 12 Jalur Khusus',
    district: 'Zona Pusat Bisnis',
    position: [-1.2, 2.6, 3.4],
    color: 0xd4a843, // Amber Gold
    officerName: 'Petugas Teknisi Listrik PJU',
    progressPercent: 40,
  },
  {
    id: 'inc-4',
    ticketId: 'TKT-8935',
    title: 'Tumpukan Sampah Liar Saluran Drainase',
    category: 'kebersihan',
    sector: 'kebersihan',
    status: 'pending', // Menunggu Penugasan
    sla: 'Target Respon Segera',
    locationName: 'Bantaran Pasar Tradisional Blok C',
    district: 'Zona Pasar & Niaga',
    position: [4.1, 1.1, -3.2],
    color: 0x38bdf8, // Cyan Blue
    officerName: 'Menunggu Disposisi Dinas',
    progressPercent: 10,
  },
  {
    id: 'inc-5',
    ticketId: 'TKT-8941',
    title: 'Perbaikan Trotoar & Akses U-Turn',
    category: 'infrastruktur',
    sector: 'infrastruktur',
    status: 'completed', // Selesai
    sla: 'Audit Kualitas Diverifikasi',
    locationName: 'Simpang Bundaran Landmark Sentral',
    district: 'Kawasan Bundaran Utama',
    position: [0.9, 1.2, -1.8],
    color: 0x10b981, // Emerald Green
    officerName: 'Unit Perawatan Jalan Cepat',
    progressPercent: 100,
  },
];

interface CityTelemetry3DProps {
  className?: string;
  activeExternalSector?: TelemetrySector;
  onSelectIncident?: (incident: TelemetryIncident) => void;
}

export function CityTelemetry3D({
  className = '',
  activeExternalSector,
  onSelectIncident,
}: CityTelemetry3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Mode & Filter States
  const [selectedSector, setSelectedSector] = useState<TelemetrySector>('all');
  const [weatherTime, setWeatherTime] = useState<WeatherTimeMode>('night');
  const [autoRotate, setAutoRotate] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fpsMetric, setFpsMetric] = useState(60);

  // Incidents Data & Worker States
  const [incidentsList, setIncidentsList] = useState<TelemetryIncident[]>(INITIAL_INCIDENTS);
  const [hoveredIncident, setHoveredIncident] = useState<TelemetryIncident | null>(null);
  const [activeIncident, setActiveIncident] = useState<TelemetryIncident | null>(null);
  const [newReportAlert, setNewReportAlert] = useState<string | null>(null);
  const [isSimulatingTransition, setIsSimulatingTransition] = useState(false);

  // Sync external sector prop from LandingPage
  useEffect(() => {
    if (activeExternalSector) {
      setSelectedSector(activeExternalSector);
      bridgeRef.current?.setSector(activeExternalSector);
    }
  }, [activeExternalSector]);

  // Three.js Bridge Ref
  const bridgeRef = useRef<{
    flyTo: (position: [number, number, number]) => void;
    resetCamera: () => void;
    setSector: (sector: TelemetrySector) => void;
    setWeather: (weather: WeatherTimeMode) => void;
    triggerSonarPulse: (pos: [number, number, number]) => void;
    updateIncidentVisuals: (incidents: TelemetryIncident[]) => void;
  } | null>(null);

  /* ───── 1. SUPABASE REALTIME SYNC (DATA LAPORAN NYATA) ───── */
  useEffect(() => {
    const fetchLiveReports = async () => {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && data && data.length > 0) {
          const mapped: TelemetryIncident[] = data.map((r: Report, idx: number) => {
            const defaultTemplate = INITIAL_INCIDENTS[idx % INITIAL_INCIDENTS.length];
            let mappedSector: TelemetryIncident['sector'] = 'infrastruktur';
            if (r.category === 'kebersihan') mappedSector = 'kebersihan';
            else if (r.category === 'lingkungan') mappedSector = 'drainase';
            else if (r.category === 'pelayanan') mappedSector = 'penerangan';

            let mappedStatus: IncidentWorkerStatus = 'pending';
            let progress = 15;
            let statusColor = defaultTemplate.color;

            if (r.status === 'completed') {
              mappedStatus = 'completed';
              progress = 100;
              statusColor = 0x0ea58d;
            } else if (r.status === 'in_progress' || r.status === 'assigned') {
              mappedStatus = 'in_progress';
              progress = 65;
            }

            return {
              id: r.id,
              ticketId: r.ticket_id || `TKT-${r.id.slice(0, 4)}`,
              title: r.title,
              category: r.category,
              sector: mappedSector,
              status: mappedStatus,
              sla: mappedStatus === 'completed' ? 'Selesai Tepat Waktu' : mappedStatus === 'in_progress' ? 'Target 2 Jam' : 'Menunggu Petugas',
              locationName: r.address || defaultTemplate.locationName,
              district: defaultTemplate.district,
              position: defaultTemplate.position,
              color: statusColor,
              reportId: r.id,
              officerName: mappedStatus === 'completed' ? 'Petugas Lapangan (Selesai)' : mappedStatus === 'in_progress' ? 'Satgas Reaksi Cepat' : 'Belum Ditugaskan',
              progressPercent: progress,
            };
          });

          setIncidentsList(mapped);
          bridgeRef.current?.updateIncidentVisuals(mapped);
        }
      } catch (err) {
        console.warn('Fallback to procedural telemetry nodes:', err);
      }
    };

    fetchLiveReports();

    // Listen to real-time status updates from Petugas Lapangan & Admin
    const channel = supabase
      .channel('city_3d_realtime_worker_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRep = payload.new as Report;
            setNewReportAlert(`Laporan Baru Masuk: ${newRep.title}`);
            const randomPos: [number, number, number] = [
              (Math.random() - 0.5) * 6,
              1.2,
              (Math.random() - 0.5) * 6,
            ];
            bridgeRef.current?.triggerSonarPulse(randomPos);
            setTimeout(() => setNewReportAlert(null), 5000);
          } else if (payload.eventType === 'UPDATE') {
            const updatedRep = payload.new as Report;
            setNewReportAlert(`Status Tiket ${updatedRep.ticket_id} Diperbarui: ${updatedRep.status.toUpperCase()}`);
            setTimeout(() => setNewReportAlert(null), 5000);
          }
          fetchLiveReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* ───── 2. THREE.JS DETAILED SCENE LIFECYCLE ───── */
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let isDestroyed = false;
    let isVisible = true;

    /* ── SCENE & FOG ── */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a11);
    const fog = new THREE.FogExp2(0x070a11, 0.046);
    scene.fog = fog;

    /* ── CAMERA ── */
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 540;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 130);

    const PANORAMA_POS = new THREE.Vector3(14, 12, 16);
    const PANORAMA_LOOKAT = new THREE.Vector3(0, 1.8, 0);
    camera.position.copy(PANORAMA_POS);
    camera.lookAt(PANORAMA_LOOKAT);

    /* ── RENDERER ── */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    /* ── LIGHTING ── */
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xd4a843, 2.6);
    sunLight.position.set(12, 18, 10);
    scene.add(sunLight);

    const secondaryLight = new THREE.DirectionalLight(0x0ea58d, 2.2);
    secondaryLight.position.set(-14, 12, -10);
    scene.add(secondaryLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    /* ═════════ A. DETAIL JARINGAN JALAN & MARKA ASPAL ═════════ */
    const roadNetworkGroup = new THREE.Group();
    rootGroup.add(roadNetworkGroup);

    // Aspal Jalan Utama (Crossroads & Arterial Boulevard)
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x0c111c,
      roughness: 0.8,
      metalness: 0.2,
    });

    const roadArterialX = new THREE.Mesh(new THREE.PlaneGeometry(28, 2.4), roadMat);
    roadArterialX.rotation.x = -Math.PI / 2;
    roadArterialX.position.y = 0.01;
    roadNetworkGroup.add(roadArterialX);

    const roadArterialZ = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 28), roadMat);
    roadArterialZ.rotation.x = -Math.PI / 2;
    roadArterialZ.position.y = 0.01;
    roadNetworkGroup.add(roadArterialZ);

    // Marka Jalan Putus-Putus (Dashed Lane Markings)
    const laneMarkingMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
    });
    const dashLength = 0.6;
    const dashSpacing = 1.1;

    for (let x = -13; x <= 13; x += dashSpacing) {
      if (Math.abs(x) < 2.2) continue; // Jangan tumpuk di bundaran tengah
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(dashLength, 0.06), laneMarkingMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.02, 0);
      roadNetworkGroup.add(dash);
    }

    for (let z = -13; z <= 13; z += dashSpacing) {
      if (Math.abs(z) < 2.2) continue;
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.06, dashLength), laneMarkingMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, z);
      roadNetworkGroup.add(dash);
    }

    // Zebra Crossings di 4 Simpang Bundaran
    const zebraOffsets = [-2.6, 2.6];
    zebraOffsets.forEach((posOffset) => {
      // Horizontal crossing
      for (let s = -0.9; s <= 0.9; s += 0.25) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.5), laneMarkingMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(s, 0.025, posOffset);
        roadNetworkGroup.add(stripe);
      }
      // Vertical crossing
      for (let s = -0.9; s <= 0.9; s += 0.25) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), laneMarkingMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(posOffset, 0.025, s);
        roadNetworkGroup.add(stripe);
      }
    });

    // Tiang Lampu Jalan PJU (InstancedMesh untuk performa optimal)
    const lampPostCount = 24;
    const lampPostGeo = new THREE.CylinderGeometry(0.03, 0.04, 1.4, 6);
    const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const lampPostsInstanced = new THREE.InstancedMesh(lampPostGeo, lampPostMat, lampPostCount);

    const lampBulbGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xd4a843 });
    const lampBulbsInstanced = new THREE.InstancedMesh(lampBulbGeo, lampBulbMat, lampPostCount);

    const dummyObj = new THREE.Object3D();
    let lampIdx = 0;

    for (let i = -10; i <= 10; i += 3.5) {
      if (Math.abs(i) < 2.5) continue;
      // Posisi di sisi jalan X
      dummyObj.position.set(i, 0.7, 1.4);
      dummyObj.updateMatrix();
      lampPostsInstanced.setMatrixAt(lampIdx, dummyObj.matrix);
      dummyObj.position.set(i, 1.4, 1.4);
      dummyObj.updateMatrix();
      lampBulbsInstanced.setMatrixAt(lampIdx, dummyObj.matrix);
      lampIdx++;

      // Posisi di sisi jalan Z
      dummyObj.position.set(1.4, 0.7, i);
      dummyObj.updateMatrix();
      lampPostsInstanced.setMatrixAt(lampIdx, dummyObj.matrix);
      dummyObj.position.set(1.4, 1.4, i);
      dummyObj.updateMatrix();
      lampBulbsInstanced.setMatrixAt(lampIdx, dummyObj.matrix);
      lampIdx++;
    }
    roadNetworkGroup.add(lampPostsInstanced);
    roadNetworkGroup.add(lampBulbsInstanced);

    /* ═════════ B. DETAIL GEDUNG & ARSITEKTUR KOTA ═════════ */
    const buildingsGroup = new THREE.Group();
    rootGroup.add(buildingsGroup);

    const buildingBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const edgeBuildingGeo = new THREE.EdgesGeometry(buildingBoxGeo);
    const buildingMeshes: THREE.Mesh[] = [];

    // Koleksi lampu suar penerbangan di puncak gedung (Aviation Beacons)
    const aviationBeaconLights: THREE.Mesh[] = [];

    const bGrid = 4;
    const bSpacing = 2.0;

    for (let gx = -bGrid; gx <= bGrid; gx++) {
      for (let gz = -bGrid; gz <= bGrid; gz++) {
        const distFromCenter = Math.sqrt(gx * gx + gz * gz);
        if (distFromCenter < 1.3 || distFromCenter > 4.7) continue;

        // Hindari menumpuk di atas aspal jalan raya utama
        const posX = gx * bSpacing;
        const posZ = gz * bSpacing;
        if (Math.abs(posX) < 1.3 || Math.abs(posZ) < 1.3) continue;

        const seed = Math.abs(Math.sin(gx * 19.82 + gz * 47.19));
        const height = distFromCenter < 2.6 ? 3.5 + seed * 4.5 : 1.0 + seed * 2.6;
        const width = 1.15 + seed * 0.35;
        const depth = 1.15 + (1 - seed) * 0.35;

        const isSkyscraper = height > 5.0;
        const isHelipadTower = seed > 0.75 && isSkyscraper;

        const buildingMat = new THREE.MeshStandardMaterial({
          color: isSkyscraper ? 0x0f2324 : 0x090e1a,
          roughness: 0.25,
          metalness: 0.8,
          transparent: true,
          opacity: 0.88,
        });

        const bMesh = new THREE.Mesh(buildingBoxGeo, buildingMat);
        bMesh.scale.set(width, height, depth);
        bMesh.position.set(posX, height / 2, posZ);
        buildingsGroup.add(bMesh);
        buildingMeshes.push(bMesh);

        // Wireframe edges neon
        const wireMat = new THREE.LineBasicMaterial({
          color: isSkyscraper ? 0x0ea58d : 0x1e293b,
          transparent: true,
          opacity: isSkyscraper ? 0.8 : 0.4,
        });
        const wire = new THREE.LineSegments(edgeBuildingGeo, wireMat);
        wire.scale.copy(bMesh.scale);
        wire.position.copy(bMesh.position);
        buildingsGroup.add(wire);

        // FITUR DETAIL 1: HELIPAD DENGAN SIMBOL [H] PADA ATAP GEDUNG TINGGI
        if (isHelipadTower) {
          const helipadGeo = new THREE.CircleGeometry(0.48, 24);
          const helipadMat = new THREE.MeshBasicMaterial({ color: 0xd4a843, side: THREE.DoubleSide });
          const helipadMesh = new THREE.Mesh(helipadGeo, helipadMat);
          helipadMesh.rotation.x = -Math.PI / 2;
          helipadMesh.position.set(posX, height + 0.02, posZ);
          buildingsGroup.add(helipadMesh);

          // Garis simbol H helipad
          const hBarMat = new THREE.MeshBasicMaterial({ color: 0x0b1120, side: THREE.DoubleSide });
          const hBar1 = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.4), hBarMat);
          hBar1.rotation.x = -Math.PI / 2;
          hBar1.position.set(posX - 0.12, height + 0.03, posZ);
          buildingsGroup.add(hBar1);

          const hBar2 = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.4), hBarMat);
          hBar2.rotation.x = -Math.PI / 2;
          hBar2.position.set(posX + 0.12, height + 0.03, posZ);
          buildingsGroup.add(hBar2);

          const hBar3 = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.06), hBarMat);
          hBar3.rotation.x = -Math.PI / 2;
          hBar3.position.set(posX, height + 0.03, posZ);
          buildingsGroup.add(hBar3);
        }

        // FITUR DETAIL 2: MENARA ANTENA & LAMPU SUAR PENERBANGAN
        if (isSkyscraper && !isHelipadTower) {
          const antennaGeo = new THREE.CylinderGeometry(0.02, 0.04, 1.2, 6);
          const antennaMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
          const antenna = new THREE.Mesh(antennaGeo, antennaMat);
          antenna.position.set(posX, height + 0.6, posZ);
          buildingsGroup.add(antenna);

          // Red Strobe Beacon at Mast Tip
          const beaconTipGeo = new THREE.SphereGeometry(0.06, 8, 8);
          const beaconTipMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
          const beaconTip = new THREE.Mesh(beaconTipGeo, beaconTipMat);
          beaconTip.position.set(posX, height + 1.22, posZ);
          buildingsGroup.add(beaconTip);
          aviationBeaconLights.push(beaconTip);
        }
      }
    }

    /* ═════════ C. TUGU MONUMEN & BUNDARAN SENTRAL ═════════ */
    const landmarkGroup = new THREE.Group();
    rootGroup.add(landmarkGroup);

    // Kolam Bundaran Melingkar
    const plazaGeo = new THREE.CylinderGeometry(2.3, 2.3, 0.22, 48);
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
    const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
    plazaMesh.position.y = 0.11;
    landmarkGroup.add(plazaMesh);

    // Kolam Air Bundaran
    const waterPool = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 36),
      new THREE.MeshStandardMaterial({ color: 0x0ea58d, roughness: 0.08, metalness: 0.9, emissive: 0x0ea58d, emissiveIntensity: 0.4 })
    );
    waterPool.rotation.x = -Math.PI / 2;
    waterPool.position.y = 0.23;
    landmarkGroup.add(waterPool);

    // Obelisk Tugu Monumen
    const obeliskMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.38, 5.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xd4a843, metalness: 0.9, roughness: 0.15 })
    );
    obeliskMesh.position.y = 3.1;
    landmarkGroup.add(obeliskMesh);

    // Puncak Api Cawan Emas Monumen
    const flameMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.48, 1),
      new THREE.MeshStandardMaterial({ color: 0xd4a843, emissive: 0xd4a843, emissiveIntensity: 2.2, roughness: 0.1, metalness: 0.5 })
    );
    flameMesh.position.y = 6.2;
    landmarkGroup.add(flameMesh);

    /* ═════════ D. JALUR LRT / MRT ELEVATED & KERETA DATA ═════════ */
    const transitGroup = new THREE.Group();
    rootGroup.add(transitGroup);

    const trackCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-11, 2.3, -7),
      new THREE.Vector3(-5, 2.3, -2),
      new THREE.Vector3(0, 2.3, 1),
      new THREE.Vector3(5, 2.3, 5),
      new THREE.Vector3(11, 2.3, 9),
    ]);

    const trackTube = new THREE.Mesh(
      new THREE.TubeGeometry(trackCurve, 80, 0.09, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 })
    );
    transitGroup.add(trackTube);

    // Kereta LRT Data Bercahaya
    const trainMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.38, 0.48),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 2.0, roughness: 0.2, metalness: 0.8 })
    );
    transitGroup.add(trainMesh);

    /* ═════════ E. RADAR GELOMBANG PEMINDAI 360° ═════════ */
    const radarGroup = new THREE.Group();
    rootGroup.add(radarGroup);

    const radarSweepMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 14.5, 64, 1, 0, Math.PI / 3),
      new THREE.MeshBasicMaterial({ color: 0x0ea58d, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
    );
    radarSweepMesh.rotation.x = -Math.PI / 2;
    radarSweepMesh.position.y = 0.04;
    radarGroup.add(radarSweepMesh);

    /* ═════════ F. SATUAN TUGAS LAPANGAN & STATUS VISUAL REALTIME ═════════ */
    const workerBeaconsGroup = new THREE.Group();
    rootGroup.add(workerBeaconsGroup);

    const raycastTargets: THREE.Mesh[] = [];
    const beaconStateObjects: {
      incidentId: string;
      diamond: THREE.Mesh;
      ring: THREE.Mesh;
      vehicleGroup?: THREE.Group;
      conesGroup?: THREE.Group;
      completedBadge?: THREE.Group;
      strobeLight?: THREE.PointLight;
      incident: TelemetryIncident;
    }[] = [];

    // Builder function to construct field workers & interactive incident nodes
    const constructWorkerBeacons = (incidents: TelemetryIncident[]) => {
      while (workerBeaconsGroup.children.length > 0) {
        workerBeaconsGroup.remove(workerBeaconsGroup.children[0]);
      }
      raycastTargets.length = 0;
      beaconStateObjects.length = 0;

      incidents.forEach((inc) => {
        const nodeGroup = new THREE.Group();
        nodeGroup.position.set(inc.position[0], 0, inc.position[2]);

        const beamHeight = inc.position[1] + 1.2;

        // 1. Sinar panduan vertikal
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, beamHeight, 8),
          new THREE.MeshBasicMaterial({ color: inc.color, transparent: true, opacity: 0.85 })
        );
        beam.position.y = beamHeight / 2;
        nodeGroup.add(beam);

        // 2. Inti Suar Berlian (Target Klik Raycasting)
        const diamond = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.4, 0),
          new THREE.MeshStandardMaterial({
            color: inc.color,
            emissive: inc.color,
            emissiveIntensity: 1.4,
            roughness: 0.1,
            metalness: 0.8,
          })
        );
        diamond.position.y = beamHeight + 0.35;
        diamond.userData = { incident: inc };
        nodeGroup.add(diamond);
        raycastTargets.push(diamond);

        // 3. Ground Ripple Ring
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.25, 0.45, 32),
          new THREE.MeshBasicMaterial({ color: inc.color, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.06;
        nodeGroup.add(ring);

        // 4. STATUS: IN_PROGRESS (Armada Mobil Dinas + Safety Cones Oranye)
        let vehicleGroup: THREE.Group | undefined;
        let conesGroup: THREE.Group | undefined;
        let strobeLight: THREE.PointLight | undefined;

        if (inc.status === 'in_progress') {
          // Mobil Patroli Dinas (Service Van)
          vehicleGroup = new THREE.Group();
          vehicleGroup.position.set(0.65, 0.18, 0.4);

          const bodyMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.28, 0.38),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.5 })
          );
          vehicleGroup.add(bodyMesh);

          // Kabin kaca
          const cabinMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.2, 0.34),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 })
          );
          cabinMesh.position.set(-0.1, 0.18, 0);
          vehicleGroup.add(cabinMesh);

          // Lampu Sirine Oranye Berkedip di Atap
          const strobeMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8),
            new THREE.MeshBasicMaterial({ color: 0xf59e0b })
          );
          strobeMesh.position.set(-0.1, 0.32, 0);
          vehicleGroup.add(strobeMesh);

          strobeLight = new THREE.PointLight(0xf59e0b, 2.5, 4);
          strobeLight.position.set(0, 0.4, 0);
          vehicleGroup.add(strobeLight);

          nodeGroup.add(vehicleGroup);

          // Barikade Safety Cones di Sekitar Lokasi Perbaikan
          conesGroup = new THREE.Group();
          const coneOffsets = [
            [-0.6, -0.6],
            [0.6, -0.6],
            [-0.6, 0.6],
            [0.6, 0.6],
          ];

          coneOffsets.forEach(([cx, cz]) => {
            const cone = new THREE.Mesh(
              new THREE.ConeGeometry(0.1, 0.28, 8),
              new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 })
            );
            cone.position.set(cx, 0.14, cz);
            conesGroup?.add(cone);
          });
          nodeGroup.add(conesGroup);
        }

        // 5. STATUS: COMPLETED (Lencana Sukses Hijau '✓ TERATASI')
        let completedBadge: THREE.Group | undefined;
        if (inc.status === 'completed') {
          completedBadge = new THREE.Group();
          completedBadge.position.set(0, beamHeight + 1.2, 0);

          // Cincin halo hijau melayang
          const haloRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.45, 0.04, 16, 32),
            new THREE.MeshBasicMaterial({ color: 0x0ea58d, wireframe: true })
          );
          completedBadge.add(haloRing);

          // Ikon bintang/centang penyelesaian
          const starCentang = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.24, 0),
            new THREE.MeshStandardMaterial({ color: 0x0ea58d, emissive: 0x0ea58d, emissiveIntensity: 2.2 })
          );
          completedBadge.add(starCentang);

          nodeGroup.add(completedBadge);
        }

        workerBeaconsGroup.add(nodeGroup);
        beaconStateObjects.push({
          incidentId: inc.id,
          diamond,
          ring,
          vehicleGroup,
          conesGroup,
          completedBadge,
          strobeLight,
          incident: inc,
        });
      });
    };

    constructWorkerBeacons(incidentsList);

    /* ═════════ G. SIMULASI HUJAN (DYNAMIC RAIN PARTICLES) ═════════ */
    const rainCount = 1200;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    const rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 26;
      rainPositions[i * 3 + 1] = Math.random() * 20;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 26;
      rainVelocities[i] = 12 + Math.random() * 8;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.08,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    const rainSystem = new THREE.Points(rainGeo, rainMat);
    scene.add(rainSystem);

    /* ═════════ H. INTERAKSI KAMERA & POINTER ═════════ */
    let isDragging = false;
    let prevPointer = { x: 0, y: 0 };
    let rotY = 0.45;
    let rotX = 0.22;
    let targetRotY = 0.45;
    let targetRotX = 0.22;
    let cameraDistance = 21;
    let targetDistance = 21;

    let isFlyingToIncident = false;
    const camTargetPos = new THREE.Vector3().copy(PANORAMA_POS);
    const camLookTarget = new THREE.Vector3().copy(PANORAMA_LOOKAT);
    const camCurrentLookAt = new THREE.Vector3().copy(PANORAMA_LOOKAT);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevPointer = { x: cx, y: cy };
      if (isFlyingToIncident) isFlyingToIncident = false;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (isDragging) {
        const dx = cx - prevPointer.x;
        const dy = cy - prevPointer.y;
        targetRotY += dx * 0.0075;
        targetRotX += dy * 0.0075;
        targetRotX = Math.max(-0.15, Math.min(0.85, targetRotX));
        prevPointer = { x: cx, y: cy };
      }

      pointer.x = ((cx - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((cy - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(raycastTargets, false);

      if (hits.length > 0) {
        const target = hits[0].object.userData.incident as TelemetryIncident;
        setHoveredIncident(target);
        document.body.style.cursor = 'pointer';
      } else {
        setHoveredIncident(null);
        if (!isDragging) document.body.style.cursor = 'default';
      }
    };

    const onPointerUp = () => {
      isDragging = false;
      document.body.style.cursor = 'default';
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(raycastTargets, false);

      if (hits.length > 0) {
        const inc = hits[0].object.userData.incident as TelemetryIncident;
        setActiveIncident(inc);
        onSelectIncident?.(inc);
        flyToTarget(inc.position);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetDistance += e.deltaY * 0.012;
      targetDistance = Math.max(9, Math.min(28, targetDistance));
      if (isFlyingToIncident) isFlyingToIncident = false;
    };

    const flyToTarget = (pos: [number, number, number]) => {
      isFlyingToIncident = true;
      camLookTarget.set(pos[0], pos[1], pos[2]);
      camTargetPos.set(pos[0] + 3.8, pos[1] + 3.2, pos[2] + 4.2);
    };

    const resetPanoramaView = () => {
      isFlyingToIncident = true;
      camLookTarget.copy(PANORAMA_LOOKAT);
      camTargetPos.copy(PANORAMA_POS);
      targetRotY = 0.45;
      targetRotX = 0.22;
      targetDistance = 21;
      setActiveIncident(null);
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    dom.addEventListener('click', onClick);
    dom.addEventListener('wheel', onWheel, { passive: false });

    dom.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp, { passive: true });

    /* ═════════ I. BRIDGE CONTROLS FOR EXTERNAL BUTTONS ═════════ */
    bridgeRef.current = {
      flyTo: flyToTarget,
      resetCamera: resetPanoramaView,
      triggerSonarPulse: (pos: [number, number, number]) => {
        // Shockwave pulse
        const shock = new THREE.Mesh(
          new THREE.RingGeometry(0.2, 0.4, 32),
          new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 1, side: THREE.DoubleSide })
        );
        shock.rotation.x = -Math.PI / 2;
        shock.position.set(pos[0], 0.1, pos[2]);
        rootGroup.add(shock);

        let scale = 1;
        const pInt = setInterval(() => {
          scale += 0.4;
          shock.scale.set(scale, scale, 1);
          (shock.material as THREE.MeshBasicMaterial).opacity -= 0.05;
          if ((shock.material as THREE.MeshBasicMaterial).opacity <= 0) {
            clearInterval(pInt);
            rootGroup.remove(shock);
            shock.geometry.dispose();
            (shock.material as THREE.MeshBasicMaterial).dispose();
          }
        }, 30);
      },
      setSector: (sector: TelemetrySector) => {
        beaconStateObjects.forEach(({ diamond, ring, vehicleGroup, conesGroup, completedBadge, incident }) => {
          const match = sector === 'all' || incident.sector === sector;
          diamond.visible = match;
          ring.visible = match;
          if (vehicleGroup) vehicleGroup.visible = match;
          if (conesGroup) conesGroup.visible = match;
          if (completedBadge) completedBadge.visible = match;
        });
      },
      setWeather: (mode: WeatherTimeMode) => {
        if (mode === 'day') {
          scene.background = new THREE.Color(0x0f172a);
          fog.color.setHex(0x0f172a);
          sunLight.intensity = 4.5;
          ambientLight.intensity = 2.8;
          rainMat.opacity = 0.0;
        } else if (mode === 'rain') {
          scene.background = new THREE.Color(0x060911);
          fog.color.setHex(0x060911);
          fog.density = 0.07;
          sunLight.intensity = 1.0;
          ambientLight.intensity = 1.2;
          rainMat.opacity = 0.65;
        } else {
          // Night
          scene.background = new THREE.Color(0x070a11);
          fog.color.setHex(0x070a11);
          fog.density = 0.046;
          sunLight.intensity = 2.6;
          ambientLight.intensity = 1.8;
          rainMat.opacity = 0.0;
        }
      },
      updateIncidentVisuals: (updatedIncidents: TelemetryIncident[]) => {
        constructWorkerBeacons(updatedIncidents);
      },
    };

    /* ═════════ J. RESIZE & OBSERVER ═════════ */
    const handleResize = () => {
      if (!container || isDestroyed) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener('resize', handleResize);

    const observer = new IntersectionObserver((entries) => {
      isVisible = entries[0].isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(container);

    /* ═════════ K. ANIMATION LOOP ═════════ */
    let animId: number;
    const clock = new THREE.Clock();
    let trainT = 0;
    let frameCount = 0;
    let lastFps = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      frameCount++;
      const now = performance.now();
      if (now - lastFps >= 1000) {
        setFpsMetric(Math.round((frameCount * 1000) / (now - lastFps)));
        frameCount = 0;
        lastFps = now;
      }

      // Smooth Camera Fly or Orbit
      if (isFlyingToIncident) {
        camera.position.lerp(camTargetPos, 0.055);
        camCurrentLookAt.lerp(camLookTarget, 0.055);
        camera.lookAt(camCurrentLookAt);

        if (camera.position.distanceTo(camTargetPos) < 0.15) {
          isFlyingToIncident = false;
        }
      } else {
        if (autoRotate && !isDragging) {
          targetRotY += 0.003;
        }

        rotY += (targetRotY - rotY) * 0.07;
        rotX += (targetRotX - rotX) * 0.07;
        cameraDistance += (targetDistance - cameraDistance) * 0.07;

        camera.position.x = Math.sin(rotY) * Math.cos(rotX) * cameraDistance;
        camera.position.z = Math.cos(rotY) * Math.cos(rotX) * cameraDistance;
        camera.position.y = Math.sin(rotX) * cameraDistance + 6.0;
        camera.lookAt(0, 1.8, 0);
      }

      // LRT Train Movement
      trainT = (trainT + delta * 0.14) % 1.0;
      const trainPoint = trackCurve.getPointAt(trainT);
      const trainTangent = trackCurve.getTangentAt(trainT);
      trainMesh.position.copy(trainPoint);
      trainMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), trainTangent);

      // Radar Rotation
      if (radarSweepMesh) {
        radarSweepMesh.rotation.z = -time * 1.5;
      }

      // Monumen Gold Flame
      flameMesh.rotation.y = time * 1.2;
      flameMesh.scale.setScalar(1.0 + Math.sin(time * 3) * 0.08);

      // Aviation Red Beacons Blinking
      aviationBeaconLights.forEach((beacon, bIdx) => {
        const blink = Math.sin(time * 5 + bIdx) > 0.2;
        (beacon.material as THREE.MeshBasicMaterial).opacity = blink ? 1 : 0.2;
      });

      // Animate Incidents & Worker Objects
      beaconStateObjects.forEach(({ diamond, ring, completedBadge, strobeLight, incident }) => {
        diamond.rotation.y = time * 1.6;
        diamond.position.y = incident.position[1] + 0.35 + Math.sin(time * 2.8 + incident.position[0]) * 0.1;

        const isTarget = hoveredIncident?.id === incident.id || activeIncident?.id === incident.id;
        const mat = diamond.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = isTarget ? 3.0 : 1.4;
        const scale = isTarget ? 1.45 : 1.0;
        diamond.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.15);

        // Ground pulse
        const ringScale = 0.6 + ((time * 1.8 + incident.position[2]) % 2.0) * 1.8;
        ring.scale.set(ringScale, ringScale, 1);
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - (ringScale / 4.2));

        // Pulsing Completed Badge Halo
        if (completedBadge) {
          completedBadge.rotation.y = time * 2;
          completedBadge.position.y = incident.position[1] + 1.6 + Math.sin(time * 2) * 0.15;
        }

        // Rotating Strobe Beacon Light
        if (strobeLight) {
          strobeLight.intensity = Math.sin(time * 12) > 0 ? 3.5 : 0.5;
        }
      });

      // Rain particles
      if (rainMat.opacity > 0) {
        const positions = rainGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < rainCount; i++) {
          positions[i * 3 + 1] -= rainVelocities[i] * delta;
          if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = 18;
          }
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    /* ── TEARDOWN & RECURSIVE GPU MEMORY DISPOSAL ── */
    return () => {
      isDestroyed = true;
      cancelAnimationFrame(animId);
      observer.disconnect();

      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      dom.removeEventListener('click', onClick);
      dom.removeEventListener('wheel', onWheel);

      dom.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (dom.parentElement) {
        dom.parentElement.removeChild(dom);
      }
    };
  }, []);

  /* ───── 3. SIMULASI INTERAKTIF PROGRES PETUGAS (DEMO ACTION) ───── */
  const handleSimulateWorkerProgress = () => {
    setIsSimulatingTransition(true);

    // Pick incident #1 (Jalan Pemuda) and transition its status: in_progress -> completed
    setIncidentsList((prev) => {
      const updated = prev.map((item) => {
        if (item.id === 'inc-1') {
          const nextStatus: IncidentWorkerStatus = item.status === 'in_progress' ? 'completed' : 'in_progress';
          return {
            ...item,
            status: nextStatus,
            color: nextStatus === 'completed' ? 0x0ea58d : 0xef4444,
            progressPercent: nextStatus === 'completed' ? 100 : 65,
            sla: nextStatus === 'completed' ? 'Selesai Tepat Waktu (Foto Terverifikasi)' : 'Target 2 Jam (Sisa 45 Mnt)',
          };
        }
        return item;
      });

      bridgeRef.current?.updateIncidentVisuals(updated);
      const inc1 = updated.find((i) => i.id === 'inc-1');
      if (inc1) {
        bridgeRef.current?.flyTo(inc1.position);
        setActiveIncident(inc1);
      }
      return updated;
    });

    setTimeout(() => {
      setIsSimulatingTransition(false);
    }, 1200);
  };

  const handleSelectSector = (sector: TelemetrySector) => {
    setSelectedSector(sector);
    bridgeRef.current?.setSector(sector);
  };

  const handleSelectWeather = (mode: WeatherTimeMode) => {
    setWeatherTime(mode);
    bridgeRef.current?.setWeather(mode);
  };

  const handleResetCamera = () => {
    bridgeRef.current?.resetCamera();
  };

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden rounded-3xl bg-[#070A11] border border-slate-800 font-body ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      } ${className}`}
    >
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* ═══════ REALTIME NOTIF TOAST ═══════ */}
      {newReportAlert && (
        <div className="absolute top-16 right-4 z-40 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="px-4 py-2.5 rounded-2xl bg-rose-500/90 text-white backdrop-blur-md shadow-2xl border border-rose-400/40 flex items-center gap-2.5 font-header text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>{newReportAlert}</span>
          </div>
        </div>
      )}

      {/* ═══════ TOPBAR COMMAND HUD ═══════ */}
      <div className="absolute top-4 inset-x-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-30">
        
        {/* Brand & FPS */}
        <div className="flex items-center gap-2 bg-[#0B1120]/90 backdrop-blur-xl px-3.5 py-1.5 rounded-full border border-slate-700/80 shadow-lg pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-[#0EA58D] animate-ping" />
          <span className="font-header text-xs font-black text-white tracking-wider uppercase">
            INDONESIAN TWIN CITY 3D
          </span>
          <span className="font-mono text-[10px] text-slate-400 border-l border-slate-700 pl-2">
            FPS: <span className="text-emerald-400 font-bold">{fpsMetric}</span>
          </span>
        </div>

        {/* Simulasi Progres Petugas (Interactive Worker Simulator) */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={handleSimulateWorkerProgress}
            disabled={isSimulatingTransition}
            title="Simulasikan Transisi Pengerjaan Petugas (In Progress ⇄ Selesai)"
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#D4A843] hover:from-amber-600 hover:to-[#c29636] text-slate-950 text-xs font-header font-black flex items-center gap-1.5 shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-3 h-3 fill-current ${isSimulatingTransition ? 'animate-spin' : ''}`} />
            <span>Simulasi Petugas Selesai</span>
          </button>
        </div>

        {/* Waktu & Cuaca */}
        <div className="flex items-center gap-1 bg-[#0B1120]/90 backdrop-blur-xl p-1 rounded-2xl border border-slate-700 shadow-lg pointer-events-auto">
          <button
            onClick={() => handleSelectWeather('night')}
            title="Mode Malam Cybernetic"
            className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1 transition-all ${
              weatherTime === 'night' ? 'bg-[#D4A843] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Moon className="w-3 h-3" />
            <span className="hidden sm:inline">Malam</span>
          </button>
          <button
            onClick={() => handleSelectWeather('day')}
            title="Mode Siang Arsitektural"
            className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1 transition-all ${
              weatherTime === 'day' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3 h-3" />
            <span className="hidden sm:inline">Siang</span>
          </button>
          <button
            onClick={() => handleSelectWeather('rain')}
            title="Mode Simulasi Hujan & Genangan"
            className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1 transition-all ${
              weatherTime === 'rain' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CloudRain className="w-3 h-3" />
            <span className="hidden sm:inline">Hujan</span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? 'Hentikan Putaran' : 'Aktifkan Putaran'}
            className={`p-2 rounded-xl backdrop-blur-md border text-xs transition-all ${
              autoRotate ? 'bg-[#0EA58D]/20 text-[#0EA58D] border-[#0EA58D]/50' : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          </button>

          <button
            onClick={handleResetCamera}
            title="Kembali ke Panorama Orbit"
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white backdrop-blur-md border border-slate-700 text-xs transition-all"
          >
            <span className="text-[11px] font-mono">Panorama</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white backdrop-blur-md border border-slate-700 text-xs transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>

      {/* ═══════ SECTOR SELECTOR PILLS ═══════ */}
      <div className="absolute top-16 inset-x-4 flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto pb-1 pointer-events-auto z-20 scrollbar-none">
        {[
          { id: 'all', label: 'Semua Simpul Kota', icon: Activity },
          { id: 'infrastruktur', label: 'Jalan & Aspal', icon: Wrench },
          { id: 'drainase', label: 'Banjir & Sungai', icon: Waves },
          { id: 'penerangan', label: 'PJU & Fasilitas', icon: Zap },
          { id: 'kebersihan', label: 'Kebersihan Kota', icon: Trash2 },
        ].map((sec) => {
          const Icon = sec.icon;
          const isSelected = selectedSector === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => handleSelectSector(sec.id as TelemetrySector)}
              className={`px-3 py-1.5 rounded-xl backdrop-blur-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all flex-shrink-0 border shadow-md ${
                isSelected
                  ? 'bg-slate-100 dark:bg-white text-slate-950 border-white shadow-lg scale-105'
                  : 'bg-[#0B1120]/85 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════ DETAIL INSPECTED INCIDENT MODAL ═══════ */}
      {(activeIncident || hoveredIncident) && (
        <div className="absolute bottom-16 sm:bottom-14 left-4 max-w-sm w-[calc(100%-2rem)] sm:w-84 pointer-events-auto z-30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3">
          {(() => {
            const current = activeIncident || hoveredIncident!;
            const isDone = current.status === 'completed';
            const isWorking = current.status === 'in_progress';

            return (
              <div className="p-4 rounded-2xl bg-[#0B1120]/95 backdrop-blur-2xl border border-slate-700 shadow-2xl space-y-3 relative">
                {activeIncident && (
                  <button
                    onClick={() => setActiveIncident(null)}
                    className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Tutup Inspeksi"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[10px] font-black px-2 py-0.5 rounded text-white shadow-xs"
                    style={{ backgroundColor: isDone ? '#0ea58d' : isWorking ? '#f59e0b' : '#ef4444' }}
                  >
                    {current.ticketId}
                  </span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                    isDone
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : isWorking
                      ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
                      : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                  }`}>
                    {current.sla}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 uppercase ml-auto">
                    {current.district}
                  </span>
                </div>

                <div>
                  <h4 className="font-header font-bold text-sm text-white leading-snug">
                    {current.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-slate-300 text-xs mt-1">
                    <MapPin className="w-3 h-3 text-rose-500 flex-shrink-0" />
                    <span className="truncate">{current.locationName}</span>
                  </div>
                </div>

                {/* Status Bar Progres Satuan Tugas */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400 flex items-center gap-1">
                      {isDone ? (
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Wrench className="w-3 h-3 text-amber-400" />
                      )}
                      {current.officerName || 'Satgas Dinas Lapangan'}
                    </span>
                    <span className={isDone ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {isDone ? '100% Selesai' : `${current.progressPercent}% Diproses`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${
                        isDone ? 'bg-emerald-500' : isWorking ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${current.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    {isDone ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Penanganan Tuntas</span>
                      </span>
                    ) : isWorking ? (
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span>Armada Bekerja di Titik</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span>Menunggu Petugas</span>
                      </span>
                    )}
                  </div>

                  {current.reportId ? (
                    <button
                      onClick={() => navigate(`/reports/${current.reportId}`)}
                      className="px-3 py-1.5 rounded-lg bg-[#0EA58D] hover:bg-[#0c8b77] text-white text-xs font-bold font-header flex items-center gap-1 shadow-sm transition-all"
                    >
                      <span>Detail Tiket</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/reports')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold font-header flex items-center gap-1 transition-all"
                    >
                      <span>Semua Laporan</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════ FOOTER HUD STATUS ═══════ */}
      <div className="absolute bottom-3 inset-x-4 flex flex-col sm:flex-row items-center justify-between gap-2 pointer-events-none z-20 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2 bg-[#0B1120]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 pointer-events-auto">
          <Sparkles className="w-3.5 h-3.5 text-[#D4A843]" />
          <span>Arsitektur Prosedural 3D & Satuan Tugas Lapangan Terintegrasi</span>
        </div>

        <div className="flex items-center gap-3 bg-[#0B1120]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 pointer-events-auto">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#f97316]" /> Cone Barikade
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Mobil Patroli
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#0ea58d]" /> Lencana Selesai
          </span>
        </div>
      </div>
    </div>
  );
}
