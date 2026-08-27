import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Report } from '../types';
import { StatusBadge, CategoryBadge } from '../components/Badges';
import { VideoBackground } from '../components/VideoBackground';
import { SplineScene } from '../components/SplineScene';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  ShieldCheck, MapPin, ArrowRight,
  CheckCircle2, FileText, Clock, Eye,
  ChevronRight,
  Wrench, Activity, LayoutDashboard,
  Radio, ArrowUpRight, CheckCircle, Users, Phone,
  Send, MessageCircle, LogOut, Sparkles,
  Box, Shield, Zap, Flame, Compass, BarChart3, PlusCircle,
  Layers, MousePointer, RotateCw, Globe
} from 'lucide-react';
import type { Variants } from 'framer-motion';

/* ───── Animation Variants ───── */
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
};

type TabKey = 'transparansi' | 'teknologi' | 'profesional';

const TAB_CONTENT: Record<TabKey, {
  index: string;
  title: string;
  subtitle: string;
  desc: string;
  bullets: string[];
  image: string;
  tag: string;
  accent: string;
}> = {
  transparansi: {
    index: 'SYS-01',
    title: 'Command Center & Audit Terbuka',
    subtitle: 'Transparansi Real-Time Publik',
    desc: 'Setiap entri aspirasi dan keluhan warga terekam permanen dalam ledger terbuka. Dilengkapi analitik telemetri kota, histori status kronologis, dan verifikasi multi-tier yang tidak dapat dimanipulasi.',
    bullets: [
      'Audit trail kronologis setiap perubahan status laporan',
      'Dashboard analitik kota dengan pembaruan data real-time',
      'Verifikasi identitas berkeamanan tinggi dengan opsi mode anonim',
    ],
    image: '/images/command_center.jpg',
    tag: 'PUBLIC AUDIT LEDGER',
    accent: '#0EA58D',
  },
  teknologi: {
    index: 'SYS-02',
    title: 'Keunggulan Geospasial AI',
    subtitle: 'Presisi Koordinat & Heatmap AI',
    desc: 'Memadukan koordinat GPS presisi tinggi, peta klaster interaktif, deteksi laporan ganda dalam radius 50 meter, dan radar notifikasi instan untuk akselerasi respon penanganan di lapangan.',
    bullets: [
      'Penandaan lokasi insiden dengan akurasi GPS sub-meter',
      'Peta klaster interaktif berbasis zona wilayah & densitas masalah',
      'Deteksi otomatis laporan duplikat berbasis radius geolokasi',
    ],
    image: '/images/smart_city_hologram.jpg',
    tag: '3D GEOSPATIAL RADAR',
    accent: '#D4A843',
  },
  profesional: {
    index: 'SYS-03',
    title: 'Armada Tanggap Lapangan',
    subtitle: 'Aplikasi Mobile Petugas PWA',
    desc: 'Sistem disposisi cerdas mengarahkan petugas dinas terkait ke titik insiden dengan navigasi peta instan, kewajiban bukti foto pengerjaan, dan evaluasi rating langsung dari warga pelapor.',
    bullets: [
      'Aplikasi mobile khusus petugas dengan navigasi GPS terpadu',
      'Wajib unggah bukti foto pengerjaan sebelum tiket diselesaikan',
      'Evaluasi skor kepuasan bintang 1–5 langsung dari warga',
    ],
    image: '/images/field_officer.jpg',
    tag: 'FIELD RESPONSE UNIT',
    accent: '#3B82F6',
  },
};

const HERO_PILLS = [
  { id: 'all', label: 'Semua Laporan' },
  { id: 'infrastruktur', label: 'Infrastruktur Jalan' },
  { id: 'kebersihan', label: 'Kebersihan Kota' },
  { id: 'lingkungan', label: 'Lingkungan Hidup' },
  { id: 'pelayanan', label: 'Fasilitas Umum' },
];

const SERVICES = [
  { code: '01', icon: MapPin, title: 'Presisi Geotagging GPS', desc: 'Tandai titik kerusakan secara akurat dengan peta satelit dan penanda lokasi pintar.' },
  { code: '02', icon: ShieldCheck, title: 'Verifikasi Terstruktur & Anonim', desc: 'Tim verifikator memvalidasi urgensi laporan dengan opsi perlindungan data privasi warga.' },
  { code: '03', icon: Wrench, title: 'Disposisi Cerdas Petugas', desc: 'Petugas dinas terkait langsung diterjunkan sesuai keahlian teknis dan zona kerja wilayah.' },
  { code: '04', icon: Activity, title: 'Estimasi Waktu SLA & Telemetri', desc: 'Pantau perkiraan waktu penyelesaian laporan secara live berdasarkan standar SLA resmi.' },
  { code: '05', icon: CheckCircle, title: 'Dokumentasi Foto Hasil', desc: 'Transparansi hasil pengerjaan dengan foto pembanding sebelum dan sesudah penanganan.' },
  { code: '06', icon: Users, title: 'Audit & Rating Warga', desc: 'Warga memberikan evaluasi skor 1–5 bintang atas kualitas hasil kerja petugas di lapangan.' },
];

export function LandingPage() {
  const { session, profile, signOut } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [publicReports, setPublicReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('transparansi');
  const [selectedHeroPill, setSelectedHeroPill] = useState('all');

  useEffect(() => {
    const fetchPublicReports = async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      setPublicReports((data as Report[]) || []);
      setLoadingReports(false);
    };
    fetchPublicReports();
  }, []);

  const handleReportClick = () => {
    if (session) {
      navigate('/app/create-report');
    } else {
      navigate('/auth?redirect=/app/create-report');
    }
  };

  const currentTab = TAB_CONTENT[activeTab];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070A11] text-slate-900 dark:text-slate-100 overflow-x-hidden font-body selection:bg-[#0EA58D] selection:text-white transition-colors duration-300">
      
      {/* ═══════ 1. HERO SECTION (CINEMATIC VIDEO BACKGROUND) ═══════ */}
      <div className="p-2 sm:p-4 lg:p-6 min-h-screen flex flex-col justify-between">
        <div className="max-w-[1520px] mx-auto w-full bg-white dark:bg-[#0B1120] rounded-2xl sm:rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-slate-200 dark:border-slate-800/80 overflow-hidden flex flex-col justify-between relative transition-colors duration-300">
          
          {/* ───── LUXURY TOPBAR ───── */}
          <header className="px-6 sm:px-10 pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-30 border-b border-slate-200 dark:border-slate-800/60 backdrop-blur-xl bg-white/80 dark:bg-[#0B1120]/75">
            {/* Left Nav Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/"
                className="px-4 py-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-[#0B1120] text-xs font-bold tracking-wide shadow-sm hover:opacity-90 transition-all flex items-center gap-1.5 font-header"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#0EA58D]" />
                Beranda
              </Link>
              <Link
                to="/map"
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all flex items-center gap-1.5 border border-slate-200 dark:border-white/5 font-body"
              >
                <Radio className="w-3 h-3 text-[#0EA58D] animate-pulse" />
                Peta Radar Live
              </Link>
              <a
                href="#layanan"
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-transparent font-body"
              >
                6 Pilar Layanan
              </a>
              <a
                href="#alur"
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-transparent font-body"
              >
                Alur Kerja
              </a>
            </div>

            {/* Right Contact & Portal CTA */}
            <div className="flex items-center gap-3 text-xs font-semibold">
              <ThemeToggle variant="compact" />
              
              {session ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/app"
                    className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm font-header"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard ({profile?.role === 'admin' ? 'Admin' : 'Warga'})</span>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-900 hover:bg-rose-500/20 hover:text-rose-500 text-slate-500 dark:text-slate-400 text-xs transition-all border border-slate-200 dark:border-slate-700"
                    title="Keluar dari akun"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="px-4 py-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:opacity-90 text-xs font-bold transition-all flex items-center gap-1 shadow-md font-header"
                >
                  <span>Masuk Portal</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </header>

          {/* ───── 3-COLUMN EDITORIAL TELEMETRY BAR ───── */}
          <div className="px-6 sm:px-10 pt-4 pb-2 grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px] text-slate-500 dark:text-slate-400 font-mono border-b border-slate-200 dark:border-slate-800/40 z-20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0EA58D] animate-ping" />
              <span className="text-slate-800 dark:text-slate-200 font-semibold uppercase tracking-wider">CIVIC INFRASTRUCTURE LEDGER</span>
            </div>
            <div className="md:text-center font-medium">
              // TELEMETRI KOTA AKTIF: 100% AUDIT TERBUKA //
            </div>
            <div className="md:text-right">
              <span className="text-[#D4A843] font-bold">RESPON CEPAT SLA:</span> 1–3 HARI KERJA
            </div>
          </div>

          {/* ───── HERO VIDEO CANVAS ───── */}
          <div className="relative px-3 sm:px-6 pt-3 pb-4">
            <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl min-h-[540px] sm:min-h-[620px] lg:min-h-[700px] flex flex-col justify-between">
              
              {/* Background Video Component */}
              <VideoBackground
                src="/videos/hero-city.webm"
                poster="/images/hero_showcase.jpg"
                className="absolute inset-0 w-full h-full"
                overlayOpacity={0.6}
                showControls={true}
              />

              {/* ───── GIANT 'CIVIC' TITLE WATERMARK ───── */}
              <div className="absolute top-2 sm:top-6 lg:top-8 inset-x-0 flex justify-center items-start pointer-events-none select-none z-10">
                <motion.h1
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                  className="font-header font-black text-[17vw] lg:text-[18.5vw] leading-[0.82] tracking-[-0.04em] text-white/[0.12] uppercase text-center"
                >
                  CIVIC
                </motion.h1>
              </div>

              {/* ───── CENTER HERO NARRATIVE OVERLAY ───── */}
              <div className="relative z-20 px-6 sm:px-12 pt-16 sm:pt-20 max-w-4xl">
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                  className="space-y-5"
                >
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-[11px] font-mono text-emerald-400 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>SMART CITY INFRASTRUCTURE & ENVIRONMENT LEDGER</span>
                  </div>

                  <h2 className="font-header font-extrabold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight uppercase leading-[1.08]">
                    Lapor Masalah Kota, <br />
                    <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                      Pantau Penanganan Hingga Tuntas.
                    </span>
                  </h2>

                  <p className="font-body text-sm sm:text-base text-slate-200 max-w-2xl leading-relaxed">
                    Platform pengaduan fasilitas umum, jalan berlubang, sampah, dan lingkungan terintegrasi dengan peta radar geospasial, SLA akuntabel, dan aplikasi petugas lapangan.
                  </p>

                  {/* Call To Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={handleReportClick}
                      className="px-7 py-3.5 rounded-full bg-[#0EA58D] hover:bg-[#0c8b77] text-white text-xs font-extrabold font-header uppercase tracking-wider shadow-[0_0_25px_rgba(14,165,141,0.5)] transition-all flex items-center gap-2 scale-100 hover:scale-105"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Buat Laporan Sekarang</span>
                    </button>

                    <Link
                      to="/map"
                      className="px-6 py-3.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold font-header uppercase tracking-wider border border-slate-700 backdrop-blur-md transition-all flex items-center gap-2"
                    >
                      <Radio className="w-4 h-4 text-[#D4A843]" />
                      <span>Eksplorasi Peta Radar</span>
                    </Link>
                  </div>
                </motion.div>
              </div>

              {/* ───── FLOATING BOTTOM FILTER PILLS ───── */}
              <div className="relative z-20 p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent">
                
                {/* Filter Pills on lower deck */}
                <div className="flex items-center gap-2 flex-wrap">
                  {HERO_PILLS.map((p) => {
                    const isActive = selectedHeroPill === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedHeroPill(p.id);
                          handleReportClick();
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-semibold font-body transition-all backdrop-blur-md ${
                          isActive
                            ? 'bg-white text-slate-950 shadow-lg font-bold scale-105'
                            : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Live System Status Pill */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-md text-[11px] font-mono text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>99.8% SISTEM ONLINE // RATA-RATA RESPON &lt; 24 JAM</span>
                </div>
              </div>
            </div>

          </div>

          <div className="h-2" />
        </div>
      </div>

      {/* ═══════ 2. DEDICATED 3D WEBGL DIGITAL TWIN CITY SECTION ═══════ */}
      <section id="3d-city" className="py-20 sm:py-28 px-4 sm:px-6 max-w-7xl mx-auto space-y-12">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold uppercase tracking-widest">
              <Box className="w-3.5 h-3.5" />
              <span>3D WEBGL INTERACTIVE CANVAS</span>
            </div>
            <h2 className="font-header font-extrabold text-3xl sm:text-5xl text-slate-900 dark:text-white tracking-tight uppercase">
              Digital Twin Kota Cerdas
            </h2>
            <p className="font-body text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Model 3D interaktif real-time yang memvisualisasikan zonasi infrastruktur perkotaan. Geser, putar, dan eksplorasi simpul telemetri fasilitas publik secara langsung.
            </p>
          </div>

          {/* Interactive hints */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400">
            <MousePointer className="w-3.5 h-3.5 text-[#0EA58D] animate-bounce" />
            <span>Klik & Seret Kursor untuk Memutar 3D</span>
          </div>
        </div>

        {/* 3D WebGL Spline Theater Showcase */}
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          
          {/* Main 3D Canvas Box */}
          <div className="lg:col-span-8 h-[480px] sm:h-[580px] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-[#070A11] relative">
            <SplineScene
              sceneUrl="https://prod.spline.design/hyEpCSgFwD6XVbdZ/scene.splinecode"
              className="w-full h-full"
            />
          </div>

          {/* Side Telemetry Cards */}
          <div className="lg:col-span-4 space-y-4">
            
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#0EA58D] font-bold">[ SIMPUL SENSOR ]</span>
                <Globe className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="font-header font-bold text-lg text-slate-900 dark:text-white uppercase">
                Geotagging Presisi Tinggi
              </h3>
              <p className="font-body text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Setiap laporan otomatis ditautkan ke titik koordinat satelit dengan radius klastering otomatis.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#D4A843] font-bold">[ DISPOSISI TIKET ]</span>
                <Zap className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="font-header font-bold text-lg text-slate-900 dark:text-white uppercase">
                Respon Cepat Lapangan
              </h3>
              <p className="font-body text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Penugasan otomatis ke petugas zona wilayah dengan notifikasi push Firebase dan SLA terukur.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-blue-500 font-bold">[ PRIVASI WARGA ]</span>
                <Shield className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="font-header font-bold text-lg text-slate-900 dark:text-white uppercase">
                Mode Anonim Terlindungi
              </h3>
              <p className="font-body text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Warga dapat melapor tanpa mengekspos identitas pribadi ke publik, tetap aman dan terlindungi.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════ 3. SECTION: PROTOKOL OPERASIONAL BENTO GRID ═══════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 max-w-7xl mx-auto space-y-16">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold uppercase tracking-widest">
            [ PROTOKOL OPERASIONAL KOTA ]
          </div>
          <h2 className="font-header text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
            Standar Baru Tata Kelola Sipil
          </h2>
          <p className="font-body text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mx-auto">
            Menghilangkan birokrasi berbelit dengan menghubungkan warga secara instan ke dinas teknis pemerintah kota melalui teknologi modern.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center">
          <div className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 inline-flex gap-1">
            {(Object.keys(TAB_CONTENT) as TabKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-5 sm:px-7 py-2 rounded-full text-xs font-bold transition-all uppercase tracking-wider font-header ${
                  activeTab === key
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-md font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{TAB_CONTENT[key].title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Feature Tab Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl p-6 sm:p-10 bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 shadow-2xl grid lg:grid-cols-12 gap-10 items-center transition-colors duration-300"
          >
            {/* Image Showcase */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden aspect-[16/10] border border-slate-200 dark:border-slate-700/80 relative group shadow-xl bg-slate-950">
                <img
                  src={currentTab.image}
                  alt={currentTab.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-emerald-400 text-[11px] font-mono font-bold uppercase tracking-wider border border-emerald-500/30">
                    {currentTab.tag}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <span className="text-xs font-mono text-[#D4A843] font-bold uppercase tracking-widest">
                  // {currentTab.subtitle}
                </span>
                <h3 className="font-header text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1 uppercase tracking-tight">
                  {currentTab.title}
                </h3>
              </div>

              <p className="font-body text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {currentTab.desc}
              </p>

              <div className="space-y-3 pt-2">
                {currentTab.bullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-500/40">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium font-body">{b}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <button
                  onClick={handleReportClick}
                  className="px-6 py-3 rounded-full bg-[#0EA58D] hover:bg-[#0c8b77] text-white text-xs font-bold font-header transition-all uppercase tracking-wider flex items-center gap-2 shadow-md"
                >
                  <span>Mulai Ajukan Laporan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <Link
                  to="/map"
                  className="text-xs font-bold font-header text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-wider flex items-center gap-1"
                >
                  <span>Buka Peta Live</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 3 Metric Cards */}
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { code: 'MET-01', value: '100%', label: 'Audit Publik Terbuka', desc: 'Setiap laporan tersimpan dalam buku besar terbuka dan tidak dapat dimanipulasi.', icon: Eye, color: 'text-emerald-500 dark:text-emerald-400' },
            { code: 'MET-02', value: '< 24H', label: 'Rata-rata Respon Tim', desc: 'Petugas lapangan ditugaskan langsung dengan SLA respon terukur.', icon: Clock, color: 'text-amber-500 dark:text-amber-400' },
            { code: 'MET-03', value: 'GEOTAG', label: 'Akurasi Koordinat GPS', desc: 'Lokasi otomatis terpetakan untuk akurasi pengerjaan armada di lapangan.', icon: MapPin, color: 'text-blue-500 dark:text-blue-400' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl p-6 bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5 text-[#0EA58D]" />
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 font-bold">{stat.code}</span>
                </div>
                <div className={`text-4xl font-header font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-sm font-bold font-header text-slate-800 dark:text-slate-200 mt-1 uppercase tracking-tight">{stat.label}</div>
                <p className="font-body text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{stat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════ 4. SECTION: WORKFLOW ALUR KERJA ═══════ */}
      <section id="alur" className="py-20 sm:py-28 bg-white dark:bg-[#0B1120] text-slate-900 dark:text-white border-y border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-14 items-center">
            
            {/* Left Narrative */}
            <div className="lg:col-span-6 space-y-8">
              <div>
                <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-bold uppercase tracking-[0.2em] border border-emerald-500/30">
                  // ALUR 4 TAHAPAN //
                </span>
                <h2 className="font-header text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mt-4 leading-tight uppercase tracking-tight">
                  Dari Laporan Hingga Selesai Tuntas
                </h2>
                <p className="font-body text-sm text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                  Sistem dirancang otomatis untuk memastikan setiap tahap mulai dari pelaporan warga, verifikasi dinas, penugasan armada teknis, hingga audit hasil kerja terekam sempurna.
                </p>
              </div>

              {/* Step Timeline */}
              <div className="space-y-4">
                {[
                  { step: '01', title: 'Warga Mengirim Laporan', desc: 'Isi formulir ringkas, unggah foto kondisi, dan aktifkan GPS untuk tagging lokasi presisi dengan opsi anonim.' },
                  { step: '02', title: 'Verifikasi & Skala Prioritas', desc: 'Admin sistem memvalidasi laporan dan menetapkan prioritas pengerjaan (Darurat / Normal / SLA).' },
                  { step: '03', title: 'Petugas Dikerahkan ke Lapangan', desc: 'Armada teknis dinas terkait menerima rincian tugas di aplikasi mobile dan bergerak menindaklanjuti.' },
                  { step: '04', title: 'Selesai dengan Bukti & Rating', desc: 'Petugas mengunggah foto penyelesaian; warga pelapor memberikan rating kepuasan.' },
                ].map((item) => (
                  <div key={item.step} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                    <span className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-mono font-black text-xs flex-shrink-0 shadow-md">
                      {item.step}
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold font-header text-slate-900 dark:text-white uppercase tracking-tight">{item.title}</h4>
                      <p className="font-body text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Visual Showcase Stack */}
            <div className="lg:col-span-6 space-y-6">
              <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl relative group bg-slate-950">
                <img
                  src="/images/field_officer.jpg"
                  alt="Petugas Lapangan"
                  className="w-full h-72 sm:h-80 object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest">[ UNIT RESPON LAPANGAN ]</div>
                  <div className="text-lg font-extrabold font-header uppercase tracking-tight mt-0.5">Petugas Bersertifikasi & Siaga 24/7</div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg relative group bg-slate-950">
                  <img
                    src="/images/hero_showcase.jpg"
                    alt="Dashboard Showcase"
                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-slate-950/50" />
                  <div className="absolute bottom-3 left-3 text-white text-xs font-bold font-header uppercase tracking-wider">
                    [ DASHBOARD ANALITIK ]
                  </div>
                </div>
                
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg relative group bg-slate-950">
                  <img
                    src="/images/3d_badges.jpg"
                    alt="3D Civic Badges"
                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-slate-950/50" />
                  <div className="absolute bottom-3 left-3 text-white text-xs font-bold font-header uppercase tracking-wider">
                    [ 4 PILAR KEAMANAN ]
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════ 5. SECTION: RECENT REPORTS FEED ═══════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-[0.2em] mb-2 block">
              // LIVE STREAM //
            </span>
            <h2 className="font-header text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
              Laporan Masuk Warga Kota
            </h2>
          </div>
          <Link
            to="/map"
            className="px-5 py-2.5 rounded-full bg-[#0EA58D] hover:bg-[#0c8b77] text-xs font-bold font-header text-white transition-all flex items-center gap-2 self-start uppercase tracking-wider shadow-md"
          >
            <span>Buka Peta Interaktif</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingReports ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-80 bg-slate-200 dark:bg-slate-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : publicReports.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-white dark:bg-[#0B1120] rounded-3xl border border-slate-200 dark:border-slate-800">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40 text-slate-400" />
            <span className="font-mono text-sm">Belum ada laporan warga publik yang terdaftar.</span>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicReports.map((report) => {
              const isMine = profile !== null && profile.id === report.reporter_id;
              return (
                <div
                  key={report.id}
                  className={`rounded-2xl bg-white dark:bg-[#0B1120] overflow-hidden flex flex-col justify-between hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${
                    isMine ? 'border-2 border-[#D4A843]/80 ring-2 ring-[#D4A843]/20 shadow-md' : 'border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="relative h-48 bg-slate-950 overflow-hidden">
                      <img
                        src={report.photo_url || '/images/hero_showcase.jpg'}
                        alt={report.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <StatusBadge status={report.status} size="xs" />
                        <CategoryBadge category={report.category} />
                        {isMine && (
                          <span className="px-2 py-0.5 rounded-md bg-[#D4A843] text-slate-950 text-[10px] font-extrabold font-mono uppercase shadow-xs">
                            👑 Laporan Anda
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-2.5 right-3 font-mono text-[11px] font-bold px-2.5 py-1 bg-black/80 text-white rounded-md border border-white/10">
                        {report.ticket_id}
                      </div>
                    </div>

                    <div className="p-5 space-y-2.5">
                      <h3 className="font-header font-extrabold text-slate-900 dark:text-white text-base leading-snug line-clamp-1">{report.title}</h3>
                      <p className="font-body text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{report.description}</p>

                      <div className="pt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono border-t border-slate-100 dark:border-slate-800/80">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        <span className="truncate">{report.address || 'Lokasi Terdaftar'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-0">
                    <Link
                      to={`/reports/${report.id}`}
                      className={`w-full py-2.5 rounded-xl text-center text-xs font-bold font-header transition-all block uppercase tracking-wider ${
                        isMine
                          ? 'bg-[#D4A843] hover:bg-[#c29636] text-slate-950 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                      }`}
                    >
                      {isMine ? '👑 Kelola Tiket Anda →' : 'Rincian Penanganan →'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════ 6. SECTION: 6 PILAR LAYANAN BENTO GRID ═══════ */}
      <section id="layanan" className="py-20 sm:py-28 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-[0.2em] block">
              [ 6 PILAR LAYANAN ]
            </span>
            <h2 className="font-header text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
              Standar Layanan Publik.
            </h2>
            <p className="font-body text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Enam pilar terintegrasi yang menjamin setiap pengaduan warga ditangani dengan standar operasional kota modern.
            </p>
            <div>
              <button
                onClick={handleReportClick}
                className="px-6 py-3.5 rounded-full bg-[#0EA58D] hover:bg-[#0c8b77] text-white text-xs font-extrabold font-header shadow-md flex items-center gap-2 uppercase tracking-wider"
              >
                <span>Mulai Ajukan Laporan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4">
            {SERVICES.map((svc) => {
              const Icon = svc.icon;
              return (
                <div
                  key={svc.title}
                  className="p-6 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-1 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-800 dark:text-white">
                      <Icon className="w-5 h-5 text-[#0EA58D]" />
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 font-bold">{svc.code}</span>
                  </div>
                  <h3 className="font-header font-extrabold text-slate-900 dark:text-white text-base mb-1.5 uppercase tracking-tight">{svc.title}</h3>
                  <p className="font-body text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">{svc.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="bg-slate-900 dark:bg-[#050811] text-white border-t border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-12 gap-10">
            
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white text-slate-950 flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5 text-[#0EA58D]" />
                </div>
                <span className="font-header font-black text-xl text-white tracking-tight uppercase">CIVICLEDGER</span>
              </div>
              <p className="font-body text-xs text-slate-400 leading-relaxed max-w-sm font-normal">
                Sistem Informasi & Manajemen Pelaporan Fasilitas Kota Berbasis Real-Time & Geospasial untuk Pemerintah Daerah dan Masyarakat.
              </p>
            </div>

            <div className="lg:col-span-3 space-y-3">
              <h4 className="font-header font-extrabold text-sm text-white uppercase tracking-wider">Akses Cepat</h4>
              <ul className="space-y-2 text-xs font-body text-slate-400">
                <li><Link to="/map" className="hover:text-white transition-colors">Peta Real-Time Live</Link></li>
                <li><Link to="/auth" className="hover:text-white transition-colors">Portal Masuk / Daftar</Link></li>
                <li><Link to="/app" className="hover:text-white transition-colors">Dashboard Warga</Link></li>
              </ul>
            </div>

            <div className="lg:col-span-4 space-y-3">
              <h4 className="font-header font-extrabold text-sm text-white uppercase tracking-wider">Kontak & Bantuan</h4>
              <p className="font-body text-xs text-slate-400">Layanan pengaduan darurat dinas kota terpadu.</p>
              <div className="text-xs font-mono text-[#D4A843] font-bold">
                Hotline: +62 21 5550 1234 • info@civicledger.id
              </div>
            </div>

          </div>

          <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            <span>© {new Date().getFullYear()} CIVICLEDGER // SMART CITY INITIATIVE</span>
            <span>DESIGN INSPIRED BY ARCHITECTURAL GRAPHIC EXCELLENCE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
