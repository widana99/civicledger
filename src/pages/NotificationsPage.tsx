import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Notification as AppNotification } from '../types';
import { STATUS_CONFIG, timeAgo, formatDateTime } from '../lib/constants';
import {
  Bell, ArrowUpCircle, MessageSquare, UserCheck, AlertCircle,
  Settings, Inbox, CheckCheck, Filter, ArrowRight,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const NOTIF_ICON_MAP: Record<string, typeof Bell> = {
  status_change: ArrowUpCircle,
  comment: MessageSquare,
  assignment: UserCheck,
  escalation: AlertCircle,
  system: Settings,
};

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'status_change', label: 'Perubahan Status' },
  { value: 'comment', label: 'Komentar & Chat' },
  { value: 'assignment', label: 'Penugasan' },
  { value: 'escalation', label: 'Eskalasi' },
];

export function NotificationsPage() {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const getReadNotifIds = useCallback((): Set<string> => {
    if (!profile) return new Set();
    try {
      const raw = localStorage.getItem(`civicledger_read_notifs_${profile.id}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }, [profile]);

  const saveReadNotifIds = useCallback((ids: Set<string>) => {
    if (!profile) return;
    try {
      localStorage.setItem(`civicledger_read_notifs_${profile.id}`, JSON.stringify(Array.from(ids)));
    } catch {}
  }, [profile]);

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const readIds = getReadNotifIds();

    // Try real notifications table
    const { data: notifData, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!notifError && notifData && notifData.length > 0) {
      const mapped = (notifData as AppNotification[]).map((n) => ({
        ...n,
        is_read: n.is_read || readIds.has(n.id),
      }));
      setNotifications(mapped);
      setLoading(false);
      return;
    }

    // Fallback: synthesize from status_logs
    if (profile.role === 'masyarakat') {
      const { data: reports } = await supabase
        .from('reports')
        .select('id, ticket_id, title')
        .eq('reporter_id', profile.id);

      if (reports && reports.length > 0) {
        const reportIds = reports.map((r: any) => r.id);
        const reportMap = new Map(reports.map((r: any) => [r.id, r]));

        const { data: logs } = await supabase
          .from('status_logs')
          .select('*')
          .in('report_id', reportIds)
          .order('created_at', { ascending: false })
          .limit(50);

        if (logs) {
          const synth: AppNotification[] = logs.map((log: any) => {
            const report = reportMap.get(log.report_id) as any;
            const statusLabel = STATUS_CONFIG[log.to_status as keyof typeof STATUS_CONFIG]?.label || log.to_status;
            const notifId = `log-${log.id}`;
            return {
              id: notifId,
              user_id: profile.id,
              title: `Status diubah → ${statusLabel}`,
              message: report ? `${report.ticket_id} — ${report.title}` : 'Laporan',
              type: 'status_change' as const,
              is_read: readIds.has(notifId),
              report_id: log.report_id,
              created_at: log.created_at,
            };
          });
          setNotifications(synth);
        }
      }
    } else if (profile.role === 'admin') {
      const [{ data: logs }, { data: officerComments }] = await Promise.all([
        supabase
          .from('status_logs')
          .select('*, reports!inner(ticket_id, title)')
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('comments')
          .select('*, profiles!inner(full_name, role), reports!inner(ticket_id, title)')
          .eq('profiles.role', 'petugas')
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      const synth: AppNotification[] = [];

      if (officerComments) {
        officerComments.forEach((c: any) => {
          const notifId = `cmt-${c.id}`;
          synth.push({
            id: notifId,
            user_id: profile.id,
            title: `💬 Laporan Petugas: ${c.profiles?.full_name || 'Petugas Lapangan'}`,
            message: `[${c.reports?.ticket_id}] "${c.content}"`,
            type: 'comment' as const,
            is_read: readIds.has(notifId),
            report_id: c.report_id,
            created_at: c.created_at,
          });
        });
      }

      if (logs) {
        logs.forEach((log: any) => {
          const notifId = `log-${log.id}`;
          const statusLabel = STATUS_CONFIG[log.to_status as keyof typeof STATUS_CONFIG]?.label || log.to_status;
          synth.push({
            id: notifId,
            user_id: profile.id,
            title: `Pergerakan Status: ${statusLabel}`,
            message: log.reports ? `${log.reports.ticket_id} — ${log.reports.title}` : 'Laporan',
            type: 'status_change' as const,
            is_read: readIds.has(notifId),
            report_id: log.report_id,
            created_at: log.created_at,
          });
        });
      }

      synth.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(synth);
    }

    setLoading(false);
  }, [profile, getReadNotifIds]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notif: AppNotification) => {
    const readIds = getReadNotifIds();
    readIds.add(notif.id);
    saveReadNotifIds(readIds);

    if (!notif.id.startsWith('log-') && !notif.id.startsWith('cmt-')) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
  };

  const markAllRead = async () => {
    const readIds = getReadNotifIds();
    notifications.forEach((n) => readIds.add(n.id));
    saveReadNotifIds(readIds);

    if (profile) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    addToast('success', 'Semua notifikasi telah ditandai sebagai dibaca');
  };

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  if (loading) {
    return (
      <div className="space-y-3 animate-slide-up">
        <div className="skeleton h-8 w-48 rounded-xl" />
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="animate-slide-up space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#16233D] tracking-tight">
            Pusat Notifikasi & Aktivitas
          </h1>
          <p className="text-[#5A6372] text-xs sm:text-sm mt-1">
            Riwayat pembaruan status laporan, verifikasi, dan koordinasi dinas
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-[#D4A843]" />
            <span>Tandai Semua Dibaca ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === f.value
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="font-display font-extrabold text-base text-slate-900 mb-1">Tidak Ada Notifikasi</h3>
          <p className="text-xs text-slate-500">Aktivitas terkait laporan Anda akan muncul secara otomatis di sini</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 divide-y divide-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          {filtered.map((n) => {
            const Icon = NOTIF_ICON_MAP[n.type] || Bell;
            const targetLink = n.report_id
              ? profile?.role === 'admin'
                ? `/app/admin/reports/${n.report_id}`
                : `/reports/${n.report_id}`
              : '#';

            return (
              <Link
                key={n.id}
                to={targetLink}
                onClick={() => handleMarkAsRead(n)}
                className={`flex items-start gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group ${
                  !n.is_read ? 'bg-amber-50/40 font-semibold' : ''
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs ${
                    !n.is_read
                      ? 'bg-slate-900 text-[#D4A843]'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-[#0EA58D] transition-colors">
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span className="px-2 py-0.5 rounded-md bg-[#D4A843] text-slate-950 text-[10px] font-extrabold font-mono uppercase">
                          Baru
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{formatDateTime(n.created_at)}</span>
                    {n.report_id && (
                      <span className="text-[#0EA58D] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Buka Rincian Tiket</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
