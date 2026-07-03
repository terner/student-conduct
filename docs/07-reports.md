# 07 — รายงานและการแจ้งเตือน

## ประเภทรายงาน

### รายงานรายบุคคล (`/reports/individual`)

- ประวัติคะแนนทั้งปีของนักเรียน 1 คน
- Score timeline chart (Recharts)
- ตารางรายการทุก transaction
- ระดับความประพฤติปัจจุบัน + badge

### รายงานรายห้อง (`/reports/classroom`)

- ตารางคะแนนนักเรียนทุกคนในห้อง
- แสดง: ชื่อ, เลขที่, คะแนนปัจจุบัน, ระดับ, จำนวนครั้งถูกตัด/เพิ่ม
- Print-ready

### รายงานนักเรียนเสี่ยง (`/reports/at-risk`)

- นักเรียนที่คะแนนต่ำกว่า threshold
- ฟิลเตอร์ตามห้อง / ระดับชั้น
- Export

### รายงานนักเรียนถึงเกณฑ์ (`/reports/threshold`)

- นักเรียนที่คะแนนถึงเกณฑ์แจ้งเตือน (thresholds)
- search/filter/pagination
- Export CSV

### รายงานสถิติโรงเรียน (`/reports/statistics`)

- กราฟการกระจายคะแนน
- Top 5 categories
- เปรียบเทียบห้อง
- Monthly trend

### หนังสือทัณฑ์บน (`/reports/bond`)

- Generate เอกสารอัตโนมัติเมื่อถึง threshold
- แสดงรายการความผิด
- สถานะ: draft → generated → signed → cancelled
- ปุ่ม Print

## การแจ้งเตือน (Notifications)

### In-app (bell icon 🔔)

- แสดง badge count ที่ยังไม่ได้อ่าน
- ประเภท:
  - `score_approval_pending` — มีคะแนนรออนุมัติ
  - `threshold_reached` — นักเรียนถึงเกณฑ์
  - `score_recorded` — มีการบันทึกคะแนน

### ผู้รับ Notification

- **admin/superadmin** — ทุก threshold + approval pending
- **ครู homeroom/assistant** — threshold ของนักเรียนในห้องตัวเอง
- **ครูที่บันทึก** — ไม่ได้ notification ของตัวเอง

### Realtime

- ต่อ WebSocket ผ่าน Supabase Realtime
- Notification อัปเดตอัตโนมัติ (bell count)
- ต้องเปิด realtime บนตาราง: profiles, notifications, score_transactions

### Email (optional)

- ส่งผ่าน Resend (ต้องตั้ง `RESEND_API_KEY` ใน env vars)
- ใช้สำหรับ password reset email (ผ่าน Supabase Auth)

## DB Tables

| Table | Key |
|-------|-----|
| `monthly_reports` | `academic_year_id`, `report_month`, `snapshot` |
| `notifications` | `recipient_id`, `type`, `read_at`, `metadata` |
| `bond_documents` | `student_id`, `status`, `document_no` |
| `intervention_logs` | `student_id`, `intervention_type`, `contacted_guardian_id` |
