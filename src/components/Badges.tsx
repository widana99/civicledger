import { ReportStatus, ReportPriority, ReportCategory, Role } from '../types';
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG, ROLE_CONFIG } from '../lib/constants';
import {
  Clock, CheckCircle, UserCheck, Loader, CheckCircle2, XCircle,
  Construction, Trees, Trash2, Building2, ShieldAlert, Tag,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Clock, CheckCircle, UserCheck, Loader, CheckCircle2, XCircle,
  Construction, Trees, Trash2, Building2, ShieldAlert, Tag,
};

export function StatusBadge({ status, size = 'sm' }: { status: ReportStatus; size?: 'sm' | 'xs' }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = ICON_MAP[cfg.icon] || Clock;
  const sizeCls = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`badge ${cfg.badge} ${sizeCls}`}>
      <Icon className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {cfg.label}
    </span>
  );
}

export function PriorityBadge({ priority, size = 'sm' }: { priority: ReportPriority; size?: 'sm' | 'xs' }) {
  const cfg = PRIORITY_CONFIG[priority];
  const sizeCls = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return <span className={`badge ${cfg.badge} ${sizeCls}`}>{cfg.label}</span>;
}

export function CategoryBadge({ category, withIcon = true, size = 'sm' }: { category: ReportCategory; withIcon?: boolean; size?: 'sm' | 'xs' }) {
  const cfg = CATEGORY_CONFIG[category];
  const Icon = ICON_MAP[cfg.icon] || Tag;
  const sizeCls = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`badge bg-neutral-100 text-neutral-600 ${sizeCls}`}>
      {withIcon && <Icon className={`${size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${cfg.color}`} />}
      {cfg.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role];
  return <span className={`badge ${cfg.badge}`}>{cfg.label}</span>;
}
