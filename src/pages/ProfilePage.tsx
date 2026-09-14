import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RoleBadge } from '../components/Badges';
import { CivicBadge3D, CivicBadgeType } from '../components/CivicBadge3D';
import { CivicReputationShowcase } from '../components/CivicReputationShowcase';
import { User, Mail, Phone, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';

export function ProfilePage() {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!profile) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('profiles').update({
      full_name: fullName,
      phone: phone || null,
    }).eq('id', profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const primaryBadge: CivicBadgeType =
    profile.role === 'admin'
      ? 'pengawas_kota'
      : profile.role === 'petugas'
      ? 'petugas_siaga'
      : 'warga_teladan';

  return (
    <div className="max-w-4xl mx-auto animate-slide-up space-y-8 pb-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white">
            Profil & Reputasi Warga
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Kelola data diri dan pantau lencana penghargaan digital Smart City Anda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Col: Profile & Form */}
        <div className="md:col-span-7 space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/20">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-lg text-neutral-900 dark:text-white">{profile.full_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <RoleBadge role={profile.role} />
                  <span className="text-xs font-mono text-neutral-400">• Terdaftar di Ledger</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label flex items-center gap-2">
                  <User className="w-4 h-4 text-neutral-500" /> Nama Lengkap
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <Mail className="w-4 h-4 text-neutral-500" /> Email Resmi
                </label>
                <input
                  value={profile.email}
                  disabled
                  className="input bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500"
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <Phone className="w-4 h-4 text-neutral-500" /> Nomor Telepon
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="input"
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : null}
                {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan Perubahan'}
              </button>
            </form>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Informasi Akun</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Peran Sistem</span>
                <RoleBadge role={profile.role} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Status Akun</span>
                <span className={`badge ${profile.is_active ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-500'}`}>
                  {profile.is_active ? 'Aktif Terverifikasi' : 'Nonaktif'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Bergabung Sejak</span>
                <span className="text-neutral-700 dark:text-neutral-300 font-mono text-xs">
                  {new Date(profile.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Primary 3D Holographic Token Card */}
        <div className="md:col-span-5 flex flex-col">
          <div className="card p-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl flex-1 relative overflow-hidden">
            <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Lencana Kehormatan Aktif</span>
            </div>

            <div className="my-3">
              <CivicBadge3D
                badgeType={primaryBadge}
                size="md"
                interactive={true}
                showLabel={false}
              />
            </div>

            <h3 className="font-bold text-lg text-white mt-2">
              {profile.role === 'admin'
                ? 'Pengawas Tata Kota'
                : profile.role === 'petugas'
                ? 'Petugas Respon Cepat'
                : 'Warga Teladan'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              Token reputasi 3D ini dienkripsi pada jaringan civic ledger dan merefleksikan kontribusi aktif Anda.
            </p>

            <span className="mt-4 text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
              Hover/Geser untuk miringkan • Klik untuk 360°
            </span>
          </div>
        </div>
      </div>

      {/* Full 3D Reputation & Badges Showcase */}
      <CivicReputationShowcase userRole={profile.role} />
    </div>
  );
}

