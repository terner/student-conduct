import { z } from 'zod';

// ─── Helpers ───
const thaiPhoneRegex = /^0[0-9]{2}-?[0-9]{3}-?[0-9]{4}$/;
const studentIdRegex = /^\d{10}$/;
const thaiNameRegex = /^[฀-๿ a-zA-Zก-ฮ]+$/;

export const errorMessages = {
  required: 'กรุณากรอกข้อมูล',
  tooShort: (min: number) => `ต้องมีความยาวอย่างน้อย ${min} ตัวอักษร`,
  tooLong: (max: number) => `ต้องมีความยาวไม่เกิน ${max} ตัวอักษร`,
  invalidEmail: 'รูปแบบอีเมลไม่ถูกต้อง',
  invalidPhone: 'เบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 081-234-5678)',
  invalidStudentId: 'รหัสนักเรียนต้องเป็นตัวเลข 10 หลัก',
  invalidName: 'ชื่อต้องเป็นภาษาไทยหรือภาษาอังกฤษเท่านั้น',
  invalidPoints: 'คะแนนต้องอยู่ระหว่าง 1-999',
  invalidGradeLevel: 'ชั้นปีต้องอยู่ระหว่าง 1-6',
  invalidClassNumber: 'เลขที่ต้องอยู่ระหว่าง 1-50',
  invalidUrl: 'รูปแบบ URL ไม่ถูกต้อง',
  passwordTooWeak: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ',
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
  .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  .max(128, 'รหัสผ่านต้องไม่เกิน 128 ตัวอักษร')
  .regex(/[a-z]/, 'ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
  .regex(/[A-Z]/, 'ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
  .regex(/[0-9]/, 'ต้องมีตัวเลขอย่างน้อย 1 ตัว')
  .regex(/[^a-zA-Z0-9]/, 'ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว');

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, errorMessages.required),
  new_password: passwordSchema,
  confirm_password: z.string().min(1, errorMessages.required),
}).refine(data => data.new_password === data.confirm_password, {
  message: 'รหัสผ่านไม่ตรงกัน',
  path: ['confirm_password'],
});

export const staffPasswordSchema = z
  .string()
  .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  .max(128, 'รหัสผ่านต้องไม่เกิน 128 ตัวอักษร');

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
  class_number: z
    .number()
    .int()
    .min(1, errorMessages.invalidClassNumber)
    .max(50, errorMessages.invalidClassNumber),
  current_status: z.enum(['active', 'inactive', 'transferred', 'graduated', 'suspended']).default('active'),
});

export const studentImportSchema = z.object({
  academic_year: z.string().min(4, 'ปีการศึกษาไม่ถูกต้อง'),
  student_id: z.string().regex(studentIdRegex, errorMessages.invalidStudentId),
  class_number: z.coerce.number().int().min(1).max(50),
  first_name: z.string().min(2).max(50),
  last_name: z.string().min(2).max(50),
  education_stage: z.enum(['primary', 'secondary']),
  grade_level: z.coerce.number().int().min(1, errorMessages.invalidGradeLevel).max(6, errorMessages.invalidGradeLevel),
  classroom: z.string().min(1),
  status: z.enum(['active', 'inactive']).default('active'),
});

// ─── Score ───
export const scoreCategorySchema = z.object({
  name: z
    .string()
    .min(2, errorMessages.tooShort(2))
    .max(100, errorMessages.tooLong(100)),
  type: z.enum(['deduct', 'add']),
  default_points: z
    .number()
    .int()
    .refine(val => val !== 0, 'คะแนนต้องไม่เป็น 0')
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
  student_ids: z.array(z.string().min(1)).min(1, 'กรุณาเลือกนักเรียนอย่างน้อย 1 คน'),
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
    .min(10, 'กรุณาระบุเหตุผลในการยกเลิกอย่างน้อย 10 ตัวอักษร')
    .max(500, errorMessages.tooLong(500)),
});

// ─── Classroom ───
export const classroomSchema = z.object({
  name: z
    .string()
    .min(3, errorMessages.tooShort(3))
    .max(20, errorMessages.tooLong(20)),
  education_stage: z.enum(['primary', 'secondary']),
  grade_level: z
    .number()
    .int()
    .min(1, errorMessages.invalidGradeLevel)
    .max(6, errorMessages.invalidGradeLevel),
  academic_year: z.string().min(4, 'ปีการศึกษาไม่ถูกต้อง'),
});

// ─── Teacher ───
export const teacherSchema = z.object({
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
  employee_id: z
    .string()
    .min(3, errorMessages.tooShort(3))
    .max(20, errorMessages.tooLong(20)),
  department: z
    .string()
    .max(100, errorMessages.tooLong(100))
    .optional()
    .or(z.literal('')),
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
  threshold_deducted: z.number().int().min(1, 'กรุณาระบุ threshold'),
  status: z.enum(['draft', 'generated', 'signed', 'cancelled']).default('draft'),
});

// ─── Intervention ───
export const interventionSchema = z.object({
  student_id: z.string().min(1, errorMessages.required),
  intervention_type: z.enum(['phone_call', 'parent_meeting', 'warning', 'bond', 'home_visit', 'counseling', 'other']),
  contacted_guardian_id: z.string().optional().or(z.literal('')),
  contact_method: z.enum(['phone', 'line', 'email', 'in_person', 'letter', 'other']),
  occurred_at: z.string().min(1, 'กรุณาระบุวันที่'),
  summary: z
    .string()
    .min(10, 'กรุณากรอกสรุปอย่างน้อย 10 ตัวอักษร')
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
  base_score: z.coerce.number().int().min(1, 'คะแนนตั้งต้นต้องมากกว่า 0').max(999),
  score_floor: z.coerce.number().int().min(0, 'คะแนนขั้นต่ำต้องไม่ต่ำกว่า 0'),
  score_ceiling: z.coerce.number().int().min(0).nullable().optional(),
  display_score_above_base_as: z.string().default('100+'),
  academic_year: z.string().min(4, 'ปีการศึกษาไม่ถูกต้อง'),
});

export const thresholdSchema = z.object({
  deducted: z.coerce.number().int().min(1, 'คะแนนที่ถูกตัดต้องมากกว่า 0'),
  action: z
    .string()
    .min(5, 'กรุณากรอกการดำเนินการ')
    .max(200, errorMessages.tooLong(200)),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'สีต้องเป็น hex color (เช่น #FF0000)'),
});

export const thresholdsArraySchema = z.array(thresholdSchema).min(1, 'ต้องมี threshold อย่างน้อย 1 ระดับ');

// ─── PDPA ───
export const pdpaConsentSchema = z.object({
  consent_version: z.string().min(1, errorMessages.required),
  accepted: z.literal(true).refine((v) => v === true, { message: 'กรุณายอมรับนโยบายความเป็นส่วนตัว' }),
  accept_notification: z.boolean().optional().default(false),
});

// ─── Import ───
export const csvImportSchema = z.object({
  file: z.instanceof(File, { message: 'กรุณาเลือกไฟล์ CSV' }),
  import_type: z.enum(['students', 'teachers', 'annual']),
  academic_year: z.string().min(4, 'ปีการศึกษาไม่ถูกต้อง'),
});

// ─── Pagination ───
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional().or(z.literal('')),
  classroom_id: z.string().optional().or(z.literal('')),
  academic_year: z.string().optional().or(z.literal('')),
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
