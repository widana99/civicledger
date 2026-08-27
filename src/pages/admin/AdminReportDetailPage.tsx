import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Report, StatusLog, CompletionProof, Profile, Wilayah,
  ReportCategory,
} from '../../types';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../../components/Badges';
import { MapView } from '../../components/MapComponents';
import { STATUS_CONFIG, CATEGORY_CONFIG, formatDateTime, timeAgo, normalizeReportStatus } from '../../lib/constants';
import { DateTimeFilter, DateTimeFilterState, INITIAL_DATE_TIME_FILTER, matchesDateTimeFilter } from '../../components/DateTimeFilter';
import {
  ArrowLeft, MapPin, Calendar, Camera, MessageSquare,
  Send, Loader2, AlertCircle, CheckCircle2, XCircle,
  UserCheck, Loader, Clock, X, ShieldCheck, Wrench, Printer,
  Phone, Mail, User, ExternalLink, RefreshCw, Check,
  Radio, HardHat, MessageCircle, Shield,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { sendReportStatusEmail } from '../../lib/emailService';

export function AdminReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { addToast } = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [reporter, setReporter] = useState<Profile | null>(null);
  const [assignedPetugas, setAssignedPetugas] = useState<Profile | null>(null);
  const [wilayah, setWilayah] = useState<Wilayah | null>(null);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [proofs, setProofs] = useState<CompletionProof[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [logDateTimeFilter, setLogDateTimeFilter] = useState<DateTimeFilterState>(INITIAL_DATE_TIME_FILTER);
  const [commentDateTimeFilter, setCommentDateTimeFilter] = useState<DateTimeFilterState>(INITIAL_DATE_TIME_FILTER);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);

  // Modal / Form States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [petugasList, setPetugasList] = useState<Profile[]>([]);
  const [petugasSpecs, setPetugasSpecs] = useState<Record<string, ReportCategory[]>>({});
  const [selectedPetugas, setSelectedPetugas] = useState('');

  // Fetch all report details
  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const { data: r, error: reportErr } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (reportErr || !r) {
        setError('Laporan tidak ditemukan atau gagal dimuat.');
        setLoading(false);
        return;
      }

      const cleanReport: Report = {
        ...(r as any),
        status: normalizeReportStatus((r as any).status),
      };
      setReport(cleanReport);

      // Parallel related fetches
      const [reporterRes, petugasRes, wilayahRes, logsRes, proofsRes, commentsRes, ratingRes] = await Promise.all([
        cleanReport.reporter_id ? supabase.from('profiles').select('*').eq('id', cleanReport.reporter_id).maybeSingle() : Promise.resolve({ data: null }),
        cleanReport.assigned_petugas_id ? supabase.from('profiles').select('*').eq('id', cleanReport.assigned_petugas_id).maybeSingle() : Promise.resolve({ data: null }),
        cleanReport.wilayah_id ? supabase.from('wilayah').select('*').eq('id', cleanReport.wilayah_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('status_logs').select('*').eq('report_id', id).order('created_at', { ascending: true }),
        supabase.from('completion_proofs').select('*').eq('report_id', id).order('created_at', { ascending: false }),
        supabase.from('comments').select('*').eq('report_id', id).order('created_at', { ascending: false }),
        supabase.from('ratings').select('score').eq('report_id', id).maybeSingle(),
      ]);

      setReporter(reporterRes.data as Profile | null);
      setAssignedPetugas(petugasRes.data as Profile | null);
      setWilayah(wilayahRes.data as Wilayah | null);
      setStatusLogs((logsRes.data as StatusLog[]) || []);
      setProofs((proofsRes.data as CompletionProof[]) || []);

      if (ratingRes.data) {
        setUserRating((ratingRes.data as any).score);
      }

      const commentsData = commentsRes.data || [];
      const commentProfiles = await Promise.all(
        (commentsData as any[]).map(async (c) => {
          const { data: p } = await supabase.from('profiles').select('full_name, role, phone, department').eq('id', c.user_id).maybeSingle();
          return { ...c, profile: p };
        })
      );
      setComments(commentProfiles);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data laporan.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();

    if (!id) return;

    // Realtime channel for live officer chat & report updates
    const channel = supabase
      .channel(`admin-live-chat-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `report_id=eq.${id}` },
        async (payload) => {
          const newC = payload.new as any;
          const { data: p } = await supabase
            .from('profiles')
            .select('full_name, role, phone, department')
            .eq('id', newC.user_id)
            .maybeSingle();

          setComments((prev) => {
            if (prev.some((c) => c.id === newC.id)) return prev;
            return [{ ...newC, profile: p }, ...prev];
          });

          if (p?.role === 'petugas') {
            addToast('info', `💬 Pesan Masuk Petugas: "${newC.content}"`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll, id, addToast]);

  const filteredStatusLogs = useMemo(() => {
    return statusLogs.filter((log) => matchesDateTimeFilter(log.created_at, logDateTimeFilter));
  }, [statusLogs, logDateTimeFilter]);

  const filteredComments = useMemo(() => {
    return comments.filter((c) => matchesDateTimeFilter(c.created_at, commentDateTimeFilter));
  }, [comments, commentDateTimeFilter]);

  // Load petugas with category & area matching
  const loadPetugas = async () => {
    const [petugasRes, specsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'petugas').eq('is_active', true).order('full_name'),
      supabase.from('petugas_spesialisasi').select('petugas_id, category'),
    ]);

    const specMap: Record<string, ReportCategory[]> = {};
    if (specsRes.data) {
      (specsRes.data as any[]).forEach((s) => {
        if (!specMap[s.petugas_id]) specMap[s.petugas_id] = [];
        specMap[s.petugas_id].push(s.category);
      });
    }
    setPetugasSpecs(specMap);

    if (petugasRes.data) {
      const list = petugasRes.data as Profile[];
      list.sort((a, b) => {
        const aArea = a.wilayah_id === report?.wilayah_id;
        const bArea = b.wilayah_id === report?.wilayah_id;
        const aSpec = report ? (specMap[a.id] || []).includes(report.category) : false;
        const bSpec = report ? (specMap[b.id] || []).includes(report.category) : false;

        const aScore = (aArea ? 2 : 0) + (aSpec ? 1 : 0);
        const bScore = (bArea ? 2 : 0) + (bSpec ? 1 : 0);
        return bScore - aScore;
      });
      setPetugasList(list);
    }
  };

  // 1. Admin Verifikasi Laporan
  const handleVerify = async () => {
    if (!report) return;
    setActionLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const fromStatus = normalizeReportStatus(report.status);

      // Try direct update first
      const { error: updateErr } = await supabase
        .from('reports')
        .update({ status: 'verified', updated_at: now })
        .eq('id', report.id);

      if (updateErr) {
        console.warn('Direct update failed, falling back to admin_verify_report RPC:', updateErr);
        const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_verify_report', {
          p_report_id: report.id,
        });

        if (rpcErr || (rpcData && !rpcData.success)) {
          throw new Error(rpcErr?.message || rpcData?.error || updateErr.message);
        }
      }

      // Safe insert log (auto-trigger might also log)
      try {
        await supabase.from('status_logs').insert({
          report_id: report.id,
          from_status: fromStatus,
          to_status: 'verified',
          changed_by: profile?.id || 'admin',
          note: 'Laporan diverifikasi oleh Administrator.',
          created_at: now,
        });
      } catch (_) {}

      // Notify citizen
      if (report.reporter_id) {
        try {
          await supabase.from('notifications').insert({
            user_id: report.reporter_id,
            report_id: report.id,
            title: 'Laporan Telah Diverifikasi ✅',
            message: `Laporan [${report.ticket_id}] telah disetujui Admin dan sedang dialokasikan ke petugas lapangan.`,
            type: 'status_update',
            is_read: false,
            created_at: now,
          });
        } catch (_) {}

        // Send instant official email to citizen Gmail
        if (reporter?.email) {
          sendReportStatusEmail({
            report: { ...report, status: 'verified' },
            newStatus: 'verified',
            reporterEmail: reporter.email,
            reporterName: reporter.full_name,
          }).then((res) => {
            if (res.success) {
              addToast('info', '✉️ Email resmi terverifikasi terkirim ke Gmail pelapor!');
            }
          });
        }
      }

      setReport((prev) => prev ? { ...prev, status: 'verified', updated_at: now } : null);
      addToast('success', 'Laporan berhasil diverifikasi! Membuka daftar petugas...');
      await loadPetugas();
      setShowAssignModal(true);
    } catch (err: any) {
      console.error('Verify error:', err);
      setError(err?.message || 'Gagal memverifikasi laporan.');
      addToast('error', `Gagal memverifikasi: ${err?.message || 'Terjadi kesalahan'}`);
    } finally {
      setActionLoading(false);
      fetchAll();
    }
  };

  // 2. Admin Tolak Laporan
  const handleReject = async () => {
    if (!report || !rejectReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const reason = rejectReason.trim();
      const fromStatus = normalizeReportStatus(report.status);

      const { error: rejectErr } = await supabase
        .from('reports')
        .update({
          status: 'rejected',
          rejected_reason: reason,
          updated_at: now,
        })
        .eq('id', report.id);

      if (rejectErr) {
        console.warn('Direct reject failed, falling back to admin_reject_report RPC:', rejectErr);
        const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_reject_report', {
          p_report_id: report.id,
          p_reason: reason,
        });

        if (rpcErr || (rpcData && !rpcData.success)) {
          throw new Error(rpcErr?.message || rpcData?.error || rejectErr.message);
        }
      }

      try {
        await supabase.from('status_logs').insert({
          report_id: report.id,
          from_status: fromStatus,
          to_status: 'rejected',
          changed_by: profile?.id || 'admin',
          note: `Laporan ditolak. Alasan: ${reason}`,
          created_at: now,
        });
      } catch (_) {}

      if (report.reporter_id) {
        try {
          await supabase.from('notifications').insert({
            user_id: report.reporter_id,
            report_id: report.id,
            title: 'Laporan Ditolak ❌',
            message: `Laporan [${report.ticket_id}] ditolak. Alasan: ${reason}`,
            type: 'status_update',
            is_read: false,
            created_at: now,
          });
        } catch (_) {}

        // Send instant rejection email to citizen Gmail
        if (reporter?.email) {
          sendReportStatusEmail({
            report: { ...report, status: 'rejected' },
            newStatus: 'rejected',
            reporterEmail: reporter.email,
            reporterName: reporter.full_name,
            adminNote: reason,
          }).then((res) => {
            if (res.success) {
              addToast('info', '✉️ Email catatan pembaruan terkirim ke Gmail pelapor.');
            }
          });
        }
      }

      setReport((prev) => prev ? { ...prev, status: 'rejected', rejected_reason: reason, updated_at: now } : null);
      setShowRejectModal(false);
      setRejectReason('');
      addToast('info', 'Laporan telah ditandai ditolak.');
    } catch (err: any) {
      setError(err?.message || 'Gagal menolak laporan.');
      addToast('error', err?.message || 'Gagal menolak laporan.');
    } finally {
      setActionLoading(false);
      fetchAll();
    }
  };

  // 3. Admin Tugaskan Petugas
  const handleAssign = async () => {
    if (!report || !selectedPetugas) return;
    setActionLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const fromStatus = normalizeReportStatus(report.status);

      const { error: assignErr } = await supabase
        .from('reports')
        .update({
          status: 'assigned',
          assigned_petugas_id: selectedPetugas,
          assigned_at: now,
          updated_at: now,
        })
        .eq('id', report.id);

      if (assignErr) {
        console.warn('Direct assign failed, falling back to admin_assign_report RPC:', assignErr);
        const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_assign_report', {
          p_report_id: report.id,
          p_petugas_id: selectedPetugas,
        });

        if (rpcErr || (rpcData && !rpcData.success)) {
          throw new Error(rpcErr?.message || rpcData?.error || assignErr.message);
        }
      }

      try {
        await supabase.from('status_logs').insert({
          report_id: report.id,
          from_status: fromStatus,
          to_status: 'assigned',
          changed_by: profile?.id || 'admin',
          note: 'Laporan telah ditugaskan kepada petugas lapangan.',
          created_at: now,
        });
      } catch (_) {}

      // Notify Petugas
      try {
        await supabase.from('notifications').insert({
          user_id: selectedPetugas,
          report_id: report.id,
          title: 'Tugas Lapangan Baru 🛠️',
          message: `Penugasan baru untuk tiket [${report.ticket_id}]: "${report.title}". Segera tindak lanjuti di aplikasi mobile.`,
          type: 'status_update',
          is_read: false,
          created_at: now,
        });
      } catch (_) {}

      // Notify Citizen
      if (report.reporter_id) {
        try {
          await supabase.from('notifications').insert({
            user_id: report.reporter_id,
            report_id: report.id,
            title: 'Petugas Telah Ditugaskan 👷',
            message: `Petugas lapangan telah ditugaskan untuk menangani laporan [${report.ticket_id}].`,
            type: 'status_update',
            is_read: false,
            created_at: now,
          });
        } catch (_) {}

        // Send instant assignment email to citizen Gmail
        if (reporter?.email) {
          const assignedOfficer = petugasList.find((p) => p.id === selectedPetugas);
          sendReportStatusEmail({
            report: { ...report, status: 'assigned' },
            newStatus: 'assigned',
            reporterEmail: reporter.email,
            reporterName: reporter.full_name,
            petugasName: assignedOfficer?.full_name || 'Petugas Lapangan',
          }).then((res) => {
            if (res.success) {
              addToast('info', '✉️ Email penugasan regu terkirim ke Gmail pelapor!');
            }
          });
        }
      }

      setReport((prev) => prev ? {
        ...prev,
        status: 'assigned',
        assigned_petugas_id: selectedPetugas,
        assigned_at: now,
        updated_at: now,
      } : null);

      setShowAssignModal(false);
      setSelectedPetugas('');
      addToast('success', 'Petugas berhasil ditugaskan! Tugas realtime tersinkron ke aplikasi petugas.');
    } catch (err: any) {
      setError(err?.message || 'Gagal menugaskan petugas.');
      addToast('error', err?.message || 'Gagal menugaskan petugas.');
    } finally {
      setActionLoading(false);
      fetchAll();
    }
  };

  // Comment submit
  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !report || !newComment.trim()) return;
    const { data } = await supabase
      .from('comments')
      .insert({ report_id: report.id, user_id: profile.id, content: newComment.trim() })
      .select('id, content, created_at, user_id')
      .single();
    if (data) {
      setComments([{ ...data, profile }, ...comments]);
      setNewComment('');
      addToast('success', 'Tanggapan admin berhasil ditambahkan.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#D4A843] animate-spin mb-3" />
        <p className="text-sm text-[#5A6372] font-mono">Memuat Konsol Verifikasi Admin...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-[#C1503D] mx-auto mb-3" />
        <h2 className="font-display text-lg font-bold text-[#16233D] mb-1">Laporan Tidak Ditemukan</h2>
        <p className="text-sm text-[#5A6372] mb-6">Tiket yang Anda cari tidak tersedia atau telah dihapus.</p>
        <Link to="/app/admin/reports" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Laporan
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Link
          to="/app/admin/reports"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5A6372] hover:text-[#16233D] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Kelola Laporan
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn-secondary btn-sm flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-[#2E8B7F]" />
            <span>Cetak Disposisi PDF</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#C1503D]/10 border border-[#C1503D]/30 p-3.5 rounded-[4px] flex items-center gap-2 text-sm text-[#C1503D] animate-shake">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="card p-6 bg-white border border-[#E2E4E0] shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#16233D] text-white">
                {report.ticket_id}
              </span>
              <StatusBadge status={report.status} />
              <CategoryBadge category={report.category} />
              <PriorityBadge priority={report.priority} />
            </div>
            <h1 className="font-display text-2xl font-bold text-[#16233D] leading-tight">
              {report.title}
            </h1>
            <p className="text-xs text-[#5A6372] flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Masuk pada: <span className="font-medium text-[#16233D]">{formatDateTime(report.created_at)}</span> ({timeAgo(report.created_at)})
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#8891A0]">Kewenangan Wilayah</span>
            <span className="text-sm font-bold text-[#16233D] bg-[#EFF1EC] px-3 py-1 rounded-[4px] border border-[#E2E4E0]">
              {wilayah?.name || 'Seluruh Kota Depok'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Report Details, Map, Proofs, Audit Logs (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deskripsi & Foto */}
          <div className="card p-5 space-y-4">
            <h2 className="font-display font-bold text-base text-[#16233D] border-b border-[#E2E4E0] pb-2">
              Detail Isi Laporan Warga
            </h2>
            <p className="text-sm text-[#16233D] leading-relaxed whitespace-pre-wrap">
              {report.description}
            </p>

            {report.photo_url && (
              <div className="pt-2">
                <span className="text-xs font-semibold text-[#5A6372] mb-1.5 block">Foto Kondisi Awal di Lapangan:</span>
                <div className="rounded-[4px] overflow-hidden border border-[#E2E4E0] bg-[#16233D]/5 max-h-96">
                  <img
                    src={report.photo_url}
                    alt="Foto Laporan"
                    className="w-full h-auto object-contain max-h-96 hover:scale-102 transition-transform cursor-pointer"
                    onClick={() => report.photo_url && window.open(report.photo_url, '_blank')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lokasi & Peta */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E4E0] pb-2">
              <h2 className="font-display font-bold text-base text-[#16233D] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#2E8B7F]" /> Lokasi & Titik Presisi
              </h2>
              {report.latitude && report.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#2E8B7F] hover:underline flex items-center gap-1"
                >
                  Buka Google Maps <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <p className="text-xs text-[#5A6372]">
              <span className="font-semibold text-[#16233D]">Alamat:</span> {report.address || 'Tidak ada keterangan alamat tertulis'}
            </p>

            {report.latitude && report.longitude ? (
              <div className="h-64 rounded-[4px] overflow-hidden border border-[#E2E4E0]">
                <MapView
                  center={[report.latitude, report.longitude]}
                  zoom={15}
                  markers={[
                    {
                      id: report.id,
                      position: [report.latitude, report.longitude],
                      title: report.title,
                      status: report.status,
                      statusLabel: STATUS_CONFIG[report.status]?.label || report.status,
                      ticketId: report.ticket_id,
                      address: report.address,
                      photoUrl: report.photo_url,
                    },
                  ]}
                />
              </div>
            ) : (
              <div className="p-4 bg-[#EFF1EC] rounded text-center text-xs text-[#8891A0]">
                Koordinat GPS tidak dicantumkan oleh pelapor
              </div>
            )}
          </div>

          {/* Bukti Penyelesaian Petugas (Jika Selesai) */}
          {proofs.length > 0 && (
            <div className="card p-5 border-l-4 border-l-[#2E8B7F] space-y-3">
              <h2 className="font-display font-bold text-base text-[#16233D] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#2E8B7F]" />
                Bukti Foto Hasil Penanganan Lapangan
              </h2>
              <div className="grid sm:grid-cols-2 gap-4 pt-1">
                {proofs.map((proof) => (
                  <div key={proof.id} className="border border-[#E2E4E0] rounded-[4px] overflow-hidden bg-[#F8F9FA]">
                    <img
                      src={proof.photo_url}
                      alt="Bukti Selesai"
                      className="w-full h-48 object-cover cursor-pointer hover:opacity-90"
                      onClick={() => window.open(proof.photo_url, '_blank')}
                    />
                    <div className="p-2.5 text-xs text-[#16233D]">
                      <p className="font-medium">{proof.note || 'Tugas selesai ditangani sesuai SOP'}</p>
                      <p className="text-[10px] text-[#8891A0] mt-1 font-mono">{formatDateTime(proof.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status History & Audit Log */}
          <div className="card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E4E0] pb-2">
              <h2 className="font-display font-bold text-base text-[#16233D] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#16233D]" />
                Riwayat Audit Log & Transisi Status ({filteredStatusLogs.length})
              </h2>
              <DateTimeFilter
                value={logDateTimeFilter}
                onChange={setLogDateTimeFilter}
                size="sm"
                align="right"
                badgeLabel="Waktu Log"
              />
            </div>

            {filteredStatusLogs.length === 0 ? (
              <p className="text-xs text-[#8891A0] py-2 text-center">
                {statusLogs.length === 0
                  ? 'Belum ada riwayat perubahan status.'
                  : 'Tidak ada log status yang sesuai dengan rentang tanggal & jam terpilih.'}
              </p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E4E0]">
                {filteredStatusLogs.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#16233D] ring-4 ring-white" />
                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#16233D]">
                          {STATUS_CONFIG[log.to_status]?.label || log.to_status}
                        </span>
                        {log.from_status && (
                          <span className="text-[10px] text-[#8891A0]">
                            (dari: {STATUS_CONFIG[log.from_status]?.label || log.from_status})
                          </span>
                        )}
                        <span className="text-[10px] text-[#8891A0] font-mono ml-auto">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                      {log.note && <p className="text-[#5A6372] text-[11px] bg-[#EFF1EC] p-1.5 rounded mt-1">{log.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tactical Live Communication & Officer Chat */}
          <div className="card p-5 space-y-4 border-2 border-[#16233D]/10 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E4E0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[4px] bg-[#16233D] text-white flex items-center justify-center">
                  <Radio className="w-4 h-4 text-[#2E8B7F] animate-pulse" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-sm sm:text-base text-[#16233D] flex items-center gap-2">
                    Kanal Komunikasi Lapangan & Posko
                    <span className="inline-flex items-center gap-1 text-[10px] bg-[#2E8B7F]/10 text-[#2E8B7F] px-2 py-0.5 rounded font-mono font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2E8B7F] animate-ping" />
                      LIVE REALTIME
                    </span>
                  </h2>
                  <p className="text-[11px] text-[#5A6372]">
                    Saluran dua arah antara Admin Posko Komando dan Petugas Lapangan
                  </p>
                </div>
              </div>

              {/* Direct WhatsApp / Call Shortcut & Date-Time Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <DateTimeFilter
                  value={commentDateTimeFilter}
                  onChange={setCommentDateTimeFilter}
                  size="sm"
                  align="right"
                  badgeLabel="Filter Jam Chat"
                />

                {assignedPetugas && assignedPetugas.phone && (
                  <>
                    <a
                      href={`https://wa.me/${assignedPetugas.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Halo ${assignedPetugas.full_name}, konfirmasi penanganan tiket [#${report.ticket_id}]: ${report.title}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary btn-sm text-[11px] text-[#2E8B7F] hover:bg-[#2E8B7F]/10 border-[#2E8B7F]/30 flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Chat WA
                    </a>
                    <a
                      href={`tel:${assignedPetugas.phone}`}
                      className="btn-secondary btn-sm text-[11px] text-[#16233D] flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Telepon
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Quick Response Templates for Admin */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-[#8891A0] uppercase font-bold tracking-wider">
                ⚡ Balasan Cepat Posko ke Petugas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Berapa estimasi waktu penyelesaian di lokasi?',
                  'Mohon unggah foto kendala/kebutuhan alat di lapangan.',
                  'Bantuan armada dan alat berat sedang diberangkatkan.',
                  'Status penanganan telah dicatat Posko, silakan lanjutkan.',
                ].map((txt) => (
                  <button
                    key={txt}
                    type="button"
                    onClick={() => setNewComment(txt)}
                    className="text-[11px] px-2.5 py-1 rounded bg-[#EFF1EC] hover:bg-[#E2E4E0] text-[#16233D] font-medium transition-colors border border-[#E2E4E0] text-left"
                  >
                    {txt}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input Form */}
            <form onSubmit={handleComment} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ketik instruksi/konfirmasi ke Petugas Lapangan..."
                className="input text-xs flex-1"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="btn-primary btn-sm px-4 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </form>

            {/* Messages Feed */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {filteredComments.length === 0 ? (
                <div className="p-6 text-center text-[#8891A0] text-xs">
                  {comments.length === 0
                    ? 'Belum ada percakapan atau catatan kendala untuk tiket ini.'
                    : 'Tidak ada pesan yang sesuai dengan filter tanggal & jam terpilih.'}
                </div>
              ) : (
                filteredComments.map((c) => {
                  const isOfficer = c.profile?.role === 'petugas';
                  const isAdmin = c.profile?.role === 'admin';

                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-[6px] border text-xs transition-all ${
                        isOfficer
                          ? 'bg-[#EBF7F5] border-[#2E8B7F]/40 shadow-xs'
                          : isAdmin
                          ? 'bg-[#16233D]/5 border-[#16233D]/20'
                          : 'bg-[#F8F9FA] border-[#E2E4E0]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {isOfficer && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2E8B7F] text-white text-[10px] font-bold">
                              <HardHat className="w-3 h-3" />
                              PETUGAS LAPANGAN
                            </span>
                          )}
                          {isAdmin && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#16233D] text-white text-[10px] font-bold">
                              <ShieldCheck className="w-3 h-3" />
                              ADMIN POSKO
                            </span>
                          )}
                          {!isOfficer && !isAdmin && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#8891A0] text-white text-[10px] font-bold">
                              <User className="w-3 h-3" />
                              WARGA PELAPOR
                            </span>
                          )}
                          <span className="font-bold text-[#16233D]">
                            {c.profile?.full_name || 'Pengguna'}
                          </span>
                          {c.profile?.department && (
                            <span className="text-[10px] text-[#5A6372] hidden sm:inline">
                              ({c.profile.department})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#8891A0] font-mono">
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <p className="text-[#16233D] leading-relaxed whitespace-pre-wrap font-medium">
                        {c.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Admin Operations Console & Citizen Profile (1 span) */}
        <div className="space-y-6">
          {/* ACTION PANEL */}
          <div className="card p-5 border-2 border-[#16233D] shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E2E4E0] pb-2">
              <ShieldCheck className="w-5 h-5 text-[#2E8B7F]" />
              <h2 className="font-display font-bold text-base text-[#16233D]">Konsol Tindakan Admin</h2>
            </div>

            {/* Current State Info */}
            <div className="p-3 rounded-[4px] bg-[#EFF1EC] space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5A6372]">Status Saat Ini:</span>
                <span className="font-bold text-[#16233D]">{STATUS_CONFIG[report.status].label}</span>
              </div>
              {report.assigned_petugas_id && (
                <div className="flex justify-between">
                  <span className="text-[#5A6372]">Petugas Lapangan:</span>
                  <span className="font-bold text-[#2E8B7F]">{assignedPetugas?.full_name || 'Ditugaskan'}</span>
                </div>
              )}
              {userRating && (
                <div className="flex justify-between">
                  <span className="text-[#5A6372]">Rating Warga:</span>
                  <span className="font-bold text-[#E8A33D]">⭐ {userRating} / 5 Bintang</span>
                </div>
              )}
            </div>

            {/* Actions for Status: Pending */}
            {report.status === 'pending' && (
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleVerify}
                  disabled={actionLoading}
                  className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 bg-[#2E8B7F] hover:bg-[#257369] text-white font-bold"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Verifikasi & Setujui Laporan</span>
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="w-full btn-secondary py-2 text-xs text-[#C1503D] hover:bg-[#C1503D]/10 flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Tolak Laporan (Tidak Valid)</span>
                </button>
              </div>
            )}

            {/* Actions for Status: Verified */}
            {report.status === 'verified' && (
              <div className="space-y-2 pt-1">
                <button
                  onClick={async () => {
                    await loadPetugas();
                    setShowAssignModal(true);
                  }}
                  disabled={actionLoading}
                  className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 bg-[#16233D] hover:bg-[#233557] text-white font-bold"
                >
                  <UserCheck className="w-4 h-4 text-[#D4A843]" />
                  <span>Tugaskan Petugas Lapangan</span>
                </button>
                <p className="text-[11px] text-[#5A6372] text-center">
                  Laporan sudah terverifikasi. Silakan pilih petugas lapangan yang siap bertugas di wilayah ini.
                </p>
              </div>
            )}

            {/* Actions for Status: Assigned or In Progress */}
            {(report.status === 'assigned' || report.status === 'in_progress') && (
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-[#F8F9FA] rounded-[4px] border border-[#E2E4E0] space-y-1.5 text-xs">
                  <div className="font-bold text-[#16233D] flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-[#2E8B7F]" />
                    <span>Petugas Bertugas:</span>
                  </div>
                  <div className="text-sm font-bold text-[#16233D]">{assignedPetugas?.full_name}</div>
                  <div className="text-[11px] text-[#5A6372]">{assignedPetugas?.email}</div>
                  {assignedPetugas?.phone && (
                    <div className="text-[11px] text-[#5A6372]">Telp: {assignedPetugas?.phone}</div>
                  )}
                  <div className="text-[10px] text-[#8891A0] font-mono pt-1">
                    Ditugaskan: {report.assigned_at ? formatDateTime(report.assigned_at) : '-'}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await loadPetugas();
                    setShowAssignModal(true);
                  }}
                  className="w-full btn-secondary btn-sm text-xs flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Alihkan / Ganti Petugas</span>
                </button>
              </div>
            )}

            {/* Status: Completed */}
            {report.status === 'completed' && (
              <div className="p-3 bg-[#2E8B7F]/10 border border-[#2E8B7F]/30 rounded-[4px] text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-[#2E8B7F] mx-auto" />
                <h4 className="font-bold text-sm text-[#16233D]">Penanganan Selesai</h4>
                <p className="text-xs text-[#5A6372]">
                  Laporan ini telah selesai dikerjakan di lapangan dan diverifikasi tuntas.
                </p>
              </div>
            )}

            {/* Status: Rejected */}
            {report.status === 'rejected' && (
              <div className="p-3 bg-[#C1503D]/10 border border-[#C1503D]/30 rounded-[4px] space-y-1">
                <div className="flex items-center gap-1.5 text-[#C1503D] font-bold text-xs">
                  <XCircle className="w-4 h-4" /> Laporan Ditolak
                </div>
                <p className="text-xs text-[#16233D]">
                  <span className="font-semibold">Alasan:</span> {report.rejected_reason || 'Tidak memenuhi kriteria laporan publik'}
                </p>
              </div>
            )}
          </div>

          {/* INFORMASI WARGA PELAPOR */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E4E0] pb-2">
              <h3 className="font-display font-bold text-sm text-[#16233D] flex items-center gap-2">
                <User className="w-4 h-4 text-[#16233D]" />
                Identitas Warga Pelapor
              </h3>
              {report.is_anonymous && (
                <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                  🛡️ Mode Anonim
                </span>
              )}
            </div>

            {report.is_anonymous && (
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 font-medium flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                <span>Pelapor meminta identitas disamarkan dari feed publik & peta.</span>
              </div>
            )}

            {reporter ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[4px] bg-[#16233D] text-white flex items-center justify-center font-bold text-xs">
                    {reporter.full_name?.charAt(0).toUpperCase() || 'W'}
                  </div>
                  <div>
                    <div className="font-bold text-[#16233D]">{reporter.full_name}</div>
                    <div className="text-[10px] text-[#8891A0]">Akun Terverifikasi</div>
                  </div>
                </div>

                <div className="space-y-1 pt-1 text-[#5A6372]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#8891A0]" />
                    <a href={`mailto:${reporter.email}`} className="hover:underline truncate">{reporter.email}</a>
                  </div>
                  {reporter.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#8891A0]" />
                      <a href={`tel:${reporter.phone}`} className="hover:underline">{reporter.phone}</a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#8891A0]">Laporan dari pengguna anonim / publik</p>
            )}
          </div>
        </div>
      </div>

      {/* ASSIGN PETUGAS MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-[#16233D]/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-[6px] border border-[#E2E4E0] p-5 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3">
              <h3 className="font-display font-bold text-lg text-[#16233D]">Tugaskan Petugas Lapangan</h3>
              <p className="text-xs text-[#5A6372]">Petugas diurutkan otomatis berdasarkan kesesuaian wilayah & spesialisasi kategori</p>
            </div>

            {petugasList.length === 0 ? (
              <p className="text-sm text-[#8891A0] mb-4 bg-[#F6F7F5] p-3 rounded-[4px] border border-[#E2E4E0]">
                Belum ada petugas aktif terdaftar dalam sistem.
              </p>
            ) : (
              <div className="space-y-2 mb-4 max-h-72 overflow-y-auto pr-1">
                {petugasList.map((p) => {
                  const isAreaMatch = p.wilayah_id === report.wilayah_id;
                  const isSpecMatch = (petugasSpecs[p.id] || []).includes(report.category);

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPetugas(p.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-[4px] border text-left transition-all ${
                        selectedPetugas === p.id
                          ? 'border-[#16233D] bg-[#EFF1EC] shadow-sm ring-1 ring-[#16233D]'
                          : 'border-[#E2E4E0] bg-white hover:border-[#8891A0]'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-[4px] bg-[#16233D] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {p.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-[#16233D] truncate">{p.full_name}</span>
                          {isAreaMatch && (
                            <span className="text-[9px] font-semibold bg-[#2E8B7F] text-white px-1.5 py-0.5 rounded-[2px]">
                              Wilayah Sesuai
                            </span>
                          )}
                          {isSpecMatch && (
                            <span className="text-[9px] font-semibold bg-[#E8A33D] text-[#16233D] px-1.5 py-0.5 rounded-[2px]">
                              Spesialisasi Kategori
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#8891A0] truncate">{p.email}</div>
                      </div>
                      {selectedPetugas === p.id && <Check className="w-4 h-4 text-[#16233D]" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-[#E2E4E0]">
              <button onClick={() => setShowAssignModal(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleAssign} disabled={!selectedPetugas || actionLoading} className="btn-primary flex-1">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Konfirmasi Penugasan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-[#16233D]/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-[6px] border border-[#E2E4E0] p-5 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-[#16233D] mb-1">Tolak Laporan</h3>
            <p className="text-xs text-[#5A6372] mb-3">Berikan alasan penolakan agar warga pelapor memahami status laporannya.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Lokasi tidak ditemukan, laporan duplikat, atau di luar kewenangan pemerintah kota..."
              className="textarea mb-3 text-xs"
              rows={3}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowRejectModal(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || actionLoading} className="btn-brick flex-1">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Konfirmasi Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
