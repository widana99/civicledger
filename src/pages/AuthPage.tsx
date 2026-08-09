import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { supabase } from '../lib/supabase';
import {
  ShieldCheck, User, Users, Wrench, Mail, Lock, Phone, MapPin,
  Loader2, ArrowLeft, AlertCircle,
} from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('masyarakat');
  const [wilayahId, setWilayahId] = useState('');
  const [wilayahs, setWilayahs] = useState<{ id: string; name: string }[]>([]);

  const loadWilayah = async () => {
    const { data } = await supabase.from('wilayah').select('id, name').order('name');
    if (data) setWilayahs(data);
  };

  const handleRoleChange = (r: Role) => {
    setRole(r);
    if (r === 'petugas' && wilayahs.length === 0) {
      loadWilayah();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/app');
      }
    } else {
      if (role === 'petugas' && !wilayahId) {
        setError('Pilih wilayah penugasan untuk akun petugas');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, phone, role, wilayahId || undefined);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        // Auto sign in after signup
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError('Akun berhasil dibuat. Silakan masuk.');
          setMode('signin');
          setLoading(false);
        } else {
          navigate('/app');
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-300 rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-xl">CivicLedger</div>
              <div className="text-xs text-primary-200">Pelaporan Masyarakat</div>
            </div>
          </Link>

          <div>
            <h1 className="font-display text-4xl font-bold leading-tight mb-4">
              Bersama Wujudkan<br />Lingkungan Lebih Baik
            </h1>
            <p className="text-primary-100 text-lg leading-relaxed max-w-md">
              Platform transparan untuk melaporkan, memantau, dan menindaklanjuti
              aspirasi masyarakat secara real-time.
            </p>
          </div>

          <div className="space-y-3 text-sm text-primary-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span>Laporan dengan foto & lokasi peta</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <span>Pelacakan status real-time</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <span>Bukti penyelesaian & rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex flex-col">
        <div className="lg:hidden p-4 border-b border-neutral-200">
          <Link to="/" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div className="font-display font-bold text-xl text-neutral-900">CivicLedger</div>
            </div>

            <h2 className="font-display text-2xl font-bold text-neutral-900 mb-2">
              {mode === 'signin' ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
            </h2>
            <p className="text-neutral-500 text-sm mb-6">
              {mode === 'signin'
                ? 'Masuk untuk melaporkan dan memantau laporan'
                : 'Pilih peran dan mulai berkontribusi'}
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-error-50 border border-error-200 text-error-700 text-sm flex items-start gap-2 animate-slide-down">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="label">Nama Lengkap</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nama lengkap Anda"
                        className="input pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Daftar Sebagai</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'masyarakat', label: 'Warga', icon: User },
                        { value: 'admin', label: 'Admin', icon: ShieldCheck },
                        { value: 'petugas', label: 'Petugas', icon: Wrench },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleRoleChange(opt.value)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                            role === opt.value
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                          }`}
                        >
                          <opt.icon className="w-5 h-5" />
                          <span className="text-xs font-semibold">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {role === 'petugas' && (
                    <div className="animate-slide-down">
                      <label className="label">Wilayah Penugasan</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <select
                          required
                          value={wilayahId}
                          onChange={(e) => setWilayahId(e.target.value)}
                          className="input pl-10 appearance-none"
                        >
                          <option value="">Pilih wilayah...</option>
                          {wilayahs.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label">Nomor Telepon (opsional)</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="08xxxxxxxxxx"
                        className="input pl-10"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@contoh.com"
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="label">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="input pl-10"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === 'signin' ? (
                  'Masuk'
                ) : (
                  'Daftar'
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-neutral-500">
              {mode === 'signin' ? (
                <>
                  Belum punya akun?{' '}
                  <button onClick={() => { setMode('signup'); setError(null); }} className="font-semibold text-primary-600 hover:text-primary-700">
                    Daftar di sini
                  </button>
                </>
              ) : (
                <>
                  Sudah punya akun?{' '}
                  <button onClick={() => { setMode('signin'); setError(null); }} className="font-semibold text-primary-600 hover:text-primary-700">
                    Masuk
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
