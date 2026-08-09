import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Report, ReportStatus, ReportCategory } from '../types';
import { StatusBadge, CategoryBadge } from '../components/Badges';
import { STATUS_CONFIG, CATEGORY_CONFIG, CATEGORY_OPTIONS } from '../lib/constants';
import {
  ShieldCheck, BarChart3, FileText, CheckCircle2, Clock,
  TrendingUp, Users, Star, MapPin,
} from 'lucide-react';

export function PublicStatsPage() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    rejected: 0,
    avgRating: 0,
    totalRatings: 0,
  });
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: reports } = await supabase.from('reports').select('*');
      const { data: ratings } = await supabase.from('ratings').select('score');

      if (reports) {
        const r = reports as Report[];
        const catStats: Record<string, number> = {};
        r.forEach((report) => {
          catStats[report.category] = (catStats[report.category] || 0) + 1;
        });
        setCategoryStats(catStats);
        setRecentReports(r.slice(0, 5));

        setStats({
          total: r.length,
          pending: r.filter((x) => x.status === 'pending').length,
          verified: r.filter((x) => x.status === 'verified').length,
          assigned: r.filter((x) => x.status === 'assigned').length,
          in_progress: r.filter((x) => x.status === 'in_progress').length,
          completed: r.filter((x) => x.status === 'completed').length,
          rejected: r.filter((x) => x.status === 'rejected').length,
          avgRating: ratings && ratings.length > 0 ? (ratings as any[]).reduce((sum, x) => sum + x.score, 0) / ratings.length : 0,
          totalRatings: ratings?.length || 0,
        });
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-200/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-neutral-900 text-lg">CivicLedger</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/map" className="btn-ghost btn-sm">Peta</Link>
            <Link to="/auth" className="btn-primary btn-sm">Masuk</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900">Statistik Publik</h1>
          <p className="text-neutral-500 text-sm mt-1">Ringkasan laporan dan penanganan masyarakat</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-28" />)}
          </div>
        ) : (
          <>
            {/* Main stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon={FileText} color="primary" value={stats.total} label="Total Laporan" />
              <StatCard icon={CheckCircle2} color="success" value={stats.completed} label="Selesai" />
              <StatCard icon={Clock} color="warning" value={stats.pending + stats.verified + stats.assigned + stats.in_progress} label="Dalam Proses" />
              <StatCard icon={TrendingUp} color="accent" value={`${completionRate}%`} label="Tingkat Penyelesaian" />
            </div>

            {/* Status breakdown */}
            <div className="card p-6 mb-6">
              <h2 className="font-semibold text-neutral-900 mb-4">Distribusi Status</h2>
              <div className="space-y-3">
                {([
                  { key: 'pending', label: 'Menunggu Verifikasi', value: stats.pending, color: 'bg-warning-400' },
                  { key: 'verified', label: 'Terverifikasi', value: stats.verified, color: 'bg-primary-400' },
                  { key: 'assigned', label: 'Ditugaskan', value: stats.assigned, color: 'bg-accent-400' },
                  { key: 'in_progress', label: 'Sedang Dikerjakan', value: stats.in_progress, color: 'bg-accent-500' },
                  { key: 'completed', label: 'Selesai', value: stats.completed, color: 'bg-success-500' },
                  { key: 'rejected', label: 'Ditolak', value: stats.rejected, color: 'bg-error-400' },
                ] as const).map((s) => (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className="text-sm font-medium text-neutral-700 w-32 sm:w-40 flex-shrink-0">{s.label}</div>
                    <div className="flex-1 bg-neutral-100 rounded-full h-6 overflow-hidden">
                      <div
                        className={`${s.color} h-full rounded-full transition-all duration-500 flex items-center justify-end px-2`}
                        style={{ width: `${stats.total > 0 ? (s.value / stats.total) * 100 : 0}%`, minWidth: s.value > 0 ? '28px' : '0' }}
                      >
                        {s.value > 0 && <span className="text-xs font-bold text-white">{s.value}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Category breakdown */}
              <div className="card p-6">
                <h2 className="font-semibold text-neutral-900 mb-4">Laporan per Kategori</h2>
                <div className="space-y-3">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const count = categoryStats[cat.value] || 0;
                    const max = Math.max(...Object.values(categoryStats), 1);
                    return (
                      <div key={cat.value} className="flex items-center gap-3">
                        <div className="text-sm font-medium text-neutral-700 w-28 flex-shrink-0">{cat.label}</div>
                        <div className="flex-1 bg-neutral-100 rounded-full h-5 overflow-hidden">
                          <div
                            className="bg-primary-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-neutral-700 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rating */}
              <div className="card p-6">
                <h2 className="font-semibold text-neutral-900 mb-4">Kepuasan Masyarakat</h2>
                {stats.totalRatings > 0 ? (
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-neutral-900">{stats.avgRating.toFixed(1)}</div>
                    <div className="flex justify-center gap-1 mt-2">
                      {[1,2,3,4,5].map((star) => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${
                            star <= Math.round(stats.avgRating)
                              ? 'fill-accent-400 text-accent-400'
                              : 'text-neutral-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-neutral-500 mt-3">Berdasarkan {stats.totalRatings} rating</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-400">
                    <Star className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
                    <p className="text-sm">Belum ada rating</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent reports */}
            <div className="card p-6">
              <h2 className="font-semibold text-neutral-900 mb-4">Laporan Terbaru</h2>
              {recentReports.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-6">Belum ada laporan</p>
              ) : (
                <div className="space-y-2">
                  {recentReports.map((r) => (
                    <Link
                      key={r.id}
                      to={`/reports/${r.id}`}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      {r.photo_url ? (
                        <img src={r.photo_url} alt={r.title} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-neutral-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-neutral-900 truncate">{r.title}</div>
                        <div className="text-xs text-neutral-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {r.address}
                        </div>
                      </div>
                      <StatusBadge status={r.status} size="xs" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, value, label }: { icon: any; color: string; value: string | number; label: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-100 text-warning-600',
    accent: 'bg-accent-100 text-accent-600',
  };
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
    </div>
  );
}
