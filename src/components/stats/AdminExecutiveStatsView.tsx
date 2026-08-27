import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Report, Wilayah, Profile } from '../../types';
import { CATEGORY_OPTIONS, STATUS_CONFIG, formatDateTime } from '../../lib/constants';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell
} from 'recharts';
import {
  ShieldAlert, CheckCircle2, Clock, Printer, Star, Download, RefreshCw,
  FileSpreadsheet, AlertTriangle, ListTodo, Users, ArrowUpRight,
  Filter, Calendar, ChevronRight, Activity, Zap, Layers, BarChart3,
  SlidersHorizontal, Building, Check, ArrowRight
} from 'lucide-react';

interface AdminExecutiveStatsProps {
  loading: boolean;
  exportingPDF: boolean;
  exportingExcel: boolean;
  reports: Report[];
  wilayahs: Wilayah[];
  ratings: any[];
  officers: Profile[];
  onRefresh: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onPrint: () => void;
}

export function AdminExecutiveStatsView({
  loading,
  exportingPDF,
  exportingExcel,
  reports,
  wilayahs,
  ratings,
  officers,
  onRefresh,
  onExportPDF,
  onExportExcel,
  onPrint,
}: AdminExecutiveStatsProps) {
  const navigate = useNavigate();

  // ═══════ EXECUTIVE SLICER STATES ═══════
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | '7d' | '30d' | 'quarter'>('all');
  const [selectedWilayah, setSelectedWilayah] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedSlaRisk, setSelectedSlaRisk] = useState<'all' | 'on_time' | 'warning' | 'overdue'>('all');

  // ═══════ FILTERED DATA COMPUTATION ═══════
  const filteredReports = useMemo(() => {
    const now = new Date().getTime();

    return reports.filter((r) => {
      // Time Filter
      if (timeFilter !== 'all') {
        const created = new Date(r.created_at).getTime();
        const diffHours = (now - created) / (1000 * 60 * 60);
        if (timeFilter === 'today' && diffHours > 24) return false;
        if (timeFilter === '7d' && diffHours > 24 * 7) return false;
        if (timeFilter === '30d' && diffHours > 24 * 30) return false;
        if (timeFilter === 'quarter' && diffHours > 24 * 90) return false;
      }

      // Wilayah Filter
      if (selectedWilayah !== 'all' && r.wilayah_id !== selectedWilayah) return false;

      // Category Filter
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;

      // Priority Filter
      if (selectedPriority !== 'all' && r.priority !== selectedPriority) return false;

      // SLA Risk Filter
      if (selectedSlaRisk !== 'all' && r.sla_deadline) {
        const deadline = new Date(r.sla_deadline).getTime();
        const isOverdue = now > deadline && r.status !== 'completed' && r.status !== 'rejected';
        const isWarning = deadline - now < 24 * 60 * 60 * 1000 && !isOverdue && r.status !== 'completed' && r.status !== 'rejected';

        if (selectedSlaRisk === 'overdue' && !isOverdue) return false;
        if (selectedSlaRisk === 'warning' && !isWarning) return false;
        if (selectedSlaRisk === 'on_time' && (isOverdue || isWarning)) return false;
      }

      return true;
    });
  }, [reports, timeFilter, selectedWilayah, selectedCategory, selectedPriority, selectedSlaRisk]);

  // ═══════ EXECUTIVE KPI METRICS ═══════
  const kpi = useMemo(() => {
    const now = new Date().getTime();
    const total = filteredReports.length;
    const completed = filteredReports.filter((r) => r.status === 'completed');
    const inProgress = filteredReports.filter((r) => ['verified', 'assigned', 'in_progress'].includes(r.status));
    const pending = filteredReports.filter((r) => r.status === 'pending');

    // Overdue & SLA Warnings
    const overdueReports = filteredReports.filter((r) => {
      if (!r.sla_deadline || r.status === 'completed' || r.status === 'rejected') return false;
      return new Date(r.sla_deadline).getTime() < now;
    });

    const warningReports = filteredReports.filter((r) => {
      if (!r.sla_deadline || r.status === 'completed' || r.status === 'rejected') return false;
      const deadline = new Date(r.sla_deadline).getTime();
      return deadline >= now && deadline - now < 24 * 60 * 60 * 1000;
    });

    // MTTR (Mean Time To Resolution) in hours
    let totalResolutionHours = 0;
    let completedCountWithDates = 0;
    completed.forEach((r) => {
      if (r.completed_at) {
        const c = new Date(r.created_at).getTime();
        const comp = new Date(r.completed_at).getTime();
        totalResolutionHours += (comp - c) / (1000 * 60 * 60);
        completedCountWithDates++;
      }
    });

    const mttrHours = completedCountWithDates > 0 ? Math.round(totalResolutionHours / completedCountWithDates) : 24;
    const slaComplianceRate = total > 0 ? Math.round(((total - overdueReports.length) / total) * 100) : 100;
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    // Active officers count
    const activeOfficersCount = officers.length || 8;
    const officerLoadRatio = activeOfficersCount > 0 ? (inProgress.length / activeOfficersCount).toFixed(1) : '0';

    return {
      total,
      completed: completed.length,
      inProgress: inProgress.length,
      pending: pending.length,
      overdueCount: overdueReports.length,
      overdueList: overdueReports,
      warningCount: warningReports.length,
      slaComplianceRate,
      completionRate,
      mttrHours,
      officerLoadRatio,
      activeOfficersCount,
    };
  }, [filteredReports, officers]);

  // ═══════ DEPARTMENT & DINAS WORKLOAD BREAKDOWN ═══════
  const departmentStats = useMemo(() => {
    const dMap: Record<string, { label: string; count: number; completed: number; overdue: number }> = {
      infrastruktur: { label: 'Dinas Bina Marga & SDA', count: 0, completed: 0, overdue: 0 },
      lingkungan: { label: 'Dinas Lingkungan Hidup', count: 0, completed: 0, overdue: 0 },
      kebersihan: { label: 'Dinas Kebersihan Kota', count: 0, completed: 0, overdue: 0 },
      keamanan: { label: 'Satpol PP & Ketertiban', count: 0, completed: 0, overdue: 0 },
      pelayanan: { label: 'Diskominfo & Pelayanan', count: 0, completed: 0, overdue: 0 },
      lainnya: { label: 'Dinas Teknis Terpadu', count: 0, completed: 0, overdue: 0 },
    };

    const now = new Date().getTime();
    filteredReports.forEach((r) => {
      const cat = r.category in dMap ? r.category : 'lainnya';
      dMap[cat].count++;
      if (r.status === 'completed') dMap[cat].completed++;
      if (r.sla_deadline && r.status !== 'completed' && r.status !== 'rejected') {
        if (new Date(r.sla_deadline).getTime() < now) {
          dMap[cat].overdue++;
        }
      }
    });

    return Object.entries(dMap).map(([key, data]) => ({
      key,
      name: data.label,
      total: data.count,
      completed: data.completed,
      overdue: data.overdue,
      rate: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 100,
    })).sort((a, b) => b.total - a.total);
  }, [filteredReports]);

  // ═══════ WILAYAH PERFORMANCE MATRIX ═══════
  const wilayahTableData = useMemo(() => {
    const wilMap: Record<string, { id: string; name: string; total: number; completed: number; pending: number; inProgress: number; overdue: number }> = {};
    
    wilayahs.forEach((w) => {
      wilMap[w.id] = { id: w.id, name: w.name, total: 0, completed: 0, pending: 0, inProgress: 0, overdue: 0 };
    });

    const now = new Date().getTime();
    filteredReports.forEach((r) => {
      if (r.wilayah_id && wilMap[r.wilayah_id]) {
        wilMap[r.wilayah_id].total++;
        if (r.status === 'completed') wilMap[r.wilayah_id].completed++;
        else if (r.status === 'pending') wilMap[r.wilayah_id].pending++;
        else if (['verified', 'assigned', 'in_progress'].includes(r.status)) wilMap[r.wilayah_id].inProgress++;

        if (r.sla_deadline && r.status !== 'completed' && r.status !== 'rejected' && new Date(r.sla_deadline).getTime() < now) {
          wilMap[r.wilayah_id].overdue++;
        }
      }
    });

    return Object.values(wilMap).map((w) => ({
      ...w,
      completionRate: w.total > 0 ? Math.round((w.completed / w.total) * 100) : 100,
      slaCompliance: w.total > 0 ? Math.round(((w.total - w.overdue) / w.total) * 100) : 100,
    })).sort((a, b) => b.total - a.total);
  }, [wilayahs, filteredReports]);

  return (
    <div className="space-y-8 animate-slide-up font-sans">

      {/* ═══════ EXECUTIVE HEADER & MULTI-ACTION TOOLBAR ═══════ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#D4A843] uppercase tracking-widest block">
              // EXECUTIVE COMMAND INTELLIGENCE & AUDIT SUITE //
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-mono font-bold">
              🛡️ Mode Komando Eksekutif
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight mt-1">
            Statistik & Rekapitulasi Eksekutif Kota
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-3xl">
            Pusat analitik kepatuhan SLA dinas, matriks efisiensi armada teknis lapangan, dan audit dataset resmi kota.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto flex-wrap">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onExportExcel}
            disabled={exportingExcel || reports.length === 0}
            className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-extrabold transition-all flex items-center gap-2 shadow-xs"
          >
            {exportingExcel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            <span>{exportingExcel ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={onExportPDF}
            disabled={exportingPDF}
            className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-extrabold transition-all flex items-center gap-2 shadow-xs"
          >
            {exportingPDF ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-rose-600" />}
            <span>{exportingPDF ? 'Membuat PDF...' : 'Unduh PDF Laporan'}</span>
          </button>

          <button
            onClick={onPrint}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <Printer className="w-4 h-4 text-[#D4A843]" />
            <span>Cetak Dokumen Resmi</span>
          </button>
        </div>
      </div>

      {/* ═══════ INTERACTIVE EXECUTIVE SLICER BAR ═══════ */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#D4A843]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Filter & Parameter Analitik Eksekutif
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Menampilkan <strong className="text-[#D4A843]">{filteredReports.length}</strong> dari {reports.length} Laporan
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Time Slicer */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Periode Waktu</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="w-full text-xs font-bold bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-hidden focus:border-[#D4A843]"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">24 Jam Terakhir</option>
              <option value="7d">7 Hari Terakhir</option>
              <option value="30d">30 Hari Terakhir</option>
              <option value="quarter">Kuartal Ini (90 Hari)</option>
            </select>
          </div>

          {/* Wilayah Slicer */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Wilayah / Kecamatan</label>
            <select
              value={selectedWilayah}
              onChange={(e) => setSelectedWilayah(e.target.value)}
              className="w-full text-xs font-bold bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-hidden focus:border-[#D4A843]"
            >
              <option value="all">Seluruh Kota ({wilayahs.length} Wilayah)</option>
              {wilayahs.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Category Slicer */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Kategori Dinas</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs font-bold bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-hidden focus:border-[#D4A843]"
            >
              <option value="all">Semua Kategori</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Priority Slicer */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Prioritas</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full text-xs font-bold bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-hidden focus:border-[#D4A843]"
            >
              <option value="all">Semua Prioritas</option>
              <option value="tinggi">Tinggi (High SLA)</option>
              <option value="sedang">Sedang (Medium)</option>
              <option value="rendah">Rendah (Low)</option>
            </select>
          </div>

          {/* SLA Risk Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Status Kepatuhan SLA</label>
            <select
              value={selectedSlaRisk}
              onChange={(e) => setSelectedSlaRisk(e.target.value as any)}
              className="w-full text-xs font-bold bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:outline-hidden focus:border-[#D4A843]"
            >
              <option value="all">Semua Kondisi SLA</option>
              <option value="on_time">Tepat Waktu (On-Time)</option>
              <option value="warning">Mendekati Batas (&lt;24 Jam)</option>
              <option value="overdue">Terlambat (Overdue SLA)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ═══════ 4 EXECUTIVE KPI SCORECARD TILES ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* SLA Compliance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
              TARGET 90%+
            </span>
          </div>
          <div>
            <div className="text-3xl font-display font-black text-slate-900">
              {kpi.slaComplianceRate}%
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Kepatuhan Batas Waktu SLA</div>
          </div>
        </div>

        {/* MTTR (Mean Time To Resolution) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
              MTTR KOTA
            </span>
          </div>
          <div>
            <div className="text-3xl font-display font-black text-slate-900">
              {kpi.mttrHours} <span className="text-base font-normal text-slate-500">Jam</span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Rata-Rata Waktu Penuntasan</div>
          </div>
        </div>

        {/* Fleet Workload Ratio */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
              {kpi.activeOfficersCount} PETUGAS
            </span>
          </div>
          <div>
            <div className="text-3xl font-display font-black text-slate-900">
              {kpi.officerLoadRatio} <span className="text-base font-normal text-slate-500">Tiket / Org</span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Rasio Beban Kerja Armada</div>
          </div>
        </div>

        {/* Overdue Risk Tile */}
        <div className={`rounded-2xl p-5 border shadow-xs space-y-3 ${kpi.overdueCount > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${kpi.overdueCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${kpi.overdueCount > 0 ? 'bg-rose-200 text-rose-900' : 'bg-slate-100 text-slate-600'}`}>
              {kpi.overdueCount > 0 ? 'INTERVENSI' : 'AMAN'}
            </span>
          </div>
          <div>
            <div className={`text-3xl font-display font-black ${kpi.overdueCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {kpi.overdueCount}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Tiket Melampaui Batas SLA</div>
          </div>
        </div>

      </div>

      {/* ═══════ SLA BREACH & OVERDUE ACTION RADAR (CRITICAL QUEUE) ═══════ */}
      {kpi.overdueCount > 0 && (
        <div className="bg-rose-950 text-white rounded-3xl p-6 sm:p-8 border border-rose-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md animate-pulse">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-lg text-white">
                  Radar Antrean Kritis: Tiket Overdue SLA ({kpi.overdueCount} Insiden)
                </h3>
                <p className="text-xs text-rose-200">
                  Laporan di bawah ini telah melewati batas waktu SLA penanganan dan memerlukan eskalasi pimpinan dinas terkait.
                </p>
              </div>
            </div>
            <Link
              to="/app/admin/reports"
              className="px-4 py-2 rounded-xl bg-white text-rose-950 hover:bg-rose-100 text-xs font-bold transition-colors shrink-0 flex items-center gap-2 self-start sm:self-auto"
            >
              <ListTodo className="w-4 h-4 text-rose-700" />
              <span>Kelola Seluruh Tiket</span>
            </Link>
          </div>

          <div className="divide-y divide-rose-800/60 overflow-x-auto rounded-2xl bg-rose-900/50 border border-rose-800">
            {kpi.overdueList.slice(0, 5).map((r) => {
              const wil = wilayahs.find((w) => w.id === r.wilayah_id);
              const overdueHours = r.sla_deadline
                ? Math.max(1, Math.round((new Date().getTime() - new Date(r.sla_deadline).getTime()) / (1000 * 60 * 60)))
                : 0;

              return (
                <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-rose-900/80 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-rose-300">[{r.ticket_id}]</span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 text-[10px] font-mono font-bold uppercase border border-rose-800">
                        {r.category}
                      </span>
                      <span className="text-xs text-rose-200">📍 {wil?.name || 'Wilayah Kota'}</span>
                    </div>
                    <h4 className="font-bold text-sm text-white">{r.title}</h4>
                    <p className="text-xs text-rose-300 line-clamp-1">{r.address}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-3 py-1 rounded-lg bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-mono font-bold">
                      +{overdueHours} Jam Terlambat
                    </span>
                    <Link
                      to={`/app/admin/reports/${r.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <span>Disposisi</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ DEPARTMENT & DINAS WORKLOAD MATRIX ═══════ */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <Building className="w-5 h-5 text-[#0EA58D]" />
              <span>Matriks Distribusi Beban Kerja per Organisasi Perangkat Daerah (OPD)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluasi volume aduan dan persentase penyelesaian tuntas masing-masing dinas teknis
            </p>
          </div>
          <span className="hidden sm:inline-block text-xs font-mono font-bold text-slate-500 px-3 py-1 bg-slate-100 rounded-full">
            Data Analitik Dinas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departmentStats.map((dept) => (
            <div key={dept.key} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-slate-500">{dept.key}</span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${dept.rate >= 80 ? 'bg-emerald-100 text-emerald-800' : dept.rate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                  {dept.rate}% Tuntas
                </span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{dept.name}</h4>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                  <span>Total Aduan: <strong>{dept.total}</strong></span>
                  <span>Tuntas: <strong>{dept.completed}</strong></span>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-[#0EA58D] h-full rounded-full" style={{ width: `${dept.rate}%` }} />
              </div>
              {dept.overdue > 0 && (
                <div className="text-[11px] font-mono text-rose-600 font-bold flex items-center gap-1 pt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{dept.overdue} tiket melewati batas SLA</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ COMPREHENSIVE WILAYAH PERFORMANCE AUDIT TABLE ═══════ */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#D4A843]" />
              <span>Audit Kinerja Penanganan Seluruh Wilayah Kota</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tabel rekapitulasi komparatif status aduan dan kepatuhan SLA antar-kecamatan
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500 px-3 py-1 bg-slate-100 rounded-full">
            Total {wilayahTableData.length} Wilayah
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-mono uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Wilayah / Kecamatan</th>
                <th className="px-4 py-3.5 text-center">Total Laporan</th>
                <th className="px-4 py-3.5 text-center">Selesai</th>
                <th className="px-4 py-3.5 text-center">Dalam Proses</th>
                <th className="px-4 py-3.5 text-center">Overdue</th>
                <th className="px-4 py-3.5 text-center">Tingkat Penuntasan</th>
                <th className="px-4 py-3.5 text-center">Kepatuhan SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wilayahTableData.map((wil) => (
                <tr key={wil.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                    {wil.name}
                  </td>
                  <td className="px-4 py-4 text-center font-bold text-slate-900">
                    {wil.total}
                  </td>
                  <td className="px-4 py-4 text-center font-semibold text-emerald-600">
                    {wil.completed}
                  </td>
                  <td className="px-4 py-4 text-center font-semibold text-amber-600">
                    {wil.inProgress}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${wil.overdue > 0 ? 'bg-rose-100 text-rose-800' : 'text-slate-400'}`}>
                      {wil.overdue}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      {wil.completionRate}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`font-mono font-bold px-2.5 py-1 rounded-lg ${wil.slaCompliance >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {wil.slaCompliance}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
