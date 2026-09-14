import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Report, ReportStatus, ReportCategory, Wilayah } from '../types';
import { MapView, MapLegend, MapMarkerItem } from '../components/MapComponents';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../components/Badges';
import { STATUS_CONFIG, CATEGORY_OPTIONS, formatDateTime, timeAgo } from '../lib/constants';
import { DateTimeFilter, DateTimeFilterState, INITIAL_DATE_TIME_FILTER, matchesDateTimeFilter } from '../components/DateTimeFilter';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  MapPin, Filter, X, Search, ShieldCheck, ArrowRight,
  PlusCircle, RefreshCw, Layers, Calendar, Eye, Shield,
  Radio, HardHat, AlertTriangle, ChevronRight, Activity,
  ExternalLink, UserCheck, CheckCircle2, Flame,
} from 'lucide-react';

export function PublicMapPage() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [wilayahs, setWilayahs] = useState<Wilayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all'>('all');
  const [wilayahFilter, setWilayahFilter] = useState<string>('all');
  const [dateTimeFilter, setDateTimeFilter] = useState<DateTimeFilterState>(INITIAL_DATE_TIME_FILTER);
  const [showFilters, setShowFilters] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);

  const isAdmin = profile?.role === 'admin';

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: reportData }, { data: wilayahData }] = await Promise.all([
      supabase
        .from('reports')
        .select('*')
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false }),
      supabase.from('wilayah').select('*').order('name'),
    ]);

    setReports((reportData as Report[]) || []);
    setWilayahs((wilayahData as Wilayah[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    // Supabase Real-Time Channel for instant map marker sync
    const channel = supabase
      .channel('realtime:map_reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleCreateReportClick = () => {
    if (session) {
      navigate('/app/create-report');
    } else {
      navigate('/auth?redirect=/app/create-report');
    }
  };

  const filtered = reports.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (wilayahFilter !== 'all' && r.wilayah_id !== wilayahFilter) return false;
    if (!matchesDateTimeFilter(r.created_at, dateTimeFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.title.toLowerCase().includes(q) &&
        !r.ticket_id.toLowerCase().includes(q) &&
        !(r.address || '').toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const markers: MapMarkerItem[] = filtered
    .filter((r) => r.latitude !== null && r.longitude !== null)
    .map((r) => ({
      id: r.id,
      position: [r.latitude!, r.longitude!] as [number, number],
      title: r.title,
      status: r.status,
      statusLabel: STATUS_CONFIG[r.status]?.label || r.status,
      ticketId: r.ticket_id,
      category: r.category,
      address: r.address || undefined,
      photoUrl: r.photo_url,
      createdAt: r.created_at,
      onClick: () => setSelected(r),
    }));

  // Tactical summary metrics for admin
  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const inProgressCount = reports.filter((r) => ['verified', 'assigned', 'in_progress'].includes(r.status)).length;
  const urgentCount = reports.filter((r) => r.priority === 'urgent' || r.priority === 'high').length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      
      {/* ═══════ HEADER (ADAPTS TO ADMIN COMMAND CENTER VS CITIZEN PUBLIC) ═══════ */}
      <header className={`sticky top-0 z-30 text-white border-b shadow-md ${isAdmin ? 'bg-[#080E1F] border-white/10' : 'bg-[#0A1628] border-white/[0.08]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={isAdmin ? "/app/admin" : "/"} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm">
                <img src="/images/logo.png" alt="LaporinAja Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-display font-bold text-white text-base leading-none block">
                  LaporinAja
                </span>
                <span className="text-[10px] font-mono text-[#D4A843] block uppercase tracking-widest mt-0.5">
                  {isAdmin ? 'Posko Monitoring Wilayah' : 'Peta Sebaran Laporan Warga'}
                </span>
              </div>
            </Link>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle variant="compact" />

            {isAdmin ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/app/admin/reports"
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <span>Daftar Kelola Laporan</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleCreateReportClick}
                  className="px-4 py-2 rounded-xl bg-[#D4A843] hover:bg-[#c29636] text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Buat Laporan</span>
                </button>

                {!session && (
                  <Link to="/auth" className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all hidden sm:inline-flex">
                    Masuk Portal
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══════ ADMIN TACTICAL METRICS BAR (ONLY FOR ADMIN) ═══════ */}
      {isAdmin && (
        <div className="bg-[#0B132B] border-b border-white/10 px-4 sm:px-6 py-2.5 text-white">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0EA58D] animate-ping" />
              <span className="font-bold uppercase tracking-wider text-[#0EA58D]">
                COMMAND CENTER LIVE TELEMETRY:
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Total Terpetakan:</span>
                <strong className="text-white bg-white/10 px-2 py-0.5 rounded">{reports.length}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Menunggu Verifikasi:</span>
                <strong className="text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded font-extrabold">{pendingCount}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Dalam Pengerjaan:</span>
                <strong className="text-teal-400 bg-teal-500/20 px-2 py-0.5 rounded">{inProgressCount}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Urgensi Tinggi:</span>
                <strong className="text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">{urgentCount}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ SEARCH & FILTER TOOLBAR ═══════ */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-base sm:text-lg font-extrabold text-slate-900">
              {isAdmin ? 'Peta Sebaran & Operasional Wilayah Kota' : 'Peta Sebaran Laporan Real-Time'}
            </h1>
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {filtered.length} Titik
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari jalan, tiket, judul..."
                className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0EA58D]/30 focus:border-[#0EA58D]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date & Time Filter */}
            <DateTimeFilter
              value={dateTimeFilter}
              onChange={setDateTimeFilter}
              size="sm"
              badgeLabel="Waktu"
            />

            {/* Wilayah Filter */}
            {wilayahs.length > 0 && (
              <select
                value={wilayahFilter}
                onChange={(e) => setWilayahFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">Semua Wilayah</option>
                {wilayahs.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}

            {/* Toggle Heatmap Button */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                showHeatmap
                  ? 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Tampilkan Heatmap Kepadatan & Titik Rawan Masalah"
            >
              <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-white' : 'text-rose-500'}`} />
              <span>{showHeatmap ? 'Heatmap Aktif' : 'Heatmap Titik Rawan'}</span>
            </button>

            {/* Toggle Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                showFilters || statusFilter !== 'all' || categoryFilter !== 'all' || dateTimeFilter.preset !== 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Kategori & Status</span>
              {(statusFilter !== 'all' || categoryFilter !== 'all' || dateTimeFilter.preset !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-[#D4A843]" />
              )}
            </button>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Expandable Filter drawer */}
        {showFilters && (
          <div className="max-w-7xl mx-auto pt-3 mt-3 border-t border-slate-100 grid sm:grid-cols-2 gap-4 animate-slide-down">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1.5">
                Filter Status Penanganan:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { value: 'all', label: 'Semua Status' },
                  { value: 'pending', label: 'Menunggu' },
                  { value: 'verified', label: 'Terverifikasi' },
                  { value: 'assigned', label: 'Ditugaskan' },
                  { value: 'in_progress', label: 'Dikerjakan' },
                  { value: 'completed', label: 'Selesai' },
                ] as const).map((st) => (
                  <button
                    key={st.value}
                    onClick={() => setStatusFilter(st.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === st.value
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-1.5">
                Filter Kategori Infrastruktur:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    categoryFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Kategori
                </button>
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategoryFilter(cat.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      categoryFilter === cat.value
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ MAP CANVAS CONTAINER ═══════ */}
      <div className="flex-1 relative min-h-[500px]">
        <MapView
          center={[-6.2088, 106.8456]}
          zoom={12}
          markers={markers}
          showHeatmap={showHeatmap}
          className="w-full h-full min-h-[calc(100vh-180px)]"
        />

        {/* Legend */}
        <div className="absolute bottom-6 left-6 z-20 hidden md:block">
          {showHeatmap ? (
            <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-lg text-xs space-y-2">
              <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-500" />
                <span>Kerapatan Area Rawan Masalah:</span>
              </div>
              <div className="space-y-1">
                <div className="h-3 w-56 rounded-full bg-gradient-to-r from-blue-500 via-teal-400 via-emerald-400 via-amber-400 to-rose-600 shadow-inner" />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Rendah (Aman)</span>
                  <span>Sedang</span>
                  <span className="font-bold text-rose-600">Padat / Kritis</span>
                </div>
              </div>
            </div>
          ) : (
            <MapLegend />
          )}
        </div>

        {/* ═══════ DETAIL DRAWER / POPUP MODAL ON MARKER CLICK ═══════ */}
        {selected && (
          <div className="absolute top-4 right-4 z-20 w-full max-w-sm sm:max-w-md bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 bg-[#D4A843] text-slate-950 rounded-md">
                  {selected.ticket_id}
                </span>
                <StatusBadge status={selected.status} size="xs" />
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo preview */}
            {selected.photo_url && (
              <div className="relative h-44 bg-slate-950 overflow-hidden">
                <img
                  src={selected.photo_url}
                  alt={selected.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Info Body */}
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CategoryBadge category={selected.category} />
                <PriorityBadge priority={selected.priority} size="xs" />
              </div>

              <h3 className="font-display font-extrabold text-base text-slate-900 leading-snug">
                {selected.title}
              </h3>

              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                {selected.description}
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                <span className="truncate">{selected.address || 'Alamat geotagged'}</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                {isAdmin ? (
                  <Link
                    to={`/app/admin/reports/${selected.id}`}
                    className="w-full py-2.5 rounded-xl bg-[#0EA58D] hover:bg-[#0c8f7a] text-white text-center text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <HardHat className="w-4 h-4" />
                    <span>Kelola & Audit Laporan (Admin)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    to={`/reports/${selected.id}`}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>Lihat Rincian Laporan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
