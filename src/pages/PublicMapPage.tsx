import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Report, ReportStatus, ReportCategory } from '../types';
import { MapView } from '../components/MapComponents';
import { StatusBadge, CategoryBadge } from '../components/Badges';
import { STATUS_CONFIG, CATEGORY_OPTIONS, CATEGORY_CONFIG } from '../lib/constants';
import { MapPin, Filter, X, Search, ShieldCheck } from 'lucide-react';

export function PublicMapPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false });
      setReports(data as Report[] || []);
      setLoading(false);
    };
    fetchReports();
  }, []);

  const filtered = reports.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    return true;
  });

  const markers = filtered.map((r) => ({
    id: r.id,
    position: [r.latitude!, r.longitude!],
    title: r.title,
    status: STATUS_CONFIG[r.status].label,
    ticketId: r.ticket_id,
    onClick: () => setSelected(r),
  }));

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-200/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-neutral-900 text-lg">CivicLedger</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/stats" className="btn-ghost btn-sm">Statistik</Link>
            <Link to="/auth" className="btn-primary btn-sm">Masuk</Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        {/* Title bar */}
        <div className="bg-white border-b border-neutral-200 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-xl font-bold text-neutral-900">Peta Laporan Publik</h1>
              <p className="text-xs text-neutral-500">{filtered.length} laporan ditampilkan</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary btn-sm lg:hidden"
            >
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={`${showFilters ? 'block' : 'hidden'} lg:block bg-white border-b border-neutral-200 px-4 py-3`}>
          <div className="max-w-6xl mx-auto flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                statusFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              Semua Status
            </button>
            {(Object.keys(STATUS_CONFIG) as ReportStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  statusFilter === s ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {STATUS_CONFIG[s].label}
              </button>
            ))}
            <div className="w-px h-6 bg-neutral-200 mx-1" />
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                categoryFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              Semua Kategori
            </button>
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategoryFilter(c.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  categoryFilter === c.value ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map + side panel */}
        <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full p-4 gap-4">
          <div className="flex-1 h-[400px] lg:h-[calc(100vh-220px)] card overflow-hidden">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="skeleton w-full h-full" />
              </div>
            ) : (
              <MapView markers={markers} />
            )}
          </div>

          {/* Selected report panel */}
          {selected && (
            <div className="lg:w-80 card p-4 animate-slide-up lg:animate-slide-down">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-mono text-neutral-500">{selected.ticket_id}</span>
                <button onClick={() => setSelected(null)} className="text-neutral-400 hover:text-neutral-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">{selected.title}</h3>
              <p className="text-sm text-neutral-600 mb-2 line-clamp-2">{selected.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <StatusBadge status={selected.status} size="xs" />
                <CategoryBadge category={selected.category} />
              </div>
              <p className="text-xs text-neutral-500 mb-3 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {selected.address}
              </p>
              <Link to={`/reports/${selected.id}`} className="btn-primary btn-sm w-full">
                Lihat Detail
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
