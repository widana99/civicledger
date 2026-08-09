import { Link } from 'react-router-dom';
import {
  ShieldCheck, MapPin, Zap, Users, BarChart3, Camera, ArrowRight,
  CheckCircle2, FileText, Clock, TrendingUp,
} from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-neutral-900 text-lg leading-none">CivicLedger</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Pelaporan Masyarakat</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/map" className="btn-ghost btn-sm hidden sm:inline-flex">
              <MapPin className="w-4 h-4" /> Peta
            </Link>
            <Link to="/stats" className="btn-ghost btn-sm hidden sm:inline-flex">
              <BarChart3 className="w-4 h-4" /> Statistik
            </Link>
            <Link to="/auth" className="btn-primary btn-sm">
              Masuk / Daftar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50/30" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-full px-3 py-1.5 text-xs font-semibold text-primary-700 mb-6">
                <Zap className="w-3.5 h-3.5" />
                Platform Pelaporan Real-time
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-900 leading-[1.1] text-balance">
                Suara Warga,{' '}
                <span className="text-primary-600">Penindakan</span>{' '}
                Cepat & Transparan
              </h1>
              <p className="mt-6 text-lg text-neutral-600 max-w-xl leading-relaxed">
                Laporkan masalah infrastruktur, kebersihan, dan lingkungan di sekitar Anda.
                Pantau penanganan secara real-time dari laporan hingga penyelesaian.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth" className="btn-primary btn-lg">
                  Mulai Melaporkan
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/map" className="btn-secondary btn-lg">
                  <MapPin className="w-4 h-4" />
                  Lihat Peta
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-6 text-sm text-neutral-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success-500" />
                  Gratis & Terbuka
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success-500" />
                  Pelacakan Real-time
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success-500" />
                  Bukti Foto
                </div>
              </div>
            </div>

            <div className="relative animate-scale-in hidden lg:block">
              <div className="card p-6 shadow-xl rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-error-100 flex items-center justify-center">
                      <Camera className="w-5 h-5 text-error-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-neutral-900">Laporan Baru</div>
                      <div className="text-xs text-neutral-500">CL-20260809-0042</div>
                    </div>
                  </div>
                  <span className="badge bg-warning-100 text-warning-700">Menunggu</span>
                </div>
                <div className="h-32 rounded-xl bg-gradient-to-br from-neutral-200 to-neutral-300 mb-4 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-neutral-400" />
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 bg-neutral-200 rounded-full w-3/4" />
                  <div className="h-2 bg-neutral-100 rounded-full w-full" />
                  <div className="h-2 bg-neutral-100 rounded-full w-5/6" />
                </div>
              </div>

              <div className="card p-4 shadow-xl -rotate-3 hover:rotate-0 transition-transform duration-500 mt-4 ml-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-success-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-neutral-900">Laporan Selesai</div>
                    <div className="text-xs text-neutral-500">Diselesaikan dalam 2 hari</div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className="text-accent-500 text-sm">★</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900">
              Cara Kerja CivicLedger
            </h2>
            <p className="mt-3 text-neutral-600 max-w-2xl mx-auto">
              Empat peran yang bekerja sama untuk penanganan masalah yang cepat dan transparan
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FileText, iconBg: 'bg-primary-100', iconColor: 'text-primary-600', title: '1. Laporkan', desc: 'Warga membuat laporan dengan foto, lokasi peta, dan kategori masalah' },
              { icon: ShieldCheck, iconBg: 'bg-accent-100', iconColor: 'text-accent-600', title: '2. Verifikasi', desc: 'Admin memverifikasi laporan, menentukan prioritas, dan menugaskan petugas' },
              { icon: Clock, iconBg: 'bg-warning-100', iconColor: 'text-warning-600', title: '3. Penanganan', desc: 'Petugas mengerjakan laporan dan mengunggah bukti foto penyelesaian' },
              { icon: CheckCircle2, iconBg: 'bg-success-100', iconColor: 'text-success-600', title: '4. Selesai', desc: 'Warga melihat hasil dan memberikan rating untuk kualitas penanganan' },
            ].map((step) => (
              <div key={step.title} className="card p-6 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl ${step.iconBg} flex items-center justify-center mb-4`}>
                  <step.icon className={`w-6 h-6 ${step.iconColor}`} />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">{step.title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { icon: FileText, value: '1,200+', label: 'Laporan Diterima' },
              { icon: CheckCircle2, value: '890+', label: 'Selesai Ditangani' },
              { icon: Clock, value: '< 3 Hari', label: 'Rata-rata Penanganan' },
              { icon: TrendingUp, value: '94%', label: 'Tingkat Kepuasan' },
            ].map((stat) => (
              <div key={stat.label}>
                <stat.icon className="w-8 h-8 text-primary-200 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-primary-100 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900">
            Mulai Berkontribusi Hari Ini
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Bergabung dengan ribuan warga yang sudah membuat lingkungan mereka lebih baik
          </p>
          <Link to="/auth" className="btn-primary btn-lg mt-8">
            Daftar Sekarang
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-8 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-neutral-900">CivicLedger</span>
          </div>
          <div className="text-sm text-neutral-500">
            Sistem Pelaporan & Penindakan Masyarakat
          </div>
        </div>
      </footer>
    </div>
  );
}
