# Full Version — หน้าการออกแบบ Figma

รายการหน้าทั้งหมดที่ต้องออกแบบใน Figma สำหรับระบบ Student Conduct Score System (Full Version)

---

## สารบัญ

1. [Auth Group (5 หน้า)](#1-auth-group)
2. [Dashboard Group (3 หน้า)](#2-dashboard-group)
3. [Student Management (3 หน้า)](#3-student-management)
4. [Score Management (3 หน้า)](#4-score-management)
5. [Classroom Management (3 หน้า)](#5-classroom-management)
6. [Teacher Management (2 หน้า)](#6-teacher-management)
7. [Reports (8 หน้า)](#7-reports)
8. [Interventions (2 หน้า)](#8-interventions)
9. [Settings (5 หน้า)](#9-settings)
10. [Layouts (4 หน้า)](#10-layouts)
11. [Modals / Dialogs (8 รายการ)](#11-modals--dialogs)
12. [Mobile / Responsive (5 หน้า)](#12-mobile--responsive)
13. [สรุปรวมทุกรายการ](#13-สรุปรวมทุกรายการ)

---

## 1. Auth Group (5 หน้า)

หน้าเหล่านี้ใช้ **Auth Layout** — การ์ดตรงกลางจอ ไม่มี Sidebar

### 1.1 Login Page
- **Route:** `/login`
- **Role:** ทุกคน
- **Elements:**
  - โลโก้โรงเรียน + ชื่อโรงเรียน
  - ช่องอีเมล หรือ รหัสนักเรียน
  - ช่องรหัสผ่าน
  - ปุ่ม "เข้าสู่ระบบ"
  - ลิงก์ "ลืมรหัสผ่าน?" (เฉพาะ admin/teacher)
  - Toggle หรือ Auto detect: นักเรียน / ครู/Admin
  - Error state: "รหัสผ่านไม่ถูกต้อง", "บัญชีถูกปิดใช้งาน"
  - Loading state: spinner ขณะ login
- **Variant:** Desktop + Mobile

### 1.2 Forgot Password Page
- **Route:** `/forgot-password`
- **Role:** Admin, Teacher
- **Elements:**
  - คำอธิบาย: "ใส่อีเมลที่ลงทะเบียนไว้ ระบบจะส่งลิงก์รีเซ็ตรหัสผ่าน"
  - ช่องอีเมล
  - ปุ่ม "ส่งลิงก์รีเซ็ตรหัสผ่าน"
  - Success state: "ตรวจสอบอีเมลของคุณ"
  - Error state: "ไม่พบอีเมลนี้ในระบบ"
  - Rate limit: "กรุณารอ 1 ชั่วโมงก่อนลองใหม่"

### 1.3 Change Password Page (First Login)
- **Route:** `/change-password`
- **Role:** ทุกคน (เมื่อ must_change_password = true)
- **Elements:**
  - คำอธิบาย: "คุณต้องเปลี่ยนรหัสผ่านก่อนเข้าใช้งานครั้งแรก"
  - รหัสผ่านเดิม
  - รหัสผ่านใหม่
  - ยืนยันรหัสผ่านใหม่
  - ข้อกำหนดรหัสผ่าน (min 8, special chars ฯลฯ)
  - Strength indicator
  - ปุ่ม "เปลี่ยนรหัสผ่าน"
  - Error state: "รหัสผ่านไม่ตรงตามข้อกำหนด"

### 1.4 PDPA Consent Page
- **Route:** `/pdpa-consent`
- **Role:** ทุกคน (หลัง login ถ้ายังไม่ consent)
- **Elements:**
  - หัวข้อ: "นโยบายความเป็นส่วนตัว (Privacy Notice)"
  - Version badge + วันที่
  - ข้อความ PDPA แบบยาว (scroll)
  - Checkbox: "ยอมรับนโยบายความเป็นส่วนตัว"
  - Checkbox optional: "ยอมรับการรับการแจ้งเตือน"
  - ปุ่ม "ยอมรับและเข้าใช้งาน" (primary — disable จนกว่า tick checkbox)
  - ปุ่ม "ปฏิเสธ" (secondary — logout)
  - Footer: ลิงก์ติดต่อผู้ดูแลระบบ

### 1.5 PDPA Rejected Page
- **Route:** `/pdpa-rejected`
- **Role:** ทุกคน (เมื่อกดปฏิเสธ PDPA)
- **Elements:**
  - ไอคอนเตือน
  - ข้อความ: "ไม่สามารถใช้งานระบบได้หากไม่ยอมรับนโยบายความเป็นส่วนตัว"
  - คำแนะนำ: "กรุณาติดต่อผู้ดูแลระบบ"
  - ปุ่ม "กลับไปหน้าเข้าสู่ระบบ"
  - ข้อมูลติดต่อ admin

---

## 2. Dashboard Group (3 หน้า)

ใช้ **Dashboard Layout** — Sidebar ซ้าย + Navbar บน

### 2.1 Admin Dashboard
- **Route:** `/dashboard`
- **Role:** Admin
- **Elements:**
  - Header: "แดชบอร์ด" + ปีการศึกษา + เกรด/ห้อง
  - Stat cards (4-6 ใบ):
    - จำนวนนักเรียนทั้งหมด (active)
    - จำนวนครู
    - จำนวนห้องเรียน
    - คะแนนเฉลี่ยโรงเรียน
    - นักเรียนถึง threshold (⚠️ ถ้ามี)
    - รายการรออนุมัติ (⚠️ ถ้ามี)
  - กราฟ: คะแนนเฉลี่ยรายเดือน (line chart)
  - ตาราง: รายการคะแนนล่าสุด 10 รายการ
  - ตาราง: นักเรียนที่ถึง threshold ล่าสุด (top 5)
  - ปุ่มลัด: บันทึกคะแนน, นำเข้า CSV, รายงาน

### 2.2 Teacher Dashboard
- **Route:** `/dashboard`
- **Role:** Teacher
- **Elements:**
  - Header: "แดชบอร์ด" + ชื่อครู + ห้องที่รับผิดชอบ
  - Stat cards:
    - จำนวนนักเรียนในห้องที่รับผิดชอบ
    - คะแนนเฉลี่ยของแต่ละห้อง
    - นักเรียนถึง threshold ในห้องตัวเอง (⚠️)
  - Card แต่ละห้องที่รับผิดชอบ:
    - ชื่อห้อง
    - จำนวนนักเรียน
    - คะแนนเฉลี่ย
    - จำนวนนักเรียนถึง threshold
    - ปุ่ม "ดูรายงานห้อง"
  - รายการคะแนนล่าสุดที่บันทึกโดยครูคนนี้
  - ปุ่มลัด: บันทึกคะแนน, ดูรายงาน

### 2.3 Student Dashboard (Self-View)
- **Route:** `/student/dashboard`
- **Role:** Student
- **Elements:**
  - Header: "ยินดีต้อนรับ, [ชื่อ]" + badge ระดับความประพฤติ
  - Card ใหญ่: คะแนนปัจจุบัน (ตัวเลขใหญ่) + badge สี
  - กราฟ timeline คะแนน (Recharts line)
  - สรุประดับ: "ดีมาก" / "ดี" / "พอใช้" / "ต้องปรับปรุง"
  - ตาราง: รายการคะแนนล่าสุด 5 รายการ
  - ปุ่ม "ดูประวัติทั้งหมด"
  - ข้อมูลส่วนตัว: ชื่อ, รหัสนักเรียน, ห้อง, ปีการศึกษา

---

## 3. Student Management (3 หน้า)

### 3.1 Student List
- **Route:** `/students`
- **Role:** Admin, Teacher (Admin เห็นทั้งหมด / Teacher เห็นเฉพาะที่ได้รับสิทธิ์)
- **Elements:**
  - Search bar: ค้นหาชื่อ/นามสกุล/รหัสนักเรียน
  - Filters:
    - ห้องเรียน (dropdown)
    - ระดับชั้น (dropdown)
    - สถานะ (active/inactive/transferred/graduated/suspended)
    - ปีการศึกษา
  - ปุ่ม "เพิ่มนักเรียน" (admin)
  - ปุ่ม "นำเข้า CSV" (admin)
  - ตาราง:
    - # | รูป | ชื่อ | นามสกุล | รหัสนักเรียน | ห้อง | คะแนนปัจจุบัน | ระดับ | สถานะ | การดำเนินการ
  - Pagination
  - เรียงลำดับได้ (click header)
  - Empty state: "ไม่พบนักเรียนตามเงื่อนไข"
  - Loading: Skeleton table

### 3.2 Student Detail
- **Route:** `/students/[id]`
- **Role:** Admin, Teacher, Student (ของตัวเอง)
- **Elements:**
  - Header: ชื่อ-นามสกุล + รหัสนักเรียน + badge ระดับ + badge สถานะ
  - Tabs:
    - **โปรไฟล์:** ข้อมูลส่วนตัว, ห้อง, ปีการศึกษา, รูป (optional)
    - **ประวัติคะแนน:** ScoreTimeline + TransactionTable + threshold status
    - **ผู้ปกครอง:** รายชื่อผู้ปกครอง (Full version)
    - **เอกสารทัณฑ์บน:** ประวัติ bond document (Full version)
    - **Intervention:** ประวัติการติดตาม (Full version)
  - Score Timeline Chart (Recharts)
  - Transaction Table: วันที่, หมวด, คะแนน, หมายเหตุ, ผู้บันทึก, หลักฐาน
  - ปุ่ม "บันทึกคะแนน" (admin/teacher)
  - Evidence Gallery (รูปหลักฐาน)

### 3.3 Student Create/Edit Form
- **Route:** `/students/create` หรือ modal ใน student list
- **Role:** Admin
- **Elements:**
  - ฟอร์ม:
    - คำนำหน้า (dropdown)
    - ชื่อจริง *
    - นามสกุล *
    - รหัสนักเรียน * (10 หลัก)
    - ห้องเรียน (dropdown)
    - สถานะ (dropdown: active)
    - อีเมล (สำหรับสร้าง auth user)
    - รหัสผ่าน (auto-generate หรือ กำหนดเอง)
  - ปุ่ม "บันทึก" / "ยกเลิก"
  - Validation error แยกตาม field
  - Success: redirect ไป student detail

---

## 4. Score Management (3 หน้า)

### 4.1 Score Record Form (Single)
- **Route:** `/score/record`
- **Role:** Admin, Teacher
- **Elements:**
  - Step 1: เลือกนักเรียน
    - StudentSearch: พิมพ์ชื่อ/รหัส → dropdown results
    - แสดงข้อมูลนักเรียนที่เลือก: รูป, ชื่อ, ห้อง, คะแนนปัจจุบัน
  - Step 2: เลือกประเภท
    - Toggle: "เพิ่มคะแนน" / "ตัดคะแนน"
    - หมวดคะแนน (dropdown): แสดงเฉพาะของ type นั้น
    - คะแนน (number input): default จากหมวด
  - Step 3: รายละเอียด
    - หมายเหตุ (textarea, max 500 chars)
    - แนบหลักฐาน: EvidenceUploader (Google Drive)
  - Step 4: ยืนยัน
    - สรุป: นักเรียน, หมวด, คะแนน, หมายเหตุ
    - ปุ่ม "บันทึกคะแนน"
    - Success: toast + ปุ่ม "บันทึกอีก"
  - State: loading, error, validation

### 4.2 Score Record Form (Bulk)
- **Route:** `/score/record/bulk` หรือ toggle ในหน้า record
- **Role:** Admin, Teacher
- **Elements:**
  - เลือกนักเรียน: checkbox list + search + filter ตามห้อง
  - แสดงจำนวนที่เลือก: "เลือก 15 คน"
  - เลือกประเภท + หมวด + คะแนน (เหมือน single)
  - หมายเหตุ (ใช้ร่วมกันทั้งหมด)
  - Preview: รายชื่อนักเรียนที่จะบันทึก
  - ปุ่ม "บันทึกทั้งหมด"
  - Progress bar ขณะบันทึก
  - Result: "สำเร็จ 15 คน, ล้มเหลว 0 คน"

### 4.3 Pending Approval Queue
- **Route:** `/score/pending` หรือเป็น tab ใน dashboard
- **Role:** Admin
- **Elements:**
  - Header: "รายการรออนุมัติ" + จำนวนที่รอ
  - Filters: วันที่, ครูผู้บันทึก, ห้อง
  - ตาราง:
    - # | นักเรียน | ครูผู้บันทึก | หมวด | คะแนน | วันที่ | หมายเหตุ
    - Action: [อนุมัติ] [ปฏิเสธ] (admin)
  - Click row → expand detail + evidence
  - Confirm dialog: "ยืนยันอนุมัติรายการนี้?"
  - Toast: "อนุมัติเรียบร้อย" / "ปฏิเสธเรียบร้อย"

---

## 5. Classroom Management (3 หน้า)

### 5.1 Classroom List
- **Route:** `/classrooms`
- **Role:** Admin, Teacher
- **Elements:**
  - Filter: ปีการศึกษา, ระดับชั้น (ประถม/มัธยม)
  - ปุ่ม "เพิ่มห้องเรียน" (admin)
  - การ์ดแต่ละห้อง:
    - ชื่อห้อง (เช่น ป.1/1)
    - ครูประจำชั้น
    - จำนวนนักเรียน
    - คะแนนเฉลี่ย
    - จำนวนนักเรียนถึง threshold
  - Click → ไป classroom detail

### 5.2 Classroom Detail
- **Route:** `/classrooms/[id]`
- **Role:** Admin, Teacher
- **Elements:**
  - Header: ชื่อห้อง, ระดับชั้น, ปีการศึกษา, ครูที่เกี่ยวข้อง
  - Stat cards: จำนวนนักเรียน, คะแนนเฉลี่ย, ระดับดีมาก X%, threshold X คน
  - ตารางนักเรียนในห้อง:
    - # | ชื่อ | นามสกุล | รหัสนักเรียน | คะแนนปัจจุบัน | ระดับ | threshold | จำนวนครั้งถูกตัด | จำนวนครั้งถูกเพิ่ม
  - ปุ่ม "บันทึกคะแนนนักเรียนในห้องนี้" (admin/teacher)
  - ปุ่ม "ดูรายงานห้อง" → report classroom
  - ส่วนจัดการครู (admin): เพิ่ม/ลบครูประจำห้อง

### 5.3 Classroom Create/Edit Form
- **Route:** modal ใน classroom list
- **Role:** Admin
- **Elements:**
  - ชื่อห้อง (เช่น "ป.1/1") *
  - ระดับชั้น (ประถม/มัธยม) *
  - ชั้นปี (1-6) *
  - ปีการศึกษา *
  - ครูประจำชั้น (select teacher)
  - ปุ่ม "บันทึก"

---

## 6. Teacher Management (2 หน้า)

### 6.1 Teacher List
- **Route:** `/teachers`
- **Role:** Admin
- **Elements:**
  - Search: ชื่อ, รหัสพนักงาน
  - ปุ่ม "เพิ่มครู"
  - ตาราง:
    - # | ชื่อ | นามสกุล | รหัสพนักงาน | แผนก | อีเมล | ห้องที่รับผิดชอบ | สถานะ
  - Click row → edit หรือ detail

### 6.2 Teacher Create/Edit + Assign Classrooms
- **Route:** modal หรือ /teachers/create
- **Role:** Admin
- **Elements:**
  - ฟอร์ม:
    - ชื่อจริง *
    - นามสกุล *
    - รหัสพนักงาน
    - แผนก
    - อีเมล * (ใช้ login)
    - รหัสผ่าน (auto-generate)
  - Assign ห้องเรียน:
    - List ห้องทั้งหมด + checkbox
    - แต่ละห้องมี dropdown: บทบาท (homeroom/assistant/subject/discipline)
    - แสดงห้องที่เลือกแล้ว
  - ปุ่ม "บันทึก"

---

## 7. Reports (8 หน้า)

### 7.1 Report Hub
- **Route:** `/reports`
- **Role:** Admin, Teacher
- **Elements:**
  - Header: "รายงาน"
  - Grid การ์ดรายงาน (3-6 ใบ):
    1. 📄 **รายงานรายบุคคล** — "ดูประวัติคะแนนรายบุคคล"
    2. 🏫 **รายงานรายห้อง** — "สรุปคะแนนรายห้อง"
    3. 📅 **รายงานประจำเดือน** — "สรุปประจำเดือน"
    4. ⚠️ **รายงานนักเรียนเสี่ยง** — "นักเรียนที่ต้องติดตาม"
    5. 📊 **รายงานสถิติโรงเรียน** — "สถิติภาพรวม"
    6. 🟠 **รายงานนักเรียนถึงเกณฑ์** — "Threshold report"
    7. 📑 **หนังสือทัณฑ์บน** — "เอกสารทัณฑ์บน"
  - แต่ละการ์ด: icon, ชื่อ, คำอธิบาย, ปุ่ม "ดูรายงาน"
  - Role-based: Teacher เห็นเฉพาะรายงานที่自己有สิทธิ์

### 7.2 Individual Report
- **Route:** `/reports/individual`
- **Role:** Admin, Teacher, Student
- **Elements:**
  - Step 1: เลือกนักเรียน (student search)
  - Report view:
    - Header: รูป, ชื่อ, รหัสนักเรียน, ห้อง, ระดับ badge
    - คะแนนปัจจุบัน (ตัวเลขใหญ่) + คะแนนที่ถูกตัดสะสม + threshold badge
    - ScoreTimeline (Recharts line chart)
    - TransactionTable: วันที่, หมวด, คะแนน, หมายเหตุ, ผู้บันทึก, หลักฐาน
    - EvidenceGallery (รูปที่แนบ)
    - ช่องลายเซ็น: (Full version) นักเรียน / ผู้ปกครอง / ครู
  - ปุ่ม "พิมพ์รายงาน"
  - ปุ่ม "Export PDF" (Full version)

### 7.3 Classroom Report
- **Route:** `/reports/classroom`
- **Role:** Admin, Teacher
- **Elements:**
  - Step 1: เลือกห้อง (dropdown)
  - Report view:
    - Header: ชื่อห้อง, ระดับชั้น, ปีการศึกษา, ครูประจำชั้น
    - Stat cards: จำนวนนักเรียน, คะแนนเฉลี่ย, จำนวนถึง threshold
    - กราฟแท่งแจกแจงระดับ (Full version)
    - ตาราง: # | ชื่อ | นามสกุล | รหัสนักเรียน | คะแนน | ระดับ | ถูกตัด | เพิ่ม | threshold
    - สรุป: "ดีมาก X คน, ดี X คน, พอใช้ X คน, ต้องปรับปรุง X คน"
  - ปุ่ม "พิมพ์"
  - ปุ่ม "Export CSV/Excel" (Full version)

### 7.4 Monthly Report
- **Route:** `/reports/monthly`
- **Role:** Admin, Teacher
- **Elements:**
  - Step 1: เลือกเดือน + ปีการศึกษา + ห้อง (หรือทั้งโรงเรียน)
  - Step 2: สร้างรายงาน
    - Summary cards:
      - เพิ่มคะแนนทั้งหมด
      - ตัดคะแนนทั้งหมด
      - จำนวน transactions ทั้งหมด
    - Top 5 ความผิดที่พบบ่อยที่สุด (bar chart)
    - นักเรียนที่คะแนนดีขึ้น/แย่ลงมากที่สุด
    - การกระจายระดับความประพฤติ (pie chart)
    - เปรียบเทียบกับเดือนก่อน (line chart)
    - สรุป threshold: "นักเรียนถึงเกณฑ์ X คน"
  - ปุ่ม "บันทึก Snapshot" (finalize)
  - ปุ่ม "พิมพ์" / "Export"
  - Status: draft / finalized / cancelled

### 7.5 At-Risk Report
- **Route:** `/reports/at-risk`
- **Role:** Admin, Teacher
- **Elements:**
  - Header: "รายงานนักเรียนเสี่ยง"
  - Filter: ห้อง, ระดับชั้น, ช่วงคะแนน (default < 70)
  - ตาราง:
    - # | ชื่อ | ห้อง | คะแนนปัจจุบัน | แนวโน้ม (↑/↓) | คะแนนเดือนก่อน | threshold
    - Trend arrow: เขียว (ดีขึ้น), แดง (แย่ลง), เทา (คงที่)
  - กราฟ: จำนวนนักเรียนเสี่ยงตามห้อง (bar chart)
  - ปุ่ม "Export PDF/Excel"

### 7.6 School Statistics
- **Route:** `/reports/statistics`
- **Role:** Admin
- **Elements:**
  - Header: "สถิติโรงเรียน"
  - ตัวกรอง: ปีการศึกษา
  - Score Distribution Histogram
  - Top Violations Bar Chart (หมวดที่ถูกตัดมากที่สุด)
  - ห้องที่มีคะแนนเฉลี่ยต่ำที่สุด (ranking)
  - เปรียบเทียบเดือนต่อเดือน (line chart)
  - เปรียบเทียบระดับชั้น
  - Threshold summary

### 7.7 Bond Document (หนังสือทัณฑ์บน)
- **Route:** `/reports/bond/[id]`
- **Role:** Admin, Teacher (view), Admin (generate)
- **Elements:**
  - Header: "หนังสือทัณฑ์บน" + เลขที่เอกสาร
  - ข้อมูลนักเรียน: ชื่อ, รหัส, ห้อง
  - รายการความผิดที่ส่งผลให้ถึง threshold
  - คะแนนที่ถูกตัดรวม
  - ข้อความทัณฑ์บน
  - ช่องลายเซ็น: นักเรียน / ผู้ปกครอง / ครูประจำชั้น / ผู้บริหาร
  - Footer: วันที่ออก, ผู้สร้าง, ผู้อนุมัติ
  - สถานะ: draft / generated / signed / cancelled
  - ปุ่ม "พิมพ์" + นับจำนวนพิมพ์
  - ปุ่ม "อนุมัติ" / "ยกเลิก" (admin)

### 7.8 Threshold Report
- **Route:** `/reports/threshold`
- **Role:** Admin, Teacher
- **Elements:**
  - Header: "รายงานนักเรียนถึงเกณฑ์"
  - Filters: ห้อง, ระดับ threshold
  - Summary bar: "ทั้งหมด X คน | ครั้งที่ 1: X | ครั้งที่ 2: X | ครั้งที่ 3: X | ขั้นสูงสุด: X"
  - ตาราง:
    - # | ชื่อ | นามสกุล | รหัสนักเรียน | ห้อง | คะแนนปัจจุบัน | ถูกตัดสะสม | ระดับ threshold (badge สี) | การดำเนินการ
    - Badge: 🟠 ครั้งที่ 1, 🔴 ครั้งที่ 2, 🔴🔴 ครั้งที่ 3, ⚫ ขั้นสูงสุด
  - Click → ไป student detail
  - ปุ่ม "พิมพ์"
  - Full version เพิ่ม: Export CSV, สร้าง bond document, บันทึก intervention

---

## 8. Interventions (2 หน้า)

### 8.1 Intervention Log List
- **Route:** `/interventions`
- **Role:** Admin, Teacher
- **Elements:**
  - Header: "บันทึกการติดตาม"
  - Filters: นักเรียน, ห้อง, ประเภท, ช่วงวันที่, ครูผู้บันทึก
  - ปุ่ม "บันทึกการติดต่อใหม่"
  - ตาราง:
    - # | วันที่ | นักเรียน | ห้อง | ประเภท | ผู้บันทึก | สรุป | สถานะ
  - Click → detail
  - Empty state: "ยังไม่มีการบันทึกการติดต่อ"

### 8.2 Intervention Detail / Create
- **Route:** `/interventions/[id]` หรือ `/interventions/create`
- **Role:** Admin, Teacher
- **Elements:**
  - ฟอร์ม:
    - นักเรียน * (search)
    - ผู้ปกครองที่ติดต่อ (dropdown guardian — Full version)
    - ประเภท: phone_call, parent_meeting, warning, bond, home_visit, counseling, other
    - ช่องทาง: phone, line, email, in_person, letter, other
    - วันที่เกิดเหตุ
    - สรุปการติดต่อ * (textarea)
    - ผลลัพธ์ (textarea)
    - นัดติดตามครั้งถัดไป (date picker)
    - เชื่อมกับ score transaction (optional)
  - Detail view:
    - แสดงข้อมูลทั้งหมด + ประวัติ intervention ของนักเรียนคนนี้
    - ปุ่ม "แก้ไข" / "ลบ" (ตาม权限)

---

## 9. Settings (5 หน้า)

### 9.1 System Settings
- **Route:** `/settings`
- **Role:** Admin
- **Elements:**
  - Form sections:
    - **ข้อมูลโรงเรียน:** ชื่อโรงเรียน (TH/EN), ที่อยู่, เบอร์โทร, โลโก้
    - **การตั้งค่าคะแนน:** คะแนนตั้งต้น, คะแนนขั้นต่ำ, คะแนนสูงสุด, รูปแบบแสดง (100+)
    - **ปีการศึกษาปัจจุบัน:** dropdown ปีการศึกษา
    - **PDPA Notice:** ข้อความ PDPA + version number + ปุ่ม "บันทึก"
    - **Thresholds:** Configurable list (เพิ่ม/ลด/แก้ไข):
      - deducted: 40 | action: "ทำทัณฑ์บนครั้งที่ 1" | color: #E68A2E
      - deducted: 60 | action: "ทำทัณฑ์บนครั้งที่ 2" | color: #D9534F
      - deducted: 80 | action: "ทำทัณฑ์บนครั้งที่ 3" | color: #C9302C
      - deducted: 100 | action: "ย้ายสถานศึกษา" | color: #8B0000
  - ปุ่ม "บันทึกการตั้งค่า"
  - Toast: "บันทึกเรียบร้อย"

### 9.2 CSV Import
- **Route:** `/settings/import`
- **Role:** Admin
- **Elements:**
  - Tabs: "นำเข้านักเรียน" / "นำเข้าครู" / "นำเข้าประจำปี"
  - 3-Step Wizard:
    1. **Upload:** ลากไฟล์ หรือ เลือกไฟล์ CSV → preview table
    2. **Preview:** แสดงข้อมูล + highlight error แถวสีแดง + สรุป (ใหม่ X, มีอยู่แล้ว X, error X)
    3. **Confirm:** ปุ่ม "ยืนยันนำเข้า" + progress bar
  - ปุ่ม "ดาวน์โหลด template" (Excel Thai ด้วย BOM)
  - Result: "นำเข้าเรียบร้อย X รายการ, error X รายการ"

### 9.3 Academic Year Management
- **Route:** `/settings/academic-years`
- **Role:** Admin
- **Elements:**
  - รายการปีการศึกษา: ตารางปี + สถานะ current + ปุ่ม "ตั้งเป็นปีปัจจุบัน"
  - ปุ่ม "เพิ่มปีการศึกษาใหม่"
  - Annual Import Wizard (Full version):
    - อัปโหลดรายชื่อนักเรียน/ครูตามห้องจริงของปีใหม่
    - Preview: นักเรียนเดิม, นักเรียนใหม่, ไม่พบในปีใหม่, ซ้ำชั้น, ย้ายห้อง
    - Confirm → สร้าง student_enrollments + audit_log

### 9.4 Audit Log Viewer
- **Route:** `/settings/audit-log`
- **Role:** Admin
- **Elements:**
  - Tabs: "Audit Logs" / "Action Logs" (Full version)
  - Filters: วันที่, ผู้กระทำ, action, target type
  - ตาราง:
    - วันที่ | ผู้กระทำ | Action | เป้าหมาย | รายละเอียด
  - Click row → expand: before_data, after_data, ip_address, user_agent
  - Pagination
  - Empty state: "ไม่มี log"

### 9.5 Permission Editor
- **Route:** `/settings/permissions`
- **Role:** Admin
- **Elements:**
  - Tabs: "สิทธิ์ตามบทบาท" / "ข้อยกเว้นรายบุคคล" (Full version)
  - ตาราง checklist  grouped by หมวด:
    - หมวด: นักเรียน, คะแนน, รายงาน, การติดตาม, ทัณฑ์บน, ระบบ, การแจ้งเตือน
    - แต่ละแถว: permission code | ชื่อ | Admin | Teacher | Student
    - Checkbox: ✅ / ❌
  - Search permission
  - ปุ่ม "บันทึก"

---

## 10. Layouts (4 หน้า)

### 10.1 Root Layout
- **Route:** `app/layout.tsx`
- **Role:** ทุกคน
- **Elements:**
  - ฟอนต์ Sarabun
  - Metadata
  - Providers: Supabase, Theme, i18n

### 10.2 Auth Layout
- **Route:** `app/(auth)/layout.tsx`
- **Role:** ยังไม่ login
- **Elements:**
  - ไม่มี Sidebar
  - เนื้อหากลางจอ (card centered)
  - โลโก้โรงเรียนเล็ก ๆ ตรงกลางบน
  - Footer: ลิขสิทธิ์

### 10.3 Dashboard Layout (Main App)
- **Route:** `app/(dashboard)/layout.tsx`
- **Role:** Admin, Teacher
- **Elements:**
  - **Sidebar (ซ้าย):**
    - โลโก้ + ชื่อโรงเรียน
    - เมนู:
      - 🏠 แดชบอร์ด
      - 👨‍🎓 นักเรียน
      - 📝 บันทึกคะแนน
      - 🏫 ห้องเรียน
      - 👨‍🏫 ครู (admin)
      - 📊 รายงาน
      - 📞 ติดตาม (Full version)
      - ⚙️ ตั้งค่า (admin)
    - เมนู active state
    - User info ล่าง: ชื่อ, บทบาท, ออกจากระบบ
  - **Top Navbar:**
    - ชื่อหน้า
    - Locale switcher TH/EN (Full version)
    - NotificationBell (Full version)
    - User avatar + dropdown
  - Main content area
  - Responsive: sidebar collapse → hamburger

### 10.4 Error / 404 Page
- **Route:** `app/error.tsx` + `app/not-found.tsx`
- **Role:** ทุกคน
- **Elements:**
  - 404: "ไม่พบหน้าที่คุณค้นหา" + ปุ่ม "กลับไปหน้าแรก"
  - Error: "เกิดข้อผิดพลาด" + ปุ่ม "ลองใหม่"
  - Timeout: "ระบบไม่ตอบสนอง กรุณาลองใหม่ภายหลัง"

---

## 11. Modals / Dialogs (8 รายการ)

### 11.1 Evidence Uploader Dialog
- **ใช้ใน:** Score Record Form
- **Elements:**
  - ปุ่ม "แนบรูป" (Google Drive)
  - แสดงรูปที่เลือก thumbnail
  - ลบรูป
  - จำกัด 1-3 รูปต่อ transaction
  - Upload progress bar

### 11.2 Score Void Dialog
- **ใช้ใน:** Student Detail (Transaction Table)
- **Elements:**
  - "ยกเลิกรายการคะแนนนี้?"
  - แสดงรายการ: นักเรียน, หมวด, คะแนน, วันที่
  - เหตุผลที่ยกเลิก * (textarea)
  - ปุ่ม "ยืนยันยกเลิก" / "ปิด"
  - Warning: "การกระทำนี้ไม่สามารถย้อนกลับได้"

### 11.3 CSV Import Preview Dialog
- **ใช้ใน:** CSV Import Page
- **Elements:**
  - ตาราง preview ข้อมูล
  - แถว error: ไฮไลต์สีแดง + ข้อความ error
  - สรุป: ใหม่ X, มีอยู่แล้ว X, error X
  - ปุ่ม "ยืนยันนำเข้า" / "ยกเลิก"

### 11.4 Export Menu
- **ใช้ใน:** ทุกรายงาน
- **Elements:**
  - Dropdown: Export CSV, Export Excel, Export PDF
  - Disabled ตาม permission

### 11.5 Notification Dropdown
- **ใช้ใน:** Navbar (Full version)
- **Elements:**
  - Bell icon + badge count
  - Dropdown: รายการแจ้งเตือนล่าสุด 5 รายการ
  - "ดูทั้งหมด" → หน้า notification
  - Mark as read

### 11.6 Student Create/Edit Modal
- **ใช้ใน:** Student List
- **Elements:**
  - ฟอร์ม: ชื่อ, นามสกุล, รหัสนักเรียน, ห้อง, สถานะ
  - ปุ่ม "บันทึก" / "ยกเลิก"
  - Validation inline

### 11.7 Teacher Assign Classroom Modal
- **ใช้ใน:** Teacher Detail
- **Elements:**
  - List ห้องทั้งหมด + checkbox
  - แต่ละห้อง: dropdown บทบาท
  - ปุ่ม "บันทึก"

### 11.8 Confirm Dialog
- **ใช้ใน:** ทั่วไป
- **Elements:**
  - "ยืนยันการดำเนินการ?"
  - รายละเอียด
  - ปุ่ม "ยืนยัน" (primary) / "ยกเลิก" (secondary)
  - Variant: danger (แดง), warning (ส้ม), info (น้ำเงิน)

---

## 12. Mobile / Responsive (5 หน้า)

### 12.1 Mobile Login
- **Responsive ของ:** Login Page
- **Elements:**
  - Full screen (no card)
  - Keyboard-aware
  - Touch-friendly inputs

### 12.2 Mobile Dashboard
- **Responsive ของ:** Dashboard
- **Elements:**
  - Stack stat cards แนวตั้ง
  - Sidebar → bottom nav หรือ hamburger
  - Tables → card list

### 12.3 Mobile Score Record
- **Responsive ของ:** Score Record Form
- **Elements:**
  - Step-by-step wizard (1 page per step)
  - Large touch targets
  - Student search → full screen

### 12.4 Mobile Student List
- **Responsive ของ:** Student List
- **Elements:**
  - Search bar fixed top
  - Card list แทนตาราง
  - Swipe to action
  - Filter → bottom sheet

### 12.5 Mobile Report View
- **Responsive ของ:** Reports
- **Elements:**
  - Charts → scrollable
  - Tables → horizontal scroll
  - Print → use system print

---

## 13. สรุปรวมทุกรายการ

| หมวด | จำนวนหน้า | จำนวน Modal |
|------|----------|-------------|
| 1. Auth Group | 5 | 0 |
| 2. Dashboard Group | 3 | 0 |
| 3. Student Management | 3 | 1 |
| 4. Score Management | 3 | 2 |
| 5. Classroom Management | 3 | 1 |
| 6. Teacher Management | 2 | 1 |
| 7. Reports | 8 | 1 |
| 8. Interventions | 2 | 0 |
| 9. Settings | 5 | 0 |
| 10. Layouts | 4 | 0 |
| 11. Modals / Dialogs | 0 | 8 |
| 12. Mobile | 5 | 0 |
| **รวมทั้งหมด** | **41 หน้า** | **8 Modals** |

### สี / Token Design System (สำหรับ Figma)

```typescript
// ระดับความประพฤติ
ดีมาก:     #27500A (เขียว)
ดี:        #0C447C (น้ำเงิน)
พอใช้:     #633806 (ส้ม)
ต้องปรับปรุง: #A32D2D (แดง)

// Threshold Badge
ครั้งที่ 1:  #E68A2E (ส้ม)
ครั้งที่ 2:  #D9534F (แดง)
ครั้งที่ 3:  #C9302C (แดงเข้ม)
ขั้นสูงสุด:  #8B0000 (ดำ/แดง)

// สถานะ
success: #22C55E
warning: #F59E0B
error:   #EF4444
info:    #3B82F6

// Neutral
background: #F8F9FA
surface:    #FFFFFF
border:     #E2E8F0
text:       #1E293B
text-muted: #94A3B8
```

### หมายเหตุสำหรับการออกแบบ

1. **MVP → Full:** หน้าใน MVP เป็น subset ของ Full — ออกแบบ Full แล้วค่อยตัด component ที่ไม่ต้องใช้ใน MVP
2. **Responsive:** ดีไซน์ Mobile First — Desktop เป็น expansion
3. **Role-based:** Component บางชิ้นแสดง/ซ่อนตาม role — ใช้ same layout
4. **i18n:** ช่องว่างข้อความต้องรองรับทั้ง TH/EN (ภาษาไทยยาวกว่า)
5. **Font:** ใช้ Sarabun ทั้งระบบ — Thai friendly
6. **Empty/Loading/Error:** ทุกหน้าต้องมี 3 states นี้
