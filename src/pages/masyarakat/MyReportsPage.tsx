import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Report, ReportStatus } from '../../types';
import { TicketCard } from '../../components/TicketCard';
import { DateTimeFilter, DateTimeFilterState, INITIAL_DATE_TIME_FILTER, matchesDateTimeFilter } from '../../components/DateTimeFilter';
import { FilePlus2, Search, Inbox } from 'lucide-react';

const STATUS_FILTERS: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Status' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'verified', label: 'Terverifikasi' },
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

  useEffect(() => {
    if (!profile) return;
    const fetchReports = async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', profile.id)
        .order('created_at', { ascending: false });

      setReports((data as Report[]) || []);
      setLoading(false);
    };
    fetchReports();
  }, [profile]);

  const filtered = reports.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (!matchesDateTimeFilter(r.created_at, dateTimeFilter)) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.ticket_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="animate-slide-up space-y-5 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#16233D]">Laporan Saya</h1>
          <p className="text-[#5A6372] text-sm mt-0.5">Daftar entri tiket laporan yang telah Anda kirimkan ke kota</p>
        </div>
        <Link to="/app/create-report" className="btn-primary">
          <FilePlus2 className="w-4 h-4" />
          <span className="hidden sm:inline">Buat Laporan</span>
        </Link>
      </div>

      {/* Search & DateTime Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="relative sm:col-span-8">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8891A0]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan judul atau nomor tiket (CL-...)"
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

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-medium whitespace-nowrap transition-all ${
              filter === f.value
                ? 'bg-[#16233D] text-white shadow-subtle'
                : 'bg-white text-[#5A6372] border border-[#E2E4E0] hover:bg-[#EFF1EC]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-[4px] bg-[#EFF1EC] flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6 text-[#8891A0]" />
          </div>
          <h3 className="font-display font-bold text-base text-[#16233D] mb-1">Belum Ada Laporan Terdaftar</h3>
          <p className="text-xs text-[#5A6372] mb-4">Laporkan permasalahan fasilitas umum di sekitar lokasi Anda untuk segera ditangani petugas</p>
          <Link to="/app/create-report" className="btn-primary inline-flex">
            <FilePlus2 className="w-4 h-4" />
            Buat Laporan Baru
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <TicketCard key={report.id} report={report} to={`/reports/${report.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}

