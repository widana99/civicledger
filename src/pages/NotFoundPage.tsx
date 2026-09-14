import { Link } from 'react-router-dom';
import { MapPin, ArrowLeft, Search } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Visual */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-28 h-28 rounded-full bg-amber-50 border-2 border-dashed border-amber-300 flex items-center justify-center">
            <MapPin className="w-12 h-12 text-amber-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shadow-lg">
            <Search className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <p className="text-sm font-mono text-slate-400 tracking-wider">ERROR 404</p>
          <h1 className="text-2xl font-extrabold text-slate-900">Halaman Tidak Ditemukan</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Maaf, halaman yang Anda cari tidak tersedia atau sudah dipindahkan. 
            Pastikan URL yang Anda masukkan sudah benar.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-md hover:bg-slate-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
          <Link
            to="/map"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-700 text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-all"
          >
            <MapPin className="w-4 h-4" />
            <span>Peta Laporan</span>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-slate-400 font-mono pt-4">
          LaporinAja — Suara Anda, Perubahan Nyata // Sistem Laporan Kota
        </p>
      </div>
    </div>
  );
}
