# 04 — การจัดการครู

## ภาพรวม

- ครู 1 คน = 1 auth user + 1 profile + 1 teacher record
- ครู login ด้วย email + password
- ครูมี role: `teacher`, `admin`, `superadmin` (เลือกได้ตอนสร้าง)

## การเพิ่มครู

### เพิ่มทีละคน

1. ไป `/teachers` → กด **"เพิ่มครู"**
2. กรอก: คำนำหน้า, ชื่อ, นามสกุล, อีเมล, รหัสเจ้าหน้าที่, เบอร์โทร, แผนก, ตำแหน่ง
3. เลือกสิทธิ์ในระบบ: `teacher`, `admin`, `superadmin`
4. กดบันทึก

**รหัสผ่านเริ่มต้น:** ระบบสร้าง auth user ด้วยรหัสผ่าน `Teacher@123` และบังคับเปลี่ยนรหัสผ่านครั้งแรก (`must_change_password = true`)

### นำเข้าจาก CSV (`/settings/import` หรือปุ่ม Import ที่ `/teachers`)

**Headers (ภาษาไทย):**
```
รหัสเจ้าหน้าที่,คำนำหน้า,ชื่อ,นามสกุล,อีเมล,เบอร์โทร,แผนก,ตำแหน่ง,สิทธิ์ในระบบ,ห้องที่ปรึกษา
```

**Required vs Optional:**

| ฟิลด์ | Required | หมายเหตุ |
|-------|----------|---------|
| `คำนำหน้า` | ✅ | พิมพ์ผิด → default `นาย` |
| `ชื่อ` | ✅ | 1 ตัวก็ได้, eng ได้ |
| `นามสกุล` | ✅ | 1 ตัวก็ได้, eng ได้ |
| `อีเมล` | ✅ | ใช้ login, ซ้ำข้าม |
| `รหัสเจ้าหน้าที่` | ❌ | |
| `เบอร์โทร` | ❌ | |
| `แผนก` | ❌ | |
| `ตำแหน่ง` | ❌ | default `ครู` |
| `สิทธิ์ในระบบ` | ❌ | `teacher`/`admin`/`superadmin`, default `teacher` |
| `ห้องที่ปรึกษา` | ❌ | ชื่อห้องในปีปัจจุบัน เช่น `ม.1/1` → assign เป็น homeroom |

**พฤติกรรม:**
- email ซ้ำ → skip (ไม่ update ทับ)
- ปีการศึกษา: ใช้ปีปัจจุบันเสมอ
- รหัสผ่านเริ่มต้น: `Teacher@123` + บังคับเปลี่ยน (`must_change_password = true`)
- export CSV ใช้ headers ไทยเหมือน import → export แล้ว import กลับได้ทันที

## การรีเซ็ตรหัสผ่าน

1. `/teachers` → คลิก `⋯` ที่แถวครู → **รีเซ็ตรหัสผ่าน**
2. ระบบส่ง email reset link ไปที่อีเมลครู (ผ่าน Supabase Auth)
3. ครูกด link ใน email → ไปหน้า `/reset-password` → ตั้งรหัสผ่านใหม่
4. หลังจากตั้งรหัสผ่าน → redirect ไป `/login`

**เงื่อนไข:**
- ต้องตั้ง `NEXT_PUBLIC_SITE_URL` ใน env vars
- Supabase Auth ต้องเปิด email service

## การ assign ครูเข้าห้อง

1. `/teachers` → คลิกชื่อครู → tab **"ห้องเรียน"**
2. เพิ่มห้อง → เลือกห้อง + บทบาท (`homeroom`, `assistant`, `subject`, `discipline`)
3. ครู 1 คน สอนได้หลายห้อง
4. ห้อง 1 ห้อง มีครูได้หลายคน

## ตำแหน่งครู (`/settings/teacher-positions`)

- จัดการตำแหน่ง: ครู, ครูผู้ช่วย, ครูชำนาญการ, ครูชำนาญการพิเศษ, หัวหน้าระดับ, ครูแนะแนว, ครูฝ่ายปกครอง
- `sort_order` ควบคุมลำดับใน dropdown

## สิทธิ์ที่ครูมี

ดูรายละเอียดที่ [01-roles-permissions.md](01-roles-permissions.md)

### ครูธรรมดา (`teacher`)
- บันทึกคะแนนนักเรียนทุกคน (ไม่ใช่แค่ห้องตัวเอง)
- Bulk record
- ดูรายงานห้องเรียนที่ตัวเองสอน
- แก้ไขข้อมูล + รีเซ็ตรหัสผ่านนักเรียนในห้องตัวเอง

### ครูที่เป็น admin
- เหมือนครูธรรมดา + จัดการข้อมูลโรงเรียน, อนุมัติคะแนน, ดูรายงานทั้งหมด

### ครูที่เป็น superadmin
- ทุกอย่าง

## DB Tables

| Table | Key |
|-------|-----|
| `teachers` | `profile_id` → `profiles` |
| `teacher_classrooms` | `teacher_id` + `classroom_id` + `assignment_role` |
| `teacher_positions` | reference data |
