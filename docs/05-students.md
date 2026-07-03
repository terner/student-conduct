# 05 — การจัดการนักเรียน

## ภาพรวม

- นักเรียน 1 คน = 1 auth user + 1 profile + 1 student record + enrollment รายปี
- นักเรียน login ด้วย `student_id_number` + password
- ต้องมี enrollment ในปีปัจจุบัน (`is_current = true`) จึงจะ login ได้

## การเพิ่มนักเรียน

### เพิ่มทีละคน

1. ไป `/students` → กด **"เพิ่มนักเรียน"**
2. กรอก: คำนำหน้า, ชื่อ, นามสกุล, รหัสนักเรียน, ห้องเรียน, ผู้ปกครอง
3. ระบบสร้าง auth user ด้วยรหัสผ่าน `Student@123`

### นำเข้าจาก CSV (`/settings/import`)

**Headers (ภาษาไทย):**
```
รหัสนักเรียน,คำนำหน้า,ชื่อ,นามสกุล,ห้อง,เลขที่ในห้อง,คำนำหน้าผู้ปกครอง,ชื่อผู้ปกครอง,นามสกุลผู้ปกครอง,ความสัมพันธ์,เบอร์โทรผู้ปกครอง
```

**Required vs Optional:**

| ฟิลด์ | Required | หมายเหตุ |
|-------|----------|---------|
| `รหัสนักเรียน` | ✅ | ซ้ำ → skip (ไม่ update ทับ) |
| `ชื่อ` | ✅ | |
| `นามสกุล` | ✅ | |
| `ห้อง` | ✅ | ชื่อห้องในปีปัจจุบัน เช่น `ม.1/1` |
| `คำนำหน้า` | ❌ | พิมพ์ผิด → default `เด็กชาย` |
| `เลขที่ในห้อง` | ❌ | ซ้ำได้ |
| `คำนำหน้าผู้ปกครอง` | ❌ | |
| `ชื่อผู้ปกครอง` | ❌ | |
| `นามสกุลผู้ปกครอง` | ❌ | |
| `ความสัมพันธ์` | ❌ | default `guardian` |
| `เบอร์โทรผู้ปกครอง` | ❌ | |

**ฟิลด์ที่ถูก ignore (auto-detect):**
- `ปีการศึกษา` → ใช้ปีปัจจุบันเสมอ
- `ชั้นปี` → derive จากชื่อห้อง
- `สถานะ` → default `active`

**พฤติกรรม:**
- `รหัสนักเรียน` ซ้ำ → skip (ไม่ทับข้อมูลเดิม)
- ปีการศึกษา: ใช้ปีปัจจุบันเสมอ
- รหัสผ่านเริ่มต้น: `Student@123` + บังคับเปลี่ยน (`must_change_password = true`)
- login ครั้งแรก → `/first-password` → `/pdpa-consent`

## รหัสนักเรียน

- `student_id_number` ใช้ login
- เลขซ้ำกันได้ในปีการศึกษาต่างกัน (เช่น 2568000001 ในปี 2568 และ 2568 ในปีอื่น)
- แต่**ห้ามซ้ำในปีเดียวกัน**
- Login จะ resolve จากปีปัจจุบัน (`is_current = true`)

## การรีเซ็ตรหัสผ่านนักเรียน

1. ไปหน้า student profile → กด **"รีเซ็ตรหัสผ่าน"**
2. คนที่ทำได้: superadmin, admin, หรือครูที่เป็น homeroom/assistant ของห้องนักเรียน
3. ระบบตั้งรหัสผ่านเป็น `Student@123` และบังคับเปลี่ยน (`must_change_password = true`)

## สถานะนักเรียน

| Status | ความหมาย |
|--------|---------|
| `active` | กำลังศึกษา |
| `inactive` | พักการเรียน |
| `transferred` | ย้ายโรงเรียน |
| `graduated` | จบการศึกษา |
| `suspended` | ถูกพักการเรียน |

- นักเรียนที่ `active` เท่านั้นที่ login ได้
- เปลี่ยนสถานะได้ที่หน้า student profile

## Enrollment รายปี

- เก็บข้อมูลห้อง, เลขที่, ปีการศึกษา
- สถานะ enrollment: `active`, `promoted`, `repeated`, `transferred`, `inactive`, `graduated`
- `source`: `annual_import`, `manual`, `promotion_helper`

## ผู้ปกครอง

- นักเรียน 1 คน มีผู้ปกครองได้หลายคน
- ต้องมีผู้ปกครองหลัก 1 คน (`is_primary = true`)
- ข้อมูล: ชื่อ, ความสัมพันธ์, เบอร์โทร, LINE ID, อีเมล, ที่อยู่
- ตั้งค่า: `can_receive_notifications`, `can_pickup_student`

## Student Profile Page

เมื่อเข้าไปที่หน้า `/students/[id]` จะเห็น:
- คะแนนปัจจุบัน + ระดับความประพฤติ
- ประวัติคะแนน (timeline chart + table)
- ข้อมูลส่วนตัว + ผู้ปกครอง
- สถานะ enrollment
- ปุ่ม: บันทึกคะแนน, แก้ไขข้อมูล, เปลี่ยนสถานะ, รีเซ็ตรหัสผ่าน

## DB Tables

| Table | Key |
|-------|-----|
| `students` | `profile_id`, `student_id_number` |
| `student_enrollments` | FK → `students`, `classrooms`, `academic_years` |
| `guardians` | standalone |
| `student_guardians` | FK → `students`, `guardians`, `relation` |
