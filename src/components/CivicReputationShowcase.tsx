import React, { useState } from 'react';
import { CivicBadge3D, CivicBadgeType, CIVIC_BADGES } from './CivicBadge3D';
import { ShieldCheck, Award, Sparkles, HelpCircle, ArrowRight, Lock } from 'lucide-react';
import { Role } from '../types';

interface CivicReputationShowcaseProps {
  userRole?: Role;
  totalReports?: number;
  verifiedReports?: number;
  className?: string;
}

export function CivicReputationShowcase({
  userRole = 'masyarakat',
  totalReports = 12,
  verifiedReports = 11,
  className = '',
}: CivicReputationShowcaseProps) {
  // Determine primary badge based on role and activity
  const activeBadgeType: CivicBadgeType =
    userRole === 'admin'
      ? 'pengawas_kota'
      : userRole === 'petugas'
      ? 'petugas_siaga'
      : verifiedReports >= 10
      ? 'warga_teladan'
      : 'terverifikasi';

  const [selectedBadge, setSelectedBadge] = useState<CivicBadgeType>(activeBadgeType);
  const activeConfig = CIVIC_BADGES[selectedBadge];

  const allBadges: { type: CivicBadgeType; unlocked: boolean; req: string }[] = [
    {
      type: 'warga_teladan',
      unlocked: verifiedReports >= 10 || userRole === 'admin',
      req: 'Min. 10 Laporan Terverifikasi',
    },
    {
      type: 'terverifikasi',
      unlocked: true,
      req: 'Akun Kependudukan Aktif',
    },
    {
      type: 'petugas_siaga',
      unlocked: userRole === 'petugas' || userRole === 'admin',
      req: 'Khusus Petugas Penanganan Lapangan',
    },
    {
      type: 'pengawas_kota',
      unlocked: userRole === 'admin',
      req: 'Khusus Administrator & Pengawas Kota',
    },
  ];

  return (
    <div className={`rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden text-slate-100 ${className}`}>
      {/* Ambient background glow */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{
          backgroundColor: `#${activeConfig.primaryColor.toString(16).padStart(6, '0')}`,
        }}
      />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-10 pointer-events-none bg-emerald-500" />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="tracking-widest uppercase font-semibold">Smart City Civic Credential</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Lencana & Kredensial Holografis 3D
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
            Setiap kontribusi pelaporan dan penyelesaian perbaikan kota diverifikasi di atas ledger cerdas. Sentuh dan putar lencana 3D untuk menginspeksi rincian kriptografisnya.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Integritas Ledger 100%</span>
        </div>
      </div>

      {/* Main Showcase Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left: 3D Interactive Hero Badge Viewer */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 relative">
          <div className="relative flex flex-col items-center">
            <CivicBadge3D
              badgeType={selectedBadge}
              size="lg"
              interactive={true}
              showLabel={false}
            />
            <div className="text-center mt-3">
              <span className="text-sm font-bold text-white block">{activeConfig.title}</span>
              <span className="text-[11px] font-mono text-amber-400 block mt-0.5">{activeConfig.tier}</span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">Klik lencana untuk rotasi 360° & cek SHA-256</span>
            </div>
          </div>
        </div>

        {/* Right: Badge Matrix & Civic Impact Metrics */}
        <div className="lg:col-span-7 space-y-6">
          {/* Badge Selector Grid */}
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-3">
              Pilih Lencana untuk Pratinjau 3D:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {allBadges.map((b) => {
                const cfg = CIVIC_BADGES[b.type];
                const isSelected = selectedBadge === b.type;

                return (
                  <button
                    key={b.type}
                    onClick={() => setSelectedBadge(b.type)}
                    className={`relative p-3 rounded-2xl border text-left transition-all duration-300 flex flex-col items-center justify-between ${
                      isSelected
                        ? 'bg-slate-800/90 border-amber-400/60 shadow-lg shadow-amber-500/10 scale-[1.02]'
                        : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-16 h-16 relative flex items-center justify-center pointer-events-none">
                      <CivicBadge3D badgeType={b.type} size="sm" interactive={false} />
                      {!b.unlocked && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] rounded-xl flex items-center justify-center">
                          <Lock className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-center mt-2 text-slate-200 line-clamp-1 block w-full">
                      {cfg.title}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full mt-1 ${
                        b.unlocked
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {b.unlocked ? 'Diraih' : 'Terkunci'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Info Card for Selected Badge */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Kriteria Pencapaian</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400">Ledger Verified</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{activeConfig.description}</p>
            <div className="text-[11px] font-mono text-amber-300/90 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
              Syarat: {activeConfig.criteria}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/50">
              {activeConfig.stats.map((st, i) => (
                <div key={i} className="text-center">
                  <span className="text-[9px] font-mono text-slate-400 block uppercase">{st.label}</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{st.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
