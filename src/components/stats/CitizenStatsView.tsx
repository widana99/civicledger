import React from 'react';
import { Link } from 'react-router-dom';
import { Report, Wilayah } from '../../types';
import { CATEGORY_OPTIONS } from '../../lib/constants';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  CheckCircle2, Clock, Printer, Star, Download, RefreshCw, Trophy,
  PlusCircle, MapPin, TrendingUp, ShieldCheck, Sparkles, Building2
} from 'lucide-react';

interface CitizenStatsProps {
  loading: boolean;
  exportingPDF: boolean;
  stats: {
    total: number;
    pending: number;
    verified: number;
    assigned: number;
    in_progress: number;
    completed: number;
    rejected: number;
    avgRating: number;
    totalRatings: number;
    avgResolutionDays: number;
  };
  categoryStats: { name: string; value: number; color: string; completed: number }[];
  wilayahStats: {
    id: string;
    name: string;
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    completionRate: number;
    avgScore: number;
  }[];
  trendData: { date: string; masuk: number; selesai: number }[];
  starDistribution: Record<number, number>;
  onRefresh: () => void;
  onExportPDF: () => void;
  onPrint: () => void;
}

export function CitizenStatsView({
  loading,
  exportingPDF,
  stats,
  categoryStats,
  wilayahStats,
  trendData,
  starDistribution,
  onRefresh,
  onExportPDF,
  onPrint,
}: CitizenStatsProps) {
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  
  // Top 3 Wilayah for Leaderboard Podium
  const topWilayahLeaderboard = [...wilayahStats]
    .sort((a, b) => (b.completionRate * 100 + b.completed) - (a.completionRate * 100 + a.completed))
    .slice(0, 3);

  return (
    <div className="space-y-8 animate-slide-up font-sans">
      
      {/* ═══════ CITIZEN HEADER & ACTIONS ═══════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#0EA58D] uppercase tracking-widest block">
              // PORTAL TRANSPARANSI PUBLIK //
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[10px] font-mono font-bold">
              👥 Keterbukaan Warga
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight mt-1">
            Indeks Transparansi & Kinerja Kota
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-2xl">
            Pantau akuntabilitas penanganan fasilitas lingkungan sekitar Anda, kecepatan respon dinas terkait, dan penilaian warga secara terbuka.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/app/create-report"
            className="px-4 py-2.5 rounded-xl bg-[#0EA58D] hover:bg-[#0C8C77] text-white text-xs font-extrabold transition-all flex items-center gap-2 shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Buat Laporan Baru</span>
          </Link>

          <button
            onClick={onExportPDF}
            disabled={exportingPDF}
            className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-extrabold transition-all flex items-center gap-2 shadow-xs"
          >
            {exportingPDF ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-rose-600" />}
            <span>{exportingPDF ? 'Membuat PDF...' : 'Unduh PDF'}</span>
          </button>

          <button
            onClick={onPrint}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <Printer className="w-4 h-4 text-[#D4A843]" />
            <span>Cetak Rekapitulasi</span>
          </button>
        </div>
      </div>

      {/* ═══════ CITIZEN PARTICIPATION HERO BANNER ═══════ */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0EA58D]/20 text-[#2DD4BF] border border-[#0EA58D]/30 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart City Participatory Ledger</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
            Suara Anda Membangun Kota Lebih Bersih & Tertata
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Setiap aduan yang Anda kirimkan tercatat permanen dalam buku besar digital dan diawasi langsung oleh dinas terkait hingga tuntas.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/map"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold transition-all flex items-center gap-2"
          >
            <MapPin className="w-4 h-4 text-[#2DD4BF]" />
            <span>Buka Peta Radar</span>
          </Link>
          <Link
            to="/app/create-report"
            className="px-4 py-2.5 rounded-xl bg-[#E5A93C] hover:bg-[#D4A843] text-[#0B132B] text-xs font-extrabold transition-all flex items-center gap-2 shadow-glow-gold"
          >
            <PlusCircle className="w-4 h-4 text-[#0B132B]" />
            <span>Lapor Sekarang</span>
          </Link>
        </div>
      </div>

      {/* ═══════ 4 PRIMARY KPI CARDS ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              📢
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
              TERSERAP
            </span>
          </div>
          <div>
            <div className="text-3xl font-display font-black text-slate-900">{stats.total}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Total Aspirasi Masuk</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#0EA58D] text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              {completionRate}% SELESAI
            </span>
          </div>
          <div>
            <div className="text-3xl font-display font-black text-[#0EA58D]">{stats.completed}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Laporan Tuntas Diperbaiki</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#D4A843] text-slate-950 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
              RESPON SLA
            </span>
          </div>
          <div>
            <div className="text-3xl font-display font-black text-slate-900">
              {stats.avgResolutionDays} <span className="text-base font-normal text-slate-500">Hari</span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Rata-Rata Waktu Tanggap</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Star className="w-5 h-5 fill-slate-950" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
              {stats.totalRatings} ULASAN
            </span>
          </div>
          <div>
            <div className="text-3xl font-display font-black text-amber-600">
              {stats.avgRating.toFixed(1)} <span className="text-base font-normal text-slate-500">/ 5.0</span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Indeks Kepuasan Warga</div>
          </div>
        </div>
      </div>

      {/* ═══════ LEADERBOARD PODIUM ═══════ */}
      {topWilayahLeaderboard.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#D4A843]" />
                <h3 className="font-display font-extrabold text-lg sm:text-xl text-white">
                  Leaderboard Wilayah Paling Responsif
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Peringkat kecamatan dengan persentase penanganan keluhan fasilitas publik tertinggi
              </p>
            </div>
            <span className="hidden sm:inline-block text-xs font-mono font-bold px-3 py-1 bg-[#D4A843]/20 text-[#D4A843] border border-[#D4A843]/30 rounded-full">
              ★ Teladan Kota
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topWilayahLeaderboard.map((wil, idx) => {
              const medals = [
                { badge: '🥇 Peringkat 1 (Teladan)', border: 'border-amber-400/50', bg: 'bg-amber-500/10', text: 'text-amber-400' },
                { badge: '🥈 Peringkat 2', border: 'border-slate-400/50', bg: 'bg-slate-500/10', text: 'text-slate-300' },
                { badge: '🥉 Peringkat 3', border: 'border-amber-700/50', bg: 'bg-amber-800/10', text: 'text-amber-600' },
              ];
              const m = medals[idx] || medals[1];
              return (
                <div
                  key={wil.id}
                  className={`rounded-2xl p-5 border ${m.border} ${m.bg} space-y-3 relative overflow-hidden backdrop-blur-xs`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-mono font-extrabold ${m.text}`}>{m.badge}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md">
                      {wil.completionRate}% Tuntas
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-white">{wil.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {wil.completed} dari {wil.total} aduan diselesaikan
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ CHARTS SECTION: TREND & CATEGORIES ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Penanganan */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0EA58D]" />
              <span>Tren Aspirasi Masuk vs Penanganan (30 Hari)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Grafik perbandingan aduan warga baru dengan perbaikan yang terselesaikan
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSelesai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA58D" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0EA58D" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B132B', borderRadius: '12px', border: 'none', color: '#fff' }}
                />
                <Area type="monotone" dataKey="masuk" name="Laporan Masuk" stroke="#3B82F6" strokeWidth={2} fill="url(#colorMasuk)" />
                <Area type="monotone" dataKey="selesai" name="Tuntas Diperbaiki" stroke="#0EA58D" strokeWidth={2} fill="url(#colorSelesai)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kategori Permasalahan */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#D4A843]" />
              <span>Sebaran Masalah Fasilitas Kota</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi jenis keluhan yang paling sering dilaporkan masyarakat
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#0B132B', fontWeight: 600 }} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B132B', borderRadius: '12px', border: 'none', color: '#fff' }}
                />
                <Bar dataKey="value" name="Total Laporan" fill="#0EA58D" radius={[0, 8, 8, 0]} />
                <Bar dataKey="completed" name="Tuntas" fill="#D4A843" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══════ PUBLIC SATISFACTION STAR BREAKDOWN ═══════ */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>Indeks Kepuasan & Ulasan Warga (CSAT)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Penilaian independen warga setelah melihat foto bukti pengerjaan oleh petugas lapangan
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-display font-black text-amber-500">
              {stats.avgRating.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ 5.0</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[5, 4, 3, 2, 1].map((s) => {
            const count = starDistribution[s] || 0;
            const pct = stats.totalRatings > 0 ? Math.round((count / stats.totalRatings) * 100) : 0;
            return (
              <div key={s} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-center">
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-800">
                  <span>{s}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                </div>
                <div className="text-lg font-black text-slate-900">{count}</div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[10px] font-mono text-slate-400">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
