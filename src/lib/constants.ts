import { ReportStatus, ReportPriority, ReportCategory, Role } from '../types';

export const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; badge: string; icon: string }> = {
  pending: { label: 'Menunggu Verifikasi', color: 'text-warning-700', badge: 'bg-warning-100 text-warning-700', icon: 'Clock' },
  verified: { label: 'Terverifikasi', color: 'text-primary-700', badge: 'bg-primary-100 text-primary-700', icon: 'CheckCircle' },
  assigned: { label: 'Ditugaskan', color: 'text-accent-700', badge: 'bg-accent-100 text-accent-700', icon: 'UserCheck' },
  in_progress: { label: 'Sedang Dikerjakan', color: 'text-accent-700', badge: 'bg-accent-100 text-accent-700', icon: 'Loader' },
  completed: { label: 'Selesai', color: 'text-success-700', badge: 'bg-success-100 text-success-700', icon: 'CheckCircle2' },
  rejected: { label: 'Ditolak', color: 'text-error-700', badge: 'bg-error-100 text-error-700', icon: 'XCircle' },
};

export const PRIORITY_CONFIG: Record<ReportPriority, { label: string; badge: string }> = {
  low: { label: 'Rendah', badge: 'bg-neutral-100 text-neutral-600' },
  medium: { label: 'Sedang', badge: 'bg-primary-100 text-primary-700' },
  high: { label: 'Tinggi', badge: 'bg-accent-100 text-accent-700' },
  urgent: { label: 'Darurat', badge: 'bg-error-100 text-error-700' },
};

export const CATEGORY_CONFIG: Record<ReportCategory, { label: string; icon: string; color: string }> = {
  infrastruktur: { label: 'Infrastruktur', icon: 'Construction', color: 'text-primary-600' },
  lingkungan: { label: 'Lingkungan', icon: 'Trees', color: 'text-success-600' },
  kebersihan: { label: 'Kebersihan', icon: 'Trash2', color: 'text-accent-600' },
  pelayanan: { label: 'Pelayanan Publik', icon: 'Building2', color: 'text-primary-600' },
  keamanan: { label: 'Keamanan', icon: 'ShieldAlert', color: 'text-error-600' },
  lainnya: { label: 'Lainnya', icon: 'Tag', color: 'text-neutral-500' },
};

export const ROLE_CONFIG: Record<Role, { label: string; badge: string }> = {
  masyarakat: { label: 'Masyarakat', badge: 'bg-primary-100 text-primary-700' },
  admin: { label: 'Admin', badge: 'bg-accent-100 text-accent-700' },
  petugas: { label: 'Petugas', badge: 'bg-success-100 text-success-700' },
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

export function timeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return formatDate(date);
}
