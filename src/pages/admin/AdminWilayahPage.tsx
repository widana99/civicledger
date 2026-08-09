import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Wilayah } from '../../types';
import { Plus, Map, Pencil, Trash2, X, Loader2 } from 'lucide-react';

export function AdminWilayahPage() {
  const [wilayahs, setWilayahs] = useState<Wilayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchWilayah = async () => {
    const { data } = await supabase.from('wilayah').select('*').order('name');
    setWilayahs((data as Wilayah[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchWilayah(); }, []);

  const openAdd = () => { setEditId(null); setName(''); setCode(''); setShowModal(true); };
  const openEdit = (w: Wilayah) => { setEditId(w.id); setName(w.name); setCode(w.code); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setSaving(true);
    if (editId) {
      await supabase.from('wilayah').update({ name: name.trim(), code: code.trim().toUpperCase() }).eq('id', editId);
    } else {
      await supabase.from('wilayah').insert({ name: name.trim(), code: code.trim().toUpperCase() });
    }
    setSaving(false);
    setShowModal(false);
    fetchWilayah();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus wilayah ini?')) return;
    await supabase.from('wilayah').delete().eq('id', id);
    fetchWilayah();
  };

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Kelola Wilayah</h1>
          <p className="text-neutral-500 text-sm mt-1">Daftar area/wilayah untuk penugasan petugas</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Tambah</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16" />)}</div>
      ) : wilayahs.length === 0 ? (
        <div className="card p-12 text-center">
          <Map className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 mb-4">Belum ada wilayah</p>
          <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Tambah Wilayah</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {wilayahs.map((w) => (
            <div key={w.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                    <Map className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900">{w.name}</div>
                    <div className="text-xs font-mono text-neutral-500">{w.code}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(w)} className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(w.id)} className="p-2 rounded-lg text-neutral-400 hover:bg-error-50 hover:text-error-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-neutral-900/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-900">{editId ? 'Edit Wilayah' : 'Tambah Wilayah'}</h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Nama Wilayah</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Bandung" className="input" required />
              </div>
              <div>
                <label className="label">Kode Wilayah</label>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Contoh: BDG" className="input" required />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
