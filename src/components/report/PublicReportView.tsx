import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Report, Profile, Wilayah, StatusLog, CompletionProof } from '../../types';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../Badges';
import { MapView } from '../MapComponents';
import { STATUS_CONFIG, formatDateTime, timeAgo, getEstimatedCompletionInfo } from '../../lib/constants';
import { DateTimeFilter, DateTimeFilterState, INITIAL_DATE_TIME_FILTER, matchesDateTimeFilter } from '../DateTimeFilter';
import {
  ArrowLeft, MapPin, Calendar, ThumbsUp, MessageSquare,
  Send, AlertCircle, CheckCircle2, XCircle, Share2, Copy,
  ExternalLink, Eye, Shield, Radio, Sparkles, Layers,
  ChevronRight, ArrowRight, UserCheck, Check, Clock
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { MediaGallery } from './MediaGallery';
import { CivicBadge3D } from '../CivicBadge3D';

interface PublicReportViewProps {
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
  currentUser: Profile | null;
  onUpvote: () => void;
  onComment: (e: React.FormEvent) => void;
  error: string | null;
}

export function PublicReportView({
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
  currentUser,
  onUpvote,
  onComment,
  error,
}: PublicReportViewProps) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [commentDateTimeFilter, setCommentDateTimeFilter] = useState<DateTimeFilterState>(INITIAL_DATE_TIME_FILTER);
  const [copied, setCopied] = useState(false);
  const slaInfo = getEstimatedCompletionInfo(report.created_at, report.category);

  const filteredComments = useMemo(() => {
    return comments.filter((c) => matchesDateTimeFilter(c.created_at, commentDateTimeFilter));
  }, [comments, commentDateTimeFilter]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    addToast('success', 'Tautan laporan berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up pb-16">
      
      {/* ───── NAVIGATION & TOP CALLOUT ───── */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Tersalin' : 'Bagikan'}</span>
          </button>

          <Link
            to="/app/create-report"
            className="px-4 py-1.5 rounded-full bg-[#111827] hover:bg-[#1F2937] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>Laporkan Isu Serupa</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ───── CIVIC TRANSPARENCY NOTICE BANNER ───── */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-lg border border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#0EA58D]/20 text-[#0EA58D] border border-[#0EA58D]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#0EA58D]">
                PORTAL TRANSPARANSI PUBLIK
              </span>
              {report.is_anonymous && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20 text-white flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  Anonim
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Laporan ini bersifat terbuka dan dapat diawasi bersama oleh seluruh warga kota.
            </p>
          </div>
        </div>

        {!currentUser && (
          <Link
            to="/auth"
            className="px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold font-display uppercase tracking-wider transition-all self-start sm:self-auto flex-shrink-0 shadow-md"
          >
            Masuk / Buat Akun
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ───── MAIN REPORT HEADER CARD ───── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-extrabold px-3 py-1 bg-slate-900 text-white rounded-lg shadow-xs">
              {report.ticket_id}
            </span>
            <StatusBadge status={report.status} />
            <CategoryBadge category={report.category} />
            <PriorityBadge priority={report.priority} />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Dilaporkan: {formatDateTime(report.created_at)}</span>
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
            {report.title}
          </h1>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed whitespace-pre-wrap">
            {report.description}
          </p>
        </div>

        {/* Civic Verification & 3D Holographic Credentials Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CivicBadge3D
              badgeType={report.is_anonymous ? 'terverifikasi' : 'warga_teladan'}
              size="sm"
              interactive={true}
              showLabel={false}
            />
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <span>{report.is_anonymous ? 'Warga Terverifikasi (Anonim)' : (reporter?.full_name || 'Warga Terverifikasi')}</span>
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  {report.is_anonymous ? 'Tier II • Zamrud' : 'Tier III • Emas'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Kredensial 3D tervalidasi • Klik lencana untuk inspeksi ledger SHA-256
              </p>
            </div>
          </div>

          {assignedPetugas ? (
            <div className="flex items-center gap-3 bg-amber-50/70 px-3.5 py-2 rounded-2xl border border-amber-200/80">
              <CivicBadge3D
                badgeType="petugas_siaga"
                size="sm"
                interactive={true}
                showLabel={false}
              />
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-700 font-bold block">Petugas Penanganan</span>
                <span className="text-xs font-bold text-slate-900 block">{assignedPetugas.full_name}</span>
              </div>
            </div>
          ) : wilayah ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <span className="text-slate-400">Wilayah:</span>
              <strong className="text-slate-800 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/60">{wilayah.name}</strong>
            </div>
          ) : null}
        </div>
      </div>

      {/* ───── SLA TARGET & COUNTDOWN CARD ───── */}
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
                  {report.status === 'completed' ? 'Target SLA Tercapai' : 'Estimasi Standar Penanganan (SLA)'}
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

          {report.is_anonymous && (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 bg-slate-900 text-white rounded-full self-start sm:self-auto shadow-xs">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Laporan Anonim</span>
            </span>
          )}
        </div>
      )}

      {/* ───── VISUAL PROGRESS TRACKER ───── */}
      {report.status === 'rejected' ? (
        <div className="rounded-2xl p-5 bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <XCircle className="w-5 h-5 text-rose-600" />
            <span>Laporan Ditolak oleh Administrator Kota</span>
          </div>
          {report.rejected_reason && (
            <p className="text-xs text-rose-700 pl-7">
              Alasan: "{report.rejected_reason}"
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-400 uppercase tracking-wider">
              // TAHAPAN PENANGANAN DINAS TERKAIT //
            </span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
              {STATUS_CONFIG[report.status].label}
            </span>
          </div>

          <div className="relative flex items-center justify-between pt-2">
            <div className="absolute left-6 right-6 top-6 h-1 bg-slate-100 -z-0" />
            {([
              { key: 'pending', label: 'Diterima', step: 1 },
              { key: 'verified', label: 'Terverifikasi', step: 2 },
              { key: 'assigned', label: 'Ditugaskan', step: 3 },
              { key: 'completed', label: 'Tuntas Selesai', step: 4 },
            ] as const).map((st) => {
              const currentStep = report.status === 'pending' ? 1 : report.status === 'verified' ? 2 : (report.status === 'assigned' || report.status === 'in_progress') ? 3 : report.status === 'completed' ? 4 : 1;
              const isDone = st.step <= currentStep;
              const isCurrent = st.step === currentStep;

              return (
                <div key={st.key} className="relative z-10 flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-mono text-xs font-extrabold transition-all shadow-xs ${
                      isDone
                        ? 'bg-slate-900 text-white ring-4 ring-slate-100'
                        : 'bg-white border-2 border-slate-200 text-slate-400'
                    } ${isCurrent ? 'ring-4 ring-[#0EA58D]/30 border-[#0EA58D] text-[#0EA58D]' : ''}`}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5 text-[#0EA58D]" /> : st.step}
                  </div>
                  <span className={`text-xs font-bold mt-2 text-center ${isCurrent ? 'text-[#0EA58D]' : isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                    {st.label}
                  </span>
                </div>
              );
            })}
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
          badgeLabel="Kondisi Lapangan"
        />
      </div>

      {/* ───── BEFORE & AFTER COMPARISON (OFFICER COMPLETION PROOFS) ───── */}
      {proofs.length > 0 && (
        <div className="bg-white rounded-3xl border border-emerald-300 p-6 sm:p-8 shadow-xs space-y-5 bg-gradient-to-b from-emerald-50/20 to-white">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base text-slate-900">
                  Dokumentasi Bukti Pengerjaan Tuntas
                </h3>
                <p className="text-xs text-slate-500">
                  Transparansi bukti penanganan resmi oleh dinas dan petugas lapangan
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full font-mono text-xs font-bold border border-emerald-200">
              ✓ Telah Tuntas Dikerjakan
            </span>
          </div>

          <div className="space-y-4">
            {proofs.map((proof) => (
              <div key={proof.id} className="space-y-3">
                <MediaGallery
                  photoUrls={proof.photo_urls}
                  photoUrl={proof.photo_url}
                  videoUrl={proof.video_url}
                  title={`Bukti Resmi Petugas (${formatDateTime(proof.created_at)})`}
                  badgeLabel="Tuntas"
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

      {/* ───── LOCATION & MAP SECTION ───── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Map */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="flex items-center gap-1.5 font-bold text-slate-900">
                <MapPin className="w-4 h-4 text-rose-500" /> Titik Lokasi Masalah
              </span>
              {wilayah && <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-800">{wilayah.name}</span>}
            </div>
            <p className="text-xs text-slate-700 font-medium mb-3">{report.address || 'Alamat lokasi tercatat'}</p>

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
                Koordinat GPS tidak ditentukan
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
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Timeline details & Officer */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 font-bold uppercase tracking-wider font-mono">
              <Calendar className="w-4 h-4 text-slate-700" /> Histori Penanganan Waktu
            </div>
            
            <div className="space-y-2.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Tanggal Registrasi</span>
                <span className="text-xs font-bold text-slate-900">{formatDateTime(report.created_at)}</span>
              </div>
              
              {report.started_at && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Mulai Ditangani Lapangan</span>
                  <span className="text-xs font-bold text-slate-900">{formatDateTime(report.started_at)}</span>
                </div>
              )}
              
              {report.completed_at && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-mono text-emerald-700 uppercase block font-bold">Waktu Penyelesaian Resmi</span>
                  <span className="text-xs font-bold text-emerald-800">{formatDateTime(report.completed_at)}</span>
                </div>
              )}
            </div>
          </div>

          {assignedPetugas && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono">Dinas/Petugas:</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">{assignedPetugas.full_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* ───── CITIZEN ACTIONS: UPVOTE & DISCUSSION ───── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
        
        {/* Support Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h3 className="font-display font-extrabold text-lg text-slate-900">
              Dukungan Warga & Solidaritas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Semakin banyak dukungan, semakin tinggi prioritas penanganan oleh dinas terkait.
            </p>
          </div>

          <button
            onClick={onUpvote}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
              hasUpvoted
                ? 'bg-amber-500 text-slate-950 font-extrabold'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${hasUpvoted ? 'fill-slate-950 text-slate-950' : ''}`} />
            <span>{hasUpvoted ? 'Telah Didukung' : 'Dukung Laporan Ini'} ({upvoteCount})</span>
          </button>
        </div>

        {/* Discussion Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-700" />
              <h4 className="font-display font-bold text-base text-slate-900">
                Diskusi & Informasi Tambahan Warga ({filteredComments.length})
              </h4>
            </div>

            <DateTimeFilter
              value={commentDateTimeFilter}
              onChange={setCommentDateTimeFilter}
              size="sm"
              align="right"
              badgeLabel="Waktu Diskusi"
            />
          </div>

          {/* Comment Form */}
          {currentUser ? (
            <form onSubmit={onComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Tulis informasi tambahan atau tanggapan terkait fasilitas ini..."
                className="input text-xs flex-1 rounded-xl"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-600">
                Ingin memberikan tanggapan atau informasi lapangan tambahan?
              </span>
              <Link
                to="/auth"
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex-shrink-0"
              >
                Masuk untuk Berkomentar
              </Link>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-3 pt-2">
            {filteredComments.map((comment) => (
              <div key={comment.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {comment.profile?.full_name || 'Warga'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {timeAgo(comment.created_at)}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{comment.content}</p>
              </div>
            ))}

            {filteredComments.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6 font-mono">
                {comments.length === 0
                  ? 'Belum ada tanggapan untuk laporan ini. Jadilah yang pertama memberikan info tambahan!'
                  : 'Tidak ada komentar yang sesuai dengan filter tanggal & jam terpilih.'}
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
