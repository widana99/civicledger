import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RoleBadge } from '../components/Badges';
import { User, Mail, Phone, Map, Loader2, CheckCircle2 } from 'lucide-react';

export function ProfilePage() {
  const { profile, signOut } = useAuth();
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

  return (
    <div className="max-w-xl mx-auto animate-slide-up">
      <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">Profil Saya</h1>

      <div className="card p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-xl">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-lg text-neutral-900">{profile.full_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <RoleBadge role={profile.role} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label flex items-center gap-2"><User className="w-4 h-4 text-neutral-500" /> Nama Lengkap</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label flex items-center gap-2"><Mail className="w-4 h-4 text-neutral-500" /> Email</label>
            <input value={profile.email} disabled className="input bg-neutral-50 text-neutral-500" />
          </div>
          <div>
            <label className="label flex items-center gap-2"><Phone className="w-4 h-4 text-neutral-500" /> Nomor Telepon</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" className="input" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : null}
            {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-neutral-900 mb-2">Informasi Akun</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Peran</span>
            <RoleBadge role={profile.role} />
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Status</span>
            <span className={`badge ${profile.is_active ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-500'}`}>
              {profile.is_active ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Bergabung</span>
            <span className="text-neutral-700">{new Date(profile.created_at).toLocaleDateString('id-ID')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
