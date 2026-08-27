import React, { useState } from 'react';
import { Report, Profile, Wilayah } from '../../types';
import { formatDateTime, STATUS_CONFIG, CATEGORY_CONFIG, PRIORITY_CONFIG } from '../../lib/constants';
import {
  X, Printer, ShieldCheck, MapPin, Calendar, FileText, CheckCircle2,
  ExternalLink, Copy, Check, Info, Download, Sparkles,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface ReceiptModalProps {
  report: Report;
  reporter: Profile | null;
  wilayah: Wilayah | null;
  assignedPetugas: Profile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({
  report,
  reporter,
  wilayah,
  assignedPetugas,
  isOpen,
  onClose,
}: ReceiptModalProps) {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Real verification URL encoded in QR Code
  const verifyUrl = `${window.location.origin}/reports/${report.id}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(verifyUrl)}&margin=6`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyVerifyUrl = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    addToast('success', 'Tautan verifikasi resmi berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto pt-6 sm:pt-10 pb-16 animate-fade-in print:p-0 print:bg-white print:static">
      
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-300 relative print:border-none print:shadow-none print:max-w-full print:rounded-none">
        
        {/* ═══════ STICKY MODAL ACTION BAR (Always visible at top) ═══════ */}
        <div className="sticky top-0 z-30 bg-slate-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 shadow-md print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D4A843] text-slate-950 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-display font-extrabold text-xs sm:text-sm tracking-wide uppercase block text-white">
                Tanda Terima Resmi Laporan Warga
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Nomor Tiket: {report.ticket_id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#D4A843] hover:bg-[#c29636] text-slate-950 text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 cursor-pointer"
              title="Cetak atau Simpan sebagai PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Instruction Tip Banner */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 font-medium print:hidden">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Petunjuk:</strong> Klik tombol <strong>Cetak / Simpan PDF</strong> di atas, lalu pilih opsi <em>"Save as PDF" / "Simpan sebagai PDF"</em> pada jendela printer peramban Anda.
            </span>
          </div>
        </div>

        {/* ═══════ PRINTABLE OFFICIAL DOCUMENT SHEET ═══════ */}
        <div className="p-6 sm:p-10 space-y-6 text-slate-900 bg-white print:p-0">
          
          {/* Official Letterhead */}
          <div className="border-b-2 border-slate-950 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-display font-extrabold text-xl shadow-md border-2 border-[#D4A843]">
                CL
              </div>
              <div>
                <h2 className="font-display font-extrabold text-xl text-slate-950 uppercase tracking-tight">
                  CIVICLEDGER REPUBLIK INDONESIA
                </h2>
                <p className="text-xs text-slate-600 font-mono">
                  Sistem Informasi Pelayanan Infrastruktur & Pengaduan Warga Kota
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Dokumen Tanda Terima Digital Sah • Terotentikasi ISO 27001 Civic Tech
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">NOMOR TIKET RESMI</span>
              <span className="text-sm font-extrabold text-slate-950 tracking-wider">
                {report.ticket_id}
              </span>
            </div>
          </div>

          {/* Document Title Banner */}
          <div className="bg-slate-100/90 rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 block">
                SURAT BUKTI PENDAFTARAN LAPORAN (E-RECEIPT RESMI)
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Diterbitkan secara otomatis oleh sistem sebagai bukti sah pelaporan fasilitas umum warga kota.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>TERDAFTAR SAH</span>
            </div>
          </div>

          {/* Grid Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Reporter Data */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-900 uppercase font-mono text-[11px] border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Data Pelapor & Registrasi
              </h4>
              <div className="space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pelapor:</span>
                  <span className="font-bold text-slate-900">{reporter?.full_name || 'Warga Terdaftar'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID Akun Warga:</span>
                  <span className="font-semibold text-slate-700 text-[11px]">{report.reporter_id.slice(0, 13)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Lapor:</span>
                  <span className="font-bold text-slate-900">{formatDateTime(report.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kategori:</span>
                  <span className="font-bold text-slate-900 capitalize">{CATEGORY_CONFIG[report.category]?.label || report.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tingkat Urgensi:</span>
                  <span className="font-bold text-slate-900 capitalize">{PRIORITY_CONFIG[report.priority]?.label || report.priority}</span>
                </div>
              </div>
            </div>

            {/* Location & Officer */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-900 uppercase font-mono text-[11px] border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Lokasi & Penugasan Wilayah
              </h4>
              <div className="space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Wilayah Kerja:</span>
                  <span className="font-bold text-slate-900">{wilayah?.name || 'Zona Terpusat Kota'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Saat Ini:</span>
                  <span className="font-bold text-slate-900">{STATUS_CONFIG[report.status]?.label || report.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Petugas Ditugaskan:</span>
                  <span className="font-bold text-slate-900">{assignedPetugas?.full_name || 'Dalam Antrean Dinas'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Koordinat GPS:</span>
                  <span className="font-bold text-slate-700 text-[11px]">
                    {report.latitude ? `${report.latitude.toFixed(5)}, ${report.longitude?.toFixed(5)}` : 'Sesuai Alamat'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Title & Description Section */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Uraian Pokok Laporan:</span>
            <h3 className="font-display font-extrabold text-base text-slate-950">{report.title}</h3>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{report.description}</p>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
              <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span>{report.address || 'Alamat lokasi terekam secara presisi'}</span>
            </div>
          </div>

          {/* ═══════ REAL SCANNABLE QR CODE & VERIFICATION LINK ═══════ */}
          <div className="border-t-2 border-dashed border-slate-300 pt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            
            {/* Real Dynamic QR Code Matrix */}
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-white border-2 border-slate-900 rounded-xl p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm">
                <img
                  src={qrCodeImageUrl}
                  alt={`QR Code Verifikasi ${report.ticket_id}`}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-950 text-xs">
                  Scan QR Code untuk Verifikasi Langsung
                </p>
                <p className="text-slate-500">
                  Arahkan kamera smartphone ke QR Code untuk membuka riwayat penanganan live di CivicLedger.
                </p>
                
                <div className="flex items-center gap-2 pt-1 font-mono text-[10px]">
                  <button
                    onClick={handleCopyVerifyUrl}
                    className="text-[#0EA58D] font-bold hover:underline flex items-center gap-1 print:hidden"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Tautan Tersalin' : 'Salin Tautan Web'}</span>
                  </button>
                  <span className="text-slate-300">|</span>
                  <a
                    href={verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-800 flex items-center gap-0.5 print:hidden"
                  >
                    <span>Buka Web</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Official Seal */}
            <div className="text-center sm:text-right font-mono">
              <div className="inline-block border-2 border-emerald-600 text-emerald-800 rounded-xl px-4 py-2 bg-emerald-50/70 uppercase font-extrabold text-xs tracking-wider rotate-[-2deg] shadow-xs">
                ✓ DOKUMEN RESMI SAH
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Dicetak pada: {formatDateTime(new Date().toISOString())}</p>
              <p className="text-[9px] text-slate-400 font-mono">ID VERIFIKASI: {report.id.replace(/-/g, '').toUpperCase().slice(0, 16)}</p>
            </div>

          </div>

        </div>

        {/* Footer Note */}
        <div className="bg-slate-50 px-6 sm:px-8 py-3.5 border-t border-slate-200 text-center text-[11px] text-slate-500 font-mono print:hidden">
          Simpan tanda terima resmi ini sebagai bukti pendaftaran tiket untuk keperluan pemantauan atau eskalasi ke dinas kota.
        </div>
      </div>
    </div>
  );
}
