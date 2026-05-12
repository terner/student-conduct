export * from './config';

// ─── API ───
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'XSS_DETECTED';

// ─── Auth ───
export type UserRole = 'superadmin' | 'admin' | 'teacher' | 'student';

export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at?: string;
  avatar_url?: string;
  phone?: string;
  created_at: string;
}

// ─── Student ───
export type StudentStatus = 'active' | 'inactive' | 'transferred' | 'graduated' | 'suspended';

export interface Student {
  id: string;
  profile_id: string;
  student_id_number: string;
  classroom_id: string;
  current_status: StudentStatus;
  // Joined fields
  first_name?: string;
  last_name?: string;
  classroom_name?: string;
  grade_level?: number;
  education_stage_name?: string;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  classroom_id: string;
  academic_year_id: string;
  class_number: number;
  enrollment_status: 'active' | 'promoted' | 'repeated' | 'transferred' | 'inactive' | 'graduated';
  previous_enrollment_id?: string;
  created_at: string;
}

// ─── Classroom ───
export interface Classroom {
  id: string;
  name: string;
  education_stage_id: string;
  education_stage_name?: string;
  grade_level_id?: string;
  grade_level_name?: string;
  grade_level: number;
  academic_year: string;
}

// ─── Teacher ───
export interface Teacher {
  id: string;
  profile_id: string;
  employee_id?: string;
  prefix?: string;
  phone?: string;
  email?: string;
  department?: string;
  position?: string;
  first_name?: string;
  last_name?: string;
}

export interface TeacherClassroom {
  teacher_id: string;
  classroom_id: string;
  assignment_role: 'homeroom' | 'assistant' | 'subject' | 'discipline';
  assigned_at: string;
}

// ─── Score ───
export type ScoreStatus = 'pending' | 'approved' | 'rejected' | 'voided';

export interface ScoreCategory {
  id: string;
  name: string;
  type: 'deduct' | 'add';
  default_points: number;
  description?: string;
  requires_evidence: boolean;
  requires_approval: boolean;
  is_active: boolean;
}

export interface ScoreTransaction {
  id: string;
  student_id: string;
  category_id: string;
  points: number;
  note?: string;
  recorded_by: string;
  recorded_at: string;
  academic_year: string;
  status: ScoreStatus;
  category_name_at_record?: string;
  category_type_at_record?: 'deduct' | 'add';
  requires_evidence_at_record?: boolean | null;
  requires_approval_at_record?: boolean | null;
  approved_by?: string;
  approved_at?: string;
  voided_by?: string;
  voided_at?: string;
  void_reason?: string;
}

export interface ScoreTransactionEvidence {
  id: string;
  transaction_id: string;
  file_name: string;
  file_url: string;
  file_path?: string;
  storage_provider?: string;
  file_type: string;
  file_size?: number;
  uploaded_by: string;
  uploaded_at: string;
}

// ─── Guardian ───
export interface Guardian {
  id: string;
  prefix?: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  phone: string;
  phone_alt?: string;
  line_id?: string;
  email?: string;
  address?: string;
  created_at: string;
}

export interface StudentGuardian {
  student_id: string;
  guardian_id: string;
  relation: 'father' | 'mother' | 'guardian' | 'relative' | 'other';
  is_primary: boolean;
  can_receive_notifications: boolean;
  can_pickup_student: boolean;
}

// ─── Bond ───
export type BondStatus = 'draft' | 'generated' | 'signed' | 'cancelled';

export interface BondDocument {
  id: string;
  document_no: string;
  student_id: string;
  academic_year_id: string;
  threshold_deducted: number;
  status: BondStatus;
  generated_by: string;
  generated_at: string;
  approved_by?: string;
  signed_at?: string;
  print_count: number;
}

// ─── Intervention ───
export type InterventionType = 'phone_call' | 'parent_meeting' | 'warning' | 'bond' | 'home_visit' | 'counseling' | 'other';
export type ContactMethod = 'phone' | 'line' | 'email' | 'in_person' | 'letter' | 'other';

export interface InterventionLog {
  id: string;
  student_id: string;
  academic_year_id: string;
  intervention_type: InterventionType;
  contacted_guardian_id?: string;
  contact_method: ContactMethod;
  occurred_at: string;
  summary: string;
  outcome?: string;
  next_follow_up_at?: string;
  recorded_by: string;
  created_at: string;
}

// ─── PDPA ───
export interface PdpaConsent {
  id: string;
  profile_id: string;
  consent_version: string;
  accepted: boolean;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
  revoked_at?: string;
}

// ─── Notification ───
export interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body?: string;
  read_at?: string;
  created_at: string;
}

// ─── Logs ───
export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id?: string;
  before_data?: unknown;
  after_data?: unknown;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ActionLog {
  id: string;
  actor_id: string;
  event: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ─── Dashboard ───
export interface DashboardStats {
  total_students: number;
  active_students: number;
  total_classrooms: number;
  total_teachers: number;
  average_score: number;
  at_risk_count: number;
  threshold_reached: number;
  score_distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

// ─── Threshold Report ───
export interface StudentThresholdInfo {
  student_id: string;
  first_name: string;
  last_name: string;
  student_id_number: string;
  classroom_name: string;
  current_score: number;
  deducted_total: number;
  threshold_level: number;
  threshold_index: number;
  threshold_action: string;
  threshold_color: string;
  deduct_count: number;
  add_count: number;
}

// ─── Monthly Report ───
export interface MonthlyReport {
  id: string;
  academic_year_id: string;
  report_month: number;
  report_year: number;
  scope: 'school' | 'grade' | 'classroom';
  classroom_id?: string;
  snapshot: MonthlyReportSnapshot;
  status: 'draft' | 'finalized' | 'cancelled';
  generated_at: string;
  finalized_at?: string;
}

export interface MonthlyReportSnapshot {
  total_deduct: number;
  total_add: number;
  top_categories: { name: string; count: number; points: number }[];
  most_changed_students: { student_id: string; name: string; change: number }[];
  conduct_distribution: { level: string; count: number }[];
}
