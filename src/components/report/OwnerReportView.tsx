import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Report, Profile, Wilayah, StatusLog, CompletionProof } from '../../types';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../Badges';
import { MapView } from '../MapComponents';
import { STATUS_CONFIG, CATEGORY_CONFIG, formatDateTime, timeAgo, getEstimatedCompletionInfo } from '../../lib/constants';
import { DateTimeFilter, DateTimeFilterState, INITIAL_DATE_TIME_FILTER, matchesDateTimeFilter } from '../DateTimeFilter';
import {
  ArrowLeft, MapPin, Calendar, ThumbsUp, MessageSquare,
  Star, Send, AlertCircle, CheckCircle2, XCircle, Share2,
  Printer, ShieldCheck, QrCode, Sparkles, Award, Clock,
  ExternalLink, Eye, ChevronDown, ChevronUp, Check, PhoneCall,
  Info, Shield, RefreshCw
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ReceiptModal } from './ReceiptModal';
import { MediaGallery } from './MediaGallery';

interface OwnerReportViewProps {
  report: Report;
  reporter: Profile | null;
  assignedPetugas: Profile | null;
  wilayah: Wilayah | null;
  statusLogs: StatusLog[];
  proofs: CompletionProof[];
  upvoteCount: number;
  hasUpvoted: boolean;
  comments: any[];
  newComment: string;
  setNewComment: (c: string) => void;
  userRating: number | null;
  hoverRating: number;
  setHoverRating: (r: number) => void;
  currentUser: Profile | null;
  onUpvote: () => void;
  onComment: (e: React.FormEvent) => void;
  onRating: (score: number) => void;
  onTogglePublicPreview?: () => void;
  error: string | null;
}

export function OwnerReportView({
  report,
  reporter,
  assignedPetugas,
  wilayah,
  statusLogs,
  proofs,
  upvoteCount,
  hasUpvoted,
  comments,
  newComment,
  setNewComment,
  userRating,
  hoverRating,
  setHoverRating,
  currentUser,
  onUpvote,
  onComment,
  onRating,
  onTogglePublicPreview,
  error,
}: OwnerReportViewProps) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [showReceipt, setShowReceipt] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(true);
  const [logDateTimeFilter, setLogDateTimeFilter] = useState<DateTimeFilterState>(INITIAL_DATE_TIME_FILTER);
  const [commentDateTimeFilter, setCommentDateTimeFilter] = useState<DateTimeFilterState>(INITIAL_DATE_TIME_FILTER);
  const [copied, setCopied] = useState(false);
  const slaInfo = getEstimatedCompletionInfo(report.created_at, report.category);

  const filteredStatusLogs = useMemo(() => {
    return statusLogs.filter((log) => matchesDateTimeFilter(log.created_at, logDateTimeFilter));
  }, [statusLogs, logDateTimeFilter]);

  const filteredComments = useMemo(() => {
    return comments.filter((c) => matchesDateTimeFilter(c.created_at, commentDateTimeFilter));
  }, [comments, commentDateTimeFilter]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    addToast('success', 'Tautan pelacakan tiket berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  const isCompleted = report.status === 'completed';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up pb-16">
      
      {/* ───── NAVIGATION & ACTION BAR ───── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Laporan Saya</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onTogglePublicPreview && (
            <button
              onClick={onTogglePublicPreview}
              className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              title="Lihat bagaimana halaman ini ditampilkan ke publik umum"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Preview Tampilan Publik</span>
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Tersalin' : 'Salin Tautan'}</span>
          </button>

          <button
            onClick={() => setShowReceipt(true)}
            className="px-4 py-1.5 rounded-full bg-[#D4A843] hover:bg-[#c29636] text-slate-950 text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md shadow-[#D4A843]/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Tanda Terima Resmi</span>
          </button>
        </div>
      </div>

      {/* ───── EXECUTIVE OWNER BANNER ───── */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border-2 border-[#D4A843]/40 overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#D4A843]/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A843]/20 border border-[#D4A843]/50 text-[#D4A843] text-xs font-extrabold font-mono uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                TIKET RESMI ANDA • RUANG KENDALI PELAPOR
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold border border-emerald-500/30">
                Hak Milik Pelapor
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {report.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
              Anda memegang kendali penuh atas tiket ini. Anda menerima pembaruan status langsung, jaminan audit respon dinas, serta hak memberikan penilaian atas hasil kerja petugas.
            </p>
          </div>

          <div className="flex-shrink-0 bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center md:text-right min-w-[200px]">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
              ID TIKET RESMI
            </span>
            <span className="font-mono text-lg font-extrabold text-[#D4A843] tracking-wider block mt-0.5">
              {report.ticket_id}
            </span>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-center md:justify-end gap-1.5 text-xs text-slate-300 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Terotentikasi Warga</span>
            </div>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Waktu Pengajuan:</span>
            <span className="font-bold text-white">{formatDateTime(report.created_at)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Kategori & Urgensi:</span>
            <span className="font-bold text-[#D4A843] capitalize">
              {CATEGORY_CONFIG[report.category]?.label} ({report.priority})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Zona Wilayah:</span>
            <span className="font-bold text-white">{wilayah?.name || 'Zona Kota'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Petugas Lapangan:</span>
            <span className="font-bold text-emerald-400">{assignedPetugas?.full_name || 'Dalam Antrean'}</span>
          </div>
        </div>
      </div>

      {/* ───── SLA TARGET & ANONYMOUS STATUS ───── */}
      {report.status !== 'rejected' && (
        <div className={`rounded-3xl p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${
          report.status === 'completed'
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : slaInfo.isOverdue
            ? 'bg-rose-50/80 border-rose-200 text-rose-950'
            : 'bg-sky-50/80 border-sky-200 text-sky-950'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
              report.status === 'completed' ? 'bg-emerald-600 text-white' : slaInfo.isOverdue ? 'bg-rose-600 text-white' : 'bg-sky-600 text-white'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider">
                  {report.status === 'completed' ? 'Target SLA Tercapai' : 'Target Estimasi Penanganan (SLA)'}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/90 border border-current shadow-2xs">
                  {slaInfo.slaLabel}
                </span>
              </div>
              <p className="text-xs font-semibold mt-0.5">
                {report.status === 'completed'
                  ? `Tuntas diselesaikan pada ${formatDateTime(report.completed_at || report.updated_at)}`
                  : slaInfo.isOverdue
                  ? `Target jatuh pada ${slaInfo.formattedTargetDate} (Melewati estimasi waktu standar)`
                  : `Target perkiraan tuntas: ${slaInfo.formattedTargetDate} (${slaInfo.diffDays} hari lagi)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {report.is_anonymous && (
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 bg-slate-900 text-white rounded-full shadow-xs">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Privasi Anonim Aktif</span>
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ───── VISUAL STEPPER TRACKER ───── */}
      {report.status === 'rejected' ? (
        <div className="rounded-3xl p-6 bg-rose-50 border border-rose-300 text-rose-900 space-y-2">
          <div className="flex items-center gap-2.5 font-bold text-base">
            <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
            <span>Laporan Tidak Dapat Diproses oleh Dinas Kota</span>
          </div>
          {report.rejected_reason && (
            <p className="text-xs text-slate-700 pl-8 bg-white p-3 rounded-xl border border-rose-200">
              <strong>Catatan Penolakan:</strong> "{report.rejected_reason}"
            </p>
          )}
          <p className="text-xs text-rose-700 pl-8">
            Jika Anda merasa terdapat kekeliruan, Anda dapat membuat laporan baru dengan foto yang lebih jelas dan deskripsi yang lebih rinci.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <span className="font-mono text-xs font-bold text-[#D4A843] uppercase tracking-wider block">
                // PROGRESS MONITORING & TAHAPAN PENYELESAIAN //
              </span>
              <h3 className="font-display font-extrabold text-lg text-slate-900 mt-0.5">
                Status Saat Ini: <span className="text-emerald-700">{STATUS_CONFIG[report.status].label}</span>
              </h3>
            </div>
            <StatusBadge status={report.status} size="sm" />
          </div>

          <div className="relative flex items-center justify-between pt-2">
            <div className="absolute left-6 right-6 top-6 h-1 bg-slate-100 -z-0" />
            {([
              { key: 'pending', label: 'Diterima', desc: 'Sistem mencatat tiket', step: 1 },
              { key: 'verified', label: 'Terverifikasi', desc: 'Disetujui Admin', step: 2 },
              { key: 'assigned', label: 'Disposisi Petugas', desc: 'Petugas diterjunkan', step: 3 },
              { key: 'completed', label: 'Selesai Tuntas', desc: 'Bukti fisik terbit', step: 4 },
            ] as const).map((st) => {
              const currentStep = report.status === 'pending' ? 1 : report.status === 'verified' ? 2 : (report.status === 'assigned' || report.status === 'in_progress') ? 3 : report.status === 'completed' ? 4 : 1;
              const isDone = st.step <= currentStep;
              const isCurrent = st.step === currentStep;

              return (
                <div key={st.key} className="relative z-10 flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono text-xs font-extrabold transition-all shadow-sm ${
                      isDone
                        ? 'bg-slate-900 text-[#D4A843] ring-4 ring-[#D4A843]/20'
                        : 'bg-white border-2 border-slate-200 text-slate-400'
                    } ${isCurrent ? 'ring-4 ring-[#D4A843]/40 border-[#D4A843] bg-slate-900 text-[#D4A843]' : ''}`}
                  >
                    {isDone ? <CheckCircle2 className="w-6 h-6 text-[#D4A843]" /> : st.step}
                  </div>
                  <span className={`text-xs font-bold mt-2 text-center ${isCurrent ? 'text-slate-950 font-extrabold' : isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                    {st.label}
                  </span>
                  <span className="hidden sm:block text-[10px] text-slate-400 font-mono text-center mt-0.5">
                    {st.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───── EXCLUSIVE STAR RATING & EVALUATION (WHEN COMPLETED) ───── */}
      {isCompleted && (
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-white to-emerald-500/10 p-6 sm:p-8 border-2 border-[#D4A843] shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D4A843] text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="font-mono text-xs font-bold text-amber-800 uppercase tracking-wider block">
                  ★ HAK EVALUASI PELAPOR ★
                </span>
                <h3 className="font-display font-extrabold text-xl text-slate-900">
                  Beri Penilaian Kinerja Petugas & Kualitas Penanganan
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Rating Anda secara langsung memengaruhi skor reputasi kinerja dinas dan petugas terkait di sistem CivicLedger.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-all hover:scale-125 focus:outline-hidden"
                  title={`${star} Bintang`}
                >
                  <Star
                    className={`w-9 h-9 transition-colors ${
                      star <= (hoverRating || userRating || 0)
                        ? 'fill-[#D4A843] text-[#D4A843] drop-shadow-sm'
                        : 'text-slate-300 hover:text-slate-400'
                    }`}
                  />
                </button>
              ))}
            </div>

            {userRating ? (
              <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Skor Anda: {userRating} dari 5 Bintang • Terima kasih!</span>
              </div>
            ) : (
              <span className="text-xs font-mono text-slate-500">
                Klik salah satu bintang untuk menyimpan evaluasi Anda
              </span>
            )}
          </div>
        </div>
      )}

      {/* ───── CITIZEN INITIAL REPORT MEDIA (PHOTOS & VIDEO) ───── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <MediaGallery
          photoUrls={report.photo_urls}
          photoUrl={report.photo_url}
          videoUrl={report.video_url}
          title="Dokumentasi Laporan Awal Warga"
          badgeLabel="Kondisi Awal"
        />
      </div>

      {/* ───── BEFORE & AFTER COMPARISON (OFFICER COMPLETION PROOFS) ───── */}
      {proofs.length > 0 && (
        <div className="bg-white rounded-3xl border border-emerald-300 p-6 sm:p-8 shadow-xs space-y-5 bg-gradient-to-b from-emerald-50/20 to-white">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-display font-extrabold text-base text-slate-900">
                Bukti Penyelesaian Resmi Petugas Lapangan
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Terverifikasi Tuntas
            </span>
          </div>

          <div className="space-y-4">
            {proofs.map((proof) => (
              <div key={proof.id} className="space-y-3">
                <MediaGallery
                  photoUrls={proof.photo_urls}
                  photoUrl={proof.photo_url}
                  videoUrl={proof.video_url}
                  title={`Bukti Kerja (${formatDateTime(proof.created_at)})`}
                  badgeLabel="Hasil Kerja"
                />
                {proof.note && (
                  <div className="p-3.5 text-xs text-slate-700 bg-emerald-50/50 border border-emerald-200 rounded-xl font-medium">
                    <span className="font-bold text-emerald-900 block mb-0.5">Catatan Petugas Lapangan:</span>
                    "{proof.note}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───── AUDIT TRAIL & STATUS LOGS (ACCORDION) ───── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 border-b border-slate-100">
          <button
            onClick={() => setShowAuditLogs(!showAuditLogs)}
            className="text-left flex items-center gap-3 flex-1 transition-colors hover:opacity-80"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#D4A843]" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-slate-900">
                Log Audit & Kronologi Real-time Penanganan ({filteredStatusLogs.length} Entri)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Rekaman setiap tahapan verifikasi dan perubahan status oleh dinas
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <DateTimeFilter
              value={logDateTimeFilter}
              onChange={setLogDateTimeFilter}
              size="sm"
              align="right"
              badgeLabel="Waktu Log"
            />
            <button
              onClick={() => setShowAuditLogs(!showAuditLogs)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
            >
              {showAuditLogs ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {showAuditLogs && (
          <div className="p-6 space-y-4">
            {filteredStatusLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 font-mono">
                {statusLogs.length === 0
                  ? 'Belum ada pergerakan status log. Laporan baru saja diterima di sistem.'
                  : 'Tidak ada log status yang sesuai dengan filter tanggal & jam terpilih.'}
              </p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {filteredStatusLogs.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-white ring-2 ring-slate-200" />
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          Status beralih ke: <strong className="text-[#0EA58D]">{STATUS_CONFIG[log.to_status]?.label || log.to_status}</strong>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                      {log.note && (
                        <p className="text-xs text-slate-600 mt-1 italic">
                          "{log.note}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ───── MAP & TIMELINE ───── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Map */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="flex items-center gap-1.5 font-bold text-slate-900">
                <MapPin className="w-4 h-4 text-rose-500" /> Lokasi Titik Geotagging
              </span>
              {wilayah && <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-800">{wilayah.name}</span>}
            </div>
            <p className="text-xs text-slate-700 font-medium mb-3">{report.address}</p>

            {report.latitude && report.longitude ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 h-48 mb-2 relative z-0">
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
              <div className="bg-slate-50 p-4 rounded-xl text-center text-xs text-slate-400 font-mono">
                Koordinat GPS tidak dicantumkan
              </div>
            )}
          </div>

          {report.latitude && report.longitude && (
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-3 border-t border-slate-100">
              <span>GPS: {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}</span>
              <a
                href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0EA58D] font-bold hover:underline flex items-center gap-1"
              >
                <span>Buka Rute Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Help & Escalation Box */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-[#D4A843] font-mono text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4" />
              Pusat Dukungan Pelapor
            </div>
            <h4 className="font-display font-extrabold text-lg text-white">
              Butuh Eskalasi Cepat?
            </h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Jika laporan Anda belum mengalami pergerakan status lebih dari 48 jam kerja, sistem CivicLedger otomatis menaikkan flag prioritas ke Command Center kota.
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-white/10 text-xs font-mono text-slate-300">
            <div className="flex items-center justify-between">
              <span>Jalur Pengaduan:</span>
              <strong className="text-white">Dinas Tata Kota & Bina Marga</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>SLA Target Verifikasi:</span>
              <strong className="text-[#D4A843]">Maks. 24 Jam Kerja</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ───── COMMENTS & INTERACTION (WITH AUTHOR BADGE) ───── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h3 className="font-display font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-slate-700" />
              Diskusi & Tambahan Informasi ({filteredComments.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sebagai pelapor resmi, tanggapan Anda akan ditandai dengan badge khusus.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <DateTimeFilter
              value={commentDateTimeFilter}
              onChange={setCommentDateTimeFilter}
              size="sm"
              align="right"
              badgeLabel="Waktu Diskusi"
            />
            <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
              <ThumbsUp className="w-4 h-4 text-amber-600" />
              <span><strong>{upvoteCount}</strong> Dukungan</span>
            </div>
          </div>
        </div>

        {/* Comment Form */}
        <form onSubmit={onComment} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Tulis informasi tambahan atau update kondisi terbaru..."
              className="input text-xs flex-1 rounded-xl"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-3 pt-2">
          {filteredComments.map((comment) => {
            const isMe = comment.user_id === currentUser?.id;
            return (
              <div
                key={comment.id}
                className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                  isMe
                    ? 'bg-amber-500/5 border-[#D4A843]/40'
                    : 'bg-slate-50/80 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {comment.profile?.full_name || 'Warga'}
                    </span>
                    {isMe && (
                      <span className="px-2 py-0.5 rounded-full bg-[#D4A843] text-slate-950 text-[10px] font-extrabold font-mono">
                        👑 Anda (Pelapor)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {timeAgo(comment.created_at)}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">{comment.content}</p>
              </div>
            );
          })}

          {filteredComments.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6 font-mono">
              {comments.length === 0
                ? 'Belum ada komentar untuk laporan Anda.'
                : 'Tidak ada komentar yang sesuai dengan filter tanggal & jam terpilih.'}
            </p>
          )}
        </div>
      </div>

      {/* Official Receipt Modal */}
      <ReceiptModal
        report={report}
        reporter={reporter}
        wilayah={wilayah}
        assignedPetugas={assignedPetugas}
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
      />

    </div>
  );
}
