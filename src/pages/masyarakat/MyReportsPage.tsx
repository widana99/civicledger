import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Report, ReportStatus } from '../../types';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../../components/Badges';
import { STATUS_CONFIG, timeAgo } from '../../lib/constants';
import { FilePlus2, ClipboardList, Search, ChevronRight, Inbox } from 'lucide-react';

const STATUS_FILTERS: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
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
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile) return;
    const fetchReports = async () => {
      let query = supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', profile.id)
        .order('created_at', { ascending: false });

      const { data } = await query;
      setReports(data as Report[] || []);
      setLoading(false);
    };
    fetchReports();
  }, [profile]);

  const filtered = reports.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.ticket_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Laporan Saya</h1>
          <p className="text-neutral-500 text-sm mt-1">Pantau status laporan yang Anda buat</p>
        </div>
        <Link to="/app/create-report" className="btn-primary">
          <FilePlus2 className="w-4 h-4" />
          <span className="hidden sm:inline">Buat Laporan</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari berdasarkan judul atau nomor tiket..."
          className="input pl-10"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filter === f.value
                ? 'bg-primary-600 text-white'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-28" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="font-semibold text-neutral-900 mb-1">Belum ada laporan</h3>
          <p className="text-sm text-neutral-500 mb-4">Buat laporan pertama Anda untuk mulai berkontribusi</p>
          <Link to="/app/create-report" className="btn-primary inline-flex">
            <FilePlus2 className="w-4 h-4" />
            Buat Laporan
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <Link
              key={report.id}
              to={`/reports/${report.id}`}
              className="card p-4 hover:shadow-md transition-all group block"
            >
              <div className="flex gap-4">
                {report.photo_url ? (
                  <img src={report.photo_url} alt={report.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-7 h-7 text-neutral-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-neutral-500">{report.ticket_id}</span>
                    <span className="text-xs text-neutral-400">·</span>
                    <span className="text-xs text-neutral-500">{timeAgo(report.created_at)}</span>
                  </div>
                  <h3 className="font-semibold text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-sm text-neutral-500 truncate mt-0.5">{report.address}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <StatusBadge status={report.status} size="xs" />
                    <CategoryBadge category={report.category} />
                    <PriorityBadge priority={report.priority} />
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-primary-500 flex-shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
