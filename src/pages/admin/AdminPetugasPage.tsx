import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, ReportCategory, Wilayah } from '../../types';
import { RoleBadge } from '../../components/Badges';
import { CATEGORY_OPTIONS, CATEGORY_CONFIG, timeAgo } from '../../lib/constants';
import {
  Wrench, Map, X, Loader2, CheckCircle2, ShieldAlert, Star, CheckSquare,
  Clock, Coffee, LogIn, LogOut, MapPin, Send, MessageSquare, Phone, AlertTriangle,
  RefreshCw, Check, CheckCheck, User, Radio, BellRing,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PetugasStats {
  completedCount: number;
  avgRating: number;
  totalRatings: number;
}

interface AttendanceRecord {
  id: string;
  officer_id: string;
  type: 'check_in' | 'break_start' | 'break_end' | 'check_out';
  status: 'on_time' | 'late' | 'normal';
  auth_method?: 'biometric' | 'password_fallback' | 'manual';
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    phone: string | null;
    department: string | null;
  };
}

interface DirectChatRecord {
  id: string;
  officer_id: string;
  sender_id: string;
  message: string;
  category: string;
  is_flagged: boolean;
  is_read?: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
    role: string;
  };
}

export function AdminPetugasPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'roster' | 'attendance' | 'direct_chat'>('roster');

  // Petugas Roster State
  const [petugas, setPetugas] = useState<Profile[]>([]);
  const [wilayahs, setWilayahs] = useState<Wilayah[]>([]);
  const [specs, setSpecs] = useState<Record<string, ReportCategory[]>>({});
  const [petugasStatsMap, setPetugasStatsMap] = useState<Record<string, PetugasStats>>({});
  const [loading, setLoading] = useState(true);
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [activePetugas, setActivePetugas] = useState<Profile | null>(null);
  const [selectedCats, setSelectedCats] = useState<ReportCategory[]>([]);
  const [saving, setSaving] = useState(false);

  // Attendance Monitoring State
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceAlert, setAttendanceAlert] = useState<{ name: string; action: string; isLate: boolean } | null>(null);

  // Direct Chat State
  const [selectedChatOfficer, setSelectedChatOfficer] = useState<Profile | null>(null);
  const [directChats, setDirectChats] = useState<DirectChatRecord[]>([]);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [isOfficerTyping, setIsOfficerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const fetchAll = useCallback(async () => {
    const [petugasRes, wilayahRes, specsRes, reportsRes, ratingsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'petugas').order('full_name'),
      supabase.from('wilayah').select('*').order('name'),
      supabase.from('petugas_spesialisasi').select('petugas_id, category'),
      supabase.from('reports').select('id, assigned_petugas_id, status'),
      supabase.from('ratings').select('report_id, score'),
    ]);

    const pList = (petugasRes.data as Profile[]) || [];
    setPetugas(pList);
    setWilayahs((wilayahRes.data as Wilayah[]) || []);

    const specMap: Record<string, ReportCategory[]> = {};
    ((specsRes.data as any[]) || []).forEach((s) => {
      if (!specMap[s.petugas_id]) specMap[s.petugas_id] = [];
      specMap[s.petugas_id].push(s.category);
    });
    setSpecs(specMap);

    // Calculate stats per petugas
    const reports = (reportsRes.data as any[]) || [];
    const ratings = (ratingsRes.data as any[]) || [];

    const ratingMapByReport: Record<string, number[]> = {};
    ratings.forEach((r) => {
      if (!ratingMapByReport[r.report_id]) ratingMapByReport[r.report_id] = [];
      ratingMapByReport[r.report_id].push(r.score);
    });

    const statsMap: Record<string, PetugasStats> = {};
    pList.forEach((p) => {
      const assignedReports = reports.filter((rep) => rep.assigned_petugas_id === p.id);
      const completed = assignedReports.filter((rep) => rep.status === 'completed');

      let totalScore = 0;
      let ratingCount = 0;
      assignedReports.forEach((rep) => {
        const scores = ratingMapByReport[rep.id] || [];
        scores.forEach((sc) => {
          totalScore += sc;
          ratingCount++;
        });
      });

      statsMap[p.id] = {
        completedCount: completed.length,
        avgRating: ratingCount > 0 ? Math.round((totalScore / ratingCount) * 10) / 10 : 0,
        totalRatings: ratingCount,
      };
    });

    setPetugasStatsMap(statsMap);
    setLoading(false);
  }, []);

  // Fetch Attendance with robust fallback merging
  const fetchAttendance = useCallback(async () => {
    setLoadingAttendance(true);

    try {
      // 1. Fetch attendance records
      const { data: attData, error: attError } = await supabase
        .from('officer_attendance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (attError) {
        console.error('Error fetching attendance:', attError);
        setLoadingAttendance(false);
        return;
      }

      const records = (attData as any[]) || [];

      // 2. Fetch profiles map so relationship join never fails
      const officerIds = Array.from(new Set(records.map((a) => a.officer_id).filter(Boolean)));
      let profileMap: Record<string, any> = {};
      if (officerIds.length > 0) {
        const { data: profData } = await supabase
          .from('profiles')
          .select('id, full_name, phone, department')
          .in('id', officerIds);
        (profData || []).forEach((p: any) => {
          profileMap[p.id] = p;
        });
      }

      const mergedLogs: AttendanceRecord[] = records.map((a) => ({
        ...a,
        profiles: profileMap[a.officer_id] || {
          full_name: 'Petugas Lapangan',
          phone: null,
          department: 'Dinas Operasional',
        },
      }));

      setAttendanceLogs(mergedLogs);
    } catch (err) {
      console.error('Attendance exception:', err);
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  // Mark chats as read
  const markChatsAsRead = useCallback(async (officerId: string) => {
    try {
      await supabase
        .from('officer_direct_chats')
        .update({ is_read: true })
        .eq('officer_id', officerId)
        .eq('is_read', false);
    } catch (_) {}
  }, []);

  // Fetch Direct Chats for selected officer with fallback
  const fetchDirectChats = useCallback(async (officerId: string) => {
    try {
      const { data: chatData, error: chatError } = await supabase
        .from('officer_direct_chats')
        .select('*')
        .eq('officer_id', officerId)
        .order('created_at', { ascending: true });

      if (chatError) {
        console.error('Error fetching chats:', chatError);
        return;
      }

      const rawChats = (chatData as any[]) || [];

      // Fetch senders profile map
      const senderIds = Array.from(new Set(rawChats.map((c) => c.sender_id).filter(Boolean)));
      let senderMap: Record<string, any> = {};
      if (senderIds.length > 0) {
        const { data: senders } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', senderIds);
        (senders || []).forEach((s: any) => {
          senderMap[s.id] = s;
        });
      }

      const mergedChats: DirectChatRecord[] = rawChats.map((c) => ({
        ...c,
        profiles: senderMap[c.sender_id] || { full_name: 'User', role: 'petugas' },
      }));

      setDirectChats(mergedChats);
      markChatsAsRead(officerId);
      scrollToBottom();
    } catch (_) {}
  }, [markChatsAsRead, scrollToBottom]);

  useEffect(() => {
    fetchAll();
    fetchAttendance();

    // Subscribe to attendance realtime (all events)
    const attChannel = supabase
      .channel('admin-attendance-realtime-sub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'officer_attendance' }, (payload) => {
        fetchAttendance();
        if (payload.eventType === 'INSERT') {
          const newRecord = payload.new as any;
          if (newRecord) {
            const actionText = 
              newRecord.type === 'check_in' ? (newRecord.status === 'late' ? 'Terlambat Masuk' : 'Absen Masuk') :
              newRecord.type === 'break_start' ? 'Mulai Istirahat' :
              newRecord.type === 'break_end' ? 'Selesai Istirahat' : 'Absen Pulang';
            
            setAttendanceAlert({
              name: 'Petugas Lapangan',
              action: actionText,
              isLate: newRecord.status === 'late',
            });

            setTimeout(() => setAttendanceAlert(null), 6000);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(attChannel);
    };
  }, [fetchAll, fetchAttendance]);

  // Direct chat & typing subscriptions
  useEffect(() => {
    if (!selectedChatOfficer) return;
    fetchDirectChats(selectedChatOfficer.id);

    const chatChannel = supabase
      .channel(`admin-officer-direct-${selectedChatOfficer.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'officer_direct_chats', filter: `officer_id=eq.${selectedChatOfficer.id}` },
        () => {
          fetchDirectChats(selectedChatOfficer.id);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'officer_direct_chats', filter: `officer_id=eq.${selectedChatOfficer.id}` },
        () => {
          fetchDirectChats(selectedChatOfficer.id);
        }
      )
      .subscribe();

    // Unified Typing Broadcast Channel
    const typingChannel = supabase.channel(`posko_chat_${selectedChatOfficer.id}`);
    typingChannel
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        if (payload.payload?.sender === 'officer') {
          const isTyping = payload.payload?.is_typing || false;
          setIsOfficerTyping(isTyping);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [selectedChatOfficer, fetchDirectChats]);

  const handleAdminTyping = (text: string) => {
    setAdminReplyText(text);
    if (!selectedChatOfficer) return;

    const channel = supabase.channel(`posko_chat_${selectedChatOfficer.id}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender: 'admin', is_typing: text.trim().length > 0 },
    });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender: 'admin', is_typing: false },
      });
    }, 2000);
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedChatOfficer || !adminReplyText.trim()) return;

    const textToSend = adminReplyText.trim();
    setAdminReplyText('');
    setSendingChat(true);

    // Stop typing indicator immediately
    const channel = supabase.channel(`posko_chat_${selectedChatOfficer.id}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender: 'admin', is_typing: false },
    });

    try {
      await supabase.from('officer_direct_chats').insert({
        officer_id: selectedChatOfficer.id,
        sender_id: profile.id,
        message: textToSend,
        category: 'umum',
        is_read: false,
        created_at: new Date().toISOString(),
      });
      fetchDirectChats(selectedChatOfficer.id);
      scrollToBottom();
    } catch (_) {}
    setSendingChat(false);
  };

  const openSpecModal = (p: Profile) => {
    setActivePetugas(p);
    setSelectedCats(specs[p.id] || []);
    setShowSpecModal(true);
  };

  const toggleCat = (cat: ReportCategory) => {
    setSelectedCats((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const handleSaveSpecs = async () => {
    if (!activePetugas) return;
    setSaving(true);
    await supabase.from('petugas_spesialisasi').delete().eq('petugas_id', activePetugas.id);
    if (selectedCats.length > 0) {
      await supabase.from('petugas_spesialisasi').insert(
        selectedCats.map((c) => ({ petugas_id: activePetugas.id, category: c }))
      );
    }
    setSaving(false);
    setShowSpecModal(false);
    fetchAll();
  };

  const toggleActive = async (p: Profile) => {
    await supabase.from('profiles').update({ is_active: !p.is_active }).eq('id', p.id);
    fetchAll();
  };

  const wilayahName = (id: string | null) => wilayahs.find((w) => w.id === id)?.name || '-';

  // Stats for Attendance
  const onTimeCount = attendanceLogs.filter((a) => a.type === 'check_in' && a.status === 'on_time').length;
  const lateCount = attendanceLogs.filter((a) => a.type === 'check_in' && a.status === 'late').length;
  const onBreakCount = attendanceLogs.filter((a) => a.type === 'break_start').length - attendanceLogs.filter((a) => a.type === 'break_end').length;
  const checkedOutCount = attendanceLogs.filter((a) => a.type === 'check_out').length;

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}</div>;
  }

  return (
    <div className="animate-slide-up space-y-6 pb-12">
      {/* Realtime Attendance Alert Toast Banner */}
      {attendanceAlert && (
        <div className={`p-3.5 rounded-[6px] border flex items-center justify-between shadow-md animate-slide-down ${
          attendanceAlert.isLate ? 'bg-[#C1503D]/15 border-[#C1503D]/40 text-[#C1503D]' : 'bg-[#2E8B7F]/15 border-[#2E8B7F]/40 text-[#2E8B7F]'
        }`}>
          <div className="flex items-center gap-2.5">
            <BellRing className="w-5 h-5 animate-bounce" />
            <div>
              <div className="font-bold text-xs">
                {attendanceAlert.isLate ? '🚨 PERINGATAN KEDISIPLINAN: PETUGAS TERLAMBAT' : '✅ LOG PRESENSI REALTIME TERBARU'}
              </div>
              <div className="text-[11px] opacity-90">
                {attendanceAlert.name} baru saja melakukan <strong>{attendanceAlert.action}</strong> melalui verifikasi perangkat.
              </div>
            </div>
          </div>
          <button onClick={() => setAttendanceAlert(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E4E0] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#16233D]">Satuan Petugas Lapangan</h1>
          <p className="text-[#5A6372] text-xs font-mono uppercase tracking-wider mt-0.5">
            Manajemen Penugasan, Presensi Realtime GPS, dan Saluran Komunikasi Posko
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-[#EFF1EC] p-1 rounded-[6px] self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'roster' ? 'bg-[#16233D] text-white shadow-xs' : 'text-[#5A6372] hover:text-[#16233D]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Daftar & Spesialisasi ({petugas.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'attendance' ? 'bg-[#16233D] text-white shadow-xs' : 'text-[#5A6372] hover:text-[#16233D]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Monitoring Presensi GPS
            {lateCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#C1503D] text-white text-[9px] flex items-center justify-center font-bold">
                {lateCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('direct_chat');
              if (!selectedChatOfficer && petugas.length > 0) {
                setSelectedChatOfficer(petugas[0]);
              }
            }}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'direct_chat' ? 'bg-[#16233D] text-white shadow-xs' : 'text-[#5A6372] hover:text-[#16233D]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Saluran Posko (Direct Inbox)
          </button>
        </div>
      </div>

      {/* ───── TAB 1: DAFTAR & SPESIALISASI PETUGAS ───── */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {petugas.length === 0 ? (
            <div className="card p-12 text-center">
              <Wrench className="w-10 h-10 text-[#8891A0] mx-auto mb-3" />
              <p className="text-[#5A6372] mb-2 font-semibold">Belum Ada Petugas Terdaftar</p>
              <p className="text-xs text-[#8891A0]">
                Petugas baru dapat mendaftar melalui aplikasi mobile dan diaktivasi oleh Admin di menu Kelola Pengguna.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {petugas.map((p) => {
                const stats = petugasStatsMap[p.id] || { completedCount: 0, avgRating: 0, totalRatings: 0 };
                return (
                  <div key={p.id} className="card p-4 hover:border-[#16233D]/30 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-[4px] bg-[#16233D] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {p.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-[#16233D] text-sm">{p.full_name}</h3>
                          <RoleBadge role={p.role} />
                          {!p.is_active && (
                            <span className="badge bg-[#C1503D]/10 text-[#C1503D] border-[#C1503D]/30 text-[10px]">
                              Menunggu Persetujuan Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#5A6372] truncate">{p.email}</p>

                        <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
                          <div className="flex items-center gap-1 text-[#5A6372]">
                            <Map className="w-3.5 h-3.5 text-[#16233D]" /> Wilayah: <b>{wilayahName(p.wilayah_id)}</b>
                          </div>
                          <div className="flex items-center gap-1 text-[#2E8B7F]">
                            <CheckSquare className="w-3.5 h-3.5" /> Selesai: <b>{stats.completedCount} Tugas</b>
                          </div>
                          <div className="flex items-center gap-1 text-[#E8A33D]">
                            <Star className="w-3.5 h-3.5 fill-[#E8A33D]" /> Rating: <b>{stats.avgRating > 0 ? `${stats.avgRating} / 5` : 'Belum Ada'}</b>
                            {stats.totalRatings > 0 && <span className="text-[10px] text-[#8891A0]">({stats.totalRatings} ulasan)</span>}
                          </div>
                        </div>

                        {(specs[p.id] || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {specs[p.id].map((cat) => (
                              <span key={cat} className="badge badge-secondary text-[10px]">
                                {CATEGORY_CONFIG[cat]?.label || cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            setSelectedChatOfficer(p);
                            setActiveTab('direct_chat');
                          }}
                          className="btn-secondary btn-sm text-[11px] flex items-center gap-1 text-[#2E8B7F]"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Chat
                        </button>
                        <button onClick={() => openSpecModal(p)} className="btn-secondary btn-sm text-[11px]">
                          <Wrench className="w-3.5 h-3.5" /> Spesialisasi
                        </button>
                        <button onClick={() => toggleActive(p)} className={`btn-sm text-[11px] ${p.is_active ? 'btn-ghost' : 'btn-primary'}`}>
                          {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───── TAB 2: MONITORING PRESENSI & DISIPLIN REALTIME GPS ───── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Status Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-3.5 border-l-4 border-l-[#2E8B7F]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5A6372]">Tepat Waktu</span>
                <LogIn className="w-4 h-4 text-[#2E8B7F]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#16233D] mt-1">{onTimeCount}</div>
              <span className="text-[10px] text-[#5A6372]">Absen &le; 08:00 WIB</span>
            </div>

            <div className="card p-3.5 border-l-4 border-l-[#C1503D]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5A6372]">Terlambat Masuk</span>
                <AlertTriangle className="w-4 h-4 text-[#C1503D]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#C1503D] mt-1">{lateCount}</div>
              <span className="text-[10px] text-[#C1503D] font-bold">Peringatan Disiplin</span>
            </div>

            <div className="card p-3.5 border-l-4 border-l-[#D4A843]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5A6372]">Sedang Istirahat</span>
                <Coffee className="w-4 h-4 text-[#D4A843]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#16233D] mt-1">{Math.max(0, onBreakCount)}</div>
              <span className="text-[10px] text-[#5A6372]">Batas Maks. 60 Menit</span>
            </div>

            <div className="card p-3.5 border-l-4 border-l-[#16233D]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5A6372]">Selesai Dinas</span>
                <LogOut className="w-4 h-4 text-[#16233D]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#16233D] mt-1">{checkedOutCount}</div>
              <span className="text-[10px] text-[#5A6372]">Absen Pulang Tercatat</span>
            </div>
          </div>

          {/* Attendance Log Table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-[#E2E4E0] flex items-center justify-between bg-[#FAFBF9]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#16233D]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#16233D]">
                  Log Presensi & Lokasi GPS Hari Ini ({attendanceLogs.length})
                </h3>
              </div>
              <button onClick={fetchAttendance} className="btn-secondary btn-sm text-[11px] flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {loadingAttendance ? (
              <div className="p-8 text-center text-[#8891A0] text-xs">Memuat data presensi...</div>
            ) : attendanceLogs.length === 0 ? (
              <div className="p-8 text-center text-[#8891A0] text-xs">
                Belum ada presensi yang tercatat oleh petugas lapangan untuk hari ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#16233D] text-white font-mono text-[10.5px] uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Petugas</th>
                      <th className="py-2.5 px-4">Tindakan Presensi</th>
                      <th className="py-2.5 px-4">Autentikasi</th>
                      <th className="py-2.5 px-4">Status Disiplin</th>
                      <th className="py-2.5 px-4">Waktu Tercatat</th>
                      <th className="py-2.5 px-4">Koordinat GPS & Lokasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E4E0]">
                    {attendanceLogs.map((log) => {
                      const isLate = log.status === 'late';
                      const isBiometric = (log.auth_method ?? 'biometric') === 'biometric';
                      const dateObj = new Date(log.created_at);
                      const timeString = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                      return (
                        <tr key={log.id} className="hover:bg-[#F6F7F5]">
                          <td className="py-3 px-4 font-bold text-[#16233D]">
                            {log.profiles?.full_name || 'Petugas Lapangan'}
                            <div className="text-[10px] text-[#5A6372] font-normal">{log.profiles?.department || '-'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-bold text-xs">
                              {log.type === 'check_in' && <LogIn className="w-3.5 h-3.5 text-[#2E8B7F]" />}
                              {log.type === 'break_start' && <Coffee className="w-3.5 h-3.5 text-[#D4A843]" />}
                              {log.type === 'break_end' && <Clock className="w-3.5 h-3.5 text-[#3B82F6]" />}
                              {log.type === 'check_out' && <LogOut className="w-3.5 h-3.5 text-[#16233D]" />}
                              {log.type === 'check_in' ? 'Absen Masuk' : log.type === 'break_start' ? 'Mulai Istirahat' : log.type === 'break_end' ? 'Selesai Istirahat' : 'Absen Pulang'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isBiometric ? (
                              <span className="px-2 py-0.5 rounded bg-[#2E8B7F]/10 text-[#2E8B7F] font-bold text-[10px] border border-[#2E8B7F]/30 inline-flex items-center gap-1">
                                <Radio className="w-3 h-3 text-[#2E8B7F]" /> Sidik Jari Sah
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-[#D4A843]/10 text-[#D4A843] font-bold text-[10px] border border-[#D4A843]/30 inline-flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-[#D4A843]" /> Manual PIN
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isLate ? (
                              <span className="px-2 py-0.5 rounded bg-[#C1503D]/10 text-[#C1503D] font-bold text-[10px] border border-[#C1503D]/30 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> TERLAMBAT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-[#2E8B7F]/10 text-[#2E8B7F] font-bold text-[10px] border border-[#2E8B7F]/30 inline-flex items-center gap-1">
                                <Check className="w-3 h-3" /> Tepat Waktu
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-[#16233D]">
                            {timeString} WIB
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-[#5A6372]">
                              <MapPin className="w-3.5 h-3.5 text-[#D4A843] flex-shrink-0" />
                              <span className="font-mono text-[11px] truncate max-w-xs">{log.address || 'GPS Tersimpan'}</span>
                              {log.latitude && log.longitude && (
                                <a
                                  href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#2E8B7F] hover:underline font-bold text-[10px] ml-1"
                                >
                                  (Peta)
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───── TAB 3: SALURAN POSKO DIRECT INBOX ───── */}
      {activeTab === 'direct_chat' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 card p-0 overflow-hidden min-h-[500px]">
          {/* Left Column: Officer List */}
          <div className="border-r border-[#E2E4E0] bg-[#FAFBF9] flex flex-col">
            <div className="p-3.5 border-b border-[#E2E4E0] font-bold text-xs uppercase tracking-wider text-[#16233D] flex items-center justify-between">
              <span>Pilih Petugas Lapangan</span>
              <span className="badge bg-[#16233D]/10 text-[#16233D] text-[10px] font-mono">{petugas.length} Petugas</span>
            </div>
            <div className="divide-y divide-[#E2E4E0] overflow-y-auto max-h-[460px]">
              {petugas.map((p) => {
                const isSelected = selectedChatOfficer?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedChatOfficer(p)}
                    className={`w-full p-3 text-left transition-all flex items-center gap-3 ${
                      isSelected ? 'bg-white border-l-4 border-l-[#16233D] shadow-xs' : 'hover:bg-white/60'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#16233D] text-white flex items-center justify-center font-bold text-xs">
                      {p.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-[#16233D] truncate">{p.full_name}</div>
                      <div className="text-[10px] text-[#5A6372] truncate">{p.department || 'Dinas Operasional'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Chat Thread */}
          <div className="md:col-span-2 flex flex-col justify-between p-4 bg-white">
            {selectedChatOfficer ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b border-[#E2E4E0] pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-[#2E8B7F] text-white flex items-center justify-center font-bold text-sm">
                        {selectedChatOfficer.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#2E8B7F] border-2 border-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-[#16233D]">{selectedChatOfficer.full_name}</h3>
                        {isOfficerTyping && (
                          <span className="text-[10px] text-[#2E8B7F] font-bold animate-pulse flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2E8B7F]" /> sedang mengetik...
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#5A6372]">{selectedChatOfficer.department || 'Petugas Lapangan'} • {selectedChatOfficer.phone || selectedChatOfficer.email}</p>
                    </div>
                  </div>
                  {selectedChatOfficer.phone && (
                    <a
                      href={`https://wa.me/${selectedChatOfficer.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary btn-sm text-[11px] text-[#2E8B7F] flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  )}
                </div>

                {/* Message Stream Feed (Scrolls down to newest) */}
                <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[340px] pr-1 mb-3">
                  {directChats.length === 0 ? (
                    <div className="p-8 text-center text-[#8891A0] text-xs">
                      Belum ada percakapan dengan petugas ini. Kirim instruksi atau konfirmasi dari Posko di bawah.
                    </div>
                  ) : (
                    directChats.map((c) => {
                      const isFromOfficer = c.sender_id === selectedChatOfficer.id;

                      return (
                        <div
                          key={c.id}
                          className={`p-3 rounded-[8px] border text-xs max-w-md ${
                            isFromOfficer
                              ? 'bg-[#EBF7F5] border-[#2E8B7F]/30 mr-auto text-[#16233D]'
                              : 'bg-[#16233D] text-white border-[#16233D] ml-auto'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-80">
                            <span className="font-bold flex items-center gap-1">
                              {isFromOfficer ? selectedChatOfficer.full_name : 'Admin Posko'}
                              {c.category && c.category !== 'umum' && (
                                <span className="px-1.5 py-0.5 rounded text-[8.5px] uppercase font-mono font-extrabold bg-black/10 text-inherit">
                                  {c.category}
                                </span>
                              )}
                            </span>
                            <span>{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{c.message}</p>
                          
                          {/* Read Receipts for Admin messages */}
                          {!isFromOfficer && (
                            <div className="flex justify-end items-center gap-1 mt-1 text-[10px] text-white/60 font-mono">
                              <span>Terkirim</span>
                              {c.is_read ? (
                                <span className="inline-flex items-center text-[#2E8B7F]" title="Sudah dibaca oleh Petugas">
                                  <CheckCheck className="w-3.5 h-3.5 text-[#2E8B7F]" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-white/50" title="Terkirim ke perangkat">
                                  <Check className="w-3.5 h-3.5 text-white/50" />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {isOfficerTyping && (
                    <div className="p-2 rounded bg-[#EBF7F5] text-[#2E8B7F] text-xs max-w-xs animate-pulse flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#2E8B7F] animate-ping" />
                      <span>{selectedChatOfficer.full_name} sedang mengetik...</span>
                    </div>
                  )}

                  {/* Auto-scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSendAdminReply} className="flex gap-2 pt-2 border-t border-[#E2E4E0]">
                  <input
                    type="text"
                    value={adminReplyText}
                    onChange={(e) => handleAdminTyping(e.target.value)}
                    placeholder={`Ketik instruksi posko ke ${selectedChatOfficer.full_name}...`}
                    className="input text-xs flex-1"
                  />
                  <button type="submit" disabled={!adminReplyText.trim() || sendingChat} className="btn-primary btn-sm px-4">
                    {sendingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#8891A0] text-xs py-12">
                <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                Pilih petugas di sebelah kiri untuk membuka ruang komunikasi posko.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Specialty Modal */}
      {showSpecModal && activePetugas && (
        <div className="fixed inset-0 bg-[#16233D]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowSpecModal(false)}>
          <div className="bg-white rounded-[6px] p-5 max-w-md w-full animate-scale-in border border-[#E2E4E0] shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-[#16233D]">Spesialisasi Petugas</h3>
                <p className="text-xs text-[#5A6372]">{activePetugas.full_name}</p>
              </div>
              <button onClick={() => setShowSpecModal(false)} className="text-[#8891A0] hover:text-[#16233D]"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-[#5A6372] mb-3">Pilih kategori penanganan yang dikuasai oleh petugas ini:</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleCat(opt.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-[4px] border text-xs font-semibold transition-all ${
                    selectedCats.includes(opt.value)
                      ? 'border-[#2E8B7F] bg-[#2E8B7F]/10 text-[#2E8B7F]'
                      : 'border-[#E2E4E0] text-[#5A6372] hover:border-[#16233D]'
                  }`}
                >
                  {selectedCats.includes(opt.value) && <CheckCircle2 className="w-4 h-4 text-[#2E8B7F]" />}
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSpecModal(false)} className="btn-secondary btn-sm">Batal</button>
              <button onClick={handleSaveSpecs} disabled={saving} className="btn-primary btn-sm">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
