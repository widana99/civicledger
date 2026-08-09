import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadPhoto, compressImage } from '../../lib/storage';
import { Report } from '../../types';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../../components/Badges';
import { formatDateTime } from '../../lib/constants';
import {
  ArrowLeft, MapPin, Camera, Loader2, AlertCircle, CheckCircle2,
  X, Play, FileText, Calendar, Phone,
} from 'lucide-react';

export function PetugasTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [task, setTask] = useState<Report | null>(null);
  const [reporter, setReporter] = useState<{ full_name: string; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofNote, setProofNote] = useState('');

  const fetchTask = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('reports').select('*').eq('id', id).maybeSingle();
    if (!data) { setLoading(false); return; }
    setTask(data as Report);
    if ((data as Report).reporter_id) {
      const { data: r } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', (data as Report).reporter_id)
        .maybeSingle();
      setReporter(r as any);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

  const handleStart = async () => {
    if (!task) return;
    setActionLoading(true);
    await supabase.from('reports').update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }).eq('id', task.id);
    setActionLoading(false);
    fetchTask();
  };

  const handleComplete = async () => {
    if (!task || !proofPhoto || !profile) return;
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
    }).eq('id', task.id);
    await supabase.from('completion_proofs').insert({
      report_id: task.id,
      photo_url: photoUrl,
      note: proofNote || null,
      uploaded_by: profile.id,
    });
    setActionLoading(false);
    setProofPhoto(null);
    setProofPreview(null);
    setProofNote('');
    fetchTask();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setProofPhoto(compressed);
    setProofPreview(URL.createObjectURL(compressed));
  };

  if (loading) {
    return <div className="max-w-2xl mx-auto"><div className="skeleton h-8 w-32 mb-4" /><div className="skeleton h-64" /></div>;
  }

  if (!task) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500">Tugas tidak ditemukan</p>
        <Link to="/app/tasks" className="btn-primary mt-4">Kembali ke Daftar Tugas</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <button onClick={() => navigate(-1)} className="btn-ghost btn-sm mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-error-50 border border-error-200 text-error-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">{task.ticket_id}</span>
          <StatusBadge status={task.status} />
          <CategoryBadge category={task.category} />
          <PriorityBadge priority={task.priority} />
        </div>
        <h1 className="font-display text-xl font-bold text-neutral-900 mb-2">{task.title}</h1>
        <p className="text-neutral-600 text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
      </div>

      {task.photo_url && (
        <div className="card overflow-hidden mb-4">
          <img src={task.photo_url} alt={task.title} className="w-full max-h-80 object-cover" />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2"><MapPin className="w-3.5 h-3.5" /> Lokasi</div>
          <p className="text-sm font-medium text-neutral-900">{task.address}</p>
          {task.latitude && task.longitude && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${task.latitude}&mlon=${task.longitude}#map=17/${task.latitude}/${task.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block"
            >Buka di peta →</a>
          )}
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2"><Calendar className="w-3.5 h-3.5" /> Dilaporkan</div>
          <p className="text-sm font-medium text-neutral-900">{formatDateTime(task.created_at)}</p>
          {reporter && (
            <div className="mt-2 pt-2 border-t border-neutral-100">
              <div className="text-xs text-neutral-500 mb-1">Pelapor</div>
              <div className="text-sm font-medium text-neutral-900">{reporter.full_name}</div>
              {reporter.phone && (
                <a href={`tel:${reporter.phone}`} className="text-xs text-primary-600 flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3" /> {reporter.phone}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {task.status === 'assigned' && (
        <div className="card p-5 bg-primary-50/50 border-primary-200">
          <h3 className="font-semibold text-neutral-900 mb-2">Mulai Pengerjaan</h3>
          <p className="text-sm text-neutral-600 mb-3">Konfirmasi bahwa Anda mulai mengerjakan tugas ini</p>
          <button onClick={handleStart} disabled={actionLoading} className="btn-primary">
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Mulai Kerjakan
          </button>
        </div>
      )}

      {task.status === 'in_progress' && (
        <div className="card p-5 bg-success-50/50 border-success-200">
          <h3 className="font-semibold text-neutral-900 mb-2">Selesaikan Tugas</h3>
          <p className="text-sm text-neutral-600 mb-3">Unggah bukti foto penyelesaian</p>
          {proofPreview ? (
            <div className="relative mb-3">
              <img src={proofPreview} alt="Bukti" className="w-full h-48 object-cover rounded-xl" />
              <button onClick={() => { setProofPhoto(null); setProofPreview(null); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-neutral-900/60 text-white flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-neutral-300 rounded-xl cursor-pointer hover:border-success-400 mb-3">
              <Camera className="w-6 h-6 text-neutral-400 mb-1" />
              <span className="text-xs text-neutral-500">Unggah bukti foto</span>
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
            </label>
          )}
          <input type="text" value={proofNote} onChange={(e) => setProofNote(e.target.value)}
            placeholder="Catatan penyelesaian (opsional)" className="input mb-3" />
          <button onClick={handleComplete} disabled={actionLoading || !proofPhoto} className="btn-primary">
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Tandai Selesai
          </button>
        </div>
      )}

      {task.status === 'completed' && (
        <div className="card p-5 bg-success-50 border-success-200 text-center">
          <CheckCircle2 className="w-10 h-10 text-success-600 mx-auto mb-2" />
          <h3 className="font-semibold text-neutral-900">Tugas Selesai</h3>
          <p className="text-sm text-neutral-600 mt-1">Penyelesaian: {formatDateTime(task.completed_at)}</p>
          <Link to="/app/tasks" className="btn-secondary mt-4">Kembali ke Daftar Tugas</Link>
        </div>
      )}
    </div>
  );
}
