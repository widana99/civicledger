import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RoleBadge } from './Badges';
import { ThemeToggle } from './ThemeToggle';

import { STATUS_CONFIG, timeAgo } from '../lib/constants';
import { usePushNotifications } from '../lib/usePushNotifications';
import { Notification as AppNotification } from '../types';
import {
  Home, FilePlus2, MapPin, BarChart3, LayoutDashboard, Users, Map as MapIcon,
  ListTodo, User, LogOut, Menu, X, ShieldCheck, ClipboardList, UserCheck, Bell,
  AlertCircle, MessageSquare, ArrowUpCircle, Settings, Loader2, BellRing, BellOff,
  CheckCheck, Check,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  // Masyarakat navigation
  { to: '/app/dashboard', label: 'Dashboard Warga', icon: LayoutDashboard, roles: ['masyarakat'] },
  { to: '/app/my-reports', label: 'Laporan Saya', icon: ClipboardList, roles: ['masyarakat'] },
  { to: '/app/create-report', label: 'Buat Laporan Baru', icon: FilePlus2, roles: ['masyarakat'] },

  // Admin navigation
  { to: '/app/admin', label: 'Dashboard Admin', icon: LayoutDashboard, roles: ['admin'] },
  { to: '/app/admin/reports', label: 'Kelola Laporan', icon: ListTodo, roles: ['admin'] },
  { to: '/app/admin/wilayah', label: 'Kelola Wilayah', icon: MapIcon, roles: ['admin'] },
  { to: '/app/admin/petugas', label: 'Kelola Petugas', icon: Users, roles: ['admin'] },
  { to: '/app/admin/users', label: 'Kelola Pengguna', icon: UserCheck, roles: ['admin'] },

  // Shared navigation
  { to: '/map', label: 'Peta Real-Time', icon: MapPin, roles: ['masyarakat', 'admin'] },
  { to: '/stats', label: 'Statistik Kota', icon: BarChart3, roles: ['masyarakat', 'admin'] },
  { to: '/app/notifications', label: 'Notifikasi', icon: Bell, roles: ['masyarakat', 'admin'] },
  { to: '/app/profile', label: 'Profil Saya', icon: User, roles: ['masyarakat', 'admin'] },
];

const NOTIF_ICON_MAP: Record<string, typeof Bell> = {
  status_change: ArrowUpCircle,
  comment: MessageSquare,
  assignment: UserCheck,
  escalation: AlertCircle,
  system: Settings,
};

export function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [showNotifOpen, setShowNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { permission, requestPermission } = usePushNotifications();
  const [pushBannerDismissed, setPushBannerDismissed] = useState(() => {
    try { return localStorage.getItem('civicledger_push_dismissed') === '1'; } catch { return false; }
  });

  // Read notification IDs tracked in localStorage for instantaneous UI updates
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
    const readIds = getReadNotifIds();

    const { data: notifData, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!notifError && notifData && notifData.length > 0) {
      const mapped = (notifData as AppNotification[]).map((n) => ({
        ...n,
        is_read: n.is_read || readIds.has(n.id),
      }));
      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => !n.is_read).length);
      return;
    }

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
          .limit(20);

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
          setUnreadCount(synth.filter((n) => !n.is_read).length);
        }
      }
    } else if (profile.role === 'admin') {
      const [{ data: logs }, { data: officerComments }] = await Promise.all([
        supabase
          .from('status_logs')
          .select('*, reports!inner(ticket_id, title)')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('comments')
          .select('*, profiles!inner(full_name, role), reports!inner(ticket_id, title)')
          .eq('profiles.role', 'petugas')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const synth: AppNotification[] = [];

      if (officerComments) {
        officerComments.forEach((c: any) => {
          const notifId = `cmt-${c.id}`;
          synth.push({
            id: notifId,
            user_id: profile.id,
            title: `💬 Pesan Petugas: ${c.profiles?.full_name || 'Petugas Lapangan'}`,
            message: `[${c.reports?.ticket_id}] "${c.content.length > 50 ? c.content.slice(0, 50) + '...' : c.content}"`,
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
            title: `Status Laporan: ${statusLabel}`,
            message: log.reports ? `${log.reports.ticket_id} — ${log.reports.title}` : 'Laporan',
            type: 'status_change' as const,
            is_read: readIds.has(notifId),
            report_id: log.report_id,
            created_at: log.created_at,
          });
        });
      }

      synth.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const limited = synth.slice(0, 20);
      setNotifications(limited);
      setUnreadCount(limited.filter((n) => !n.is_read).length);
    }
  }, [profile, getReadNotifIds]);

  const handleMarkAsRead = async (notif: AppNotification) => {
    const readIds = getReadNotifIds();
    readIds.add(notif.id);
    saveReadNotifIds(readIds);

    // If it's a database notification, update DB
    if (!notif.id.startsWith('log-') && !notif.id.startsWith('cmt-')) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    const readIds = getReadNotifIds();
    notifications.forEach((n) => readIds.add(n.id));
    saveReadNotifIds(readIds);

    if (profile) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  useEffect(() => {
    if (!profile) return;

    if (profile.role === 'admin') {
      supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .then(({ count }) => {
          if (count !== null) setPendingCount(count);
        });
    }

    fetchNotifications();

    const channel = supabase
      .channel('notif-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'status_logs' },
        () => {
          fetchNotifications();
          if (profile.role === 'admin') {
            supabase
              .from('reports')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'pending')
              .then(({ count }) => {
                if (count !== null) setPendingCount(count);
              });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        () => {
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'officer_attendance' },
        () => {
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'officer_direct_chats' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchNotifications]);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-8 h-8 text-[#0EA58D] animate-spin" />
      </div>
    );
  }

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const sidebar = (
    <div className="flex flex-col h-full bg-[#080E1F] text-white border-r border-white/10">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-white/10 bg-[#0B132B]/80 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0EA58D] via-[#2DD4BF] to-[#E5A93C] p-[1.5px] shadow-glow-teal flex-shrink-0 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#080E1F] rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#2DD4BF]" />
            </div>
          </div>
          <div>
            <div className="font-display font-extrabold text-white text-base leading-none tracking-tight">CivicLedger</div>
            <div className="text-[10px] font-mono text-[#E5A93C] mt-1 tracking-wider uppercase font-semibold">
              {profile.role === 'admin' ? '🛡️ Admin Hub' : '👤 Portal Warga'}
            </div>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app/admin' || item.to === '/app/dashboard' || item.to === '/map' || item.to === '/stats'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-[#0EA58D] to-[#10B981] text-[#080E1F] shadow-glow-teal font-extrabold'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.to === '/app/admin/reports' && pendingCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full animate-pulse">
                {pendingCount}
              </span>
            )}
            {item.to === '/app/notifications' && unreadCount > 0 && (
              <span className="bg-[#E5A93C] text-[#0B132B] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer Profile in Sidebar */}
      <div className="border-t border-white/10 p-4 bg-[#0B132B]/60 backdrop-blur-md">
        <div className="mb-3">
          <ThemeToggle variant="pill" className="w-full justify-center" />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0EA58D] to-[#E5A93C] p-[1.5px] flex-shrink-0">
            <div className="w-full h-full bg-[#080E1F] rounded-[10px] flex items-center justify-center font-bold text-xs text-white">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">{profile.full_name}</div>
            <div className="mt-0.5">
              <RoleBadge role={profile.role} />
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070A11] flex font-sans selection:bg-[#E5A93C]/30 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 fixed inset-y-0 left-0 z-30 shadow-2xl">
        {sidebar}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-[#080E1F]/70 z-40 lg:hidden backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-[#080E1F] z-50 lg:hidden animate-slide-up shadow-2xl">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        
        {/* Sticky Frosted Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xs transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0B132B] dark:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#0EA58D] animate-ping" />
              {profile.role === 'admin'
                ? 'Portal Administrator Wilayah'
                : 'Portal Layanan Aspirasi Warga'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <ThemeToggle variant="compact" />

            {/* Notification Bell with Frosted Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifOpen(!showNotifOpen)}
                className="relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 hover:border-[#0EA58D]/40 transition-all shadow-xs"
                title="Pemberitahuan Aktivitas"
              >
                <Bell className="w-4 h-4 text-[#0B132B] dark:text-slate-200" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center px-1 ring-2 ring-white dark:ring-slate-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50 animate-scale-in overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
                    <span className="text-xs font-bold font-display text-[#0B132B] dark:text-white uppercase tracking-wider">Aktivitas & Notifikasi</span>
                    <div className="flex items-center gap-2.5">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-bold text-[#0EA58D] hover:underline flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Tandai Semua Dibaca</span>
                        </button>
                      )}
                      <Link
                        to="/app/notifications"
                        onClick={() => setShowNotifOpen(false)}
                        className="text-[11px] font-bold text-slate-600 hover:underline"
                      >
                        Lihat Semua
                      </Link>
                      <button onClick={() => setShowNotifOpen(false)} className="text-slate-400 hover:text-slate-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center">Belum ada pembaruan aktivitas terbaru.</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.slice(0, 8).map((n) => {
                        const Icon = NOTIF_ICON_MAP[n.type] || Bell;
                        const targetLink = n.report_id
                          ? profile?.role === 'admin'
                            ? `/app/admin/reports/${n.report_id}`
                            : `/reports/${n.report_id}`
                          : '/app/notifications';

                        return (
                          <Link
                            key={n.id}
                            to={targetLink}
                            onClick={() => {
                              handleMarkAsRead(n);
                              setShowNotifOpen(false);
                            }}
                            className={`block p-3.5 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-amber-50/60 font-semibold' : 'opacity-80'}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${!n.is_read ? 'bg-[#0B132B] text-[#D4A843] shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="text-xs font-bold text-[#0B132B] truncate">{n.title}</div>
                                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#E5A93C] flex-shrink-0" />}
                                </div>
                                <div className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">{n.message}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-1">{timeAgo(n.created_at)}</div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Avatar Button */}
            <Link to="/app/profile" className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0EA58D] to-[#E5A93C] p-[1.5px]">
                <div className="w-full h-full bg-[#080E1F] rounded-[10px] flex items-center justify-center font-bold text-xs text-white">
                  {profile.full_name.charAt(0).toUpperCase()}
                </div>
              </div>
              <span className="hidden md:inline text-xs font-bold text-[#0B132B]">{profile.full_name}</span>
            </Link>
          </div>
        </header>

        {/* Push Notification Permission Banner */}
        {permission === 'default' && !pushBannerDismissed && (
          <div className="mx-4 lg:mx-8 mt-4 flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#0B132B] via-[#0F1E36] to-[#0B132B] text-white shadow-xl border border-white/10 animate-slide-up">
            <div className="w-9 h-9 rounded-xl bg-[#E5A93C]/20 border border-[#E5A93C]/30 flex items-center justify-center flex-shrink-0 text-[#E5A93C]">
              <BellRing className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-bold font-display">Aktifkan Notifikasi Real-Time</p>
              <p className="text-[11px] text-slate-300">Dapatkan notifikasi instan di peramban saat laporan Anda diperbarui</p>
            </div>
            <button
              onClick={async () => {
                await requestPermission();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#E5A93C] to-[#F5BE58] text-[#0B132B] text-xs font-bold hover:brightness-105 transition-all flex-shrink-0 shadow-sm"
            >
              Izinkan
            </button>
            <button
              onClick={() => {
                setPushBannerDismissed(true);
                try { localStorage.setItem('civicledger_push_dismissed', '1'); } catch {}
              }}
              className="text-white/40 hover:text-white transition-colors flex-shrink-0 p-1"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Push Denied Banner */}
        {permission === 'denied' && !pushBannerDismissed && (
          <div className="mx-4 lg:mx-8 mt-4 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs animate-slide-up">
            <BellOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800 flex-1">
              Notifikasi peramban diblokir. Klik ikon gembok di address bar untuk mengizinkan notifikasi live.
            </p>
            <button
              onClick={() => {
                setPushBannerDismissed(true);
                try { localStorage.setItem('civicledger_push_dismissed', '1'); } catch {}
              }}
              className="text-amber-600 hover:text-amber-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
