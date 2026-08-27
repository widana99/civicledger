import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ShieldCheck, User, Mail, Lock, Phone,
  Loader2, ArrowLeft, AlertCircle, Info, CheckCircle2,
  KeyRound, ArrowRight, Sparkles, ExternalLink,
} from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'otp-verify';

/* ═══════ Google SVG Icon ═══════ */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function AuthPage() {
  const { session, signIn, signUp, signInWithGoogle, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/';

  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // OTP
  const [otpCode, setOtpCode] = useState('');

  const isFromReporting = redirectTarget.includes('create-report');

  useEffect(() => {
    if (session) {
      // Check if there was a pending profile registration
      const pendingRaw = localStorage.getItem('civic_pending_profile');
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          supabase.from('profiles').upsert({
            id: session.user.id,
            email: session.user.email || pending.email,
            full_name: pending.fullName || session.user.email?.split('@')[0] || 'Warga',
            phone: pending.phone || null,
            role: 'masyarakat',
            is_active: true,
          }).then(() => {
            localStorage.removeItem('civic_pending_profile');
          });
        } catch (_) {}
      }
      navigate(redirectTarget, { replace: true });
    }
  }, [session, navigate, redirectTarget]);

  /* ═══════ Sign In with Email/Password ═══════ */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      navigate(redirectTarget, { replace: true });
    }
  };

  /* ═══════ Sign In with Google ═══════ */
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error);
      setLoading(false);
    }
  };

  /* ═══════ Sign Up — Step 1: Form → Send Email Link & OTP ═══════ */
  const handleSignUpForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Nama lengkap wajib diisi');
      return;
    }
    if (!email.trim()) {
      setError('Email wajib diisi');
      return;
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      // 1. Simpan metadata pendaftaran di localStorage untuk auto-recovery
      localStorage.setItem('civic_pending_profile', JSON.stringify({
        fullName,
        phone,
        email,
        password,
      }));

      // 2. Kirim email konfirmasi dari Supabase dengan metadata lengkap
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || null,
          },
          emailRedirectTo: window.location.origin + '/auth?confirmed=true',
        },
      });

      if (signUpErr) {
        // Jika user sudah terdaftar tapi belum verifikasi OTP
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email,
          options: {
            data: { full_name: fullName, phone: phone || null },
            emailRedirectTo: window.location.origin + '/auth?confirmed=true',
          },
        });
        if (otpErr) throw otpErr;
      }

      setSuccess(`Email konfirmasi telah dikirim ke ${email}. Silakan buka email Anda.`);
      setMode('otp-verify');
    } catch (err: any) {
      setError(err?.message || 'Gagal mengirim email konfirmasi. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  /* ═══════ Sign Up — Step 2: Verify Email OTP & Create Account ═══════ */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Verifikasi token 6 digit jika user memasukkan kode
      const { error: otpError } = await verifyOtp({
        email,
        token: otpCode,
        type: 'email',
      });

      if (otpError) {
        // Coba verifikasi dengan tipe 'signup'
        const { error: signupOtpErr } = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: 'signup',
        });
        if (signupOtpErr) {
          setError(otpError);
          setLoading(false);
          return;
        }
      }

      // Pastikan profile tersimpan di tabel profiles
      const { data: userRes } = await supabase.auth.getUser();
      if (userRes?.user) {
        await supabase.from('profiles').upsert({
          id: userRes.user.id,
          email,
          full_name: fullName || email.split('@')[0],
          phone: phone || null,
          role: 'masyarakat',
          is_active: true,
        });
      }

      localStorage.removeItem('civic_pending_profile');
      navigate(redirectTarget, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Verifikasi gagal');
    } finally {
      setLoading(false);
    }
  };

  /* ═══════ Resend OTP ═══════ */
  const handleResendOtp = async () => {
    setOtpCode('');
    setSuccess(null);
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setSuccess(`Kode OTP baru telah dikirim ke ${email}.`);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengirim ulang OTP.');
    } finally {
      setLoading(false);
    }
  };

  /* ═══════ Step Indicator ═══════ */
  const currentStep = mode === 'signup' ? 1 : mode === 'otp-verify' ? 2 : 0;

  const StepIndicator = () => {
    if (currentStep === 0) return null;
    const steps = ['Data Akun', 'Verifikasi Email'];
    return (
      <div className="flex items-center gap-2 mb-6">
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isDone = stepNum < currentStep;
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
                ${isDone ? 'bg-[#0EA58D] text-[#080E1F]' : isActive ? 'bg-[#E5A93C] text-[#0B132B] ring-4 ring-[#E5A93C]/20' : 'bg-slate-200 text-slate-500'}
              `}>
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : stepNum}
              </div>
              <span className={`text-xs font-bold font-display ${isActive ? 'text-[#0B132B]' : 'text-slate-400'}`}>
                {label}
              </span>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 rounded-full ${isDone ? 'bg-[#0EA58D]' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC] font-sans selection:bg-[#E5A93C]/30">
      
      {/* Left side - Aesthetic Liquid Glass Ambient Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#080E1F] text-white relative overflow-hidden flex-col justify-between p-12 lg:p-16">
        
        {/* Glowing Aurora Spheres */}
        <div className="absolute top-1/4 -right-10 w-96 h-96 bg-[#0EA58D]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-[#E5A93C]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 w-fit group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0EA58D] via-[#2DD4BF] to-[#E5A93C] p-[1.5px] shadow-glow-teal group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-[#080E1F] rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-[#2DD4BF]" />
              </div>
            </div>
            <div>
              <div className="font-display font-black text-xl text-white tracking-tight">CivicLedger</div>
              <div className="text-[10px] font-mono text-[#E5A93C] tracking-widest uppercase font-semibold">Portal Laporan Kota</div>
            </div>
          </Link>
        </div>

        <div className="relative z-10 space-y-6 my-auto max-w-md">
          <div className="inline-flex items-center gap-2 bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-full px-3.5 py-1 text-xs font-mono text-[#2DD4BF]">
            <Sparkles className="w-3.5 h-3.5 text-[#E5A93C]" />
            <span>Sistem Transparan & Akuntabel</span>
          </div>

          <h1 className="font-display text-4xl lg:text-5xl font-extrabold leading-[1.12] text-white">
            Wujudkan Kota Bersih, Tertib & Aman
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed font-normal">
            Platform resmi partisipasi warga untuk melaporkan kerusakan fasilitas umum, kendala lingkungan, dan memantau respon petugas secara real-time.
          </p>

          <div className="space-y-3.5 text-xs text-slate-200 pt-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#0EA58D]/20 border border-[#0EA58D]/30 flex items-center justify-center text-[#2DD4BF]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span>Laporan dengan koordinat GPS presisi & dokumentasi foto</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#E5A93C]/20 border border-[#E5A93C]/30 flex items-center justify-center text-[#E5A93C]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span>Pantau tahapan verifikasi, penugasan & eksekusi secara live</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#0EA58D]/20 border border-[#0EA58D]/30 flex items-center justify-center text-[#2DD4BF]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span>Evaluasi dan beri rating kepuasan atas hasil kerja petugas</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[11px] font-mono text-slate-500">
          © {new Date().getFullYear()} CivicLedger — Pemerintah Kota & Partisipasi Masyarakat
        </div>
      </div>

      {/* Right side - Form with Liquid Glass Card */}
      <div className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-8 lg:px-14 bg-[#F8FAFC]">
        <div className="w-full max-w-md mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0B132B] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Beranda
            </Link>

            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0EA58D] text-[#080E1F] flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5 font-bold" />
              </div>
              <span className="font-display font-bold text-sm text-[#0B132B]">CivicLedger</span>
            </div>
          </div>

          {/* Prompt banner if redirected from 'Buat Laporan' */}
          {isFromReporting && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[#0B132B] text-xs flex items-start gap-3 shadow-xs animate-slide-up">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-xs">Login Diperlukan untuk Melapor</span>
                <span className="text-slate-600 text-[11px]">
                  Silakan masuk atau daftarkan akun baru Anda untuk mengirimkan laporan resmi dengan perlindungan data.
                </span>
              </div>
            </div>
          )}

          {/* Form Container with Liquid Glass Styling */}
          <div className="rounded-3xl p-6 sm:p-8 bg-white/80 backdrop-blur-2xl border border-white shadow-[0_10px_35px_rgba(11,19,43,0.06)] space-y-5">
            
            <StepIndicator />

            {/* ═══════ SIGN IN MODE ═══════ */}
            {mode === 'signin' && (
              <>
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B132B]">
                    Masuk ke Portal
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                    Gunakan akun Anda untuk membuat dan memantau status laporan kota
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-slide-up">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5 animate-slide-up">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                    <span>{success}</span>
                  </div>
                )}

                {/* Google Sign In */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white/90 hover:bg-white hover:border-[#E5A93C]/50 hover:shadow-md transition-all text-sm font-bold text-[#0B132B] shadow-xs group"
                >
                  <GoogleIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Masuk dengan Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">atau email</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="label">Alamat Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className="input pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Kata Sandi</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-accent w-full btn-lg font-bold shadow-glow-gold flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Masuk Sekarang'}
                  </button>
                </form>

                <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100 font-medium">
                  Belum memiliki akun warga?{' '}
                  <button
                    onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                    className="font-bold text-[#0B132B] hover:text-[#0EA58D] underline transition-colors"
                  >
                    Daftar di sini
                  </button>
                </div>
              </>
            )}

            {/* ═══════ SIGN UP MODE ═══════ */}
            {mode === 'signup' && (
              <>
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B132B]">
                    Registrasi Akun
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                    Lengkapi data diri Anda untuk mendaftar sebagai warga kota
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-slide-up">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Google Sign Up */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white/90 hover:bg-white hover:border-[#E5A93C]/50 hover:shadow-md transition-all text-sm font-bold text-[#0B132B] shadow-xs group"
                >
                  <GoogleIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Daftar dengan Google
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">atau formulir</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <form onSubmit={handleSignUpForm} className="space-y-4">
                  <div>
                    <label className="label">Nama Lengkap</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nama sesuai KTP"
                        className="input pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Nomor HP <span className="text-slate-400 font-normal">(opsional)</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="08xxxxxxxxxx"
                        className="input pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Alamat Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className="input pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Kata Sandi</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-accent w-full btn-lg font-bold shadow-glow-gold flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Daftar & Kirim Konfirmasi Email
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100 font-medium">
                  Sudah memiliki akun?{' '}
                  <button
                    onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
                    className="font-bold text-[#0B132B] hover:text-[#0EA58D] underline transition-colors"
                  >
                    Masuk di sini
                  </button>
                </div>
              </>
            )}

            {/* ═══════ EMAIL CONFIRMATION / OTP VERIFY MODE ═══════ */}
            {mode === 'otp-verify' && (
              <>
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0EA58D]/10 border border-[#0EA58D]/30 flex items-center justify-center text-[#0EA58D] shadow-glow-teal">
                    <Mail className="w-7 h-7" />
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-black text-[#0B132B]">
                    Periksa Email Anda ✉️
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-sm mx-auto leading-relaxed">
                    Tautan konfirmasi pendaftaran telah dikirim ke <span className="font-bold text-[#0B132B]">{email}</span>
                  </p>
                </div>

                {success && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-slide-up">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                    <span>{success}</span>
                  </div>
                )}

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-slide-up">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                {/* ── Main Step Card: Click Link in Email ── */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-[#0EA58D] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                      1
                    </div>
                    <div>
                      <h3 className="text-xs font-bold font-display text-[#0B132B]">
                        Klik Tautan Konfirmasi di Email
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-medium">
                        Buka kotak masuk email Anda dan klik tombol <strong className="text-slate-800 font-bold">"Confirm your mail"</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-[#E5A93C] text-[#0B132B] flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                      2
                    </div>
                    <div>
                      <h3 className="text-xs font-bold font-display text-[#0B132B]">
                        Otomatis Terhubung
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-medium">
                        Setelah link diklik, halaman CivicLedger akan langsung aktif dan membuka dashboard Anda tanpa perlu memasukkan kode.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                    <a
                      href="https://mail.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-accent w-full sm:flex-1 py-2.5 px-4 font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Buka Gmail Sekarang</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* ── Live Waiting Status ── */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-600 font-mono">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0EA58D] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0EA58D]"></span>
                  </span>
                  <span>Menunggu Anda mengklik tautan konfirmasi...</span>
                </div>

                {/* ── Optional: OTP 6 Digit Code Accordion ── */}
                <details className="group border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  <summary className="px-4 py-2.5 text-xs font-bold text-slate-600 cursor-pointer hover:text-[#0B132B] flex items-center justify-between select-none">
                    <span>Menerima 6 digit kode angka di email?</span>
                    <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-4 pt-2 border-t border-slate-200/60 bg-white space-y-3">
                    <p className="text-[11px] text-slate-500 font-medium">
                      Jika email dari Supabase Anda telah dikonfigurasi menampilkan 6 digit OTP, masukkan di sini:
                    </p>
                    <form onSubmit={handleVerifyOtp} className="space-y-3">
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="input pl-10 text-center text-xl font-mono tracking-[0.5em] font-bold"
                          inputMode="numeric"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading || otpCode.length < 6}
                        className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Verifikasi Kode 6 Digit
                      </button>
                    </form>
                  </div>
                </details>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-semibold">
                  <button
                    onClick={() => { setMode('signup'); setError(null); setSuccess(null); setOtpCode(''); }}
                    className="hover:text-[#0B132B] transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Kembali
                  </button>
                  <button
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="font-bold text-[#0EA58D] hover:underline"
                  >
                    Kirim ulang email
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
