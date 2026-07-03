# 08 — ตั้งค่าระบบ

## หน้า Settings (`/settings`)

เข้าถึงโดย superadmin, admin

### Tab: ข้อมูลโรงเรียน

- **ชื่อโรงเรียน (TH)** — แสดงใน sidebar, login page, รายงาน
- **ชื่อโรงเรียน (EN)** — แสดงใน UI ภาษาอังกฤษ
- **Logo** — อัปโหลดรูป (PNG/JPG/GIF/WebP, max 2MB) — เฉพาะ superadmin

### Tab: คะแนน

- **คะแนนตั้งต้น (base_score)** — default 100
- **คะแนนขั้นต่ำ (score_floor)** — default 0
- **คะแนนเกินฐานแสดงเป็น** — "100+"

### Tab: เกณฑ์แจ้งเตือน (Thresholds)

- เพิ่ม/ลบ thresholds
- แต่ละ threshold: `คะแนนที่ถูกตัด` + `การดำเนินการ` + `สี`
- ตัวอย่าง:
  - 40 → ทำทัณฑ์บนครั้งที่ 1
  - 60 → ทำทัณฑ์บนครั้งที่ 2
  - 80 → ทำทัณฑ์บนครั้งที่ 3
  - 100 → ย้ายสถานศึกษา

สีเลือกจาก palette 8 สี (แดง, ส้ม, เหลือง, เขียว, น้ำเงิน, ม่วง, ชมพู, เทา)

### Tab: โครงสร้างชั้นเรียน

ลิงก์ไปหน้า:
- `/settings/academic-years` — จัดการปีการศึกษา
- `/settings/education-stages` — จัดการระดับชั้นการศึกษา
- `/settings/grade-levels` — จัดการชั้นปี

### Tab: Storage

- **Storage Provider** — `vercel_blob`, `supabase`, `google_drive`
- **Vercel Blob** — ใช้ `BLOB_READ_WRITE_TOKEN`
- **Google Drive** — ต้องกรอก service account email, private key, folder IDs
- ปุ่ม **Test Connection** — ทดสอบการเชื่อมต่อ (เฉพาะ superadmin)
- **Email (Resend)** — API key + from address + test send

## หน้าอื่นใน Settings

### `/settings/profile`
- แก้ไขโปรไฟล์ตัวเอง (ชื่อ, เบอร์โทร, รูป)
- ทุก role เข้าได้

### `/settings/import`
- CSV import ครู
- CSV import นักเรียน + ผู้ปกครอง
- Annual import

### `/settings/logs`
- **Audit Logs** — เหตุการณ์ที่เปลี่ยนข้อมูล (create/update/delete/void/approve)
- **Action Logs** — เหตุการณ์การใช้งาน (login, view, export)
- แสดง: วันเวลา, ผู้ทำ, action, เป้าหมาย, IP, user-agent

### `/settings/teacher-positions`
- จัดการตำแหน่งครู (ครู, ครูผู้ช่วย, ครูชำนาญการ...)

## DB: settings table

| Key | Value (JSON) | หมายเหตุ |
|-----|-------------|---------|
| `school_name` | `"โรงเรียน..."` | |
| `school_logo` | `"/api/blob/branding/..."` | URL หรือ path |
| `base_score` | `100` | |
| `score_floor` | `0` | |
| `display_score_above_base_as` | `"100+"` | |
| `thresholds` | `[{deducted, action, color}]` | |
| `conduct_levels` | `[{name, min, max, color}]` | |
| `storage_provider` | `"vercel_blob"` | |
| `pdpa_notice_version` | `"1.0"` | |
| `password_policy` | `{...}` | |
| `resend_api_key` | `"re_..."` | optional |
| `resend_from` | `"noreply@..."` | optional |
