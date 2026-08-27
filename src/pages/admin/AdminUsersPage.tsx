import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, Role } from '../../types';
import { RoleBadge } from '../../components/Badges';
import {
  Users, Search, AlertCircle, Loader2,
  CheckCircle, XCircle, RefreshCw, UserX
} from 'lucide-react';

export function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    const { data, error } = await query;
    if (data) {
      setUsers(data as Profile[]);
    } else if (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdatingId(userId);
    setMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      setMessage({ type: 'error', text: 'Gagal memperbarui role pengguna: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Role pengguna berhasil diperbarui!' });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    }
    setUpdatingId(null);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    setUpdatingId(userId);
    setMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', userId);

    if (error) {
      setMessage({ type: 'error', text: 'Gagal mengubah status keaktifan: ' + error.message });
    } else {
      setMessage({
        type: 'success',
        text: `Akun berhasil ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}!`,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
      );
    }
    setUpdatingId(null);
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const pendingPetugasCount = users.filter((u) => u.role === 'petugas' && !u.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-[#16233D]" />
            <h1 className="font-display text-2xl font-bold text-[#16233D]">Kelola Pengguna</h1>
          </div>
          <p className="text-xs font-mono text-[#5A6372] uppercase tracking-wider">
            Manajemen Akun Warga & Akses Administrator
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="btn-secondary btn-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Data
        </button>
      </div>

      {/* Pending Officer Approval Alert Banner */}
      {pendingPetugasCount > 0 && (
        <div className="p-4 rounded-[4px] border border-[#D4A843]/40 bg-[#D4A843]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-down">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[4px] bg-[#D4A843] text-[#16233D] flex items-center justify-center font-bold text-sm">
              {pendingPetugasCount}
            </div>
            <div>
              <div className="text-xs font-bold text-[#16233D]">
                Ada {pendingPetugasCount} Petugas Lapangan Baru Menunggu Persetujuan Akun
              </div>
              <div className="text-[11px] text-[#5A6372]">
                Petugas baru telah mendaftar melalui aplikasi mobile dan membutuhkan aktivasi dari Admin untuk bertugas.
              </div>
            </div>
          </div>
          <button
            onClick={() => setRoleFilter('petugas')}
            className="btn-primary btn-sm text-xs font-bold whitespace-nowrap self-start sm:self-auto"
          >
            Tinjau & Aktifkan Petugas
          </button>
        </div>
      )}

      {message && (
        <div
          className={`p-3.5 rounded-[4px] border text-xs font-semibold flex items-center gap-2 animate-slide-down ${
            message.type === 'success'
              ? 'bg-[#2E8B7F]/10 border-[#2E8B7F]/30 text-[#2E8B7F]'
              : 'bg-[#C1503D]/10 border-[#C1503D]/30 text-[#C1503D]'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Filter bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8891A0]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama atau email..."
            className="input pl-10 text-xs py-2"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'masyarakat', 'admin', 'petugas'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold uppercase tracking-wider border transition-colors whitespace-nowrap ${
                roleFilter === r
                  ? 'bg-[#16233D] text-white border-[#16233D]'
                  : 'bg-white text-[#5A6372] border-[#E2E4E0] hover:bg-[#EFF1EC]'
              }`}
            >
              {r === 'all' ? 'Semua Role' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Users List Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-[#8891A0] gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#16233D]" />
            <span className="text-xs font-mono">Memuat daftar pengguna...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-[#8891A0]">
            <UserX className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-[#16233D]">Tidak Ada Pengguna Ditemukan</p>
            <p className="text-xs text-[#5A6372] mt-1">Coba atur ulang pencarian atau filter role.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#16233D] text-[#F6F7F5] font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Role Saat Ini</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4">Ubah Role</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E4E0]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F6F7F5] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[4px] bg-[#16233D] text-white flex items-center justify-center font-bold text-xs">
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[#16233D]">{u.full_name}</div>
                          <div className="text-[11px] font-mono text-[#5A6372]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-3.5 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E8B7F]">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C1503D]">
                          <XCircle className="w-3.5 h-3.5" />
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        className="bg-white border border-[#E2E4E0] rounded-[4px] px-2 py-1 text-xs font-semibold text-[#16233D] focus:outline-none focus:border-[#16233D]"
                      >
                        <option value="masyarakat">Warga (masyarakat)</option>
                        <option value="admin">Admin System</option>
                        <option value="petugas">Petugas Lapangan</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        disabled={updatingId === u.id}
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                        className={`btn-sm text-[11px] ${
                          u.is_active ? 'btn-secondary text-[#C1503D]' : 'btn-primary'
                        }`}
                      >
                        {updatingId === u.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : u.is_active ? (
                          'Nonaktifkan'
                        ) : (
                          'Aktifkan'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
