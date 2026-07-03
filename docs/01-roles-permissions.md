# 01 — สิทธิ์และบทบาท (Roles & Permissions)

## ภาพรวม

ระบบมี 4 บทบาท: `superadmin`, `admin`, `teacher`, `student`

ใช้ฟังก์ชัน `can*` ใน `src/lib/security/roles.ts` ตรวจสอบสิทธิ์

## ตารางสิทธิ์หลัก

| ฟังก์ชัน | superadmin | admin | teacher | student |
|----------|:---------:|:-----:|:------:|:------:|
| `canManageSettings` | ✅ | ✅ | ❌ | ❌ |
| `canManageSchoolData` | ✅ | ✅ | ❌ | ❌ |
| `canApproveScores` | ✅ | ✅ | ❌ | ❌ |
| `canImportData` | ✅ | ✅ | ❌ | ❌ |
| `canRecordScores` | ✅ | ✅ | ✅ | ❌ |

## สิ่งที่แต่ละบทบาททำได้

### superadmin
- ทุกอย่าง — จัดการตั้งค่า, จัดการผู้ใช้, อนุมัติคะแนน, ดู audit log
- อัปโหลด logo โรงเรียน
- ทดสอบ storage connection
- เปลี่ยนปีการศึกษา

### admin
- จัดการข้อมูลโรงเรียน (นร./ครู/ห้องเรียน)
- อนุมัติคะแนน, void คะแนน
- ดูรายงานทั้งหมด
- CSV import
- แก้ไข settings (ชื่อโรงเรียน, thresholds, คะแนนตั้งต้น)
- **แก้ไข settings ไม่ได้บางอย่าง** (logo, storage test)

### teacher
- บันทึกคะแนนนักเรียนทุกคน (add/deduct)
- Bulk record
- ดูรายงานห้องเรียนที่ตัวเองสอน
- แก้ไขข้อมูลนักเรียนในห้องที่ตัวเองเป็น homeroom/assistant
- รีเซ็ตรหัสผ่านนักเรียนในห้องตัวเอง
- ดู student profile

### student
- ดูคะแนนตัวเอง
- ดูประวัติคะแนนตัวเอง
- ดูการแจ้งเตือนของตัวเอง

## การตรวจสอบสิทธิ์แบบละเอียด

### Server Actions (`src/lib/actions/`)

ทุก server action ถูก wrap ด้วย `withAuth()` (ตรวจว่ามี session) และเช็ค `can*` อีกชั้น

| หมวด | Action | Permission |
|------|--------|-----------|
| นักเรียน | ดูรายชื่อ | `canManageSchoolData` |
| | แก้ไข | `canManageSchoolData \|\| canApproveScores` หรือ homeroom/assistant |
| | รีเซ็ตรหัสผ่าน | `canEditStudentProfile()` → admin/superadmin/homeroom/assistant |
| | เปลี่ยนสถานะ | `canApproveScores && canManageSchoolData` |
| | CSV Import | `canImportData` |
| ครู | ทั้งหมด | `canManageSchoolData` |
| คะแนน | บันทึก | `canRecordScores` |
| | อนุมัติ/Void | `canApproveScores` |
| ห้องเรียน | ดูทั้งหมด | `canManageSchoolData \|\| canApproveScores` |
| | สร้าง/แก้ไข/ลบ | `canManageSchoolData` |
| รายงาน | ดูทั้งหมด | `canApproveScores` |
| ตั้งค่า | ดู + แก้ไข | `canManageSettings` |

### Route Access Guard (`src/components/layout/route-access-guard.tsx`)

| Role | เข้าได้ |
|------|--------|
| superadmin | ทุกหน้า |
| admin | settings, dashboard, score/*, import, reports, interventions |
| teacher | score/record, reports/classroom, student profiles |
| student | students/me, student/dashboard, student profile ตัวเอง |

### Sidebar Menu

| เมนู | superadmin | admin | teacher | student |
|------|:---------:|:-----:|:------:|:------:|
| แดชบอร์ด | ✅ | ✅ | ❌ | ❌ |
| รายชื่อนักเรียน | ✅ | ❌ | ❌ | ❌ |
| ห้องเรียน | ✅ | ✅ | ❌ | ❌ |
| บันทึกคะแนน | ✅ | ✅ | ✅ | ❌ |
| ประวัติคะแนน | ✅ | ✅ | ❌ | ❌ |
| หมวดหมู่คะแนน | ✅ | ✅ | ❌ | ❌ |
| รออนุมัติ | ✅ | ✅ | ❌ | ❌ |
| นำเข้าข้อมูล | ✅ | ✅ | ❌ | ❌ |
| รายงาน | ✅ | ✅ | ❌ | ❌ |
| รายงานห้องเรียน | ❌ | ❌ | ✅ | ❌ |
| รายชื่อครู | ✅ | ❌ | ❌ | ❌ |
| ตั้งค่า | ✅ | ✅ | ❌ | ❌ |
| คะแนนของฉัน | ❌ | ❌ | ❌ | ✅ |

## API Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 20 ครั้ง | 1 นาที |
| Upload evidence | 30 ครั้ง | 1 นาที |
| Upload logo | 10 ครั้ง | 1 นาที |
| Upload avatar | 10 ครั้ง | 1 นาที |

## Auth Guards

- ไม่มี session → redirect `/login`
- `must_change_password=true` → redirect `/first-password`
- PDPA ยังไม่ consent → redirect `/pdpa-consent`
- `is_active=false` → 403
