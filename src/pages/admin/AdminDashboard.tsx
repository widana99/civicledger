import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Report } from '../../types';
import { TicketCard } from '../../components/TicketCard';
import { CATEGORY_OPTIONS, formatDate, formatDateTime } from '../../lib/constants';
import { exportStatsToPDF } from '../../lib/exportUtils';
import { DashboardStatsSkeleton } from '../../components/SkeletonLoader';
import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  FileText, Clock, TrendingUp, Users, AlertTriangle,
  ArrowRight, Loader2, ListTodo, PieChart as PieChartIcon, BarChart3,
  Zap, Timer, Target, Printer, ShieldCheck, HardHat, MapPin,
  CheckCircle2, PlusCircle, Download, FileSpreadsheet,
} from 'lucide-react';

const PALETTE = {
  navy: '#0B132B',
  gold: '#D4A843',
  teal: '#0EA58D',
  brick: '#C1503D',
  sand: '#EFF1EC',
  border: '#E2E4E0',
  text: '#5A6372',
  muted: '#8891A0',
  bg: '#F6F7F5',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  verified: '#3B82F6',
  assigned: '#0EA58D',
  in_progress: '#0EA58D',
  completed: '#10B981',
  rejected: '#EF4444',
};

export function AdminDashboard() {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    rejected: 0,
    completionRate: 0,
    avgResolutionDays: 0,
    escalatedCount: 0,
  });
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [urgentReports, setUrgentReports] = useState<Report[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; count: number }[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      const { data: reports } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reports) {
        const r = reports as Report[];
        const completed = r.filter((x) => x.status === 'completed');
        const now = new Date();

        // Avg resolution time (days) for completed reports
        let totalDays = 0;
        completed.forEach((c) => {
          const start = new Date(c.created_at).getTime();
          const end = c.completed_at ? new Date(c.completed_at).getTime() : now.getTime();
          totalDays += (end - start) / (1000 * 60 * 60 * 24);
        });
        const avgDays = completed.length > 0 ? parseFloat((totalDays / completed.length).toFixed(1)) : 0;

        // Pending and In Progress
        const pending = r.filter((x) => x.status === 'pending' || x.status === 'verified').length;
        const inProgress = r.filter((x) => x.status === 'assigned' || x.status === 'in_progress').length;
        const rejected = r.filter((x) => x.status === 'rejected').length;
        const rate = r.length > 0 ? Math.round((completed.length / r.length) * 100) : 0;

        // Escalated reports (>3 days unhandled)
        const escalated = r.filter((x) => {
          const isPending = x.status === 'pending' || x.status === 'verified';
          const ageDays = (now.getTime() - new Date(x.created_at).getTime()) / (1000 * 60 * 60 * 24);
          return isPending && ageDays > 3;
        }).length;

        setStats({
          total: r.length,
          pending,
          inProgress,
          completed: completed.length,
          rejected,
          completionRate: rate,
          avgResolutionDays: avgDays,
          escalatedCount: escalated,
        });

        // Category counts
        const catMap: Record<string, number> = {};
        r.forEach((item) => {
          catMap[item.category] = (catMap[item.category] || 0) + 1;
        });
        setCategoryCounts(catMap);

        // Pie data
        const pieArr = [
          { name: 'Menunggu', value: pending, color: STATUS_COLORS.pending },
          { name: 'Diproses / Ditugaskan', value: inProgress, color: STATUS_COLORS.in_progress },
          { name: 'Selesai', value: completed.length, color: STATUS_COLORS.completed },
          { name: 'Ditolak', value: rejected, color: STATUS_COLORS.rejected },
        ].filter((x) => x.value > 0);
        setPieData(pieArr);

        // 7-day trend
        const trendMap: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          trendMap[key] = 0;
        }
        r.forEach((item) => {
          const key = item.created_at.slice(0, 10);
          if (trendMap[key] !== undefined) {
            trendMap[key]++;
          }
        });
        setTrendData(
          Object.entries(trendMap).map(([date, count]) => ({
            date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            count,
          }))
        );

        setRecentReports(r.slice(0, 4));
        setUrgentReports(r.filter((x) => (x.priority === 'urgent' || x.priority === 'high') && x.status !== 'completed' && x.status !== 'rejected').slice(0, 4));
      }
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setExportingPDF(true);
    try {
      await exportStatsToPDF(dashboardRef.current, `CivicLedger_Laporan_Eksekutif_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded-md animate-pulse" />
            <div className="h-4 w-72 bg-slate-200 rounded-md animate-pulse" />
          </div>
        </div>
        <DashboardStatsSkeleton />
      </div>
    );
  }

  return (
    <div ref={dashboardRef} className="animate-slide-up space-y-6 pb-12 font-sans">
      
      {/* ═══════ HEADER ═══════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#0EA58D] uppercase tracking-widest block">
              // ADMIN OPERATIONS //
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold">
              Command Hub
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-1">
            Dashboard Pemantauan & Operasional Admin
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
            Kendali verifikasi cepat, disposisi lapangan, dan monitoring mitigasi insiden kota
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <Link
            to="/stats"
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#0EA58D]" />
            <span>Statistik Kota</span>
          </Link>

          <button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            title="Unduh laporan ringkasan dalam format PDF"
          >
            {exportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{exportingPDF ? 'Membuat PDF...' : 'Unduh PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4A843]" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* ═══════ PRINT LETTERHEAD ═══════ */}
      <div className="hidden print:block border-b-2 border-slate-950 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-950 text-white flex items-center justify-center font-bold">
              CL
            </div>
            <div>
              <h2 className="font-display font-extrabold text-lg text-slate-950 uppercase">
                CIVICLEDGER REPUBLIK INDONESIA
              </h2>
              <p className="text-xs text-slate-600 font-mono">
                Lembar Laporan Harian Operasional & Disposisi Petugas
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-xs">
            <p className="font-bold">DOKUMEN KENDALI ADMIN</p>
            <p className="text-slate-500">{formatDateTime(new Date().toISOString())}</p>
          </div>
        </div>
      </div>

      {/* ═══════ TACTICAL KPI CARDS ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reports */}
        <Link
          to="/app/admin/reports"
          className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-slate-400 transition-all group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Total Laporan Masuk
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-slate-950">{stats.total}</div>
          <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Semua Tiket Kota</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Pending Verification */}
        <Link
          to="/app/admin/reports"
          className={`rounded-3xl border p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all group space-y-2 ${
            stats.pending > 0
              ? 'bg-amber-500/10 border-amber-400/60 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-extrabold text-amber-800 uppercase tracking-wider">
              Perlu Verifikasi Segera
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-amber-900">{stats.pending}</div>
          <div className="text-[11px] text-amber-800 font-mono font-bold flex items-center justify-between pt-1 border-t border-amber-200/60">
            <span>{stats.pending > 0 ? '⚡ Butuh Tindakan Admin' : 'Semua Terverifikasi'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-800 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* In Progress */}
        <Link
          to="/app/admin/reports"
          className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-slate-400 transition-all group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-teal-700 uppercase tracking-wider">
              Dalam Pengerjaan
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center">
              <Loader2 className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-teal-800">{stats.inProgress}</div>
          <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Ditugaskan ke Petugas</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Escalated */}
        <Link
          to="/app/admin/reports"
          className={`rounded-3xl border p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all group space-y-2 ${
            stats.escalatedCount > 0
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-extrabold text-rose-700 uppercase tracking-wider">
              Perlu Eskalasi (&gt;3 Hari)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-rose-900">{stats.escalatedCount}</div>
          <div className="text-[11px] text-rose-700 font-mono flex items-center justify-between pt-1 border-t border-rose-200">
            <span>{stats.escalatedCount > 0 ? 'Terlambat SLA' : 'SLA Aman'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-rose-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* ═══════ QUICK COMMAND ACTION ROW ═══════ */}
      <div className="grid sm:grid-cols-3 gap-4 print:hidden">
        <Link
          to="/app/admin/reports"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#0EA58D] hover:shadow-md transition-all flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-[#0EA58D] group-hover:text-white text-slate-700 flex items-center justify-center transition-colors">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-slate-900">Kelola & Disposisi Laporan</h4>
            <p className="text-[11px] text-slate-500">Verifikasi, tolak, atau tugaskan ke dinas</p>
          </div>
        </Link>

        <Link
          to="/app/admin/petugas"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#0EA58D] hover:shadow-md transition-all flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-[#0EA58D] group-hover:text-white text-slate-700 flex items-center justify-center transition-colors">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-slate-900">Kelola Petugas Lapangan</h4>
            <p className="text-[11px] text-slate-500">Monitor absensi & penugasan zona kerja</p>
          </div>
        </Link>

        <Link
          to="/map"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#0EA58D] hover:shadow-md transition-all flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-[#0EA58D] group-hover:text-white text-slate-700 flex items-center justify-center transition-colors">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-slate-900">Peta Command Center</h4>
            <p className="text-[11px] text-slate-500">Pantau sebaran titik insiden real-time</p>
          </div>
        </Link>
      </div>

      {/* ═══════ URGENT & RECENT REPORTS SECTION ═══════ */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Urgent Reports Requiring Fast Action */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <h3 className="font-display font-extrabold text-base text-slate-900">
                Laporan Prioritas Tinggi & Darurat ({urgentReports.length})
              </h3>
            </div>
            <Link
              to="/app/admin/reports"
              className="text-xs font-bold text-[#0EA58D] hover:underline"
            >
              Lihat Semua
            </Link>
          </div>

          <div className="space-y-3">
            {urgentReports.map((r) => (
              <TicketCard key={r.id} report={r} to={`/app/admin/reports/${r.id}`} />
            ))}
            {urgentReports.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8 font-mono">
                Tidak ada laporan darurat aktif yang membutuhkan tindakan saat ini.
              </p>
            )}
          </div>
        </div>

        {/* Recent Inflow */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-display font-extrabold text-base text-slate-900">
                Laporan Terbaru Masuk Sistem ({recentReports.length})
              </h3>
            </div>
            <Link
              to="/app/admin/reports"
              className="text-xs font-bold text-[#0EA58D] hover:underline"
            >
              Semua Entri
            </Link>
          </div>

          <div className="space-y-3">
            {recentReports.map((r) => (
              <TicketCard key={r.id} report={r} to={`/app/admin/reports/${r.id}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ CHARTS SECTION ═══════ */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trend 14 Days */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-900" />
              <h3 className="font-display font-bold text-base text-slate-900">Volume Laporan 14 Hari Terakhir</h3>
            </div>
          </div>
          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="adminTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA58D" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0EA58D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#0F172A',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: 11,
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0EA58D"
                  strokeWidth={2}
                  fill="url(#adminTrendFill)"
                  name="Jumlah Tiket"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown Pie */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-teal-600" />
              <h3 className="font-display font-bold text-base text-slate-900">Distribusi Status Saat Ini</h3>
            </div>
            <span className="text-xs font-mono text-slate-400 font-bold">{stats.total} Total Tiket</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-36 h-36 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#0F172A',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: 11,
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2 text-xs font-mono">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="truncate text-slate-600">{item.name}</span>
                  <span className="font-bold text-slate-900 ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
