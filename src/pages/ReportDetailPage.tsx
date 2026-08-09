import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadPhoto, compressImage } from '../lib/storage';
import {
  Report, StatusLog, CompletionProof, Profile, Wilayah,
  ReportStatus, ReportPriority, Role,
} from '../types';
import { StatusBadge, CategoryBadge, PriorityBadge, RoleBadge } from '../components/Badges';
import { STATUS_CONFIG, STATUS_ORDER, CATEGORY_CONFIG, formatDateTime, timeAgo } from '../lib/constants';
import {
  ArrowLeft, MapPin, Calendar, Camera, ThumbsUp, MessageSquare,
  Star, Send, Loader2, AlertCircle, CheckCircle2, XCircle,
  UserCheck, Loader, Clock, X, ShieldCheck, Wrench,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Clock, CheckCircle2, UserCheck, Loader, XCircle,
};

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [report, setReport] = useState<Report | null>(null);
  const [reporter, setReporter] = useState<Profile | null>(null);
  const [assignedPetugas, setAssignedPetugas] = useState<Profile | null>(null);
  const [wilayah, setWilayah] = useState<Wilayah | null>(null);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [proofs, setProofs] = useState<CompletionProof[]>([]);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [comments, setComments] = useState<Array<{ id: string; content: string; created_at: string; user_id: string; profile?: Profile }>>([]);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin action states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [petugasList, setPetugasList] = useState<Profile[]>([]);
  const [selectedPetugas, setSelectedPetugas] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Petugas proof upload
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofNote, setProofNote] = useState('');

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data: r } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!r) {
      setLoading(false);
      return;
    }
    setReport(r as Report);

    // Fetch related data in parallel
    const [reporterRes, petugasRes, wilayahRes, logsRes, proofsRes, upvotesRes, commentsRes, ratingRes] = await Promise.all([
      r.reporter_id ? supabase.from('profiles').select('*').eq('id', r.reporter_id).maybeSingle() : Promise.resolve({ data: null }),
      r.assigned_petugas_id ? supabase.from('profiles').select('*').eq('id', r.assigned_petugas_id).maybeSingle() : Promise.resolve({ data: null }),
      r.wilayah_id ? supabase.from('wilayah').select('*').eq('id', r.wilayah_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('status_logs').select('*').eq('report_id', id).order('created_at', { ascending: true }),
      supabase.from('completion_proofs').select('*').eq('report_id', id).order('created_at', { ascending: false }),
      supabase.from('upvotes').select('id, user_id').eq('report_id', id),
      supabase.from('comments').select('*').eq('report_id', id).order('created_at', { ascending: false }),
      profile ? supabase.from('ratings').select('score').eq('report_id', id).eq('user_id', profile.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    setReporter(reporterRes.data as Profile | null);
    setAssignedPetugas(petugasRes.data as Profile | null);
    setWilayah(wilayahRes.data as Wilayah | null);
    setStatusLogs(logsRes.data as StatusLog[] || []);
    setProofs(proofsRes.data as CompletionProof[] || []);

    const upvotes = upvotesRes.data || [];
    setUpvoteCount(upvotes.length);
    setHasUpvoted(profile ? upvotes.some((u: any) => u.user_id === profile.id) : false);

    const commentsData = commentsRes.data || [];
    // Fetch comment profiles
    const commentProfiles = await Promise.all(
      (commentsData as any[]).map(async (c) => {
        const { data: p } = await supabase.from('profiles').select('full_name, role').eq('id', c.user_id).maybeSingle();
        return { ...c, profile: p };
      })
    );
    setComments(commentProfiles);

    if (ratingRes.data) {
      setUserRating((ratingRes.data as any).score);
    }

    setLoading(false);
  }, [id, profile]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleUpvote = async () => {
    if (!profile || !report) return;
    if (hasUpvoted) {
      await supabase.from('upvotes').delete().eq('report_id', report.id).eq('user_id', profile.id);
      setHasUpvoted(false);
      setUpvoteCount((c) => c - 1);
    } else {
      await supabase.from('upvotes').insert({ report_id: report.id, user_id: profile.id });
      setHasUpvoted(true);
      setUpvoteCount((c) => c + 1);
    }
  };

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
    }
  };

  const handleRating = async (score: number) => {
    if (!profile || !report) return;
    setUserRating(score);
    await supabase
      .from('ratings')
      .upsert({ report_id: report.id, user_id: profile.id, score }, { onConflict: 'report_id, user_id' });
    fetchAll();
  };

  // Admin actions
  const handleVerify = async () => {
    if (!report) return;
    setActionLoading(true);
    await supabase.from('reports').update({ status: 'verified' }).eq('id', report.id);
    setActionLoading(false);
    fetchAll();
  };

  const handleReject = async () => {
    if (!report || !rejectReason.trim()) return;
    setActionLoading(true);
    await supabase
      .from('reports')
      .update({ status: 'rejected', rejected_reason: rejectReason.trim() })
      .eq('id', report.id);
    setActionLoading(false);
    setShowRejectModal(false);
    setRejectReason('');
    fetchAll();
  };

  const loadPetugas = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'petugas')
      .eq('is_active', true)
      .order('full_name');
    if (data) setPetugasList(data as Profile[]);
  };

  const handleAssign = async () => {
    if (!report || !selectedPetugas) return;
    setActionLoading(true);
    await supabase
      .from('reports')
      .update({
        status: 'assigned',
        assigned_petugas_id: selectedPetugas,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', report.id);
    setActionLoading(false);
    setShowAssignModal(false);
    setSelectedPetugas('');
    fetchAll();
  };

  // Petugas actions
  const handleStartTask = async () => {
    if (!report) return;
    setActionLoading(true);
    await supabase
      .from('reports')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', report.id);
    setActionLoading(false);
    fetchAll();
  };

  const handleCompleteTask = async () => {
    if (!report || !proofPhoto) return;
    setActionLoading(true);
    const photoUrl = await uploadPhoto(proofPhoto, 'proofs');
    if (!photoUrl) {
      setError('Gagal mengunggah bukti foto');
      setActionLoading(false);
      return;
    }
    await supabase.from('reports').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', report.id);

    await supabase.from('completion_proofs').insert({
      report_id: report.id,
      photo_url: photoUrl,
      note: proofNote || null,
      uploaded_by: profile?.id,
    });

    setActionLoading(false);
    setProofPhoto(null);
    setProofPreview(null);
    setProofNote('');
    fetchAll();
  };

  const handleProofPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setProofPhoto(compressed);
    setProofPreview(URL.createObjectURL(compressed));
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="skeleton h-8 w-32 mb-4" />
        <div className="skeleton h-64 mb-4" />
        <div className="skeleton h-32" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-neutral-500">Laporan tidak ditemukan</p>
        <Link to="/app" className="btn-primary mt-4">Kembali</Link>
      </div>
    );
  }

  const canAdminAct = profile?.role === 'admin';
  const isAssignedPetugas = profile?.id === report.assigned_petugas_id;
  const isReporter = profile?.id === report.reporter_id;
  const canRate = isReporter && report.status === 'completed';

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <button onClick={() => navigate(-1)} className="btn-ghost btn-sm mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-error-50 border border-error-200 text-error-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">{report.ticket_id}</span>
          <StatusBadge status={report.status} />
          <CategoryBadge category={report.category} />
          <PriorityBadge priority={report.priority} />
        </div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-neutral-900 mb-2">{report.title}</h1>
        <p className="text-neutral-600 text-sm leading-relaxed whitespace-pre-wrap">{report.description}</p>
      </div>

      {/* Photo */}
      {report.photo_url && (
        <div className="card overflow-hidden mb-4">
          <img src={report.photo_url} alt={report.title} className="w-full max-h-96 object-cover" />
        </div>
      )}

      {/* Info grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
            <MapPin className="w-3.5 h-3.5" /> Lokasi
          </div>
          <p className="text-sm text-neutral-900 font-medium">{report.address}</p>
          {report.latitude && report.longitude && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=17/${report.latitude}/${report.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block"
            >
              Lihat di peta →
            </a>
          )}
          {wilayah && <p className="text-xs text-neutral-500 mt-1">{wilayah.name}</p>}
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
            <Calendar className="w-3.5 h-3.5" /> Waktu
          </div>
          <p className="text-sm text-neutral-900 font-medium">{formatDateTime(report.created_at)}</p>
          {report.completed_at && (
            <p className="text-xs text-success-600 mt-1">Selesai: {formatDateTime(report.completed_at)}</p>
          )}
        </div>
      </div>

      {/* Reporter & Petugas info */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm">
              {reporter?.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-900">{reporter?.full_name || 'Tidak diketahui'}</div>
              <div className="text-xs text-neutral-500">Pelapor</div>
            </div>
          </div>
          {assignedPetugas && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-success-500 to-success-700 flex items-center justify-center text-white font-semibold text-sm">
                {assignedPetugas.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-900">{assignedPetugas.full_name}</div>
                <div className="text-xs text-neutral-500">Petugas Penanggung Jawab</div>
              </div>
            </div>
          )}
        </div>
        {report.rejected_reason && (
          <div className="mt-3 p-3 rounded-xl bg-error-50 border border-error-200">
            <div className="text-xs font-semibold text-error-700 mb-1">Alasan Penolakan</div>
            <p className="text-sm text-error-600">{report.rejected_reason}</p>
          </div>
        )}
      </div>

      {/* Status timeline */}
      <div className="card p-5 mb-4">
        <h3 className="font-semibold text-neutral-900 mb-4">Riwayat Status</h3>
        <div className="space-y-1">
          {STATUS_ORDER.map((status) => {
            const log = statusLogs.find((l) => l.to_status === status);
            const isReached = statusLogs.some((l) => l.to_status === status) || report.status === status;
            const currentIdx = STATUS_ORDER.indexOf(report.status as ReportStatus);
            const statusIdx = STATUS_ORDER.indexOf(status);
            const isPast = statusIdx < currentIdx;
            const isCurrent = status === report.status;
            const cfg = STATUS_CONFIG[status];
            const Icon = ICON_MAP[cfg.icon] || Clock;

            if (report.status === 'rejected' && status !== 'pending') return null;

            return (
              <div key={status} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCurrent ? 'bg-primary-600 text-white' : isPast ? 'bg-success-100 text-success-600' : 'bg-neutral-100 text-neutral-400'
                  }`}>
                    <Icon className={`w-4 h-4 ${isCurrent ? 'animate-pulse' : ''}`} />
                  </div>
                  {statusIdx < STATUS_ORDER.length - 1 && (
                    <div className={`w-0.5 h-8 ${isPast ? 'bg-success-200' : 'bg-neutral-200'}`} />
                  )}
                </div>
                <div className="pt-1 pb-8">
                  <div className={`text-sm font-semibold ${isReached ? 'text-neutral-900' : 'text-neutral-400'}`}>
                    {cfg.label}
                  </div>
                  {log && (
                    <div className="text-xs text-neutral-500 mt-0.5">{formatDateTime(log.created_at)}</div>
                  )}
                </div>
              </div>
            );
          })}
          {report.status === 'rejected' && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-error-100 text-error-600 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-4 h-4" />
              </div>
              <div className="pt-1">
                <div className="text-sm font-semibold text-error-700">Ditolak</div>
                {statusLogs.find((l) => l.to_status === 'rejected') && (
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {formatDateTime(statusLogs.find((l) => l.to_status === 'rejected')!.created_at)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin actions */}
      {canAdminAct && report.status === 'pending' && (
        <div className="card p-4 mb-4 bg-primary-50/50 border-primary-200">
          <h3 className="font-semibold text-neutral-900 mb-3 text-sm">Aksi Admin</h3>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleVerify} disabled={actionLoading} className="btn-primary btn-sm">
              <CheckCircle2 className="w-4 h-4" /> Verifikasi
            </button>
            <button onClick={() => setShowRejectModal(true)} disabled={actionLoading} className="btn-danger btn-sm">
              <XCircle className="w-4 h-4" /> Tolak
            </button>
          </div>
        </div>
      )}

      {canAdminAct && report.status === 'verified' && (
        <div className="card p-4 mb-4 bg-accent-50/50 border-accent-200">
          <h3 className="font-semibold text-neutral-900 mb-3 text-sm">Aksi Admin</h3>
          <button onClick={() => { loadPetugas(); setShowAssignModal(true); }} className="btn-accent btn-sm">
            <UserCheck className="w-4 h-4" /> Tugaskan Petugas
          </button>
        </div>
      )}

      {/* Petugas actions */}
      {isAssignedPetugas && report.status === 'assigned' && (
        <div className="card p-4 mb-4 bg-success-50/50 border-success-200">
          <h3 className="font-semibold text-neutral-900 mb-3 text-sm">Aksi Petugas</h3>
          <button onClick={handleStartTask} disabled={actionLoading} className="btn-primary btn-sm">
            <Loader className="w-4 h-4" /> Mulai Kerjakan
          </button>
        </div>
      )}

      {isAssignedPetugas && report.status === 'in_progress' && (
        <div className="card p-4 mb-4 bg-success-50/50 border-success-200">
          <h3 className="font-semibold text-neutral-900 mb-3 text-sm">Selesaikan Tugas</h3>
          <p className="text-xs text-neutral-600 mb-3">Unggah bukti foto penyelesaian</p>
          {proofPreview ? (
            <div className="relative mb-3">
              <img src={proofPreview} alt="Bukti" className="w-full h-48 object-cover rounded-xl" />
              <button
                onClick={() => { setProofPhoto(null); setProofPreview(null); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-neutral-900/60 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-neutral-300 rounded-xl cursor-pointer hover:border-success-400 mb-3">
              <Camera className="w-6 h-6 text-neutral-400 mb-1" />
              <span className="text-xs text-neutral-500">Unggah bukti foto</span>
              <input type="file" accept="image/*" capture="environment" onChange={handleProofPhotoChange} className="hidden" />
            </label>
          )}
          <input
            type="text"
            value={proofNote}
            onChange={(e) => setProofNote(e.target.value)}
            placeholder="Catatan penyelesaian (opsional)"
            className="input mb-3"
          />
          <button onClick={handleCompleteTask} disabled={actionLoading || !proofPhoto} className="btn-primary btn-sm">
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Tandai Selesai
          </button>
        </div>
      )}

      {/* Completion proofs */}
      {proofs.length > 0 && (
        <div className="card p-5 mb-4">
          <h3 className="font-semibold text-neutral-900 mb-3">Bukti Penyelesaian</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {proofs.map((proof) => (
              <div key={proof.id}>
                <img src={proof.photo_url} alt="Bukti" className="w-full h-40 object-cover rounded-xl" />
                {proof.note && <p className="text-xs text-neutral-600 mt-1.5">{proof.note}</p>}
                <p className="text-xs text-neutral-400 mt-0.5">{formatDateTime(proof.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating */}
      {canRate && (
        <div className="card p-5 mb-4 bg-accent-50/30 border-accent-200">
          <h3 className="font-semibold text-neutral-900 mb-2">Beri Rating Penyelesaian</h3>
          <p className="text-sm text-neutral-600 mb-3">Bagaimana kualitas penanganan laporan ini?</p>
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoverRating || userRating)
                      ? 'fill-accent-400 text-accent-400'
                      : 'text-neutral-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Social: upvote & comments */}
      <div className="card p-5">
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-neutral-100">
          <button
            onClick={handleUpvote}
            disabled={!profile}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              hasUpvoted
                ? 'bg-primary-50 text-primary-700'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${hasUpvoted ? 'fill-primary-500 text-primary-500' : ''}`} />
            {upvoteCount} Dukung
          </button>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <MessageSquare className="w-4 h-4" />
            {comments.length} Komentar
          </div>
        </div>

        {/* Comment form */}
        {profile ? (
          <form onSubmit={handleComment} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Tulis komentar..."
                className="input flex-1"
              />
              <button type="submit" disabled={!newComment.trim()} className="btn-primary">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-neutral-500 mb-4">
            <Link to="/auth" className="text-primary-600 font-medium">Masuk</Link> untuk berkomentar
          </p>
        )}

        {/* Comments list */}
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                {comment.profile?.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-neutral-50 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-neutral-900">{comment.profile?.full_name || 'Tidak diketahui'}</span>
                    <span className="text-xs text-neutral-400">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-neutral-700">{comment.content}</p>
                </div>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-4">Belum ada komentar</p>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-neutral-900/40 z-50 flex items-center justify-center p-4" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-neutral-900 mb-3">Tolak Laporan</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Alasan penolakan..."
              rows={3}
              className="input resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowRejectModal(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || actionLoading} className="btn-danger flex-1">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-neutral-900/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-neutral-900 mb-3">Tugaskan Petugas</h3>
            {petugasList.length === 0 ? (
              <p className="text-sm text-neutral-500 mb-3">Belum ada petugas terdaftar. Tambahkan petugas di halaman kelola petugas.</p>
            ) : (
              <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                {petugasList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPetugas(p.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      selectedPetugas === p.id ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-success-500 to-success-700 flex items-center justify-center text-white font-semibold text-sm">
                      {p.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-neutral-900 truncate">{p.full_name}</div>
                      <div className="text-xs text-neutral-500">{p.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowAssignModal(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleAssign} disabled={!selectedPetugas || actionLoading} className="btn-primary flex-1">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tugaskan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
