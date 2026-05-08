export * from './config';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type UserRole = 'admin' | 'teacher' | 'student';

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

export interface ScoreTransaction {
  id: string;
  student_id: string;
  category_id: string;
  points: number;
  note?: string;
  recorded_by: string;
  recorded_at: string;
  academic_year: string;
  status?: 'pending' | 'approved' | 'rejected' | 'voided';
  approved_by?: string;
  approved_at?: string;
  voided_by?: string;
  voided_at?: string;
  void_reason?: string;
}
