import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadPhoto, compressImage } from '../../lib/storage';
import { calculateDistanceMeters } from '../../lib/geo';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, CATEGORY_CONFIG, SLA_CONFIG } from '../../lib/constants';
import { ReportCategory, ReportPriority, Report } from '../../types';
import { MapPicker } from '../../components/MapComponents';
import { TicketCard } from '../../components/TicketCard';
import { HoneypotField } from '../../components/HoneypotField';
import { validateSafeInput, validateFileUpload, rateLimiter, sanitizeString, sanitizeText, isAccountActive } from '../../utils/security';
import {
  Camera, MapPin, Loader2, AlertCircle, CheckCircle2, X,
  FileText, Tag, Layers, AlertTriangle, ThumbsUp, ArrowRight,
  Shield, Clock, Film, Video, Trash2, Plus, Play
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const RECOMMENDED_PRIORITY: Record<ReportCategory, ReportPriority> = {
  infrastruktur: 'medium',
  lingkungan: 'medium',
  kebersihan: 'low',
  pelayanan: 'low',
  keamanan: 'high',
  lainnya: 'low',
};

export function CreateReportPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReportCategory>('infrastruktur');
  const [priority, setPriority] = useState<ReportPriority>('medium');
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [wilayahs, setWilayahs] = useState<{ id: string; name: string }[]>([]);
  const [wilayahId, setWilayahId] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Duplicate detection modal state
  const [similarReports, setSimilarReports] = useState<{ report: Report; distance: number }[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  useEffect(() => {
    supabase.from('wilayah').select('id, name').order('name').then(({ data }) => {
      if (data) setWilayahs(data);
    });
  }, []);

  const handleCategorySelect = (cat: ReportCategory) => {
    setCategory(cat);
    setPriority(RECOMMENDED_PRIORITY[cat]);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 5) {
      setError('Maksimal 5 foto per laporan');
      addToast('warning', 'Maksimal 5 foto bukti per laporan');
      return;
    }

    const newPhotos: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = await validateFileUpload(file);
      if (!validation.valid) {
        setError(validation.error || 'File foto tidak valid');
        addToast('error', validation.error || 'File foto tidak valid');
        continue;
      }
      const compressed = await compressImage(file);
      newPhotos.push(compressed);
      newPreviews.push(URL.createObjectURL(compressed));
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateFileUpload(file);
    if (!validation.valid) {
      setError(validation.error || 'File video tidak valid');
      addToast('error', validation.error || 'File video tidak valid');
      return;
    }

    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleRemoveVideo = () => {
    setVideo(null);
    setVideoPreview(null);
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        () => setError('Tidak bisa mengakses lokasi. Pilih di peta.')
      );
    }
  };

  const checkDuplicatesAndProceed = async (bypassDuplicateCheck = false) => {
    setError(null);

    // 0. Account Active Status Check
    if (profile && !isAccountActive(profile)) {
      const banMsg = 'Akun Anda dinonaktifkan oleh Administrator. Tidak dapat membuat laporan.';
      setError(banMsg);
      addToast('error', banMsg);
      return;
    }

    // 1. Anti-Bot Honeypot trap check
    if (honeypot.trim() !== '') {
      console.warn('[Security Shield] Automated bot honeypot triggered');
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        navigate('/app');
      }, 1000);
      return;
    }

    // 2. Client-side Rate Limit Guard (Max 5 reports per 10 mins)
    const rateCheck = rateLimiter.checkRateLimit('create_report', 5, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      const waitMsg = `Batas pengiriman tercapai. Silakan tunggu ${rateCheck.waitSeconds} detik sebelum membuat laporan baru.`;
      setError(waitMsg);
      addToast('error', waitMsg);
      return;
    }

    // 3. Length Validations
    if (title.length < 5) {
      setError('Judul minimal 5 karakter');
      addToast('warning', 'Judul terlalu pendek — minimal 5 karakter');
      return;
    }
    if (description.length < 10) {
      setError('Deskripsi minimal 10 karakter');
      addToast('warning', 'Deskripsi terlalu pendek — minimal 10 karakter');
      return;
    }
    if (!address.trim()) {
      setError('Alamat wajib diisi');
      addToast('warning', 'Silakan isi alamat lokasi kejadian');
      return;
    }

    // 4. Injection & Safe Input Verification
    const titleCheck = validateSafeInput(title);
    if (!titleCheck.isSafe) {
      setError(`Judul tidak valid: ${titleCheck.threat}`);
      addToast('error', 'Karakter terlarang ditemukan pada judul');
      return;
    }
    const descCheck = validateSafeInput(description);
    if (!descCheck.isSafe) {
      setError(`Deskripsi tidak valid: ${descCheck.threat}`);
      addToast('error', 'Karakter terlarang ditemukan pada deskripsi');
      return;
    }
    const addressCheck = validateSafeInput(address);
    if (!addressCheck.isSafe) {
      setError(`Alamat tidak valid: ${addressCheck.threat}`);
      addToast('error', 'Karakter terlarang ditemukan pada alamat');
      return;
    }

    const cleanTitle = sanitizeString(title, 120);
    const cleanDescription = sanitizeText(description);

    setLoading(true);

    // If position is selected and not bypassing, check radius 100m for similar active reports
    if (position && !bypassDuplicateCheck) {
      const { data: activeReports } = await supabase
        .from('reports')
        .select('*')
        .eq('category', category)
        .in('status', ['pending', 'verified', 'assigned', 'in_progress'])
        .not('latitude', 'is', null);

      if (activeReports && activeReports.length > 0) {
        const matches: { report: Report; distance: number }[] = [];
        activeReports.forEach((rep) => {
          if (rep.latitude && rep.longitude) {
            const dist = calculateDistanceMeters(position[0], position[1], rep.latitude, rep.longitude);
            if (dist <= 100) {
              matches.push({ report: rep as Report, distance: dist });
            }
          }
        });

        if (matches.length > 0) {
          setSimilarReports(matches.sort((a, b) => a.distance - b.distance));
          setShowDuplicateModal(true);
          setLoading(false);
          return;
        }
      }
    }

    // Execute Multi-Photo Upload
    let photoUrls: string[] = [];
    if (photos.length > 0) {
      const uploaded = await Promise.all(photos.map((p) => uploadPhoto(p, 'reports')));
      photoUrls = uploaded.filter((url): url is string => url !== null);
      if (photoUrls.length === 0) {
        setError('Gagal mengunggah foto. Coba lagi.');
        setLoading(false);
        return;
      }
    }

    // Execute Video Upload
    let videoUrl: string | null = null;
    if (video) {
      videoUrl = await uploadPhoto(video, 'reports');
    }

    const primaryPhoto = photoUrls.length > 0 ? photoUrls[0] : null;

    const { data, error: insertError } = await supabase
      .from('reports')
      .insert({
        title: cleanTitle,
        description: cleanDescription,
        category,
        priority,
        address: sanitizeString(address, 255),
        latitude: position?.[0] || null,
        longitude: position?.[1] || null,
        photo_url: primaryPhoto,
        photo_urls: photoUrls,
        video_url: videoUrl,
        reporter_id: profile?.id,
        wilayah_id: wilayahId || null,
        is_anonymous: isAnonymous,
        status: 'pending',
      })
      .select('id, ticket_id')
      .single();

    if (insertError) {
      setError('Gagal membuat laporan: ' + insertError.message);
      setLoading(false);
      return;
    }

    addToast('success', `Laporan ${data.ticket_id} berhasil dibuat!`);
    navigate(`/reports/${data.id}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkDuplicatesAndProceed(false);
  };

  return (
    <div className="max-w-2xl mx-auto animate-slide-up pb-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#16233D]">Buat Laporan Baru</h1>
        <p className="text-[#8891A0] text-sm mt-1">Laporkan masalah infrastruktur atau lingkungan dengan lokasi presisi</p>
      </div>

      {error && (
        <div className="alert alert-error mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-current hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Anti-Bot Honeypot Field */}
        <HoneypotField value={honeypot} onChange={setHoneypot} />

        {/* Title & Category */}
        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Judul Singkat Masalah</label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Lampu PJU Padam Depan SD 01 atau Jalan Berlubang Parah"
              className="input"
            />
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#8891A0]" />
              Kategori Laporan
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((opt) => {
                const cfg = CATEGORY_CONFIG[opt.value];
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleCategorySelect(opt.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-[4px] border text-xs font-semibold transition-all ${
                      category === opt.value
                        ? 'border-[#16233D] bg-[#16233D] text-white shadow-subtle'
                        : 'border-[#E2E4E0] text-[#5A6372] bg-[#F6F7F5] hover:border-[#8891A0]'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* SLA Target Banner */}
            <div className="mt-3 p-3 bg-sky-50/80 rounded-xl border border-sky-200 flex items-center justify-between text-xs animate-scale-in">
              <div className="flex items-center gap-2 text-sky-900 font-medium">
                <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span>Target Standar Penanganan (SLA):</span>
              </div>
              <span className="font-mono font-bold text-sky-950 bg-sky-100 px-2.5 py-0.5 rounded-md border border-sky-300">
                ⏱️ {SLA_CONFIG[category]?.label || '2 - 4 Hari Kerja'}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card p-5">
          <label className="label">Deskripsi Masalah</label>
          <textarea
            required
            minLength={10}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan detail permasalahan secara rinci (lokasi patokan, dampak, kondisi saat ini)..."
            className="input resize-none"
          />
        </div>

        {/* Anonymous Toggle Option */}
        <div className="card p-5 bg-gradient-to-r from-slate-50 to-slate-100/60 border border-slate-200">
          <label className="flex items-start gap-3.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-[#0EA58D]"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900">
                <Shield className="w-4 h-4 text-[#0EA58D]" />
                <span>Kirim sebagai Laporan Anonim</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nama dan foto profil Anda akan disamarkan dari publik dan ditampilkan sebagai <em>"Warga Terverifikasi (Anonim)"</em>. Identitas tetap diaudit secara internal untuk keamanan.
              </p>
            </div>
          </label>
        </div>

        {/* Multi-Photo Evidence Upload */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="label mb-0 flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#8891A0]" />
              Foto Bukti Lapangan (Maksimal 5 Foto)
            </label>
            <span className="text-xs font-mono font-bold text-slate-500">
              {photos.length} / 5 Foto
            </span>
          </div>

          {/* Photo Grid Previews */}
          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
              {photoPreviews.map((preview, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                  <img src={preview} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-600/90 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm"
                    title="Hapus foto ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono font-bold">
                    #{idx + 1}
                  </span>
                </div>
              ))}

              {photos.length < 5 && (
                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-400 transition-colors bg-slate-50/50 hover:bg-slate-100/50">
                  <Plus className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-[11px] font-medium text-slate-600">Tambah Foto</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
                </label>
              )}
            </div>
          )}

          {/* Initial Upload Button if no photos yet */}
          {photoPreviews.length === 0 && (
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-400 transition-colors bg-slate-50/50 hover:bg-slate-100/50">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <Camera className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-xs font-semibold text-[#16233D]">Pilih Foto Lapangan (Bisa Pilih Banyak)</span>
              <span className="text-[10px] text-[#8891A0] mt-0.5">JPG, PNG, WebP maks 10MB per file (Otomatis dikompres)</span>
              <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
            </label>
          )}
        </div>

        {/* Video Evidence Upload */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="label mb-0 flex items-center gap-2">
              <Film className="w-4 h-4 text-sky-600" />
              Video Rekaman Bukti (Opsional — Maksimal 1 Video)
            </label>
            {video && (
              <span className="text-[11px] font-mono text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {(video.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            )}
          </div>

          {videoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video max-h-56">
              <video src={videoPreview} controls className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={handleRemoveVideo}
                className="absolute top-2 right-2 p-1.5 bg-red-600/90 text-white rounded-md hover:bg-red-700 transition-colors shadow-md flex items-center gap-1 text-xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Video
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-sky-200/80 rounded-xl cursor-pointer hover:border-sky-400 transition-colors bg-sky-50/30 hover:bg-sky-50/60">
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center mb-2">
                <Video className="w-5 h-5 text-sky-600" />
              </div>
              <span className="text-xs font-semibold text-slate-800">Unggah Video Bukti Kerusakan / Kondisi Lapangan</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Format MP4, WebM, MOV maks 35MB</span>
              <input type="file" accept="video/mp4,video/webm,video/quicktime,video/*" onChange={handleVideoChange} className="hidden" />
            </label>
          )}
        </div>

        {/* Address & Wilayah */}
        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Alamat Lengkap / Patokan</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Contoh: Depan Toko Melati, Jl. Sudirman RT 02/RW 05"
              className="input"
            />
          </div>
          <div>
            <label className="label">Wilayah Kota / Kecamatan</label>
            <select
              value={wilayahId}
              onChange={(e) => setWilayahId(e.target.value)}
              className="input"
            >
              <option value="">Pilih wilayah domisili/kejadian</option>
              {wilayahs.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#C1503D]" />
              Pin Lokasi di Peta
            </label>
            <button type="button" onClick={handleGetCurrentLocation} className="btn-ghost btn-sm">
              <MapPin className="w-3.5 h-3.5 text-[#C1503D]" />
              Gunakan GPS Saya
            </button>
          </div>
          <MapPicker position={position} onPositionChange={setPosition} />
          {position && (
            <div className="mt-2 text-xs font-mono text-[#5A6372] bg-[#F6F7F5] p-2 rounded-[4px] border border-[#E2E4E0] flex items-center justify-between">
              <span>Koordinat terpilih:</span>
              <span className="font-semibold text-[#16233D]">{position[0].toFixed(5)}, {position[1].toFixed(5)}</span>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
            Batal
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {loading ? 'Memeriksa...' : 'Kirim Laporan Resmi'}
          </button>
        </div>
      </form>

      {/* DUPLICATE DETECTION MODAL */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-[#16233D]/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setShowDuplicateModal(false)}>
          <div className="bg-white rounded-[6px] border border-[#E2E4E0] p-6 max-w-lg w-full animate-scale-in max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4 pb-3 border-b border-[#E2E4E0]">
              <div className="w-10 h-10 rounded-[4px] bg-[#FDF0DA] border border-[#E8A33D] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#E8A33D]" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-[#16233D]">Laporan Serupa Ditemukan</h3>
                <p className="text-xs text-[#5A6372] mt-0.5">
                  Terdapat {similarReports.length} laporan aktif dengan kategori sama dalam radius &lt;100 meter.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
              <p className="text-xs text-[#5A6372] bg-[#F6F7F5] p-2.5 rounded-[4px] border border-[#E2E4E0]">
                💡 <strong>Tips:</strong> Mendukung laporan yang sudah ada akan mempercepat akumulasi urgensi publik daripada membuat laporan duplikat!
              </p>

              {similarReports.map(({ report, distance }) => (
                <div key={report.id} className="relative">
                  <div className="absolute top-2 right-2 z-10 text-[10px] font-mono font-semibold bg-[#16233D] text-white px-2 py-0.5 rounded-[4px]">
                    Jarak: {distance} meter
                  </div>
                  <TicketCard report={report} />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#E2E4E0]">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  checkDuplicatesAndProceed(true);
                }}
                className="btn-secondary btn-sm flex-1 text-center"
              >
                Tetap Buat Laporan Baru
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (similarReports[0]) {
                    const rId = similarReports[0].report.id;
                    if (profile) {
                      await supabase.from('upvotes').insert({ report_id: rId, user_id: profile.id });
                    }
                    setShowDuplicateModal(false);
                    navigate(`/reports/${rId}`);
                  }
                }}
                className="btn-accent btn-sm flex-1 text-center font-semibold flex items-center justify-center gap-1.5"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                Dukung Laporan Terdekat Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

