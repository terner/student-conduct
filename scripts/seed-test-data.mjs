import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const TEACHER_COUNT = 50;
const STUDENT_COUNT = 1000;
const TEST_STUDENT_ID_BASE = 2569000000;
const THRESHOLD_SAMPLE_COUNT = 30;
const teacherPassword = 'Teacher@123';
const studentPassword = 'Student@123';
const defaultThresholds = [
  { deducted: 20, action: 'เฝ้าระวัง', color: '#FEF3C7' },
  { deducted: 40, action: 'เชิญผู้ปกครอง', color: '#FED7AA' },
  { deducted: 60, action: 'ทัณฑ์บน', color: '#FCA5A5' },
];

function loadEnv() {
  const env = {};
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return env;
}

function assertOk(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

const env = loadEnv();
const supabase = createClient(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

async function deleteIn(table, column, values) {
  if (values.length === 0) return;
  assertOk(await supabase.from(table).delete().in(column, values), `delete ${table}.${column}`);
}

async function updateNullIn(table, column, values) {
  if (values.length === 0) return;
  assertOk(await supabase.from(table).update({ [column]: null }).in(column, values), `clear ${table}.${column}`);
}

function normalizeThresholds(value) {
  const thresholds = Array.isArray(value) ? value : [];
  return thresholds
    .map((threshold) => ({
      deducted: Number(threshold.deducted),
      action: String(threshold.action || ''),
      color: String(threshold.color || '#FEF3C7'),
    }))
    .filter((threshold) => Number.isFinite(threshold.deducted) && threshold.deducted > 0)
    .sort((a, b) => a.deducted - b.deducted);
}

async function ensureThresholds(adminProfileId) {
  const setting = assertOk(await supabase.from('settings').select('value').eq('key', 'thresholds').maybeSingle(), 'load thresholds setting');
  const existing = normalizeThresholds(setting?.value);
  if (existing.length > 0) return existing;

  assertOk(await supabase.from('settings').upsert({
    key: 'thresholds',
    value: defaultThresholds,
    updated_by: adminProfileId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' }), 'create default thresholds');

  return defaultThresholds;
}

async function ensureScoreCategories(adminProfileId) {
  let categories = assertOk(
    await supabase.from('score_categories').select('id, type, default_points').eq('is_active', true),
    'load score categories',
  );

  const hasDeduct = categories.some((category) => category.type === 'deduct');
  const hasAdd = categories.some((category) => category.type === 'add');
  const toInsert = [];

  if (!hasDeduct) {
    toInsert.push({
      name: 'ข้อมูลทดสอบ: หักคะแนนทั่วไป',
      type: 'deduct',
      default_points: -5,
      description: 'หมวดทดสอบสำหรับ seed data',
      is_active: true,
      created_by: adminProfileId,
    });
  }

  if (!hasAdd) {
    toInsert.push({
      name: 'ข้อมูลทดสอบ: เพิ่มคะแนนความดี',
      type: 'add',
      default_points: 5,
      description: 'หมวดทดสอบสำหรับ seed data',
      is_active: true,
      created_by: adminProfileId,
    });
  }

  if (toInsert.length > 0) {
    assertOk(await supabase.from('score_categories').insert(toInsert), 'create score categories');
    categories = assertOk(
      await supabase.from('score_categories').select('id, type, default_points').eq('is_active', true),
      'reload score categories',
    );
  }

  return categories;
}

async function deleteUsersById(userIds) {
  for (const userId of userIds.filter(Boolean)) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    const message = error?.message.toLowerCase() || '';
    if (error && !message.includes('not found') && !message.includes('database error loading user')) {
      throw new Error(`delete auth user ${userId}: ${error.message}`);
    }
  }
}

async function deleteUsersByEmail(emails) {
  const wanted = new Set(emails);
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`list auth users: ${error.message}`);
    await deleteUsersById((data.users || []).filter((user) => user.email && wanted.has(user.email)).map((user) => user.id));
    if ((data.users || []).length < 1000) break;
    page += 1;
  }
}

function classroomNameForGrade(gradeLevel, roomNumber) {
  if (gradeLevel <= 6) return `ป.${gradeLevel}/${roomNumber}`;
  return `ม.${gradeLevel - 6}/${roomNumber}`;
}

function stageCodeForGrade(gradeLevel) {
  if (gradeLevel <= 6) return 'primary';
  if (gradeLevel <= 9) return 'secondary';
  return 'highschool';
}

async function ensureClassrooms(academicYearId) {
  const stages = assertOk(
    await supabase.from('education_stages').select('id, code, name_th').eq('is_active', true),
    'load education stages',
  );
  const stageByCode = new Map(stages.map((stage) => [stage.code, stage]));
  const existing = assertOk(
    await supabase.from('classrooms').select('id, name, grade_level, education_stage_id, academic_year_id').eq('academic_year_id', academicYearId),
    'load classrooms',
  );
  const existingByName = new Map(existing.map((classroom) => [classroom.name, classroom]));
  const toInsert = [];

  for (let gradeLevel = 1; gradeLevel <= 12; gradeLevel += 1) {
    const stage = stageByCode.get(stageCodeForGrade(gradeLevel));
    if (!stage) continue;
    for (let roomNumber = 1; roomNumber <= 2; roomNumber += 1) {
      const name = classroomNameForGrade(gradeLevel, roomNumber);
      if (!existingByName.has(name)) {
        toInsert.push({
          name,
          grade_level: gradeLevel,
          education_stage_id: stage.id,
          academic_year_id: academicYearId,
        });
      }
    }
  }

  if (toInsert.length > 0) {
    assertOk(await supabase.from('classrooms').insert(toInsert), 'create classrooms');
  }

  const classrooms = assertOk(
    await supabase.from('classrooms').select('id, name, grade_level, education_stage_id, academic_year_id').eq('academic_year_id', academicYearId).order('grade_level').order('name'),
    'reload classrooms',
  );
  return classrooms.filter((classroom) => classroom.grade_level >= 1 && classroom.grade_level <= 12);
}

function makeTeacher(index) {
  const firstNames = ['อรทัย', 'ปกรณ์', 'วรรณา', 'นิรันดร์', 'มัลลิกา', 'ธนากร', 'ศิริพร', 'ชยพล', 'กนกวรรณ', 'ภาคิน'];
  const lastNames = ['ใจดี', 'สอนเก่ง', 'มีเมตตา', 'รักเรียน', 'นำทาง', 'หลักแหลม', 'เพียรดี', 'สุขใจ', 'ตั้งใจ', 'ดูแลดี'];
  const prefixes = ['นางสาว', 'นาย', 'นาง', 'นาย', 'นางสาว', 'นาย', 'นาง', 'นาย', 'นางสาว', 'นาย'];
  const positions = ['ครู', 'ครู', 'ครูชำนาญการ', 'ครูผู้ช่วย', 'หัวหน้าระดับ', 'ครู', 'ครูแนะแนว', 'ครู', 'ครูชำนาญการ', 'ครู'];
  const n = index + 1;
  return {
    employee_id: `T${String(n).padStart(3, '0')}`,
    prefix: prefixes[index % prefixes.length],
    first_name: firstNames[index % firstNames.length],
    last_name: lastNames[Math.floor(index / firstNames.length) % lastNames.length],
    email: `teacher${n}@school.com`,
    phone: `081-111-${String(1000 + n).slice(-4)}`,
    department: index % 3 === 0 ? 'งานกิจการนักเรียน' : index % 2 === 0 ? 'มัธยมศึกษา' : 'ประถมศึกษา',
    position: positions[index % positions.length],
  };
}

function makeStudent(index) {
  const firstNames = ['ธนภัทร', 'มินตรา', 'ปุณณวิช', 'ณิชา', 'กิตติพงศ์', 'อริสา', 'พชรพล', 'ชนัญชิดา', 'วรเมธ', 'กัญญารัตน์', 'นราวิชญ์', 'พิชญาภา', 'ศุภโชค', 'ธัญชนก', 'ภูวนาท', 'แพรวา', 'อนาวิน', 'พิมพ์ชนก', 'ชยุต', 'ศศิธร'];
  const lastNames = ['ตั้งใจเรียน', 'สุขสวัสดิ์', 'เก่งกล้า', 'ใจงาม', 'เพียรดี', 'ร่าเริง', 'มั่นคง', 'สดใส', 'กล้าหาญ', 'มีวินัย', 'ใฝ่รู้', 'ขยันดี', 'รุ่งเรือง', 'สุภาพ', 'อดทน'];
  const n = index + 1;
  const isBoy = index % 2 === 0;
  return {
    prefix: isBoy ? 'เด็กชาย' : 'เด็กหญิง',
    first_name: firstNames[index % firstNames.length],
    last_name: lastNames[Math.floor(index / firstNames.length) % lastNames.length],
    student_id_number: String(TEST_STUDENT_ID_BASE + n),
    email: `${TEST_STUDENT_ID_BASE + n}@student.school.com`,
  };
}

function getDeductedForThresholdLevel(thresholds, levelIndex, cycle) {
  const current = thresholds[levelIndex];
  const next = thresholds[levelIndex + 1];
  const min = current.deducted;
  if (!next) return min + cycle * 10;

  const max = next.deducted - 1;
  const span = Math.max(0, max - min);
  const offsets = [0, Math.ceil(span / 2), span];
  return min + offsets[cycle % offsets.length];
}

function buildThresholdSamples(thresholds) {
  return Array.from({ length: THRESHOLD_SAMPLE_COUNT }, (_, index) => {
    const levelIndex = index % thresholds.length;
    const cycle = Math.floor(index / thresholds.length);
    return {
      index,
      thresholdLevel: levelIndex + 1,
      deducted: getDeductedForThresholdLevel(thresholds, levelIndex, cycle),
      added: index % 4 === 0 ? 5 : index % 9 === 0 ? 10 : 0,
    };
  });
}

async function cleanupNonAdminPeople() {
  const profiles = assertOk(await supabase.from('profiles').select('id, user_id, role'), 'load profiles');
  const oldProfiles = profiles.filter((profile) => {
    const roles = Array.isArray(profile.role) ? profile.role : [profile.role];
    return !roles.includes('admin') && !roles.includes('superadmin') && (roles.includes('teacher') || roles.includes('student'));
  });
  const oldProfileIds = oldProfiles.map((profile) => profile.id);
  const oldUserIds = oldProfiles.map((profile) => profile.user_id).filter(Boolean);
  const oldStudents = oldProfileIds.length ? assertOk(await supabase.from('students').select('id').in('profile_id', oldProfileIds), 'load old students') : [];
  const oldTeachers = oldProfileIds.length ? assertOk(await supabase.from('teachers').select('id').in('profile_id', oldProfileIds), 'load old teachers') : [];
  const oldStudentIds = oldStudents.map((student) => student.id);
  const oldTeacherIds = oldTeachers.map((teacher) => teacher.id);
  const oldGuardianLinks = oldStudentIds.length ? assertOk(await supabase.from('student_guardians').select('guardian_id').in('student_id', oldStudentIds), 'load old guardians') : [];
  const oldGuardianIds = [...new Set(oldGuardianLinks.map((link) => link.guardian_id).filter(Boolean))];
  const oldTransactionsByStudent = oldStudentIds.length ? assertOk(await supabase.from('score_transactions').select('id').in('student_id', oldStudentIds), 'load transactions by student') : [];
  const oldTransactionsByRecorder = oldProfileIds.length ? assertOk(await supabase.from('score_transactions').select('id').in('recorded_by', oldProfileIds), 'load transactions by recorder') : [];
  const oldTransactionIds = [...new Set([...oldTransactionsByStudent, ...oldTransactionsByRecorder].map((transaction) => transaction.id))];

  await deleteIn('score_transaction_evidence', 'transaction_id', oldTransactionIds);
  await deleteIn('score_transaction_evidence', 'uploaded_by', oldProfileIds);
  await deleteIn('intervention_logs', 'student_id', oldStudentIds);
  await deleteIn('intervention_logs', 'contacted_guardian_id', oldGuardianIds);
  await deleteIn('intervention_logs', 'related_transaction_id', oldTransactionIds);
  await deleteIn('intervention_logs', 'recorded_by', oldProfileIds);
  await deleteIn('bond_documents', 'student_id', oldStudentIds);
  await deleteIn('bond_documents', 'generated_by', oldProfileIds);
  await deleteIn('bond_documents', 'approved_by', oldProfileIds);
  await deleteIn('bond_documents', 'cancelled_by', oldProfileIds);
  await deleteIn('notifications', 'recipient_id', oldProfileIds);
  await deleteIn('pdpa_consents', 'accepted_by', oldProfileIds);
  await deleteIn('monthly_reports', 'generated_by', oldProfileIds);
  await deleteIn('profile_permission_overrides', 'profile_id', oldProfileIds);
  await deleteIn('profile_permission_overrides', 'granted_by', oldProfileIds);
  await deleteIn('action_logs', 'actor_id', oldProfileIds);
  await deleteIn('audit_logs', 'actor_id', oldProfileIds);
  await updateNullIn('settings', 'updated_by', oldProfileIds);
  await updateNullIn('score_categories', 'created_by', oldProfileIds);
  await deleteIn('score_transactions', 'id', oldTransactionIds);
  await deleteIn('score_transactions', 'student_id', oldStudentIds);
  await deleteIn('score_transactions', 'recorded_by', oldProfileIds);
  await deleteIn('score_transactions', 'approved_by', oldProfileIds);
  await deleteIn('score_transactions', 'voided_by', oldProfileIds);
  await deleteIn('student_guardians', 'student_id', oldStudentIds);
  await deleteIn('student_guardians', 'guardian_id', oldGuardianIds);
  await deleteIn('student_enrollments', 'student_id', oldStudentIds);
  await deleteIn('teacher_classrooms', 'teacher_id', oldTeacherIds);
  await deleteIn('teacher_classrooms', 'assigned_by', oldProfileIds);
  await deleteIn('students', 'id', oldStudentIds);
  await deleteIn('teachers', 'id', oldTeacherIds);
  await deleteIn('guardians', 'id', oldGuardianIds);
  await deleteIn('profiles', 'id', oldProfileIds);
  await deleteUsersById(oldUserIds);

  const targetEmails = [
    ...Array.from({ length: TEACHER_COUNT }, (_, index) => `teacher${index + 1}@school.com`),
    ...Array.from({ length: STUDENT_COUNT }, (_, index) => `${TEST_STUDENT_ID_BASE + 1 + index}@student.school.com`),
  ];
  await deleteUsersByEmail(targetEmails);

  return oldProfileIds.length;
}

async function main() {
  const deletedProfiles = await cleanupNonAdminPeople();
  const profiles = assertOk(await supabase.from('profiles').select('id, role'), 'load admin profiles');
  const adminProfiles = profiles.filter((profile) => {
    const roles = Array.isArray(profile.role) ? profile.role : [profile.role];
    return roles.includes('superadmin') || roles.includes('admin');
  });
  const adminProfileId = adminProfiles[0]?.id || null;
  const academicYear = assertOk(await supabase.from('academic_years').select('id').eq('is_current', true).single(), 'load current academic year');
  const classrooms = await ensureClassrooms(academicYear.id);
  const thresholds = await ensureThresholds(adminProfileId);
  const categories = await ensureScoreCategories(adminProfileId);

  const teacherRecords = [];
  for (let index = 0; index < TEACHER_COUNT; index += 1) {
    const teacherSeed = makeTeacher(index);
    const fullName = `${teacherSeed.first_name} ${teacherSeed.last_name}`;
    const auth = assertOk(await supabase.auth.admin.createUser({
      email: teacherSeed.email,
      password: teacherPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, prefix: teacherSeed.prefix, role: 'teacher' },
    }), `create auth ${teacherSeed.email}`);
    const profile = assertOk(await supabase.from('profiles').insert({
      user_id: auth.user.id,
      role: ['teacher'],
      prefix: teacherSeed.prefix,
      full_name: fullName,
      phone: teacherSeed.phone,
      is_active: true,
      must_change_password: false,
    }).select('id').single(), `create teacher profile ${teacherSeed.email}`);
    const teacher = assertOk(await supabase.from('teachers').insert({
      profile_id: profile.id,
      employee_id: teacherSeed.employee_id,
      department: teacherSeed.department,
      position: teacherSeed.position,
      phone: teacherSeed.phone,
      email: teacherSeed.email,
    }).select('id, profile_id').single(), `create teacher ${teacherSeed.email}`);
    teacherRecords.push({ ...teacher, ...teacherSeed, full_name: fullName });
  }

  assertOk(await supabase.from('teacher_classrooms').insert(classrooms.map((classroom, index) => ({
    teacher_id: teacherRecords[index % teacherRecords.length].id,
    classroom_id: classroom.id,
    assignment_role: 'homeroom',
    assigned_by: adminProfileId,
  }))), 'create teacher assignments');

  const studentRecords = [];
  for (let index = 0; index < STUDENT_COUNT; index += 1) {
    const studentSeed = makeStudent(index);
    const classroom = classrooms[index % classrooms.length];
    const classNumber = Math.floor(index / classrooms.length) + 1;
    const fullName = `${studentSeed.first_name} ${studentSeed.last_name}`;
    const auth = assertOk(await supabase.auth.admin.createUser({
      email: studentSeed.email,
      password: studentPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, prefix: studentSeed.prefix, first_name: studentSeed.first_name, last_name: studentSeed.last_name, role: 'student' },
    }), `create auth ${studentSeed.email}`);
    const profile = assertOk(await supabase.from('profiles').insert({
      user_id: auth.user.id,
      role: ['student'],
      prefix: studentSeed.prefix,
      full_name: fullName,
      is_active: true,
      must_change_password: false,
    }).select('id').single(), `create student profile ${studentSeed.student_id_number}`);
    const student = assertOk(await supabase.from('students').insert({
      profile_id: profile.id,
      student_id_number: studentSeed.student_id_number,
      classroom_id: classroom.id,
      current_status: 'active',
    }).select('id').single(), `create student ${studentSeed.student_id_number}`);
    assertOk(await supabase.from('student_enrollments').insert({
      student_id: student.id,
      classroom_id: classroom.id,
      academic_year_id: academicYear.id,
      class_number: classNumber,
      enrollment_status: 'active',
      source: 'manual',
    }), `create enrollment ${studentSeed.student_id_number}`);
    const suffix = String(index + 1).padStart(4, '0');
    const guardian = assertOk(await supabase.from('guardians').insert({
      full_name: `${index % 2 === 0 ? 'นาย' : 'นาง'}ผู้ปกครอง ${studentSeed.last_name}`,
      phone: `082-222-${suffix}`,
      phone_alt: `083-333-${suffix}`,
      line_id: `line_${studentSeed.student_id_number}`,
      email: `guardian${index + 1}@example.com`,
      address: `${100 + index} หมู่ ${index % 9 + 1} ตำบลทดสอบ อำเภอเมือง จังหวัดตัวอย่าง`,
    }).select('id').single(), `create guardian ${studentSeed.student_id_number}`);
    assertOk(await supabase.from('student_guardians').insert({
      student_id: student.id,
      guardian_id: guardian.id,
      relation: ['father', 'mother', 'guardian', 'relative', 'other'][index % 5],
      is_primary: true,
      can_receive_notifications: true,
      can_pickup_student: index % 3 !== 0,
    }), `link guardian ${studentSeed.student_id_number}`);
    studentRecords.push(student);
  }

  const deductCategory = categories.find((category) => category.type === 'deduct');
  const addCategory = categories.find((category) => category.type === 'add');
  const scoreRows = [];
  const thresholdSamples = deductCategory ? buildThresholdSamples(thresholds) : [];
  const approvedAt = new Date().toISOString();

  for (const sample of thresholdSamples) {
    const student = studentRecords[sample.index];
    const teacher = teacherRecords[sample.index % teacherRecords.length];
    const halfDeducted = Math.floor(sample.deducted / 2);
    const deductedParts = sample.deducted >= 30 ? [halfDeducted, sample.deducted - halfDeducted] : [sample.deducted];

    for (const [partIndex, deducted] of deductedParts.entries()) {
      scoreRows.push({
        student_id: student.id,
        category_id: deductCategory.id,
        points: -deducted,
        note: `ข้อมูลทดสอบเกณฑ์: ระดับ ${sample.thresholdLevel}${partIndex > 0 ? ' (ต่อเนื่อง)' : ''}`,
        recorded_by: teacher.profile_id,
        academic_year_id: academicYear.id,
        status: 'approved',
        approved_by: adminProfileId || teacher.profile_id,
        approved_at: approvedAt,
      });
    }

    if (addCategory && sample.added > 0) {
      scoreRows.push({
        student_id: student.id,
        category_id: addCategory.id,
        points: sample.added,
        note: 'ข้อมูลทดสอบเกณฑ์: เพิ่มคะแนนชดเชย',
        recorded_by: teacher.profile_id,
        academic_year_id: academicYear.id,
        status: 'approved',
        approved_by: adminProfileId || teacher.profile_id,
        approved_at: approvedAt,
      });
    }
  }

  for (let index = THRESHOLD_SAMPLE_COUNT; index < studentRecords.length; index += 1) {
    const teacher = teacherRecords[index % teacherRecords.length];
    if (deductCategory && index % 5 === 0) {
      scoreRows.push({
        student_id: studentRecords[index].id,
        category_id: deductCategory.id,
        points: -Math.abs(deductCategory.default_points || 5),
        note: 'ข้อมูลทดสอบ: ตัดคะแนนพฤติกรรม',
        recorded_by: teacher.profile_id,
        academic_year_id: academicYear.id,
        status: 'approved',
        approved_by: adminProfileId || teacher.profile_id,
        approved_at: approvedAt,
      });
    }
    if (addCategory && index % 7 === 0) {
      scoreRows.push({
        student_id: studentRecords[index].id,
        category_id: addCategory.id,
        points: Math.abs(addCategory.default_points || 5),
        note: 'ข้อมูลทดสอบ: เพิ่มคะแนนความดี',
        recorded_by: teacher.profile_id,
        academic_year_id: academicYear.id,
        status: 'approved',
        approved_by: adminProfileId || teacher.profile_id,
        approved_at: approvedAt,
      });
    }
  }
  if (scoreRows.length > 0) assertOk(await supabase.from('score_transactions').insert(scoreRows), 'create score transactions');

  console.log(JSON.stringify({
    ok: true,
    deleted_profiles: deletedProfiles,
    classrooms: classrooms.length,
    created_teachers: teacherRecords.length,
    created_students: studentRecords.length,
    created_guardians: studentRecords.length,
    created_teacher_assignments: classrooms.length,
    created_score_transactions: scoreRows.length,
    created_threshold_sample_students: thresholdSamples.length,
    threshold_levels: thresholds.map((threshold) => threshold.deducted),
    teacher_password: teacherPassword,
    student_password: studentPassword,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
