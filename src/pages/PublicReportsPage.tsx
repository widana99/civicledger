import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Report, ReportCategory, ReportStatus, Wilayah } from '../types';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../components/Badges';
import { MapView, MapMarkerItem } from '../components/MapComponents';
import { ThemeToggle } from '../components/ThemeToggle';
import { normalizeReportStatus, CATEGORY_CONFIG, STATUS_CONFIG } from '../lib/constants';
import {
  Search, MapPin, Navigation, Map as MapIcon,
  LayoutGrid, RefreshCw, X, ChevronRight,
  FilePlus2, AlertCircle, SlidersHorizontal, Compass
} from 'lucide-react';

/* ───── Haversine Formula for Real-Time Distance ───── */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

type SortOption = 'newest' | 'oldest' | 'priority' | 'closest';
type RadiusOption = 'all' | 2 | 5 | 10 | 25;

export function PublicReportsPage() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [reports, setReports] = useState<Report[]>([]);
  const [wilayahs, setWilayahs] = useState<Wilayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'all'>('all');
  const [selectedWilayah, setSelectedWilayah] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // GPS Geolocation states
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedRadius, setSelectedRadius] = useState<RadiusOption>('all');

  // Mobile filter accordion toggle
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  /* ───── Fetch Initial Data & Wilayah ───── */
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // Fetch public reports
      const { data: reportsData, error: reportsErr } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsErr) throw reportsErr;

      // Fetch regions list for dropdown filter
      const { data: wilayahData } = await supabase
        .from('wilayah')
        .select('*')
        .order('name', { ascending: true });

      const normalizedReports = ((reportsData as Report[]) || []).map((r) => ({
        ...r,
        status: normalizeReportStatus(r.status),
      }));

      setReports(normalizedReports);
      setWilayahs(wilayahData || []);
    } catch (err) {
      console.error('Error fetching public directory reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Realtime Supabase Channel for instant community updates
    const channel = supabase
      .channel('public_reports_directory_stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        () => {
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  /* ───── Real-Time Geolocation Trigger ───── */
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Browser Anda tidak mendukung deteksi geolokasi GPS.');
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
        setSortBy('closest');
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setLocationError('Izin akses lokasi ditolak atau sinyal GPS tidak stabil.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleClearLocation = () => {
    setUserLocation(null);
    setSelectedRadius('all');
    if (sortBy === 'closest') setSortBy('newest');
  };

  /* ───── Filtering & Sorting Calculation ───── */
  const filteredAndSortedReports = useMemo(() => {
    return reports
      .map((report) => {
        let distance: number | null = null;
        if (
          userLocation &&
          typeof report.latitude === 'number' &&
          typeof report.longitude === 'number'
        ) {
          distance = calculateDistanceKm(
            userLocation.lat,
            userLocation.lng,
            report.latitude,
            report.longitude
          );
        }
        return { ...report, distanceKm: distance };
      })
      .filter((report) => {
        // 1. Text Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = report.title?.toLowerCase().includes(q);
          const matchDesc = report.description?.toLowerCase().includes(q);
          const matchTicket = report.ticket_id?.toLowerCase().includes(q);
          const matchAddress = report.address?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchTicket && !matchAddress) {
            return false;
          }
        }

        // 2. Category Filter
        if (selectedCategory !== 'all' && report.category !== selectedCategory) {
          return false;
        }

        // 3. Status Filter
        if (selectedStatus !== 'all' && report.status !== selectedStatus) {
          return false;
        }

        // 4. Wilayah Filter
        if (selectedWilayah !== 'all' && report.wilayah_id !== selectedWilayah) {
          return false;
        }

        // 5. GPS Radius Filter
        if (userLocation && selectedRadius !== 'all') {
          if (report.distanceKm === null || report.distanceKm > selectedRadius) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'closest') {
          if (a.distanceKm === null && b.distanceKm === null) return 0;
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'priority') {
          const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        }
        // Default: newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [reports, searchQuery, selectedCategory, selectedStatus, selectedWilayah, selectedRadius, sortBy, userLocation]);

  /* ───── Map Markers Transform ───── */
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    return filteredAndSortedReports
      .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
      .map((r) => ({
        id: r.id,
        position: [r.latitude!, r.longitude!] as [number, number],
        title: r.title,
        status: r.status,
        statusLabel: STATUS_CONFIG[r.status]?.label || r.status,
        ticketId: r.ticket_id,
        category: r.category,
        categoryLabel: CATEGORY_CONFIG[r.category]?.label || r.category,
        address: r.address,
        photoUrl: r.photo_url,
        createdAt: r.created_at,
        onClick: () => navigate(`/reports/${r.id}`),
      }));
  }, [filteredAndSortedReports, navigate]);

  /* ───── Status Counts for Filter Badges ───── */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: reports.length };
    reports.forEach((r) => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return counts;
  }, [reports]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: reports.length };
    reports.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [reports]);

  const activeFiltersCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedStatus !== 'all' ? 1 : 0) +
    (selectedWilayah !== 'all' ? 1 : 0) +
    (selectedRadius !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedWilayah('all');
    setSelectedRadius('all');
    setSortBy('newest');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070A11] text-slate-900 dark:text-slate-100 font-sans selection:bg-[#0EA58D] selection:text-white transition-colors duration-300">
      
      {/* ═══════ HEADER DIRECTORY TOPBAR ═══════ */}
      <header className="sticky top-0 z-30 bg-white/85 dark:bg-[#0B1120]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-300 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <img src="/images/logo.png" alt="LaporinAja" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-header font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-none">
                    LaporinAja
                  </span>
                  <span className="hidden md:inline px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider border border-emerald-500/20">
                    Direktori Publik
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  Arsip & Pemantauan Laporan Kota
                </span>
              </div>
            </Link>
          </div>

          {/* Actions & Links */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              to="/map"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all"
            >
              <Compass className="w-3.5 h-3.5 text-[#0EA58D]" />
              <span>Peta Radar</span>
            </Link>

            <ThemeToggle variant="compact" />

            {session ? (
              <Link
                to="/app/create-report"
                className="px-4 py-2 rounded-xl bg-[#0EA58D] hover:bg-[#0c8b77] text-white text-xs font-bold font-header uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Buat Laporan</span>
                <span className="sm:hidden">Lapor</span>
              </Link>
            ) : (
              <Link
                to="/auth?redirect=/app/create-report"
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold font-header uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm hover:opacity-90"
              >
                <span>Masuk Portal</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ═══════ HERO TITLE & TELEMETRY STRIP ═══════ */}
      <section className="bg-gradient-to-b from-slate-100/60 to-transparent dark:from-[#0B1120]/60 dark:to-transparent border-b border-slate-200/60 dark:border-slate-800/40 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Pencatatan Transparan & Akuntabel</span>
              </div>
              <h1 className="font-header font-black text-2xl sm:text-4xl text-slate-900 dark:text-white tracking-tight uppercase">
                Seluruh Laporan Warga Kota
              </h1>
              <p className="font-body text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mt-1.5 leading-relaxed">
                Pantau seluruh pengaduan kerusakan fasilitas, kebersihan, dan lingkungan kota secara live. Cari berdasarkan lokasi radius GPS, jenis keluhan, maupun tahapan penanganan.
              </p>
            </div>

            {/* Quick Live Stats Pill */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">TOTAL LAPORAN</span>
                  <span className="font-header font-extrabold text-base text-slate-900 dark:text-white">
                    {reports.length}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">TERTANGANI</span>
                  <span className="font-header font-extrabold text-base text-emerald-500">
                    {reports.filter((r) => r.status === 'completed').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ MAIN CONTENT AREA ═══════ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* ───── CONTROL PANEL: SEARCH & PRIMARY FILTERS ───── */}
        <div className="bg-white dark:bg-[#0B1120] rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          
          {/* Search Bar & GPS Trigger */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari jenis laporan, nomor tiket (TKT-...), jalan, atau kata kunci..."
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA58D]/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* GPS Location Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={userLocation ? handleClearLocation : handleDetectLocation}
                disabled={locating}
                className={`px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all flex-1 sm:flex-none ${
                  userLocation
                    ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Gunakan posisi GPS saat ini untuk mengukur jarak insiden"
              >
                <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                <span>
                  {locating
                    ? 'Mencari Sinyal GPS...'
                    : userLocation
                    ? 'Lokasi Aktif (Hapus)'
                    : 'Gunakan Lokasi Saya'}
                </span>
              </button>

              {/* View Switcher Button (Grid vs Map) */}
              <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-xl text-xs font-bold transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-900 text-[#0B132B] dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Tampilan Kartu"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-xl text-xs font-bold transition-all ${
                    viewMode === 'map'
                      ? 'bg-white dark:bg-slate-900 text-[#0B132B] dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Tampilan Peta Interaktif"
                >
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                className="sm:hidden p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* GPS Location Status Note */}
          {locationError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{locationError}</span>
            </div>
          )}

          {userLocation && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  GPS Terkunci: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Radius:
                </span>
                {(['all', 2, 5, 10, 25] as RadiusOption[]).map((r) => (
                  <button
                    key={String(r)}
                    onClick={() => setSelectedRadius(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      selectedRadius === r
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {r === 'all' ? 'Semua Jarak' : `< ${r} km`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ───── FILTER BAR (DESKTOP & EXPANDABLE MOBILE) ───── */}
          <div className={`space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 ${showFiltersMobile ? 'block' : 'hidden sm:block'}`}>
            
            {/* Category Filter Pills */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                Kategori Laporan:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategory === 'all'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>Semua Kategori</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20">
                    {categoryCounts['all'] || 0}
                  </span>
                </button>

                {(Object.keys(CATEGORY_CONFIG) as ReportCategory[]).map((cat) => {
                  const cfg = CATEGORY_CONFIG[cat];
                  const isSelected = selectedCategory === cat;
                  const count = categoryCounts[cat] || 0;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#0EA58D] text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{cfg.label}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Filter & Region Dropdown Strip */}
            <div className="grid sm:grid-cols-12 gap-3 items-center pt-2">
              
              {/* Status Selector */}
              <div className="sm:col-span-8 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold mr-1">
                  Status:
                </span>
                <button
                  onClick={() => setSelectedStatus('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedStatus === 'all'
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Semua ({statusCounts['all'] || 0})
                </button>
                {(Object.keys(STATUS_CONFIG) as ReportStatus[]).map((st) => {
                  const isSelected = selectedStatus === st;
                  const count = statusCounts[st] || 0;
                  return (
                    <button
                      key={st}
                      onClick={() => setSelectedStatus(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        isSelected
                          ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold shadow-xs'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {STATUS_CONFIG[st].label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Wilayah Dropdown & Sort Selector */}
              <div className="sm:col-span-4 flex items-center gap-2 justify-end">
                {/* Wilayah Filter */}
                <select
                  value={selectedWilayah}
                  onChange={(e) => setSelectedWilayah(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">Semua Wilayah</option>
                  {wilayahs.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>

                {/* Sort Option */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="priority">Prioritas Tinggi</option>
                  {userLocation && <option value="closest">Jarak Terdekat</option>}
                </select>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs"
                    title="Reset semua filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>

        {/* ───── ACTIVE FILTERS SUMMARY STRIP ───── */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
          <div>
            Menampilkan <strong className="text-slate-900 dark:text-white">{filteredAndSortedReports.length}</strong> laporan
            {searchQuery && ` untuk "${searchQuery}"`}
            {selectedCategory !== 'all' && ` • Kategori: ${CATEGORY_CONFIG[selectedCategory].label}`}
            {selectedStatus !== 'all' && ` • Status: ${STATUS_CONFIG[selectedStatus].label}`}
            {userLocation && selectedRadius !== 'all' && ` • Radius < ${selectedRadius} km`}
          </div>
          <button
            onClick={() => fetchData(true)}
            className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-white transition-colors"
            title="Muat ulang data live"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#0EA58D]' : ''}`} />
            <span className="hidden sm:inline">Sinkronisasi</span>
          </button>
        </div>

        {/* ───── VIEW CONTAINER (GRID OR MAP) ───── */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-slate-200 dark:bg-slate-800/60 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredAndSortedReports.length === 0 ? (
          <div className="py-20 text-center space-y-4 bg-white dark:bg-[#0B1120] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-header font-extrabold text-lg text-slate-900 dark:text-white">
                Tidak Ada Laporan yang Sesuai
              </h3>
              <p className="font-body text-xs text-slate-500 max-w-sm mx-auto">
                Coba sesuaikan kata kunci pencarian, ubah filter kategori, atau perluas radius lokasi Anda.
              </p>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        ) : viewMode === 'map' ? (
          /* ───── DUAL VIEW: INTERACTIVE MAP ───── */
          <div className="bg-white dark:bg-[#0B1120] rounded-3xl p-3 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="h-[620px] rounded-2xl overflow-hidden relative">
              <MapView
                markers={mapMarkers}
                autoFit={true}
                zoom={12}
                showHeatmap={false}
              />
            </div>
          </div>
        ) : (
          /* ───── DUAL VIEW: RESPONSIVE CARDS GRID ───── */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedReports.map((report) => {
              const isOwner = profile !== null && profile.id === report.reporter_id;
              return (
                <div
                  key={report.id}
                  className={`rounded-3xl bg-white dark:bg-[#0B1120] overflow-hidden flex flex-col justify-between border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group ${
                    isOwner
                      ? 'border-[#D4A843]/60 ring-1 ring-[#D4A843]/20'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Photo & Overlay Badges */}
                  <div>
                    <div className="relative h-48 bg-slate-950 overflow-hidden">
                      <img
                        src={report.photo_url || '/images/hero_showcase.jpg'}
                        alt={report.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={report.status} size="xs" />
                        <CategoryBadge category={report.category} />
                        {isOwner && (
                          <span className="px-2 py-0.5 rounded-md bg-[#D4A843] text-slate-950 text-[10px] font-extrabold font-mono uppercase shadow-xs">
                            Laporan Anda
                          </span>
                        )}
                      </div>

                      {/* Ticket Number & GPS Distance */}
                      <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5">
                        {report.distanceKm !== null && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-emerald-500 text-white rounded-md shadow-xs flex items-center gap-1">
                            <Navigation className="w-2.5 h-2.5" />
                            <span>{report.distanceKm} km</span>
                          </span>
                        )}
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-black/75 text-white rounded-md border border-white/10">
                          {report.ticket_id}
                        </span>
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <PriorityBadge priority={report.priority} />
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(report.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <h3 className="font-header font-extrabold text-slate-900 dark:text-white text-base leading-snug line-clamp-2 group-hover:text-[#0EA58D] transition-colors">
                        {report.title}
                      </h3>

                      <p className="font-body text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {report.description}
                      </p>

                      <div className="pt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono border-t border-slate-100 dark:border-slate-800/80">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        <span className="truncate">{report.address || 'Titik Koordinat Geospasial Terdaftar'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Card CTA */}
                  <div className="px-5 pb-5 pt-0">
                    <Link
                      to={`/reports/${report.id}`}
                      className="w-full py-2.5 rounded-xl text-center text-xs font-bold font-header transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 hover:bg-[#0EA58D] hover:text-white text-slate-900 dark:text-white group/btn"
                    >
                      <span>Lihat Rincian Penanganan</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

    </div>
  );
}
