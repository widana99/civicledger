import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Report, ReportStatus } from '../../types';
import { TicketCard } from '../../components/TicketCard';
import { DateTimeFilter, DateTimeFilterState, INITIAL_DATE_TIME_FILTER, matchesDateTimeFilter } from '../../components/DateTimeFilter';
import { STATUS_CONFIG, normalizeReportStatus } from '../../lib/constants';
import { FilePlus2, Search, Inbox, RefreshCw, Radio } from 'lucide-react';

const STATUS_FILTERS: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Status' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'verified', label: 'Terverifikasi' },
  { value: 'assigned', label: 'Ditugaskan' },
  { value: 'in_progress', label: 'Dikerjakan' },
  { value: 'completed', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
];

export function MyReportsPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('all');
  const [dateTimeFilter, setDateTimeFilter] = useState<DateTimeFilterState>(INITIAL_DATE_TIME_FILTER);
  const [search, setSearch] = useState('');

  const fetchReports = useCallback(async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const normalizedData = ((data as any[]) || []).map((r) => ({
        ...r,
        status: normalizeReportStatus(r.status),
      }));
      setReports(normalizedData);
    } catch (err) {
      console.error('Error fetching citizen reports:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchReports();

    if (!profile) return;

    // Real-time listener for reports and status updates
    const channel = supabase
      .channel(`realtime:my_reports_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
        },
        () => {
          fetchReports();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'status_logs',
        },
        () => {
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchReports]);

  // Compute live count badge for every status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: reports.length,
      pending: 0,
      verified: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      rejected: 0,
    };
    reports.forEach((r) => {
      const s = normalizeReportStatus(r.status);
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [reports]);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const normalizedStatus = normalizeReportStatus(r.status);
      if (filter !== 'all' && normalizedStatus !== filter) return false;
      if (!matchesDateTimeFilter(r.created_at, dateTimeFilter)) return false;
      if (
        search &&
        !r.title.toLowerCase().includes(search.toLowerCase()) &&
        !r.ticket_id.toLowerCase().includes(search.toLowerCase()) &&
        !(r.address || '').toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [reports, filter, dateTimeFilter, search]);

  return (
    <div className="animate-slide-up space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold text-[#16233D] dark:text-white">Laporan Saya</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/20">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              Live Realtime
            </span>
          </div>
          <p className="text-[#5A6372] dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            Daftar entri tiket laporan yang telah Anda kirimkan dan tersinkronisasi otomatis dengan status database kota
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchReports()}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
            title="Muat ulang data live"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0EA58D]' : ''}`} />
          </button>
          <Link to="/app/create-report" className="btn-accent text-[#0B132B] font-bold shadow-glow-gold">
            <FilePlus2 className="w-4 h-4" />
            <span>Buat Laporan Baru</span>
          </Link>
        </div>
      </div>

      {/* Search & DateTime Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="relative sm:col-span-8">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8891A0] dark:text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan judul, alamat, atau nomor tiket (CL-...)"
            className="input pl-10"
          />
        </div>
        <div className="sm:col-span-4 flex items-center">
          <DateTimeFilter
            value={dateTimeFilter}
            onChange={(val) => setDateTimeFilter(val)}
            className="w-full"
            badgeLabel="Filter Waktu"
          />
        </div>
      </div>

      {/* Filter tabs with Live Count Badges */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {STATUS_FILTERS.map((f) => {
          const count = statusCounts[f.value] ?? 0;
          const isActive = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                isActive
                  ? 'bg-gradient-to-r from-[#0EA58D] to-[#10B981] text-[#080E1F] font-extrabold shadow-glow-teal ring-2 ring-[#0EA58D]/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  isActive
                    ? 'bg-[#080E1F]/20 text-[#080E1F]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl p-12 text-center bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#16233D] dark:text-white mb-1">
            {filter !== 'all'
              ? `Tidak Ada Laporan Berstatus "${STATUS_CONFIG[filter as ReportStatus]?.label || filter}"`
              : 'Belum Ada Laporan Terdaftar'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            {filter !== 'all'
              ? 'Silakan ubah tab filter status di atas atau buat laporan pengaduan baru.'
              : 'Laporkan permasalahan fasilitas umum atau lingkungan sekitar Anda untuk segera ditangani petugas kota.'}
          </p>
          {filter !== 'all' ? (
            <button
              onClick={() => setFilter('all')}
              className="btn-secondary px-5 py-2 text-xs font-bold"
            >
              Tampilkan Semua Status ({reports.length})
            </button>
          ) : (
            <Link to="/app/create-report" className="btn-accent text-[#0B132B] font-bold shadow-glow-gold inline-flex items-center gap-2">
              <FilePlus2 className="w-4 h-4" />
              Buat Laporan Baru Sekarang
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((report) => (
            <TicketCard key={report.id} report={report} to={`/reports/${report.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}


