import { describe, it, expect } from 'vitest';
import {
  loginEmailSchema,
  loginStudentSchema,
  changePasswordSchema,
  studentSchema,
  scoreRecordSchema,
  scoreCategorySchema,
  scoreBulkRecordSchema,
  scoreVoidSchema,
  classroomSchema,
  teacherSchema,
  teacherClassroomSchema,
  guardianSchema,
  studentGuardianSchema,
  interventionSchema,
  schoolInfoSchema,
  scoreSettingsSchema,
  thresholdSchema,
  thresholdsArraySchema,
  pdpaConsentSchema,
  csvImportSchema,
  paginationSchema,
  profileSchema,
  studentImportSchema,
  bondDocumentSchema,
} from '../schemas';

describe('loginEmailSchema', () => {
  it('accepts valid email + password', () => {
    const result = loginEmailSchema.safeParse({ email: 'admin@school.com', password: 'secret123' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginEmailSchema.safeParse({ email: 'not-an-email', password: 'secret123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });

  it('rejects empty email', () => {
    const result = loginEmailSchema.safeParse({ email: '', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginEmailSchema.safeParse({ email: 'admin@school.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('loginStudentSchema', () => {
  it('accepts valid 10-digit student ID + password', () => {
    const result = loginStudentSchema.safeParse({ student_id: '1234567890', password: 'secret123' });
    expect(result.success).toBe(true);
  });

  it('rejects non-10-digit student ID', () => {
    const result = loginStudentSchema.safeParse({ student_id: '12345', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('rejects student ID with letters', () => {
    const result = loginStudentSchema.safeParse({ student_id: '12345abc90', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginStudentSchema.safeParse({ student_id: '1234567890', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  const valid = {
    current_password: 'oldPass123',
    new_password: 'NewStr0ng!',
    confirm_password: 'NewStr0ng!',
  };

  it('accepts valid password change', () => {
    const result = changePasswordSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects new_password without uppercase', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      new_password: 'newstr0ng!',
      confirm_password: 'newstr0ng!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects new_password without lowercase', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      new_password: 'NEWSTR0NG!',
      confirm_password: 'NEWSTR0NG!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects new_password without number', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      new_password: 'NewStrong!',
      confirm_password: 'NewStrong!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects new_password without special char', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      new_password: 'NewStr0ng',
      confirm_password: 'NewStr0ng',
    });
    expect(result.success).toBe(false);
  });

  it('rejects new_password shorter than 8 chars', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      new_password: 'Sh0rt!',
      confirm_password: 'Sh0rt!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched confirm_password', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      confirm_password: 'Different!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty current_password', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      current_password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('studentSchema', () => {
  const valid = {
    prefix: 'เด็กชาย',
    first_name: 'ธนพล',
    last_name: 'ใจดี',
    student_id_number: '1234567890',
    classroom_id: 'classroom-uuid',
    class_number: 15,
  };

  it('accepts valid student data', () => {
    const result = studentSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts valid prefix enum values', () => {
    for (const prefix of ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว', 'นาง'] as const) {
      const result = studentSchema.safeParse({ ...valid, prefix });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid prefix', () => {
    const result = studentSchema.safeParse({ ...valid, prefix: 'คุณ' });
    expect(result.success).toBe(false);
  });

  it('rejects short first_name', () => {
    const result = studentSchema.safeParse({ ...valid, first_name: 'ก' });
    expect(result.success).toBe(false);
  });

  it('rejects first_name with special characters', () => {
    const result = studentSchema.safeParse({ ...valid, first_name: 'ธนพล@!' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid student_id_number (non-10-digit)', () => {
    const result = studentSchema.safeParse({ ...valid, student_id_number: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects class_number 0', () => {
    const result = studentSchema.safeParse({ ...valid, class_number: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects class_number 51', () => {
    const result = studentSchema.safeParse({ ...valid, class_number: 51 });
    expect(result.success).toBe(false);
  });

  it('defaults prefix to เด็กชาย', () => {
    const result = studentSchema.safeParse({ ...valid, prefix: undefined });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prefix).toBe('เด็กชาย');
    }
  });

  it('defaults current_status to active', () => {
    const result = studentSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.current_status).toBe('active');
    }
  });
});

describe('scoreRecordSchema', () => {
  const valid = {
    student_id: 'student-uuid',
    category_id: 'category-uuid',
    points: 10,
  };

  it('accepts valid score record', () => {
    const result = scoreRecordSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts negative points (deduction)', () => {
    const result = scoreRecordSchema.safeParse({ ...valid, points: -5 });
    expect(result.success).toBe(true);
  });

  it('rejects points = 0', () => {
    const result = scoreRecordSchema.safeParse({ ...valid, points: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects points > 999', () => {
    const result = scoreRecordSchema.safeParse({ ...valid, points: 1000 });
    expect(result.success).toBe(false);
  });

  it('rejects points < -999', () => {
    const result = scoreRecordSchema.safeParse({ ...valid, points: -1000 });
    expect(result.success).toBe(false);
  });

  it('accepts optional note within limit', () => {
    const result = scoreRecordSchema.safeParse({ ...valid, note: 'มีพฤติกรรมดี' });
    expect(result.success).toBe(true);
  });

  it('rejects note exceeding 500 chars', () => {
    const result = scoreRecordSchema.safeParse({ ...valid, note: 'ก'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer points', () => {
    const result = scoreRecordSchema.safeParse({ ...valid, points: 3.5 });
    expect(result.success).toBe(false);
  });

  it('rejects missing student_id', () => {
    const result = scoreRecordSchema.safeParse({ category_id: 'cat', points: 5 });
    expect(result.success).toBe(false);
  });

  it('rejects missing category_id', () => {
    const result = scoreRecordSchema.safeParse({ student_id: 'stu', points: 5 });
    expect(result.success).toBe(false);
  });
});

describe('scoreCategorySchema', () => {
  it('accepts valid deduct category', () => {
    const result = scoreCategorySchema.safeParse({
      name: 'มาสาย',
      type: 'deduct',
      default_points: -5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid add category', () => {
    const result = scoreCategorySchema.safeParse({
      name: 'ช่วยงาน',
      type: 'add',
      default_points: 3,
    });
    expect(result.success).toBe(true);
  });

  it('rejects default_points = 0', () => {
    const result = scoreCategorySchema.safeParse({
      name: 'หมวด',
      type: 'deduct',
      default_points: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects name shorter than 2 chars', () => {
    const result = scoreCategorySchema.safeParse({
      name: 'ก',
      type: 'deduct',
      default_points: -5,
    });
    expect(result.success).toBe(false);
  });

  it('accepts requires_evidence and requires_approval flags', () => {
    const result = scoreCategorySchema.safeParse({
      name: 'ทะเลาะวิวาท',
      type: 'deduct',
      default_points: -20,
      requires_evidence: true,
      requires_approval: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requires_evidence).toBe(true);
      expect(result.data.requires_approval).toBe(true);
    }
  });

  it('defaults requires_evidence and requires_approval to false', () => {
    const result = scoreCategorySchema.safeParse({
      name: 'ทดสอบ',
      type: 'add',
      default_points: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requires_evidence).toBe(false);
      expect(result.data.requires_approval).toBe(false);
    }
  });
});

describe('scoreBulkRecordSchema', () => {
  it('accepts valid bulk record', () => {
    const result = scoreBulkRecordSchema.safeParse({
      student_ids: ['id1', 'id2', 'id3'],
      category_id: 'cat-uuid',
      points: -5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty student_ids array', () => {
    const result = scoreBulkRecordSchema.safeParse({
      student_ids: [],
      category_id: 'cat-uuid',
      points: -5,
    });
    expect(result.success).toBe(false);
  });
});

describe('scoreVoidSchema', () => {
  it('accepts valid void request', () => {
    const result = scoreVoidSchema.safeParse({
      transaction_id: 'tx-uuid',
      void_reason: 'บันทึกผิดรายการ ต้องแก้ไข',
    });
    expect(result.success).toBe(true);
  });

  it('rejects void_reason shorter than 10 chars', () => {
    const result = scoreVoidSchema.safeParse({
      transaction_id: 'tx-uuid',
      void_reason: 'สั้น',
    });
    expect(result.success).toBe(false);
  });
});

describe('classroomSchema', () => {
  it('accepts valid classroom', () => {
    const result = classroomSchema.safeParse({
      name: 'ป.1/1',
      education_stage: 'primary',
      grade_level: 1,
      academic_year: '2568',
    });
    expect(result.success).toBe(true);
  });

  it('rejects grade_level 0', () => {
    const result = classroomSchema.safeParse({
      name: 'ป.1/1',
      education_stage: 'primary',
      grade_level: 0,
      academic_year: '2568',
    });
    expect(result.success).toBe(false);
  });

  it('rejects grade_level 7', () => {
    const result = classroomSchema.safeParse({
      name: 'ป.1/1',
      education_stage: 'primary',
      grade_level: 7,
      academic_year: '2568',
    });
    expect(result.success).toBe(false);
  });
});

describe('teacherSchema', () => {
  it('accepts valid teacher', () => {
    const result = teacherSchema.safeParse({
      first_name: 'สมชาย',
      last_name: 'มีสุข',
      email: 'somchai@school.com',
      employee_id: 'T001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = teacherSchema.safeParse({
      first_name: 'สมชาย',
      last_name: 'มีสุข',
      email: 'not-email',
      employee_id: 'T001',
    });
    expect(result.success).toBe(false);
  });
});

describe('teacherClassroomSchema', () => {
  it('accepts valid assignment', () => {
    const result = teacherClassroomSchema.safeParse({
      teacher_id: 'teacher-uuid',
      classroom_id: 'classroom-uuid',
      assignment_role: 'homeroom',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid assignment_role', () => {
    const result = teacherClassroomSchema.safeParse({
      teacher_id: 'teacher-uuid',
      classroom_id: 'classroom-uuid',
      assignment_role: 'invalid_role',
    });
    expect(result.success).toBe(false);
  });

  it('defaults assignment_role to homeroom', () => {
    const result = teacherClassroomSchema.safeParse({
      teacher_id: 'teacher-uuid',
      classroom_id: 'classroom-uuid',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assignment_role).toBe('homeroom');
    }
  });
});

describe('guardianSchema', () => {
  it('accepts valid guardian with required fields', () => {
    const result = guardianSchema.safeParse({
      full_name: 'สมศรี ใจดี',
      phone: '081-234-5678',
    });
    expect(result.success).toBe(true);
  });

  it('accepts phone without dashes', () => {
    const result = guardianSchema.safeParse({
      full_name: 'สมศรี ใจดี',
      phone: '0812345678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid phone', () => {
    const result = guardianSchema.safeParse({
      full_name: 'สมศรี ใจดี',
      phone: '1234',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = guardianSchema.safeParse({
      full_name: 'สมศรี ใจดี',
      phone: '081-234-5678',
      line_id: 'line123',
      email: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });
});

describe('studentGuardianSchema', () => {
  it('accepts valid relation', () => {
    const result = studentGuardianSchema.safeParse({
      student_id: 'student-uuid',
      guardian_id: 'guardian-uuid',
      relation: 'mother',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid relation', () => {
    const result = studentGuardianSchema.safeParse({
      student_id: 'student-uuid',
      guardian_id: 'guardian-uuid',
      relation: 'uncle',
    });
    expect(result.success).toBe(false);
  });
});

describe('interventionSchema', () => {
  const valid = {
    student_id: 'student-uuid',
    intervention_type: 'phone_call' as const,
    contact_method: 'phone' as const,
    occurred_at: '2026-05-09',
    summary: 'โทรแจ้งผู้ปกครองเรื่องพฤติกรรมนักเรียนในห้องเรียน',
  };

  it('accepts valid intervention', () => {
    const result = interventionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts all intervention types', () => {
    const types = ['phone_call', 'parent_meeting', 'warning', 'bond', 'home_visit', 'counseling', 'other'] as const;
    for (const t of types) {
      const result = interventionSchema.safeParse({ ...valid, intervention_type: t });
      expect(result.success).toBe(true);
    }
  });

  it('rejects summary shorter than 10 chars', () => {
    const result = interventionSchema.safeParse({ ...valid, summary: 'สั้น' });
    expect(result.success).toBe(false);
  });
});

describe('schoolInfoSchema', () => {
  it('accepts minimum school info', () => {
    const result = schoolInfoSchema.safeParse({
      school_name: 'โรงเรียนวัดใจ',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short school name', () => {
    const result = schoolInfoSchema.safeParse({ school_name: 'ร' });
    expect(result.success).toBe(false);
  });
});

describe('scoreSettingsSchema', () => {
  it('accepts valid settings', () => {
    const result = scoreSettingsSchema.safeParse({
      base_score: 100,
      score_floor: 0,
      academic_year: '2568',
    });
    expect(result.success).toBe(true);
  });

  it('rejects base_score of 0', () => {
    const result = scoreSettingsSchema.safeParse({
      base_score: 0,
      score_floor: 0,
      academic_year: '2568',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative score_floor', () => {
    const result = scoreSettingsSchema.safeParse({
      base_score: 100,
      score_floor: -1,
      academic_year: '2568',
    });
    expect(result.success).toBe(false);
  });
});

describe('thresholdSchema', () => {
  it('accepts valid threshold', () => {
    const result = thresholdSchema.safeParse({
      deducted: 20,
      action: 'แจ้งผู้ปกครอง',
      color: '#FF0000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-hex color', () => {
    const result = thresholdSchema.safeParse({
      deducted: 20,
      action: 'แจ้งผู้ปกครอง',
      color: 'red',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short action text', () => {
    const result = thresholdSchema.safeParse({
      deducted: 20,
      action: 'สั้น',
      color: '#FF0000',
    });
    expect(result.success).toBe(false);
  });
});

describe('thresholdsArraySchema', () => {
  it('accepts array of thresholds', () => {
    const result = thresholdsArraySchema.safeParse([
      { deducted: 20, action: 'แจ้งครูที่ปรึกษา', color: '#FFFF00' },
      { deducted: 40, action: 'แจ้งผู้ปกครอง', color: '#FF8800' },
      { deducted: 60, action: 'เรียกผู้ปกครองพบ', color: '#FF0000' },
    ]);
    expect(result.success).toBe(true);
  });

  it('rejects empty array', () => {
    const result = thresholdsArraySchema.safeParse([]);
    expect(result.success).toBe(false);
  });
});

describe('pdpaConsentSchema', () => {
  it('accepts valid consent', () => {
    const result = pdpaConsentSchema.safeParse({
      consent_version: '1.0',
      accepted: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects accepted: false', () => {
    const result = pdpaConsentSchema.safeParse({
      consent_version: '1.0',
      accepted: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('applies defaults for empty input', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.page_size).toBe(20);
    }
  });

  it('coerces string numbers', () => {
    const result = paginationSchema.safeParse({ page: '3', page_size: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.page_size).toBe(10);
    }
  });

  it('rejects page_size > 100', () => {
    const result = paginationSchema.safeParse({ page_size: 101 });
    expect(result.success).toBe(false);
  });
});

describe('csvImportSchema', () => {
  it('accepts valid import config', () => {
    const file = new File([''], 'students.csv', { type: 'text/csv' });
    const result = csvImportSchema.safeParse({
      file,
      import_type: 'students',
      academic_year: '2568',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid import_type', () => {
    const file = new File([''], 'students.csv', { type: 'text/csv' });
    const result = csvImportSchema.safeParse({
      file,
      import_type: 'invalid',
      academic_year: '2568',
    });
    expect(result.success).toBe(false);
  });
});

describe('studentImportSchema', () => {
  it('accepts valid import row', () => {
    const result = studentImportSchema.safeParse({
      academic_year: '2568',
      student_id: '1234567890',
      class_number: 15,
      first_name: 'ธนพล',
      last_name: 'ใจดี',
      education_stage: 'primary',
      grade_level: 1,
      classroom: 'ป.1/1',
    });
    expect(result.success).toBe(true);
  });

  it('coerces numeric string values', () => {
    const result = studentImportSchema.safeParse({
      academic_year: '2568',
      student_id: '1234567890',
      class_number: '15',
      first_name: 'ธนพล',
      last_name: 'ใจดี',
      education_stage: 'primary',
      grade_level: '1',
      classroom: 'ป.1/1',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.grade_level).toBe('number');
      expect(typeof result.data.class_number).toBe('number');
    }
  });
});

describe('profileSchema', () => {
  it('accepts valid profile data', () => {
    const result = profileSchema.safeParse({
      first_name: 'สมชาย',
      last_name: 'มีสุข',
      phone: '081-234-5678',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty phone (optional)', () => {
    const result = profileSchema.safeParse({
      first_name: 'สมชาย',
      last_name: 'มีสุข',
      phone: '',
    });
    expect(result.success).toBe(true);
  });
});

describe('bondDocumentSchema', () => {
  it('accepts valid bond document', () => {
    const result = bondDocumentSchema.safeParse({
      student_id: 'student-uuid',
      threshold_deducted: 40,
    });
    expect(result.success).toBe(true);
  });

  it('defaults status to draft', () => {
    const result = bondDocumentSchema.safeParse({
      student_id: 'student-uuid',
      threshold_deducted: 40,
    });
    if (result.success) {
      expect(result.data.status).toBe('draft');
    }
  });
});
