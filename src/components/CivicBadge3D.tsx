import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Shield, Award, CheckCircle2, Sparkles, X, ExternalLink, Copy, Check } from 'lucide-react';

export type CivicBadgeType = 'warga_teladan' | 'terverifikasi' | 'petugas_siaga' | 'pengawas_kota';

export interface CivicBadgeConfig {
  type: CivicBadgeType;
  title: string;
  subtitle: string;
  tier: string;
  primaryColor: number;
  secondaryColor: number;
  emissiveColor: number;
  metalness: number;
  roughness: number;
  geometryType: 'coin' | 'shield' | 'hexagon' | 'diamond';
  description: string;
  criteria: string;
  hash: string;
  stats: { label: string; value: string }[];
}

export const CIVIC_BADGES: Record<CivicBadgeType, CivicBadgeConfig> = {
  warga_teladan: {
    type: 'warga_teladan',
    title: 'Warga Teladan',
    subtitle: 'Citizen Vanguard Level 3',
    tier: 'Tier III • Emas Murni',
    primaryColor: 0xd4a843,
    secondaryColor: 0xffe89e,
    emissiveColor: 0x5a3e0b,
    metalness: 0.9,
    roughness: 0.18,
    geometryType: 'coin',
    description: 'Diberikan kepada warga yang konsisten melaporkan kerusakan fasilitas umum dengan akurasi GPS tinggi dan verifikasi tervalidasi 100%.',
    criteria: '10+ Laporan Terverifikasi • Akurasi GPS >95% • 0 Laporan Palsu',
    hash: '0x8f2d9c1b74a3e8e19c0b6214f7d3a58e',
    stats: [
      { label: 'Akurasi Laporan', value: '99.2%' },
      { label: 'Laporan Dituntaskan', value: '14 Titik' },
      { label: 'Indeks Dampak Warga', value: 'A+' },
    ],
  },
  terverifikasi: {
    type: 'terverifikasi',
    title: 'Pelapor Terverifikasi',
    subtitle: 'Civic Verified Reporter',
    tier: 'Tier II • Zamrud Kota',
    primaryColor: 0x0ea58d,
    secondaryColor: 0x5eead4,
    emissiveColor: 0x044338,
    metalness: 0.85,
    roughness: 0.22,
    geometryType: 'shield',
    description: 'Identitas dan reputasi pelapor telah diaudit melalui integrasi kependudukan resmi serta memiliki rekam jejak laporan yang bersih.',
    criteria: 'KTP Tervalidasi • Riwayat Laporan Terbukti • Reputasi Positif',
    hash: '0x3c71e49a1d82b406e89f5c2a71d0e824',
    stats: [
      { label: 'Status Verifikasi', value: 'Resmi' },
      { label: 'Kecepatan Respon', value: '< 2 Jam' },
      { label: 'Integritas Laporan', value: '100%' },
    ],
  },
  petugas_siaga: {
    type: 'petugas_siaga',
    title: 'Petugas Respon Cepat',
    subtitle: 'Rapid Municipal Taskforce',
    tier: 'Tier Taktikal • Amber Baja',
    primaryColor: 0xf59e0b,
    secondaryColor: 0xfbbf24,
    emissiveColor: 0x78350f,
    metalness: 0.95,
    roughness: 0.12,
    geometryType: 'hexagon',
    description: 'Lencana kehormatan bagi personel dinas teknis dan petugas lapangan dengan kecepatan respon darurat serta dokumentasi perbaikan tuntas.',
    criteria: '25+ Pekerjaan Lapangan Selesai • SLA < 24 Jam • Bukti Foto Valid',
    hash: '0xe92b7145a80f3c6d12e8471b059c63da',
    stats: [
      { label: 'Rata-rata Penanganan', value: '4.8 Jam' },
      { label: 'Kepuasan Warga', value: '4.9 / 5.0' },
      { label: 'Tingkat Selesai SLA', value: '97.6%' },
    ],
  },
  pengawas_kota: {
    type: 'pengawas_kota',
    title: 'Pengawas Tata Kota',
    subtitle: 'City Governance Auditor',
    tier: 'Tier Kehormatan • Ametis Obsidian',
    primaryColor: 0x6366f1,
    secondaryColor: 0xa5b4fc,
    emissiveColor: 0x1e1b4b,
    metalness: 0.88,
    roughness: 0.2,
    geometryType: 'diamond',
    description: 'Tanda pengenal otoritas pengawas tata kota, auditor independen, dan administrator kebijakan tata ruang Smart City.',
    criteria: 'Otoritas Tata Kelola • Audit Wilayah Terjadwal • Pengawasan Anggaran',
    hash: '0x1a8f9c44b02e77d391c5a28f74e9b602',
    stats: [
      { label: 'Wilayah Pantau', value: '5 Kota Administrasi' },
      { label: 'Audit Transparansi', value: '100% Realtime' },
      { label: 'Keamanan Ledger', value: 'SHA-256 Validated' },
    ],
  },
};

interface CivicBadge3DProps {
  badgeType: CivicBadgeType;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  showLabel?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CivicBadge3D({
  badgeType,
  size = 'md',
  interactive = true,
  showLabel = false,
  onClick,
  className = '',
}: CivicBadge3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const config = CIVIC_BADGES[badgeType];

  const dimensions = {
    sm: { w: 64, h: 64, scale: 0.9 },
    md: { w: 110, h: 110, scale: 1.4 },
    lg: { w: 220, h: 220, scale: 2.2 },
  }[size];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, dimensions.w / dimensions.h, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(dimensions.w, dimensions.h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const coloredRimLight = new THREE.PointLight(config.primaryColor, 3.5, 10);
    coloredRimLight.position.set(-3, -2, 2);
    scene.add(coloredRimLight);

    const topSpecularLight = new THREE.PointLight(config.secondaryColor, 2.0, 8);
    topSpecularLight.position.set(0, 3, 2);
    scene.add(topSpecularLight);

    // 3. 3D Medallion Group
    const badgeGroup = new THREE.Group();
    badgeGroup.scale.setScalar(dimensions.scale);
    scene.add(badgeGroup);

    // PBR Medallion Material
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: config.primaryColor,
      metalness: config.metalness,
      roughness: config.roughness,
      emissive: config.emissiveColor,
      emissiveIntensity: 0.4,
    });

    const rimMaterial = new THREE.MeshStandardMaterial({
      color: config.secondaryColor,
      metalness: 0.95,
      roughness: 0.1,
      emissive: config.primaryColor,
      emissiveIntensity: 0.6,
    });

    // Medallion Geometries
    if (config.geometryType === 'hexagon') {
      const hexGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.12, 6);
      const baseMesh = new THREE.Mesh(hexGeo, bodyMaterial);
      baseMesh.rotation.x = Math.PI / 2;
      badgeGroup.add(baseMesh);

      const hexRimGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.08, 6);
      const rimMesh = new THREE.Mesh(hexRimGeo, rimMaterial);
      rimMesh.rotation.x = Math.PI / 2;
      badgeGroup.add(rimMesh);
    } else if (config.geometryType === 'shield') {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.95);
      shape.quadraticCurveTo(0.8, 0.85, 0.8, 0.1);
      shape.quadraticCurveTo(0.7, -0.6, 0, -0.95);
      shape.quadraticCurveTo(-0.7, -0.6, -0.8, 0.1);
      shape.quadraticCurveTo(-0.8, 0.85, 0, 0.95);

      const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 };
      const shieldGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      shieldGeo.center();
      const baseMesh = new THREE.Mesh(shieldGeo, bodyMaterial);
      badgeGroup.add(baseMesh);

      const rimGeo = new THREE.TorusGeometry(0.9, 0.03, 8, 24);
      const rimMesh = new THREE.Mesh(rimGeo, rimMaterial);
      badgeGroup.add(rimMesh);
    } else if (config.geometryType === 'diamond') {
      const octaGeo = new THREE.OctahedronGeometry(0.85, 1);
      const baseMesh = new THREE.Mesh(octaGeo, bodyMaterial);
      baseMesh.scale.set(1, 1.15, 0.35);
      badgeGroup.add(baseMesh);

      const ringGeo = new THREE.TorusGeometry(0.92, 0.035, 12, 32);
      const rimMesh = new THREE.Mesh(ringGeo, rimMaterial);
      badgeGroup.add(rimMesh);
    } else {
      const coinGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.12, 36);
      const baseMesh = new THREE.Mesh(coinGeo, bodyMaterial);
      baseMesh.rotation.x = Math.PI / 2;
      badgeGroup.add(baseMesh);

      const rimTorus = new THREE.TorusGeometry(0.88, 0.045, 16, 48);
      const rimMesh = new THREE.Mesh(rimTorus, rimMaterial);
      badgeGroup.add(rimMesh);
    }

    // Emblem Center Accent (Star or Core Facet)
    const emblemGeo = new THREE.TetrahedronGeometry(0.38, 0);
    const emblemMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.1,
      emissive: config.secondaryColor,
      emissiveIntensity: 0.8,
    });
    const emblemMesh = new THREE.Mesh(emblemGeo, emblemMat);
    emblemMesh.position.z = 0.12;
    badgeGroup.add(emblemMesh);

    // Orbiting Sparkle Particles
    const particleCount = 28;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleAngles = new Float32Array(particleCount);
    const particleSpeeds = new Float32Array(particleCount);
    const particleRadii = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particleAngles[i] = (i / particleCount) * Math.PI * 2;
      particleSpeeds[i] = 0.5 + Math.random() * 0.8;
      particleRadii[i] = 1.05 + Math.random() * 0.25;
      particlePos[i * 3] = Math.cos(particleAngles[i]) * particleRadii[i];
      particlePos[i * 3 + 1] = Math.sin(particleAngles[i]) * particleRadii[i];
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));

    const particleMat = new THREE.PointsMaterial({
      color: config.secondaryColor,
      size: 0.06,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    badgeGroup.add(particleSystem);

    // 4. Pointer Movement & Inertia
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;
    let isPointerOver = false;

    const handlePointerMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = nx * 0.6;
      targetRotX = -ny * 0.6;
    };

    const handlePointerEnter = () => {
      isPointerOver = true;
      setIsHovered(true);
    };

    const handlePointerLeave = () => {
      isPointerOver = false;
      setIsHovered(false);
      targetRotX = 0;
      targetRotY = 0;
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('mouseenter', handlePointerEnter);
    container.addEventListener('mouseleave', handlePointerLeave);

    // 5. Visibility / Intersection Observer
    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(container);

    // 6. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth lerp damping towards target
      if (isPointerOver) {
        currentRotX += (targetRotX - currentRotX) * 0.12;
        currentRotY += (targetRotY - currentRotY) * 0.12;
        badgeGroup.rotation.x = currentRotX;
        badgeGroup.rotation.y = currentRotY;
      } else {
        badgeGroup.rotation.y += delta * 0.45;
        badgeGroup.rotation.x = Math.sin(elapsed * 1.5) * 0.08;
      }

      badgeGroup.position.y = Math.sin(elapsed * 2.0) * 0.05;

      emblemMesh.rotation.y = elapsed * 1.2;
      emblemMesh.rotation.z = elapsed * 0.8;

      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        particleAngles[i] += particleSpeeds[i] * delta;
        arr[i * 3] = Math.cos(particleAngles[i]) * particleRadii[i];
        arr[i * 3 + 1] = Math.sin(particleAngles[i]) * particleRadii[i];
        arr[i * 3 + 2] = Math.sin(particleAngles[i] * 2 + elapsed) * 0.15;
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Cleanup & GPU Disposal
    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('mouseenter', handlePointerEnter);
      container.removeEventListener('mouseleave', handlePointerLeave);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        } else if (obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [badgeType, dimensions.w, dimensions.h, dimensions.scale, config, interactive]);

  const handleContainerClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div
        onClick={handleContainerClick}
        className={`inline-flex flex-col items-center cursor-pointer group select-none transition-all duration-300 ${className}`}
        title={`Klik untuk inspeksi 3D: ${config.title}`}
      >
        <div
          ref={containerRef}
          style={{ width: dimensions.w, height: dimensions.h }}
          className="relative transition-transform duration-300 group-hover:scale-105"
        >
          {/* Subtle back ambient glow */}
          <div
            className="absolute inset-2 rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none"
            style={{
              backgroundColor: `#${config.primaryColor.toString(16).padStart(6, '0')}`,
            }}
          />
        </div>

        {showLabel && (
          <div className="text-center mt-1.5 space-y-0.5">
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 tracking-tight block">
              {config.title}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 block w-fit mx-auto border border-slate-200/50 dark:border-slate-700/50">
              {config.tier}
            </span>
          </div>
        )}
      </div>

      {/* 3D Inspection Modal */}
      {isModalOpen && (
        <CivicBadgeModal badge={config} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CivicBadgeModal: 360-Degree Turntable 3D Inspection & Civic Credentials
   ───────────────────────────────────────────────────────────────────────────── */
interface CivicBadgeModalProps {
  badge: CivicBadgeConfig;
  onClose: () => void;
}

export function CivicBadgeModal({ badge, onClose }: CivicBadgeModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.4);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(badge.primaryColor, 4.0, 10);
    rimLight.position.set(-4, -3, 3);
    scene.add(rimLight);

    // Group
    const group = new THREE.Group();
    group.scale.setScalar(2.0);
    scene.add(group);

    // Materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: badge.primaryColor,
      metalness: badge.metalness,
      roughness: badge.roughness,
      emissive: badge.emissiveColor,
      emissiveIntensity: 0.5,
    });

    const rimMaterial = new THREE.MeshStandardMaterial({
      color: badge.secondaryColor,
      metalness: 0.95,
      roughness: 0.1,
      emissive: badge.primaryColor,
      emissiveIntensity: 0.7,
    });

    if (badge.geometryType === 'hexagon') {
      const hex = new THREE.CylinderGeometry(0.85, 0.85, 0.14, 6);
      const mesh = new THREE.Mesh(hex, bodyMaterial);
      mesh.rotation.x = Math.PI / 2;
      group.add(mesh);
      const rim = new THREE.CylinderGeometry(0.92, 0.92, 0.09, 6);
      const rMesh = new THREE.Mesh(rim, rimMaterial);
      rMesh.rotation.x = Math.PI / 2;
      group.add(rMesh);
    } else if (badge.geometryType === 'shield') {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.95);
      shape.quadraticCurveTo(0.8, 0.85, 0.8, 0.1);
      shape.quadraticCurveTo(0.7, -0.6, 0, -0.95);
      shape.quadraticCurveTo(-0.7, -0.6, -0.8, 0.1);
      shape.quadraticCurveTo(-0.8, 0.85, 0, 0.95);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 });
      geo.center();
      group.add(new THREE.Mesh(geo, bodyMaterial));
      const rim = new THREE.TorusGeometry(0.9, 0.035, 12, 32);
      group.add(new THREE.Mesh(rim, rimMaterial));
    } else {
      const coin = new THREE.CylinderGeometry(0.85, 0.85, 0.14, 48);
      const mesh = new THREE.Mesh(coin, bodyMaterial);
      mesh.rotation.x = Math.PI / 2;
      group.add(mesh);
      const rim = new THREE.TorusGeometry(0.88, 0.05, 16, 48);
      group.add(new THREE.Mesh(rim, rimMaterial));
    }

    // Star core
    const emblem = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.4, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.95,
        roughness: 0.1,
        emissive: badge.secondaryColor,
        emissiveIntensity: 0.9,
      })
    );
    emblem.position.z = 0.14;
    group.add(emblem);

    // Particle Cloud
    const count = 48;
    const pGeo = new THREE.BufferGeometry();
    const pArr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const r = 1.1 + Math.random() * 0.35;
      pArr[i * 3] = Math.cos(theta) * r;
      pArr[i * 3 + 1] = Math.sin(theta) * r;
      pArr[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
    const pMat = new THREE.PointsMaterial({
      color: badge.secondaryColor,
      size: 0.07,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    group.add(new THREE.Points(pGeo, pMat));

    // Interactive Drag Controls
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let velX = 0;
    let velY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevX;
      const deltaY = e.clientY - prevY;
      velX = deltaX * 0.008;
      velY = deltaY * 0.008;
      group.rotation.y += velX;
      group.rotation.x += velY;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch support
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevX = e.touches[0].clientX;
        prevY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevX;
      const deltaY = e.touches[0].clientY - prevY;
      velX = deltaX * 0.008;
      velY = deltaY * 0.008;
      group.rotation.y += velX;
      group.rotation.x += velY;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    };
    const onTouchEnd = () => {
      isDragging = false;
    };

    container.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();
    const loop = () => {
      animId = requestAnimationFrame(loop);
      const elapsed = clock.getElapsedTime();

      if (!isDragging) {
        velX *= 0.94;
        velY *= 0.94;
        group.rotation.y += velX + 0.006;
        group.rotation.x += velY;
      }

      emblem.rotation.y = elapsed * 1.5;
      group.position.y = Math.sin(elapsed * 2.0) * 0.06;

      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [badge]);

  const copyHash = () => {
    navigator.clipboard.writeText(badge.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-700/70 shadow-2xl overflow-hidden text-slate-100 flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-slate-600/50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left Side: 3D Turntable Interactive Canvas */}
        <div className="relative w-full md:w-1/2 h-64 md:h-auto bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-slate-800">
          <div ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center" />
          <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
            <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 bg-slate-800/70 px-2.5 py-1 rounded-full border border-slate-700/60">
              Drag / Sentuh untuk Putar 360°
            </span>
          </div>
        </div>

        {/* Right Side: Credential Details & Civic Impact */}
        <div className="p-6 w-full md:w-1/2 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kredensial Smart City Terverifikasi</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">{badge.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{badge.subtitle}</p>
            <div className="mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {badge.tier}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mt-3">{badge.description}</p>
          </div>

          {/* Stats Matrix */}
          <div className="grid grid-cols-3 gap-2 bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/60">
            {badge.stats.map((s, idx) => (
              <div key={idx} className="text-center">
                <span className="text-[9px] text-slate-400 block font-mono uppercase truncate">{s.label}</span>
                <span className="text-xs font-bold text-slate-100 font-mono">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Ledger Proof / SHA-256 Checksum */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">Ledger Hash ID</span>
              <button
                onClick={copyHash}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <div className="font-mono text-[10px] text-slate-300 break-all bg-slate-900/90 p-1.5 rounded border border-slate-800">
              {badge.hash}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white text-xs font-bold transition-all border border-slate-600/50"
          >
            Tutup Inspeksi 3D
          </button>
        </div>
      </div>
    </div>
  );
}
