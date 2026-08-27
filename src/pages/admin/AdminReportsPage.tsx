import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Report, ReportStatus, ReportCategory } from '../../types';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../../components/Badges';
import { TicketCard } from '../../components/TicketCard';
import { STATUS_CONFIG, CATEGORY_OPTIONS, PRIORITY_OPTIONS, normalizeReportStatus, formatDateTime } from '../../lib/constants';
import { exportToExcel } from '../../lib/exportUtils';
import { TableSkeleton } from '../../components/SkeletonLoader';
import { DateTimeFilter, DateTimeFilterState, INITIAL_DATE_TIME_FILTER, matchesDateTimeFilter } from '../../components/DateTimeFilter';
import { Search, Download, FileSpreadsheet, Inbox, Filter, AlertTriangle, Zap, ArrowUpDown } from 'lucide-react';

export function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all'>('all');
  const [dateTimeFilter, setDateTimeFilter] = useState<DateTimeFilterState>(INITIAL_DATE_TIME_FILTER);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [escalatedOnly, setEscalatedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      setReports(((data as any[]) || []).map(r => ({ ...r, status: normalizeReportStatus(r.status) })));
      setLoading(false);
    };
    fetchReports();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date().getTime();
    return reports
      .filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
        if (!matchesDateTimeFilter(r.created_at, dateTimeFilter)) return false;
        if (escalatedOnly) {
          const isPending = r.status === 'pending' || r.status === 'verified';
          const ageDays = (now - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
          if (!isPending || ageDays <= 3) return false;
        }
        if (search) {
          const q = search.toLowerCase();
          if (!r.title.toLowerCase().includes(q) && !r.ticket_id.toLowerCase().includes(q) && !r.address.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'priority') {
          const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [reports, statusFilter, categoryFilter, dateTimeFilter, sortBy, escalatedOnly, search]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Nomor Tiket', 'Judul', 'Kategori', 'Status', 'Prioritas', 'Alamat', 'Tanggal Dibuat'];
    const rows = filtered.map((r) => [
      `"${r.ticket_id}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      `"${r.status}"`,
      `"${r.priority}"`,
      `"${r.address.replace(/"/g, '""')}"`,
      `"${new Date(r.created_at).toLocaleString('id-ID')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CivicLedger_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) return;
    exportToExcel(filtered);
  };

  const escalatedCount = useMemo(() => {
    const now = new Date().getTime();
    return reports.filter((r) => {
      const isPending = r.status === 'pending' || r.status === 'verified';
      const ageDays = (now - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return isPending && ageDays > 3;
    }).length;
  }, [reports]);

  return (
    <div className="animate-slide-up space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#16233D]">Kelola & Audit Laporan</h1>
          <p className="text-[#5A6372] text-sm mt-0.5">Pantau status, verifikasi, dan ekspor seluruh entri laporan kota</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {escalatedCount > 0 && (
            <button
              onClick={() => { setEscalatedOnly(!escalatedOnly); setPage(0); }}
              className={`btn-sm flex items-center gap-1.5 transition-all ${
                escalatedOnly ? 'bg-[#C1503D] text-white' : 'bg-[#C1503D]/10 text-[#C1503D] border border-[#C1503D]/30'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Perlu Eskalasi ({escalatedCount})</span>
            </button>
          )}
          <button
            onClick={handleExportExcel}
            disabled={filtered.length === 0}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            title="Ekspor ke format Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel ({filtered.length})</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Ekspor format CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="relative md:col-span-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8891A0]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Cari berdasarkan judul, nomor tiket (CL-...), atau alamat..."
            className="input pl-10"
          />
        </div>
        <div className="md:col-span-4 flex items-center">
          <DateTimeFilter
            value={dateTimeFilter}
            onChange={(val) => { setDateTimeFilter(val); setPage(0); }}
            className="w-full"
            badgeLabel="Rentang Waktu"
          />
        </div>
        <div className="md:col-span-3 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value as any); setPage(0); }}
            className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="newest">Urutkan: Terbaru</option>
            <option value="oldest">Urutkan: Terlama</option>
            <option value="priority">Urutkan: Prioritas Tertinggi</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#8891A0] uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" /> Filter Status
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <FilterChip label="Semua Status" active={statusFilter === 'all'} onClick={() => { setStatusFilter('all'); setPage(0); }} />
          {(Object.keys(STATUS_CONFIG) as ReportStatus[]).map((s) => (
            <FilterChip key={s} label={STATUS_CONFIG[s].label} active={statusFilter === s} onClick={() => { setStatusFilter(s); setPage(0); }} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#8891A0] uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" /> Filter Kategori
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <FilterChip label="Semua Kategori" active={categoryFilter === 'all'} onClick={() => { setCategoryFilter('all'); setPage(0); }} />
          {CATEGORY_OPTIONS.map((c) => (
            <FilterChip key={c.value} label={c.label} active={categoryFilter === c.value} onClick={() => { setCategoryFilter(c.value); setPage(0); }} />
          ))}
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : paged.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox className="w-10 h-10 text-[#8891A0] mx-auto mb-3" />
          <p className="text-[#5A6372] font-medium">Tidak ada laporan yang sesuai kriteria filter</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paged.map((r) => (
              <TicketCard key={r.id} report={r} to={`/app/admin/reports/${r.id}`} />
            ))}
          </div>

          {pageCount > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary btn-sm">Sebelumnya</button>
              <span className="px-3 py-1 text-xs font-mono text-[#5A6372]">Halaman {page + 1} dari {pageCount}</span>
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
      className={`px-3 py-1.5 rounded-[4px] text-xs font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-[#16233D] text-white shadow-subtle'
          : 'bg-white text-[#5A6372] border border-[#E2E4E0] hover:bg-[#EFF1EC]'
      }`}
    >
      {label}
    </button>
  );
}
