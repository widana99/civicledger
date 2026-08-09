import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Report } from '../../types';
import { StatusBadge, CategoryBadge } from '../../components/Badges';
import { STATUS_CONFIG, formatDateTime, timeAgo } from '../../lib/constants';
import {
  FileText, CheckCircle2, Clock, TrendingUp, Users, AlertTriangle,
  ArrowRight, Loader2, ListTodo,
} from 'lucide-react';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    rejected: 0,
    completionRate: 0,
  });
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [urgentReports, setUrgentReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      const { data: reports } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reports) {
        const r = reports as Report[];
        const completed = r.filter((x) => x.status === 'completed').length;
        setStats({
          total: r.length,
          pending: r.filter((x) => x.status === 'pending').length,
          inProgress: r.filter((x) => ['verified', 'assigned', 'in_progress'].includes(x.status)).length,
          completed,
          rejected: r.filter((x) => x.status === 'rejected').length,
          completionRate: r.length > 0 ? Math.round((completed / r.length) * 100) : 0,
        });
        setRecentReports(r.slice(0, 5));
        setUrgentReports(r.filter((x) => x.priority === 'urgent' && x.status !== 'completed' && x.status !== 'rejected').slice(0, 5));
      }
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Dashboard Admin</h1>
        <p className="text-neutral-500 text-sm mt-1">Ringkasan laporan dan aktivitas sistem</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} color="bg-primary-100 text-primary-600" value={stats.total} label="Total Laporan" />
        <StatCard icon={Clock} color="bg-warning-100 text-warning-600" value={stats.pending} label="Perlu Verifikasi" />
        <StatCard icon={Loader2} color="bg-accent-100 text-accent-600" value={stats.inProgress} label="Sedang Diproses" />
        <StatCard icon={TrendingUp} color="bg-success-100 text-success-600" value={`${stats.completionRate}%`} label="Tingkat Selesai" />
      </div>

      {/* Urgent reports */}
      {urgentReports.length > 0 && (
        <div className="card p-5 border-error-200 bg-error-50/30">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-error-600" />
            <h2 className="font-semibold text-neutral-900">Laporan Darurat</h2>
          </div>
          <div className="space-y-2">
            {urgentReports.map((r) => (
              <Link
                key={r.id}
                to={`/reports/${r.id}`}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-neutral-900 truncate">{r.title}</div>
                  <div className="text-xs text-neutral-500">{r.ticket_id} · {timeAgo(r.created_at)}</div>
                </div>
                <StatusBadge status={r.status} size="xs" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link to="/app/admin/reports" className="card p-5 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center mb-3">
                <ListTodo className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="font-semibold text-neutral-900">Kelola Laporan</h3>
              <p className="text-sm text-neutral-500 mt-0.5">Verifikasi, tugaskan, dan pantau</p>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-primary-500 transition-colors" />
          </div>
        </Link>
        <Link to="/app/admin/petugas" className="card p-5 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-success-100 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-success-600" />
              </div>
              <h3 className="font-semibold text-neutral-900">Kelola Petugas</h3>
              <p className="text-sm text-neutral-500 mt-0.5">Atur petugas & spesialisasi</p>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-success-500 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Recent reports */}
      <div className="card p-5">
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
                  <img src={r.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-neutral-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-neutral-900 truncate">{r.title}</div>
                  <div className="text-xs text-neutral-500">{r.ticket_id} · {timeAgo(r.created_at)}</div>
                </div>
                <StatusBadge status={r.status} size="xs" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, value, label }: { icon: any; color: string; value: string | number; label: string }) {
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
    </div>
  );
}
