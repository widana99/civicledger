import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Report, ReportStatus } from '../../types';
import { StatusBadge, CategoryBadge } from '../../components/Badges';
import { STATUS_CONFIG, formatDateTime, timeAgo } from '../../lib/constants';
import { ListTodo, MapPin, ChevronRight, FileText, Inbox } from 'lucide-react';

const TABS: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'assigned', label: 'Ditugaskan' },
  { value: 'in_progress', label: 'Dikerjakan' },
  { value: 'completed', label: 'Selesai' },
  { value: 'all', label: 'Semua' },
];

export function PetugasTasksPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ReportStatus | 'all'>('assigned');

  useEffect(() => {
    if (!profile) return;
    const fetchTasks = async () => {
      let query = supabase
        .from('reports')
        .select('*')
        .eq('assigned_petugas_id', profile.id)
        .order('created_at', { ascending: false });
      const { data } = await query;
      setTasks((data as Report[]) || []);
      setLoading(false);
    };
    fetchTasks();
  }, [profile]);

  const filtered = tasks.filter((t) => tab === 'all' || t.status === tab);
  const counts = {
    assigned: tasks.filter(t => t.status === 'assigned').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    all: tasks.length,
  };

  return (
    <div className="animate-slide-up">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Tugas Saya</h1>
        <p className="text-neutral-500 text-sm mt-1">Daftar laporan yang ditugaskan kepada Anda</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.value ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {t.label} ({counts[t.value]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">Tidak ada tugas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <Link
              key={task.id}
              to={`/app/tasks/${task.id}`}
              className="card p-4 hover:shadow-md transition-all group block"
            >
              <div className="flex gap-3">
                {task.photo_url ? (
                  <img src={task.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-neutral-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-neutral-500 mb-1">{task.ticket_id}</div>
                  <h3 className="font-semibold text-neutral-900 truncate group-hover:text-primary-700 transition-colors">{task.title}</h3>
                  <p className="text-xs text-neutral-500 truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {task.address}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <StatusBadge status={task.status} size="xs" />
                    <CategoryBadge category={task.category} />
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
