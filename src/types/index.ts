export type Role = 'masyarakat' | 'admin' | 'petugas';

export type ReportStatus =
  | 'pending'
  | 'verified'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'rejected';

export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ReportCategory =
  | 'infrastruktur'
  | 'lingkungan'
  | 'kebersihan'
  | 'pelayanan'
  | 'keamanan'
  | 'lainnya';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
  wilayah_id: string | null;
  department?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Wilayah {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Report {
  id: string;
  ticket_id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  priority: ReportPriority;
  address: string;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  photo_urls?: string[];
  video_url?: string | null;
  completion_photo_urls?: string[];
  completion_video_url?: string | null;
  reporter_id: string;
  wilayah_id: string | null;
  assigned_petugas_id: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  rejected_reason: string | null;
  is_anonymous?: boolean;
  sla_deadline?: string | null;
  estimated_completion_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusLog {
  id: string;
  report_id: string;
  from_status: ReportStatus | null;
  to_status: ReportStatus;
  changed_by: string;
  note: string | null;
  created_at: string;
}

export interface CompletionProof {
  id: string;
  report_id: string;
  photo_url: string;
  photo_urls?: string[];
  video_url?: string | null;
  note: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface Upvote {
  id: string;
  report_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  report_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Rating {
  id: string;
  report_id: string;
  user_id: string;
  score: number;
  note: string | null;
  created_at: string;
}

export interface PetugasSpesialisasi {
  id: string;
  petugas_id: string;
  category: ReportCategory;
  created_at: string;
}

export interface ReportWithRelations extends Report {
  reporter?: Profile;
  wilayah?: Wilayah | null;
  assigned_petugas?: Profile | null;
  upvotes?: { count: number }[];
  completion_proofs?: CompletionProof[];
}

export type NotificationType = 'status_change' | 'comment' | 'assignment' | 'escalation' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  report_id: string | null;
  created_at: string;
}
