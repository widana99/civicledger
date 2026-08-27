import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Report } from '../../types';
import { MapView, MapMarkerItem, MapLegend } from '../../components/MapComponents';
import { TicketCard } from '../../components/TicketCard';
import { STATUS_CONFIG, normalizeReportStatus } from '../../lib/constants';
import {
  FilePlus2, MapPin, CheckCircle2, Clock,
  TrendingUp, ShieldCheck, ArrowRight,
  Sparkles, ListTodo, Map as MapIcon, ChevronRight,
} from 'lucide-react';

export function CitizenDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [myReports, setMyReports] = useState<Report[]>([]);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [cityStats, setCityStats] = useState({
    totalCity: 0,
    completedCity: 0,
    inProgressCity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      // Fetch user's reports
      const { data: myData } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', profile.id)
        .order('created_at', { ascending: false });

      // Fetch all reports with coordinates for the live map
      const { data: allData } = await supabase
        .from('reports')
        .select('*')
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false });

      const myReps = ((myData as any[]) || []).map((r) => ({
        ...r,
        status: normalizeReportStatus(r.status),
      }));
      const allReps = ((allData as any[]) || []).map((r) => ({
        ...r,
        status: normalizeReportStatus(r.status),
      }));

      setMyReports(myReps);
      setAllReports(allReps);

      const completed = allReps.filter((r) => r.status === 'completed').length;
      const inProgress = allReps.filter((r) =>
        ['pending', 'verified', 'assigned', 'in_progress'].includes(r.status)
      ).length;

      setCityStats({
        totalCity: allReps.length,
        completedCity: completed,
        inProgressCity: inProgress,
      });

      setLoading(false);
    };

    fetchData();

    // Real-time subscription
    const channel = supabase
      .channel('citizen_dashboard_updates')
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
  }, [profile]);

  const mapMarkers: MapMarkerItem[] = allReports
    .filter((r) => r.latitude !== null && r.longitude !== null)
    .slice(0, 30)
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
      onClick: () => navigate(`/reports/${r.id}`),
    }));

  const completionRate =
    cityStats.totalCity > 0
      ? Math.round((cityStats.completedCity / cityStats.totalCity) * 100)
      : 0;

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans selection:bg-[#E5A93C]/30">
      
      {/* Welcome Liquid Glass Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#0B132B] via-[#0F1E36] to-[#080E1F] text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#0EA58D]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-[#E5A93C]/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-full px-3.5 py-1 text-xs font-mono text-[#2DD4BF]">
              <Sparkles className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>Portal Partisipasi Warga Digital</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Selamat Datang, {profile?.full_name || 'Warga'}! 👋
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Pantau laporan infrastruktur lingkungan sekitar dan ikut serta membangun kota yang lebih responsif dan transparan.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
            <Link
              to="/app/create-report"
              className="btn-accent btn-lg font-bold shadow-glow-gold flex items-center justify-center gap-2 text-[#0B132B]"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Buat Laporan Baru</span>
            </Link>
            <Link
              to="/map"
              className="btn-lg rounded-xl bg-white/10 hover:bg-white/15 text-white backdrop-blur-md border border-white/15 font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <MapIcon className="w-4 h-4 text-[#2DD4BF]" />
              <span>Peta Real-Time</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid with Interactive Navigation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/app/my-reports"
          className="liquid-glass rounded-2xl p-5 space-y-3 hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer block group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#0B132B] text-[#E5A93C] flex items-center justify-center shadow-xs group-hover:bg-[#E5A93C] group-hover:text-[#0B132B] transition-colors">
              <ListTodo className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 px-2 py-0.5 bg-slate-100/80 rounded-full border border-slate-200/60">
              Laporan Anda
            </span>
          </div>
          <div>
            <div className="text-3xl font-display font-black text-[#0B132B]">
              {myReports.length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center justify-between">
              <span>Tiket Anda Kirimkan</span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link
          to="/stats"
          className="liquid-glass rounded-2xl p-5 space-y-3 hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer block group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#0EA58D] text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-[#0EA58D] px-2 py-0.5 bg-[#0EA58D]/10 rounded-full border border-[#0EA58D]/20">
              Tuntas Kota
            </span>
          </div>
          <div>
            <div className="text-3xl font-display font-black text-[#0B132B]">
              {cityStats.completedCity}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center justify-between">
              <span>Laporan Terselesaikan</span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link
          to="/map"
          className="liquid-glass rounded-2xl p-5 space-y-3 hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer block group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#E5A93C] text-[#0B132B] flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-amber-800 px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
              Proses Live
            </span>
          </div>
          <div>
            <div className="text-3xl font-display font-black text-[#0B132B]">
              {cityStats.inProgressCity}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center justify-between">
              <span>Sedang Ditangani</span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link
          to="/stats"
          className="liquid-glass rounded-2xl p-5 space-y-3 hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer block group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#0B132B] text-[#0EA58D] flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-[#0EA58D] px-2 py-0.5 bg-[#0EA58D]/10 rounded-full border border-[#0EA58D]/20">
              Efisiensi
            </span>
          </div>
          <div>
            <div className="text-3xl font-display font-black text-[#0B132B]">
              {cityStats.totalCity > 0
                ? Math.round((cityStats.completedCity / cityStats.totalCity) * 100)
                : 0}
              %
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center justify-between">
              <span>Tingkat Penanganan</span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Main Content: Map Widget + My Reports Column */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Map Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="liquid-glass rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#E5A93C]" />
                  <h2 className="font-display font-extrabold text-lg text-[#0B132B]">
                    Peta Laporan Real-Time Kota
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Titik lokasi laporan publik aktif dengan indikator status penanganan.
                </p>
              </div>

              <Link
                to="/map"
                className="btn-secondary btn-sm flex items-center gap-1.5 text-xs font-bold"
              >
                <span>Buka Layar Penuh</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="h-80 rounded-2xl overflow-hidden border border-slate-200/80 relative shadow-inner">
              {loading ? (
                <div className="h-full flex items-center justify-center bg-slate-50">
                  <div className="skeleton w-full h-full" />
                </div>
              ) : (
                <MapView markers={mapMarkers} autoFit />
              )}
            </div>

            <MapLegend />
          </div>

          {/* Quick Guide Card */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-500/10 via-white/80 to-teal-500/10 backdrop-blur-xl border border-amber-500/20 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2 text-[#0B132B]">
              <ShieldCheck className="w-4 h-4 text-[#E5A93C]" />
              <h3 className="font-bold text-xs uppercase tracking-wider font-display">
                Panduan Pelaporan yang Efektif
              </h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-200/80 space-y-1 shadow-xs">
                <span className="font-bold text-[#0B132B] block">1. Foto Jelas</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">Sertakan foto bukti kerusakan dengan sudut pandang yang terang.</p>
              </div>
              <div className="bg-white/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-200/80 space-y-1 shadow-xs">
                <span className="font-bold text-[#0B132B] block">2. Pin GPS Presisi</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">Gunakan GPS ponsel agar petugas sampai ke titik lokasi tepat.</p>
              </div>
              <div className="bg-white/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-200/80 space-y-1 shadow-xs">
                <span className="font-bold text-[#0B132B] block">3. Pantau & Ulas</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">Pantau perkembangan status dan berikan rating setelah tuntas.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: User's Recent Reports */}
        <div className="lg:col-span-5 space-y-4">
          <div className="liquid-glass rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-extrabold text-lg text-[#0B132B]">
                  Laporan Aktif Anda
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Status tiket pengaduan yang sedang diproses.
                </p>
              </div>

              <Link
                to="/app/my-reports"
                className="text-xs font-bold text-[#0B132B] hover:text-[#0EA58D] flex items-center gap-1 transition-colors"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="skeleton h-24 rounded-2xl" />
                ))}
              </div>
            ) : myReports.length === 0 ? (
              <div className="py-12 text-center space-y-3.5 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-6">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mx-auto text-slate-400 shadow-xs">
                  <FilePlus2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-[#0B132B]">Belum Ada Laporan Terkirim</div>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Kirimkan laporan pertama Anda untuk perbaikan lingkungan kota.
                  </p>
                </div>
                <Link
                  to="/app/create-report"
                  className="btn-accent btn-sm font-bold inline-flex items-center gap-1.5 text-[#0B132B] shadow-glow-gold"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>Buat Laporan Pertama</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myReports.slice(0, 4).map((report) => (
                  <TicketCard
                    key={report.id}
                    report={report}
                    to={`/reports/${report.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
