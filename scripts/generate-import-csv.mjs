import { writeFileSync } from 'node:fs';

function csvValue(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(path, headers, data) {
  const lines = [
    headers.join(','),
    ...data.map((row) => headers.map((header) => csvValue(row[header])).join(',')),
  ];
  writeFileSync(path, `\uFEFF${lines.join('\n')}\n`);
}

function classroomName(gradeLevel, roomNumber) {
  return gradeLevel <= 6 ? `ป.${gradeLevel}/${roomNumber}` : `ม.${gradeLevel - 6}/${roomNumber}`;
}

function stageCode(gradeLevel) {
  if (gradeLevel <= 6) return 'primary';
  if (gradeLevel <= 9) return 'secondary';
  return 'highschool';
}

const studentFirstNames = [
  'ธนภัทร', 'มินตรา', 'ปุณณวิช', 'ณิชา', 'กิตติพงศ์',
  'อริสา', 'พชรพล', 'ชนัญชิดา', 'วรเมธ', 'กัญญารัตน์',
  'นราวิชญ์', 'พิชญาภา', 'ศุภโชค', 'ธัญชนก', 'ภูวนาท',
  'แพรวา', 'อนาวิน', 'พิมพ์ชนก', 'ชยุต', 'ศศิธร',
];
const studentLastNames = [
  'ตั้งใจเรียน', 'สุขสวัสดิ์', 'เก่งกล้า', 'ใจงาม', 'เพียรดี',
  'ร่าเริง', 'มั่นคง', 'สดใส', 'กล้าหาญ', 'มีวินัย',
  'ใฝ่รู้', 'ขยันดี', 'รุ่งเรือง', 'สุภาพ', 'อดทน',
];

const studentHeaders = [
  'ปีการศึกษา',
  'รหัสนักเรียน',
  'คำนำหน้า',
  'ชื่อ',
  'นามสกุล',
  'ชั้นปี',
  'ห้อง',
  'เลขที่ในห้อง',
  'ระดับ',
  'สถานะ',
  'ชื่อผู้ปกครอง',
  'ความสัมพันธ์',
  'เบอร์โทรผู้ปกครอง',
];

const studentRows = Array.from({ length: 1000 }, (_, index) => {
  const number = index + 1;
  const gradeLevel = (index % 12) + 1;
  const roomNumber = (Math.floor(index / 12) % 2) + 1;
  const lastName = studentLastNames[Math.floor(index / studentFirstNames.length) % studentLastNames.length];
  return {
    ปีการศึกษา: '2568',
    รหัสนักเรียน: String(2568000000 + number),
    คำนำหน้า: index % 2 === 0 ? 'เด็กชาย' : 'เด็กหญิง',
    ชื่อ: studentFirstNames[index % studentFirstNames.length],
    นามสกุล: lastName,
    ชั้นปี: gradeLevel,
    ห้อง: classroomName(gradeLevel, roomNumber),
    เลขที่ในห้อง: Math.floor(index / 24) + 1,
    ระดับ: stageCode(gradeLevel),
    สถานะ: 'active',
    ชื่อผู้ปกครอง: `${index % 2 === 0 ? 'นาย' : 'นาง'}ผู้ปกครอง ${lastName}`,
    ความสัมพันธ์: ['บิดา', 'มารดา', 'ผู้ปกครอง', 'ญาติ'][index % 4],
    เบอร์โทรผู้ปกครอง: `082-222-${String(1000 + number).slice(-4)}`,
  };
});

const teacherFirstNames = ['อรทัย', 'ปกรณ์', 'วรรณา', 'นิรันดร์', 'มัลลิกา', 'ธนากร', 'ศิริพร', 'ชยพล', 'กนกวรรณ', 'ภาคิน'];
const teacherLastNames = ['ใจดี', 'สอนเก่ง', 'มีเมตตา', 'รักเรียน', 'นำทาง', 'หลักแหลม', 'เพียรดี', 'สุขใจ', 'ตั้งใจ', 'ดูแลดี'];
const teacherPrefixes = ['นางสาว', 'นาย', 'นาง', 'นาย', 'นางสาว', 'นาย', 'นาง', 'นาย', 'นางสาว', 'นาย'];
const teacherPositions = ['ครู', 'ครู', 'ครูชำนาญการ', 'ครูผู้ช่วย', 'หัวหน้าระดับ', 'ครู', 'ครูแนะแนว', 'ครู', 'ครูชำนาญการ', 'ครู'];

const teacherHeaders = [
  'รหัสเจ้าหน้าที่',
  'คำนำหน้า',
  'ชื่อ',
  'นามสกุล',
  'อีเมล',
  'เบอร์โทร',
  'แผนก',
  'ตำแหน่ง',
  'สิทธิ์ในระบบ',
];

const teacherRows = Array.from({ length: 50 }, (_, index) => {
  const number = index + 1;
  return {
    รหัสเจ้าหน้าที่: `T${String(number).padStart(3, '0')}`,
    คำนำหน้า: teacherPrefixes[index % teacherPrefixes.length],
    ชื่อ: teacherFirstNames[index % teacherFirstNames.length],
    นามสกุล: teacherLastNames[Math.floor(index / teacherFirstNames.length) % teacherLastNames.length],
    อีเมล: `teacher${number}@school.com`,
    เบอร์โทร: `081-111-${String(1000 + number).slice(-4)}`,
    แผนก: index % 3 === 0 ? 'งานกิจการนักเรียน' : index % 2 === 0 ? 'มัธยมศึกษา' : 'ประถมศึกษา',
    ตำแหน่ง: teacherPositions[index % teacherPositions.length],
    สิทธิ์ในระบบ: 'teacher',
  };
});

writeCsv('reports/import_students_1000.csv', studentHeaders, studentRows);
writeCsv('reports/import_teachers_50.csv', teacherHeaders, teacherRows);

console.log(JSON.stringify({
  students: { path: 'reports/import_students_1000.csv', rows: studentRows.length },
  teachers: { path: 'reports/import_teachers_50.csv', rows: teacherRows.length },
}, null, 2));
