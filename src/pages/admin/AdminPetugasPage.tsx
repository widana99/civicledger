import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, ReportCategory, Wilayah } from '../../types';
import { RoleBadge } from '../../components/Badges';
import { CATEGORY_OPTIONS, CATEGORY_CONFIG } from '../../lib/constants';
import { Plus, Wrench, Map, X, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

export function AdminPetugasPage() {
  const [petugas, setPetugas] = useState<Profile[]>([]);
  const [wilayahs, setWilayahs] = useState<Wilayah[]>([]);
  const [specs, setSpecs] = useState<Record<string, ReportCategory[]>>({});
  const [loading, setLoading] = useState(true);
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [activePetugas, setActivePetugas] = useState<Profile | null>(null);
  const [selectedCats, setSelectedCats] = useState<ReportCategory[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const [petugasRes, wilayahRes, specsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'petugas').order('full_name'),
      supabase.from('wilayah').select('*').order('name'),
      supabase.from('petugas_spesialisasi').select('petugas_id, category'),
    ]);
    setPetugas((petugasRes.data as Profile[]) || []);
    setWilayahs((wilayahRes.data as Wilayah[]) || []);
    const specMap: Record<string, ReportCategory[]> = {};
    ((specsRes.data as any[]) || []).forEach((s) => {
      if (!specMap[s.petugas_id]) specMap[s.petugas_id] = [];
      specMap[s.petugas_id].push(s.category);
    });
    setSpecs(specMap);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openSpecModal = (p: Profile) => {
    setActivePetugas(p);
    setSelectedCats(specs[p.id] || []);
    setShowSpecModal(true);
  };

  const toggleCat = (cat: ReportCategory) => {
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleSaveSpecs = async () => {
    if (!activePetugas) return;
    setSaving(true);
    await supabase.from('petugas_spesialisasi').delete().eq('petugas_id', activePetugas.id);
    if (selectedCats.length > 0) {
      await supabase.from('petugas_spesialisasi').insert(
        selectedCats.map(c => ({ petugas_id: activePetugas.id, category: c }))
      );
    }
    setSaving(false);
    setShowSpecModal(false);
    fetchAll();
  };

  const toggleActive = async (p: Profile) => {
    await supabase.from('profiles').update({ is_active: !p.is_active }).eq('id', p.id);
    fetchAll();
  };

  const wilayahName = (id: string | null) => wilayahs.find(w => w.id === id)?.name || '-';

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}</div>;
  }

  return (
    <div className="animate-slide-up">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Kelola Petugas</h1>
        <p className="text-neutral-500 text-sm mt-1">Daftar petugas lapangan dan spesialisasi mereka</p>
      </div>

      {petugas.length === 0 ? (
        <div className="card p-12 text-center">
          <Wrench className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 mb-2">Belum ada petugas terdaftar</p>
          <p className="text-sm text-neutral-400">Petugas dapat mendaftar melalui halaman pendaftaran dengan peran Petugas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {petugas.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-success-500 to-success-700 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {p.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-neutral-900">{p.full_name}</h3>
                    <RoleBadge role={p.role} />
                    {!p.is_active && <span className="badge bg-neutral-100 text-neutral-500">Nonaktif</span>}
                  </div>
                  <p className="text-sm text-neutral-500 truncate">{p.email}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
                    <Map className="w-3 h-3" /> {wilayahName(p.wilayah_id)}
                  </div>
                  {(specs[p.id] || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {specs[p.id].map((cat) => (
                        <span key={cat} className="badge bg-primary-50 text-primary-700 text-[10px]">
                          {CATEGORY_CONFIG[cat].label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => openSpecModal(p)} className="btn-secondary btn-sm">
                    <Wrench className="w-3.5 h-3.5" /> Spesialisasi
                  </button>
                  <button onClick={() => toggleActive(p)} className={`btn-sm ${p.is_active ? 'btn-ghost' : 'btn-secondary'}`}>
                    {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSpecModal && activePetugas && (
        <div className="fixed inset-0 bg-neutral-900/40 z-50 flex items-center justify-center p-4" onClick={() => setShowSpecModal(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-neutral-900">Spesialisasi Petugas</h3>
                <p className="text-xs text-neutral-500">{activePetugas.full_name}</p>
              </div>
              <button onClick={() => setShowSpecModal(false)} className="text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-neutral-600 mb-3">Pilih kategori yang dikuasai petugas ini</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleCat(opt.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    selectedCats.includes(opt.value)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  {selectedCats.includes(opt.value) && <CheckCircle2 className="w-4 h-4" />}
                  {opt.label}
                </button>
              ))}
            </div>
            <button onClick={handleSaveSpecs} disabled={saving} className="btn-primary w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
