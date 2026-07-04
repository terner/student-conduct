export const STUDENT_CSV_HEADERS = {
  academicYear: ['ปีการศึกษา', 'academic_year'],
  studentId: ['รหัสนักเรียน', 'student_id', 'student_id_number'],
  prefix: ['คำนำหน้า', 'prefix'],
  classNumber: ['เลขที่ในห้อง', 'เลขที่', 'class_number'],
  firstName: ['ชื่อ', 'first_name'],
  lastName: ['นามสกุล', 'last_name'],
  educationStage: ['ระดับ', 'education_stage_id', 'education_stage'],
  gradeLevel: ['ชั้นปี', 'grade_level'],
  classroom: ['ห้อง', 'classroom'],
  status: ['สถานะ', 'status'],
  guardianPrefix: ['คำนำหน้าผู้ปกครอง', 'guardian_prefix'],
  guardianFullName: ['ชื่อผู้ปกครอง', 'guardian_full_name', 'guardian_name'],
  guardianFirstName: ['ชื่อผู้ปกครอง', 'guardian_first_name'],
  guardianLastName: ['นามสกุลผู้ปกครอง', 'guardian_last_name'],
  guardianRelation: ['ความสัมพันธ์', 'guardian_relation'],
  guardianPhone: ['เบอร์โทรผู้ปกครอง', 'guardian_phone'],
} as const;

export const REQUIRED_STUDENT_THAI_CSV_HEADERS = [
  'รหัสนักเรียน',
  'ชื่อ',
  'นามสกุล',
  'ชั้นปี',
  'ห้อง',
] as const;

export const REQUIRED_STUDENT_ENGLISH_CSV_HEADERS = [
  'student_id',
  'first_name',
  'last_name',
  'grade_level',
  'classroom',
] as const;

export const TEACHER_CSV_HEADERS = {
  prefix: ['คำนำหน้า', 'prefix'],
  firstName: ['ชื่อ', 'first_name'],
  lastName: ['นามสกุล', 'last_name'],
  email: ['อีเมล', 'email'],
  employeeId: ['รหัสเจ้าหน้าที่', 'employee_id', 'employeeId'],
  phone: ['เบอร์โทร', 'phone'],
  department: ['แผนก', 'department'],
  position: ['ตำแหน่ง', 'position'],
  systemRole: ['สิทธิ์ในระบบ', 'system_role', 'systemRole'],
  homeroom: ['ห้องที่ปรึกษา', 'classroom', 'homeroom'],
} as const;

export function readCsvString(row: Record<string, unknown>, aliases: readonly string[], defaultValue = '') {
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && value !== null && String(value) !== '') return String(value);
  }
  return defaultValue;
}

export function readCsvValue(row: Record<string, unknown>, aliases: readonly string[]) {
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && value !== null && String(value) !== '') return value;
  }
  return undefined;
}
