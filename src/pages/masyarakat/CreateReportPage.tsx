import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadPhoto, compressImage } from '../../lib/storage';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, CATEGORY_CONFIG } from '../../lib/constants';
import { ReportCategory, ReportPriority } from '../../types';
import { MapPicker } from '../../components/MapComponents';
import {
  Camera, MapPin, Loader2, AlertCircle, CheckCircle2, X,
  FileText, Tag, Layers,
} from 'lucide-react';

export function CreateReportPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReportCategory>('infrastruktur');
  const [priority, setPriority] = useState<ReportPriority>('medium');
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [wilayahs, setWilayahs] = useState<{ id: string; name: string }[]>([]);
  const [wilayahId, setWilayahId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('wilayah').select('id, name').order('name').then(({ data }) => {
      if (data) setWilayahs(data);
    });
  }, []);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar');
      return;
    }
    const compressed = await compressImage(file);
    setPhoto(compressed);
    setPhotoPreview(URL.createObjectURL(compressed));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.length < 5) {
      setError('Judul minimal 5 karakter');
      return;
    }
    if (description.length < 10) {
      setError('Deskripsi minimal 10 karakter');
      return;
    }

    setLoading(true);

    let photoUrl: string | null = null;
    if (photo) {
      photoUrl = await uploadPhoto(photo, 'reports');
      if (!photoUrl) {
        setError('Gagal mengunggah foto. Coba lagi.');
        setLoading(false);
        return;
      }
    }

    const { data, error: insertError } = await supabase
      .from('reports')
      .insert({
        title,
        description,
        category,
        priority,
        address,
        latitude: position?.[0] || null,
        longitude: position?.[1] || null,
        photo_url: photoUrl,
        reporter_id: profile?.id,
        wilayah_id: wilayahId || null,
      })
      .select('id, ticket_id')
      .single();

    if (insertError) {
      setError('Gagal membuat laporan: ' + insertError.message);
      setLoading(false);
      return;
    }

    navigate(`/reports/${data.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Buat Laporan Baru</h1>
        <p className="text-neutral-500 text-sm mt-1">Laporkan masalah di sekitar Anda dengan foto dan lokasi</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-error-50 border border-error-200 text-error-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photo */}
        <div className="card p-5">
          <label className="label flex items-center gap-2">
            <Camera className="w-4 h-4 text-neutral-500" />
            Foto Laporan
          </label>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-neutral-900/60 text-white flex items-center justify-center hover:bg-neutral-900/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-neutral-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-colors">
              <Camera className="w-8 h-8 text-neutral-400 mb-2" />
              <span className="text-sm text-neutral-500">Klik untuk mengunggah foto</span>
              <span className="text-xs text-neutral-400 mt-1">JPG, PNG (max 5MB)</span>
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
            </label>
          )}
        </div>

        {/* Title */}
        <div className="card p-5">
          <label className="label flex items-center gap-2">
            <FileText className="w-4 h-4 text-neutral-500" />
            Judul Laporan
          </label>
          <input
            type="text"
            required
            minLength={5}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Jalan berlubang di Jl. Sudirman"
            className="input"
          />
        </div>

        {/* Category & Priority */}
        <div className="card p-5 space-y-4">
          <div>
            <label className="label flex items-center gap-2">
              <Tag className="w-4 h-4 text-neutral-500" />
              Kategori
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((opt) => {
                const cfg = CATEGORY_CONFIG[opt.value];
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      category === opt.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <Layers className="w-4 h-4 text-neutral-500" />
              Tingkat Prioritas
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    priority === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card p-5">
          <label className="label">Deskripsi</label>
          <textarea
            required
            minLength={10}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan masalah secara detail..."
            className="input resize-none"
          />
        </div>

        {/* Address & Wilayah */}
        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Alamat</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Contoh: Jl. Sudirman No. 123, RT 05/RW 03"
              className="input"
            />
          </div>
          <div>
            <label className="label">Wilayah</label>
            <select
              value={wilayahId}
              onChange={(e) => setWilayahId(e.target.value)}
              className="input"
            >
              <option value="">Pilih wilayah (opsional)</option>
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
              <MapPin className="w-4 h-4 text-neutral-500" />
              Lokasi di Peta
            </label>
            <button type="button" onClick={handleGetCurrentLocation} className="btn-ghost btn-sm">
              <MapPin className="w-3.5 h-3.5" />
              Lokasi Saya
            </button>
          </div>
          <MapPicker position={position} onPositionChange={setPosition} />
          {position && (
            <p className="text-xs text-neutral-500 mt-2">
              Koordinat: {position[0].toFixed(5)}, {position[1].toFixed(5)}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
            Batal
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {loading ? 'Mengirim...' : 'Kirim Laporan'}
          </button>
        </div>
      </form>
    </div>
  );
}
