import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Report, ReportStatus, ReportCategory } from '../../types';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../../components/Badges';
import { STATUS_CONFIG, CATEGORY_OPTIONS, PRIORITY_OPTIONS, formatDateTime } from '../../lib/constants';
import { Search, ChevronRight, FileText, Inbox } from 'lucide-react';

export function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all'>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      setReports((data as Report[]) || []);
      setLoading(false);
    };
    fetchReports();
  }, []);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.ticket_id.toLowerCase().includes(q) && !r.address.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [reports, statusFilter, categoryFilter, search]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="animate-slide-up">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Kelola Laporan</h1>
        <p className="text-neutral-500 text-sm mt-1">Verifikasi, tugaskan, dan pantau semua laporan</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Cari judul, tiket, atau alamat..."
          className="input pl-10"
        />
      </div>

      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
        <FilterChip label="Semua" active={statusFilter === 'all'} onClick={() => { setStatusFilter('all'); setPage(0); }} />
        {(Object.keys(STATUS_CONFIG) as ReportStatus[]).map((s) => (
          <FilterChip key={s} label={STATUS_CONFIG[s].label} active={statusFilter === s} onClick={() => { setStatusFilter(s); setPage(0); }} />
        ))}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        <FilterChip label="Semua Kategori" active={categoryFilter === 'all'} onClick={() => { setCategoryFilter('all'); setPage(0); }} />
        {CATEGORY_OPTIONS.map((c) => (
          <FilterChip key={c.value} label={c.label} active={categoryFilter === c.value} onClick={() => { setCategoryFilter(c.value); setPage(0); }} />
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-20" />)}
        </div>
      ) : paged.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">Tidak ada laporan yang cocok</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paged.map((r) => (
              <Link key={r.id} to={`/reports/${r.id}`} className="card p-4 hover:shadow-md transition-all group block">
                <div className="flex gap-4 items-start">
                  {r.photo_url ? (
                    <img src={r.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-neutral-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-neutral-500">{r.ticket_id}</span>
                    </div>
                    <h3 className="font-semibold text-neutral-900 truncate group-hover:text-primary-700 transition-colors">{r.title}</h3>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">{r.address} · {formatDateTime(r.created_at)}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <StatusBadge status={r.status} size="xs" />
                      <CategoryBadge category={r.category} />
                      <PriorityBadge priority={r.priority} />
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-primary-500 flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>

          {pageCount > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary btn-sm">Sebelumnya</button>
              <span className="px-3 py-1.5 text-sm text-neutral-600">Halaman {page + 1} / {pageCount}</span>
              <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="btn-secondary btn-sm">Berikutnya</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
        active ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
      }`}
    >
      {label}
    </button>
  );
}
