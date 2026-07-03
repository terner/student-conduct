-- Fill index gaps for foreign keys and high-traffic filters used by the app.

-- Foreign keys without a matching leading-column index.
create index if not exists idx_bond_documents_academic_year_id
  on public.bond_documents (academic_year_id);

create index if not exists idx_bond_documents_approved_by
  on public.bond_documents (approved_by);

create index if not exists idx_bond_documents_generated_by
  on public.bond_documents (generated_by);

create index if not exists idx_bond_documents_student_id
  on public.bond_documents (student_id);

create index if not exists idx_intervention_logs_academic_year_id
  on public.intervention_logs (academic_year_id);

create index if not exists idx_intervention_logs_contacted_guardian_id
  on public.intervention_logs (contacted_guardian_id);

create index if not exists idx_intervention_logs_recorded_by
  on public.intervention_logs (recorded_by);

create index if not exists idx_intervention_logs_related_transaction_id
  on public.intervention_logs (related_transaction_id);

create index if not exists idx_intervention_logs_student_id
  on public.intervention_logs (student_id);

create index if not exists idx_monthly_reports_academic_year_id
  on public.monthly_reports (academic_year_id);

create index if not exists idx_monthly_reports_classroom_id
  on public.monthly_reports (classroom_id);

create index if not exists idx_pdpa_consents_accepted_by
  on public.pdpa_consents (accepted_by);

create index if not exists idx_role_permissions_permission_id
  on public.role_permissions (permission_id);

create index if not exists idx_score_transactions_approved_by
  on public.score_transactions (approved_by);

create index if not exists idx_score_transactions_voided_by
  on public.score_transactions (voided_by);

create index if not exists idx_settings_updated_by
  on public.settings (updated_by);

create index if not exists idx_student_guardians_guardian_id
  on public.student_guardians (guardian_id);

create index if not exists idx_teacher_classrooms_assigned_by
  on public.teacher_classrooms (assigned_by);

-- Status and ordering filters used repeatedly by dashboard, report, and list queries.
create index if not exists idx_students_current_status
  on public.students (current_status);

create index if not exists idx_students_classroom_status
  on public.students (classroom_id, current_status);

create index if not exists idx_student_enrollments_status
  on public.student_enrollments (enrollment_status);

create index if not exists idx_student_enrollments_student_year_status_created
  on public.student_enrollments (student_id, academic_year_id, enrollment_status, created_at desc);

create index if not exists idx_score_transactions_status
  on public.score_transactions (status);

create index if not exists idx_score_transactions_recorded_at
  on public.score_transactions (recorded_at desc);

create index if not exists idx_score_transactions_student_year_status
  on public.score_transactions (student_id, academic_year_id, status);

create index if not exists idx_score_transactions_year_status_recorded
  on public.score_transactions (academic_year_id, status, recorded_at desc);

create index if not exists idx_score_transactions_year_status_created_recorded
  on public.score_transactions (academic_year_id, status, created_at desc, recorded_at desc);

create index if not exists idx_notifications_recipient_created_at
  on public.notifications (recipient_id, created_at desc);

create index if not exists idx_notifications_recipient_read_at
  on public.notifications (recipient_id, read_at);

create index if not exists idx_notifications_created_at
  on public.notifications (created_at desc);

create index if not exists idx_bond_documents_status
  on public.bond_documents (status);

create index if not exists idx_intervention_logs_created_at
  on public.intervention_logs (created_at desc);

create index if not exists idx_monthly_reports_status
  on public.monthly_reports (status);

create index if not exists idx_action_logs_created_at
  on public.action_logs (created_at desc);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs (created_at desc);
