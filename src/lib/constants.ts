import { ReportStatus, ReportPriority, ReportCategory, Role } from '../types';

export const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; badge: string; icon: string }> = {
  pending: { label: 'Menunggu Verifikasi', color: 'text-amber-600', badge: 'bg-amber-500/10 text-amber-700 border border-amber-500/20 backdrop-blur-sm', icon: 'Clock' },
  verified: { label: 'Terverifikasi', color: 'text-sky-600', badge: 'bg-sky-500/10 text-sky-700 border border-sky-500/20 backdrop-blur-sm', icon: 'CheckCircle' },
  assigned: { label: 'Ditugaskan', color: 'text-indigo-600', badge: 'bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 backdrop-blur-sm', icon: 'UserCheck' },
  in_progress: { label: 'Sedang Dikerjakan', color: 'text-teal-600', badge: 'bg-teal-500/10 text-teal-700 border border-teal-500/20 backdrop-blur-sm', icon: 'Loader' },
  completed: { label: 'Selesai', color: 'text-emerald-600', badge: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 backdrop-blur-sm', icon: 'CheckCircle2' },
  rejected: { label: 'Ditolak', color: 'text-rose-600', badge: 'bg-rose-500/10 text-rose-700 border border-rose-500/20 backdrop-blur-sm', icon: 'XCircle' },
};

export const PRIORITY_CONFIG: Record<ReportPriority, { label: string; badge: string }> = {
  low: { label: 'Rendah', badge: 'bg-slate-500/10 text-slate-600 border border-slate-500/15 backdrop-blur-sm' },
  medium: { label: 'Sedang', badge: 'bg-sky-500/10 text-sky-700 border border-sky-500/20 backdrop-blur-sm' },
  high: { label: 'Tinggi', badge: 'bg-amber-500/10 text-amber-700 border border-amber-500/20 backdrop-blur-sm font-semibold' },
  urgent: { label: 'Darurat', badge: 'bg-rose-500/10 text-rose-700 border border-rose-500/25 backdrop-blur-sm font-bold animate-pulse' },
};

export const CATEGORY_CONFIG: Record<ReportCategory, { label: string; icon: string; color: string }> = {
  infrastruktur: { label: 'Infrastruktur', icon: 'Construction', color: 'text-sky-600' },
  lingkungan: { label: 'Lingkungan', icon: 'Trees', color: 'text-emerald-600' },
  kebersihan: { label: 'Kebersihan', icon: 'Trash2', color: 'text-teal-600' },
  pelayanan: { label: 'Pelayanan Publik', icon: 'Building2', color: 'text-indigo-600' },
  keamanan: { label: 'Keamanan', icon: 'ShieldAlert', color: 'text-rose-600' },
  lainnya: { label: 'Lainnya', icon: 'Tag', color: 'text-slate-500' },
};

export const ROLE_CONFIG: Record<Role, { label: string; badge: string }> = {
  masyarakat: { label: 'Masyarakat', badge: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 backdrop-blur-sm' },
  admin: { label: 'Admin', badge: 'bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 backdrop-blur-sm' },
  petugas: { label: 'Petugas', badge: 'bg-amber-500/10 text-amber-700 border border-amber-500/20 backdrop-blur-sm' },
};

export const STATUS_ORDER: ReportStatus[] = ['pending', 'verified', 'assigned', 'in_progress', 'completed'];

export const CATEGORY_OPTIONS: { value: ReportCategory; label: string }[] = [
  { value: 'infrastruktur', label: 'Infrastruktur' },
  { value: 'lingkungan', label: 'Lingkungan' },
  { value: 'kebersihan', label: 'Kebersihan' },
  { value: 'pelayanan', label: 'Pelayanan Publik' },
  { value: 'keamanan', label: 'Keamanan' },
  { value: 'lainnya', label: 'Lainnya' },
];

export const PRIORITY_OPTIONS: { value: ReportPriority; label: string }[] = [
  { value: 'low', label: 'Rendah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'high', label: 'Tinggi' },
  { value: 'urgent', label: 'Darurat' },
];

export function normalizeReportStatus(val: any): ReportStatus {
  if (!val) return 'pending';
  const str = String(val).toLowerCase().trim();
  if (str === 'pending' || str.includes('menunggu')) return 'pending';
  if (str === 'verified' || str.includes('terverifikasi')) return 'verified';
  if (str === 'assigned' || str.includes('ditugaskan')) return 'assigned';
  if (str === 'in_progress' || str.includes('dikerjakan') || str.includes('proses')) return 'in_progress';
  if (str === 'completed' || str.includes('selesai')) return 'completed';
  if (str === 'rejected' || str.includes('ditolak')) return 'rejected';
  return 'pending';
}

export function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(date: string | null): string {
  if (!date) return '-';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Baru saja';
  if (diffMin < 60) return `${diffMin}m lalu`;
  if (diffHour < 24) return `${diffHour}j lalu`;
  if (diffDay < 7) return `${diffDay}h lalu`;
  return formatDate(date);
}

export const SLA_CONFIG: Record<ReportCategory, { minDays: number; maxDays: number; label: string }> = {
  infrastruktur: { minDays: 3, maxDays: 5, label: '3 - 5 Hari Kerja' },
  lingkungan: { minDays: 2, maxDays: 4, label: '2 - 4 Hari Kerja' },
  kebersihan: { minDays: 1, maxDays: 2, label: '1 - 2 Hari Kerja' },
  pelayanan: { minDays: 1, maxDays: 3, label: '1 - 3 Hari Kerja' },
  keamanan: { minDays: 1, maxDays: 2, label: '1 - 2 Hari Kerja' },
  lainnya: { minDays: 2, maxDays: 4, label: '2 - 4 Hari Kerja' },
};

export function getEstimatedCompletionInfo(createdAt: string, category: ReportCategory) {
  const sla = SLA_CONFIG[category] || SLA_CONFIG.lainnya;
  const created = new Date(createdAt);
  const targetDate = new Date(created.getTime() + sla.maxDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays < 0;

  return {
    slaLabel: sla.label,
    targetDate,
    formattedTargetDate: targetDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    diffDays,
    isOverdue,
  };
}
