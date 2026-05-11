import { z } from 'zod';
import thMessages from '../../../messages/th.json';

// ─── Helpers ───
const thaiPhoneRegex = /^0[0-9]{2}-?[0-9]{3}-?[0-9]{4}$/;
const studentIdRegex = /^\d{10}$/;
const thaiNameRegex = /^[฀-๿ a-zA-Zก-ฮ]+$/;

const validationMessages = thMessages.validation;
const interpolate = (value: string, params: Record<string, string | number>) =>
  Object.entries(params).reduce((message, [key, param]) => message.replace(`{${key}}`, String(param)), value);

export const errorMessages = {
  ...validationMessages,
  tooShort: (min: number) => interpolate(validationMessages.tooShort, { min }),
  tooLong: (max: number) => interpolate(validationMessages.tooLong, { max }),
};

// ─── Auth ───
export const loginEmailSchema = z.object({
  email: z
    .string()
    .min(1, errorMessages.required)
    .email(errorMessages.invalidEmail),
  password: z
    .string()
    .min(1, errorMessages.required),
});

export const loginStudentSchema = z.object({
  student_id: z
    .string()
    .regex(studentIdRegex, errorMessages.invalidStudentId),
  password: z
    .string()
    .min(1, errorMessages.required),
});

const passwordSchema = z
  .string()
  .min(8, errorMessages.passwordMin)
  .max(128, errorMessages.passwordMax)
  .regex(/[a-z]/, errorMessages.passwordLowercase)
  .regex(/[A-Z]/, errorMessages.passwordUppercase)
  .regex(/[0-9]/, errorMessages.passwordNumber)
  .regex(/[^a-zA-Z0-9]/, errorMessages.passwordSpecial);

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, errorMessages.required),
  new_password: passwordSchema,
  confirm_password: z.string().min(1, errorMessages.required),
}).refine(data => data.new_password === data.confirm_password, {
  message: errorMessages.passwordMismatch,
  path: ['confirm_password'],
});

export const staffPasswordSchema = z
  .string()
  .min(8, errorMessages.passwordMin)
  .max(128, errorMessages.passwordMax);

// ─── Profile ───
export const profileSchema = z.object({
  first_name: z
    .string()
    .min(2, errorMessages.tooShort(2))
    .max(50, errorMessages.tooLong(50))
    .regex(thaiNameRegex, errorMessages.invalidName),
  last_name: z
    .string()
    .min(2, errorMessages.tooShort(2))
    .max(50, errorMessages.tooLong(50))
    .regex(thaiNameRegex, errorMessages.invalidName),
  phone: z
    .string()
    .regex(thaiPhoneRegex, errorMessages.invalidPhone)
    .optional()
    .or(z.literal('')),
});

// ─── Student ───
export const studentPrefixEnum = ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว', 'นาง'] as const;

export const studentSchema = z.object({
  prefix: z.enum(studentPrefixEnum).default('เด็กชาย'),
  first_name: z
    .string()
    .min(2, errorMessages.tooShort(2))
    .max(50, errorMessages.tooLong(50))
    .regex(thaiNameRegex, errorMessages.invalidName),
  last_name: z
    .string()
    .min(2, errorMessages.tooShort(2))
    .max(50, errorMessages.tooLong(50))
    .regex(thaiNameRegex, errorMessages.invalidName),
  student_id_number: z
    .string()
    .regex(studentIdRegex, errorMessages.invalidStudentId),
  classroom_id: z.string().min(1, errorMessages.required),
  class_number: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().min(1, errorMessages.invalidClassNumber).max(50, errorMessages.invalidClassNumber).optional(),
  ),
  current_status: z.enum(['active', 'inactive', 'transferred', 'graduated', 'suspended']).default('active'),
  guardian_full_name: z
    .string()
    .max(100, errorMessages.tooLong(100))
    .optional()
    .or(z.literal('')),
  guardian_relation: z
    .enum(['father', 'mother', 'guardian', 'relative', 'other'])
    .optional(),
  guardian_phone: z
    .string()
    .regex(thaiPhoneRegex, errorMessages.invalidPhone)
    .optional()
    .or(z.literal('')),
});

export const studentImportSchema = z.object({
  academic_year: z.string().min(4, errorMessages.invalidAcademicYear),
  student_id: z.string().regex(studentIdRegex, errorMessages.invalidStudentId),
  class_number: z.coerce.number().int().min(1).max(50),
  first_name: z.string().min(2).max(50),
  last_name: z.string().min(2).max(50),
  education_stage_id: z.string().uuid(),
  grade_level: z.coerce.number().int().min(1, errorMessages.invalidGradeLevel).max(12, errorMessages.invalidGradeLevel),
  classroom: z.string().min(1),
  status: z.enum(['active', 'inactive']).default('active'),
});

// ─── Score ───
export const scoreCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(2, errorMessages.tooShort(2))
    .max(100, errorMessages.tooLong(100)),
  type: z.enum(['deduct', 'add']),
  default_points: z
    .number()
    .int()
    .refine(val => val !== 0, errorMessages.scoreNotZero)
    .refine(val => Math.abs(val) <= 999, errorMessages.invalidPoints),
  description: z
    .string()
    .max(200, errorMessages.tooLong(200))
    .optional()
    .or(z.literal('')),
  requires_evidence: z.boolean().default(false),
  requires_approval: z.boolean().default(false),
});

export const scoreRecordSchema = z.object({
  student_id: z.string().min(1, errorMessages.required),
  category_id: z.string().min(1, errorMessages.required),
  points: z
    .number()
    .int()
    .refine(val => Math.abs(val) >= 1 && Math.abs(val) <= 999, errorMessages.invalidPoints),
  note: z
    .string()
    .max(500, errorMessages.tooLong(500))
    .optional()
    .or(z.literal('')),
});

export const scoreBulkRecordSchema = z.object({
  student_ids: z.array(z.string().min(1)).min(1, errorMessages.selectAtLeastOneStudent),
  category_id: z.string().min(1, errorMessages.required),
  points: z
    .number()
    .int()
    .refine(val => Math.abs(val) >= 1 && Math.abs(val) <= 999, errorMessages.invalidPoints),
  note: z
    .string()
    .max(500, errorMessages.tooLong(500))
    .optional()
    .or(z.literal('')),
});

export const scoreVoidSchema = z.object({
  transaction_id: z.string().min(1, errorMessages.required),
  void_reason: z
    .string()
    .min(10, errorMessages.voidReasonMin)
    .max(500, errorMessages.tooLong(500)),
});

// ─── Classroom ───
export const classroomSchema = z.object({
  name: z
    .string()
    .min(3, errorMessages.tooShort(3))
    .max(20, errorMessages.tooLong(20))
    .optional()
    .or(z.literal('')),
  education_stage_id: z.string().uuid(),
  grade_level_id: z.string().uuid().optional().or(z.literal('')),
  grade_level: z
    .number()
    .int()
    .min(1, errorMessages.invalidGradeLevel)
    .max(12, errorMessages.invalidGradeLevel),
  room_count: z
    .number()
    .int()
    .min(1, errorMessages.roomCountMin)
    .max(20, errorMessages.roomCountMax)
    .default(1),
});

// ─── Teacher ───
export const teacherPrefixEnum = ['นาย', 'นาง', 'นางสาว'] as const;

export const teacherSchema = z.object({
  prefix: z.enum(teacherPrefixEnum).default('นาย'),
  first_name: z
    .string()
    .min(2, errorMessages.tooShort(2))
    .max(50, errorMessages.tooLong(50)),
  last_name: z
    .string()
    .min(2, errorMessages.tooShort(2))
    .max(50, errorMessages.tooLong(50)),
  email: z
    .string()
    .email(errorMessages.invalidEmail),
  phone: z
    .string()
    .regex(thaiPhoneRegex, errorMessages.invalidPhone)
    .optional()
    .or(z.literal('')),
  employee_id: z
    .string()
    .min(3, errorMessages.tooShort(3))
    .max(20, errorMessages.tooLong(20)),
  department: z
    .string()
    .max(100, errorMessages.tooLong(100))
    .optional()
    .or(z.literal('')),
  position: z
    .string()
    .max(100, errorMessages.tooLong(100))
    .optional()
    .or(z.literal('')),
  system_role: z.enum(['teacher', 'admin', 'superadmin']).default('teacher'),
  is_admin: z.boolean().optional(),
  avatar_url: z.string().url(errorMessages.invalidUrl).optional().or(z.literal('')),
});

export const teacherClassroomSchema = z.object({
  teacher_id: z.string().min(1, errorMessages.required),
  classroom_id: z.string().min(1, errorMessages.required),
  assignment_role: z.enum(['homeroom', 'assistant', 'subject', 'discipline']).default('homeroom'),
});

// ─── Guardian ───
export const guardianSchema = z.object({
  full_name: z
    .string()
    .min(2, errorMessages.tooShort(2))
    .max(100, errorMessages.tooLong(100)),
  phone: z
    .string()
    .regex(thaiPhoneRegex, errorMessages.invalidPhone),
  phone_alt: z
    .string()
    .regex(thaiPhoneRegex, errorMessages.invalidPhone)
    .optional()
    .or(z.literal('')),
  line_id: z
    .string()
    .max(50, errorMessages.tooLong(50))
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email(errorMessages.invalidEmail)
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(500, errorMessages.tooLong(500))
    .optional()
    .or(z.literal('')),
});

export const studentGuardianSchema = z.object({
  student_id: z.string().min(1, errorMessages.required),
  guardian_id: z.string().min(1, errorMessages.required),
  relation: z.enum(['father', 'mother', 'guardian', 'relative', 'other']),
  is_primary: z.boolean().default(false),
  can_receive_notifications: z.boolean().default(true),
  can_pickup_student: z.boolean().default(false),
});

// ─── Bond ───
export const bondDocumentSchema = z.object({
  student_id: z.string().min(1, errorMessages.required),
  threshold_deducted: z.number().int().min(1, errorMessages.thresholdRequired),
  status: z.enum(['draft', 'generated', 'signed', 'cancelled']).default('draft'),
});

// ─── Intervention ───
export const interventionSchema = z.object({
  student_id: z.string().min(1, errorMessages.required),
  intervention_type: z.enum(['phone_call', 'parent_meeting', 'warning', 'bond', 'home_visit', 'counseling', 'other']),
  contacted_guardian_id: z.string().optional().or(z.literal('')),
  contact_method: z.enum(['phone', 'line', 'email', 'in_person', 'letter', 'other']),
  occurred_at: z.string().min(1, errorMessages.dateRequired),
  summary: z
    .string()
    .min(10, errorMessages.summaryMin)
    .max(2000, errorMessages.tooLong(2000)),
  outcome: z
    .string()
    .max(1000, errorMessages.tooLong(1000))
    .optional()
    .or(z.literal('')),
  next_follow_up_at: z
    .string()
    .optional()
    .or(z.literal('')),
});

// ─── Settings ───
export const schoolInfoSchema = z.object({
  school_name: z
    .string()
    .min(2, errorMessages.tooShort(2))
    .max(200, errorMessages.tooLong(200)),
  school_name_en: z
    .string()
    .max(200, errorMessages.tooLong(200))
    .optional()
    .or(z.literal('')),
  school_address: z
    .string()
    .max(500, errorMessages.tooLong(500))
    .optional()
    .or(z.literal('')),
  school_phone: z
    .string()
    .regex(thaiPhoneRegex, errorMessages.invalidPhone)
    .optional()
    .or(z.literal('')),
});

export const scoreSettingsSchema = z.object({
  base_score: z.coerce.number().int().min(1, errorMessages.baseScoreMin).max(999),
  score_floor: z.coerce.number().int().min(0, errorMessages.scoreFloorMin),
  score_ceiling: z.coerce.number().int().min(0).nullable().optional(),
  display_score_above_base_as: z.string().default('100+'),
  academic_year: z.string().min(4, errorMessages.invalidAcademicYear),
});

export const thresholdSchema = z.object({
  deducted: z.coerce.number().int().min(1, errorMessages.deductedMin),
  action: z
    .string()
    .min(5, errorMessages.actionRequired)
    .max(200, errorMessages.tooLong(200)),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, errorMessages.invalidHexColor),
});

export const thresholdsArraySchema = z.array(thresholdSchema).min(1, errorMessages.thresholdsMin);

// ─── PDPA ───
export const pdpaConsentSchema = z.object({
  consent_version: z.string().min(1, errorMessages.required),
  accepted: z.literal(true).refine((v) => v === true, { message: errorMessages.pdpaConsentRequired }),
  accept_notification: z.boolean().optional().default(false),
});

// ─── Import ───
export const csvImportSchema = z.object({
  file: z.instanceof(File, { message: errorMessages.csvFileRequired }),
  import_type: z.enum(['students', 'annual']),
  academic_year: z.string().min(4, errorMessages.invalidAcademicYear),
});

// ─── Pagination ───
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional().or(z.literal('')),
  classroom_id: z.string().optional().or(z.literal('')),
  academic_year: z.string().optional().or(z.literal('')),
  grade_level: z.coerce.number().int().optional().or(z.literal('')),
  grade_level_id: z.string().optional().or(z.literal('')),
  education_stage_id: z.string().optional().or(z.literal('')),
  status: z.string().optional().or(z.literal('')),
});

// ─── Export ───
export type LoginEmailInput = z.infer<typeof loginEmailSchema>;
export type LoginStudentInput = z.infer<typeof loginStudentSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type StudentInput = z.infer<typeof studentSchema>;
export type ScoreRecordInput = z.infer<typeof scoreRecordSchema>;
export type ScoreBulkRecordInput = z.infer<typeof scoreBulkRecordSchema>;
export type ClassroomInput = z.infer<typeof classroomSchema>;
export type TeacherInput = z.infer<typeof teacherSchema>;
export type GuardianInput = z.infer<typeof guardianSchema>;
export type InterventionInput = z.infer<typeof interventionSchema>;
export type SchoolInfoInput = z.infer<typeof schoolInfoSchema>;
export type ScoreSettingsInput = z.infer<typeof scoreSettingsSchema>;
export type ThresholdInput = z.infer<typeof thresholdSchema>;
export type PdpaConsentInput = z.infer<typeof pdpaConsentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
