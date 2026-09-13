import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Report, StatusLog, CompletionProof, Profile, Wilayah,
} from '../types';
import { normalizeReportStatus } from '../lib/constants';
import { Loader2, AlertCircle, ArrowLeft, Eye, ShieldCheck, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { PublicReportView } from '../components/report/PublicReportView';
import { OwnerReportView } from '../components/report/OwnerReportView';
import { sanitizeText, validateSafeInput, rateLimiter, isAccountActive } from '../utils/security';

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { addToast } = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [reporter, setReporter] = useState<Profile | null>(null);
  const [assignedPetugas, setAssignedPetugas] = useState<Profile | null>(null);
  const [wilayah, setWilayah] = useState<Wilayah | null>(null);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [proofs, setProofs] = useState<CompletionProof[]>([]);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toggle to let the report owner preview the public view
  const [isPublicPreview, setIsPublicPreview] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data: r, error: reportErr } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (reportErr || !r) {
      setError('Laporan tidak ditemukan atau telah dihapus.');
      setLoading(false);
      return;
    }

    const cleanReport: Report = {
      ...(r as any),
      status: normalizeReportStatus((r as any).status),
    };
    setReport(cleanReport);

    // Parallel related fetches
    const [reporterRes, petugasRes, wilayahRes, logsRes, proofsRes, upvotesRes, commentsRes, ratingRes] = await Promise.all([
      cleanReport.reporter_id ? supabase.from('profiles').select('*').eq('id', cleanReport.reporter_id).maybeSingle() : Promise.resolve({ data: null }),
      cleanReport.assigned_petugas_id ? supabase.from('profiles').select('*').eq('id', cleanReport.assigned_petugas_id).maybeSingle() : Promise.resolve({ data: null }),
      cleanReport.wilayah_id ? supabase.from('wilayah').select('*').eq('id', cleanReport.wilayah_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('status_logs').select('*').eq('report_id', id).order('created_at', { ascending: true }),
      supabase.from('completion_proofs').select('*').eq('report_id', id).order('created_at', { ascending: false }),
      supabase.from('upvotes').select('id, user_id').eq('report_id', id),
      supabase.from('comments').select('*').eq('report_id', id).order('created_at', { ascending: false }),
      profile ? supabase.from('ratings').select('score').eq('report_id', id).eq('user_id', profile.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    setReporter(reporterRes.data as Profile | null);
    setAssignedPetugas(petugasRes.data as Profile | null);
    setWilayah(wilayahRes.data as Wilayah | null);
    setStatusLogs((logsRes.data as StatusLog[]) || []);
    setProofs((proofsRes.data as CompletionProof[]) || []);

    const upvotes = upvotesRes.data || [];
    setUpvoteCount(upvotes.length);
    setHasUpvoted(profile ? upvotes.some((u: any) => u.user_id === profile.id) : false);

    const commentsData = commentsRes.data || [];
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

  // Set Page Title
  useEffect(() => {
    if (report) {
      document.title = `${report.ticket_id} - ${report.title} | CivicLedger`;
    }
  }, [report]);

  const handleUpvote = async () => {
    if (!profile) {
      addToast('warning', 'Silakan masuk terlebih dahulu untuk memberikan dukungan');
      return;
    }
    if (!report) return;

    if (hasUpvoted) {
      await supabase.from('upvotes').delete().eq('report_id', report.id).eq('user_id', profile.id);
      setHasUpvoted(false);
      setUpvoteCount((c) => Math.max(0, c - 1));
      addToast('info', 'Dukungan dibatalkan.');
    } else {
      await supabase.from('upvotes').insert({ report_id: report.id, user_id: profile.id });
      setHasUpvoted(true);
      setUpvoteCount((c) => c + 1);
      addToast('success', 'Terima kasih telah mendukung laporan ini!');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      addToast('warning', 'Silakan masuk terlebih dahulu untuk berkomentar');
      return;
    }
    if (!isAccountActive(profile)) {
      addToast('error', 'Akun Anda dinonaktifkan oleh Administrator. Tidak dapat berkomentar.');
      return;
    }
    if (!report || !newComment.trim()) return;

    // Rate limiting: Max 8 comments per 2 minutes
    const rateCheck = rateLimiter.checkRateLimit('post_comment', 8, 2 * 60 * 1000);
    if (!rateCheck.allowed) {
      addToast('warning', `Batas komentar tercapai. Silakan tunggu ${rateCheck.waitSeconds} detik.`);
      return;
    }

    // Input security verification
    const inputCheck = validateSafeInput(newComment);
    if (!inputCheck.isSafe) {
      addToast('error', `Tanggapan tidak valid: ${inputCheck.threat}`);
      return;
    }

    const cleanContent = sanitizeText(newComment.trim());
    if (!cleanContent) {
      addToast('warning', 'Tanggapan tidak boleh kosong.');
      return;
    }

    const { data, error: commentError } = await supabase
      .from('comments')
      .insert({ report_id: report.id, user_id: profile.id, content: cleanContent })
      .select('id, content, created_at, user_id')
      .single();

    if (data) {
      setComments([{ ...data, profile }, ...comments]);
      setNewComment('');
      addToast('success', 'Tanggapan berhasil dikirim.');
    } else if (commentError) {
      addToast('error', 'Gagal mengirim komentar: ' + commentError.message);
    }
  };

  const handleRating = async (score: number) => {
    if (!profile || !report) return;

    if (!isAccountActive(profile)) {
      addToast('error', 'Akun Anda dinonaktifkan. Tidak dapat memberikan rating.');
      return;
    }

    // Security Business Logic: Only completed reports can be rated
    if (report.status !== 'completed') {
      addToast('warning', 'Hanya laporan yang telah selesai ditangani yang dapat dinilai.');
      return;
    }

    // Security Business Logic: Only original reporter or admin can rate
    if (report.reporter_id !== profile.id && profile.role !== 'admin') {
      addToast('error', 'Hanya warga pelapor yang berhak menilai hasil pengerjaan tiket ini.');
      return;
    }

    setUserRating(score);
    const { error: ratingError } = await supabase
      .from('ratings')
      .upsert({ report_id: report.id, user_id: profile.id, score }, { onConflict: 'report_id, user_id' });

    if (ratingError) {
      addToast('error', 'Gagal menyimpan rating: ' + ratingError.message);
    } else {
      addToast('success', `Terima kasih! Anda memberikan rating ${score} bintang atas kinerja dinas.`);
      fetchAll();
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <Loader2 className="w-10 h-10 text-[#D4A843] animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500 font-mono">Memuat lembar data laporan kota...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="font-display font-extrabold text-xl text-slate-900">Laporan Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">
          Nomor tiket yang Anda tuju tidak terdaftar di sistem atau telah dihapus.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow-sm hover:bg-slate-800 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
    );
  }

  // Check if current user is the owner (creator/reporter) of this report
  const isReporter = profile !== null && profile.id === report.reporter_id;

  return (
    <div className="min-h-screen">
      
      {/* If author is in public preview mode, show a floating return banner */}
      {isReporter && isPublicPreview && (
        <div className="sticky top-20 z-40 max-w-4xl mx-auto mb-4 p-3.5 rounded-2xl bg-slate-900 text-white shadow-xl border border-white/15 flex items-center justify-between gap-4 animate-slide-down">
          <div className="flex items-center gap-2.5 text-xs">
            <Eye className="w-4 h-4 text-[#D4A843]" />
            <span>
              <strong>Mode Preview Publik Aktif</strong> — Ini adalah tampilan yang dilihat oleh masyarakat umum saat membuka tiket Anda.
            </span>
          </div>
          <button
            onClick={() => setIsPublicPreview(false)}
            className="px-3.5 py-1.5 rounded-xl bg-[#D4A843] hover:bg-[#c29636] text-slate-950 text-xs font-extrabold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kembali ke Ruang Kendali</span>
          </button>
        </div>
      )}

      {/* Render Owner View or Public View based on ownership */}
      {isReporter && !isPublicPreview ? (
        <OwnerReportView
          report={report}
          reporter={reporter}
          assignedPetugas={assignedPetugas}
          wilayah={wilayah}
          statusLogs={statusLogs}
          proofs={proofs}
          upvoteCount={upvoteCount}
          hasUpvoted={hasUpvoted}
          comments={comments}
          newComment={newComment}
          setNewComment={setNewComment}
          userRating={userRating}
          hoverRating={hoverRating}
          setHoverRating={setHoverRating}
          currentUser={profile}
          onUpvote={handleUpvote}
          onComment={handleComment}
          onRating={handleRating}
          onTogglePublicPreview={() => setIsPublicPreview(true)}
          error={error}
        />
      ) : (
        <PublicReportView
          report={report}
          reporter={reporter}
          assignedPetugas={assignedPetugas}
          wilayah={wilayah}
          statusLogs={statusLogs}
          proofs={proofs}
          upvoteCount={upvoteCount}
          hasUpvoted={hasUpvoted}
          comments={comments}
          newComment={newComment}
          setNewComment={setNewComment}
          currentUser={profile}
          onUpvote={handleUpvote}
          onComment={handleComment}
          error={error}
        />
      )}

    </div>
  );
}
