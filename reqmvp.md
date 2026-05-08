# ระบบคะแนนความประพฤตินักเรียน — MVP

## Student Conduct Score System (Minimum Viable Product)

โรงเรียนเดียว · เข้าสู่ระบบตามบทบาท · บริหารคะแนน · รายงานพื้นฐาน + รายงาน Threshold

Next.js 14 | TypeScript | Supabase | Vercel | Tailwind CSS | ภาษาไทย

---

## สารบัญ

1. [Tech Stack](#1-tech-stack)
2. [วิธีติดตั้ง](#2-วิธีติดตั้ง)
3. [โครงสร้างฐานข้อมูล](#3-โครงสร้างฐานข้อมูล)
4. [โครงสร้างโฟลเดอร์](#4-โครงสร้างโฟลเดอร์)
5. [ระบบเข้าสู่ระบบและบทบาท](#5-ระบบเข้าสู่ระบบและบทบาท)
   - 5.5 [PDPA Consent Flow](#55-pdpa-consent-flow-บังคับก่อนเข้าใช้งาน)
6. [ระบบคะแนน](#6-ระบบคะแนน)
7. [ฟีเจอร์แยกตามบทบาท](#7-ฟีเจอร์แยกตามบทบาท)
8. [Component หลัก](#8-component-หลัก)
9. [หน้าและเส้นทาง](#9-หน้าและเส้นทาง)
10. [รายงานใน MVP](#10-รายงานใน-mvp)
11. [API Endpoints](#11-api-endpoints)
12. [CSS / ฟอนต์](#12-css--ฟอนต์)
13. [เกณฑ์การแจ้งเตือน (Threshold)](#13-เกณฑ์การแจ้งเตือน-threshold)
14. [ดีไซน์เผื่อขยายไป Full Version](#14-ดีไซน์เผื่อขยายไป-full-version)
15. [ฟีเจอร์ที่ควรทำตั้งแต่ MVP](#15-ฟีเจอร์ที่ควรทำตั้งแต่-mvp-ป้องกัน-rework-หนัก)
16. [สิ่งที่ตัดออกจาก Full Version](#16-สิ่งที่ตัดออกจาก-full-version)
17. [เกณฑ์การยอมรับ (Acceptance Criteria)](#17-เกณฑ์การยอมรับ-acceptance-criteria)

---

## 1. Tech Stack

| ชั้น | เทคโนโลยี | วัตถุประสงค์ |
|------|----------|-------------|
| Framework | Next.js 14 (App Router) | SSR, routing, server actions |
| ภาษา | TypeScript | ความปลอดภัยของชนิดข้อมูล |
| ฐานข้อมูล | Supabase (PostgreSQL) | เก็บข้อมูล + RLS |
| ยืนยันตัวตน | Supabase Auth | Login, บทบาท, session |
| โฮสต์ | Vercel | Deploy |
| UI | shadcn/ui + Tailwind CSS | ระบบ component |
| กราฟ | Recharts | กราฟ timeline คะแนน |
| ฟอร์ม | react-hook-form + zod | ตรวจสอบข้อมูล |
| CSV | papaparse | นำเข้านักเรียน |
| ฟอนต์ | Sarabun (Google Fonts) | UI ภาษาไทย |

---

## 2. วิธีติดตั้ง

```bash
# 2.1 สร้างโปรเจกต์
npx create-next-app@latest school-conduct --typescript --tailwind --app --src-dir
cd school-conduct

# 2.2 ติดตั้ง Dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install @hookform/resolvers react-hook-form zod recharts sonner
npm install papaparse @types/papaparse
npm install lucide-react class-variance-authority clsx tailwind-merge

# 2.3 shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card dialog select table badge form input label textarea toast tabs separator sheet

# 2.4 Environment Variables (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 2.5 Deploy ขึ้น Vercel
npx vercel --prod
```

---

## 3. โครงสร้างฐานข้อมูล

วาง SQL ใน Supabase SQL Editor แล้วรันทั้งหมด

### 3.1 Extension

```sql
create extension if not exists "uuid-ossp";
```

### 3.2 ตารางหลัก (7 ตาราง)

```sql
-- profiles — เชื่อมกับ auth.users, เก็บบทบาท + ชื่อ
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique,
  role text check (role in ('admin','teacher','student')) not null,
  first_name text not null,
  last_name text not null,
  is_active boolean default true,
  must_change_password boolean default false,
  last_login_at timestamptz,
  created_at timestamptz default now()
);

-- classrooms — ห้องเรียน
create table classrooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                           -- เช่น 'ป.1/1', 'ม.1/1'
  education_stage text check (education_stage in ('primary','secondary')) not null,
  grade_level int not null check (grade_level between 1 and 6),
  academic_year text not null,                  -- เช่น '2569'
  unique (name, academic_year)
);

-- students — นักเรียน
create table students (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade unique,
  student_id_number text unique,                -- รหัสนักเรียน 10 หลัก
  classroom_id uuid references classrooms(id),
  current_status text check (current_status in ('active','inactive','transferred','graduated','suspended')) default 'active'
);

-- teachers — ครู
create table teachers (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade unique,
  employee_id text unique,
  department text
);

-- teacher_classrooms — ครูประจำชั้น/ประจำวิชา (หลายคนต่อหลายห้อง)
create table teacher_classrooms (
  teacher_id uuid references teachers(id),
  classroom_id uuid references classrooms(id),
  assignment_role text check (assignment_role in ('homeroom','assistant','subject','discipline')) default 'homeroom',
  assigned_at timestamptz default now(),
  primary key (teacher_id, classroom_id)
);

-- score_categories — หมวดคะแนน (เพิ่ม/ตัด)
create table score_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text check (type in ('deduct','add')) not null,
  default_points int not null,                  -- ค่าบวก=เพิ่ม, ค่าลบ=ตัด
  description text,
  is_active boolean default true,
  created_by uuid references profiles(id)
);

-- score_transactions — รายการบันทึกคะแนน
create table score_transactions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) not null,
  category_id uuid references score_categories(id),
  points int not null,                          -- บวก=เพิ่มคะแนน, ลบ=ตัดคะแนน
  note text,                                    -- หมายเหตุ
  recorded_by uuid references profiles(id) not null,
  recorded_at timestamptz default now(),
  academic_year text not null
);

-- settings — ตั้งค่าระบบ
create table settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);

-- pdpa_consents — บันทึกการยอมรับ PDPA
create table pdpa_consents (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  consent_version text not null,
  accepted boolean not null default true,
  accepted_at timestamptz default now(),
  ip_address text,
  user_agent text,
  unique (profile_id, consent_version)
);
```

### 3.3 Indexes

```sql
create index idx_profiles_user_id on profiles(user_id);
create index idx_profiles_role on profiles(role);
create index idx_students_profile_id on students(profile_id);
create index idx_students_id_number on students(student_id_number);
create index idx_students_classroom on students(classroom_id);
create index idx_score_transactions_student on score_transactions(student_id);
create index idx_score_transactions_recorded_at on score_transactions(recorded_at);
create index idx_score_transactions_academic_year on score_transactions(academic_year);
```

### 3.4 Row Level Security (RLS)

```sql
-- ========================================
-- PROFILES
-- ========================================
alter table profiles enable row level security;

create policy "profiles_self" on profiles
  for select using (user_id = auth.uid());

create policy "profiles_admin_all" on profiles
  for all using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
  );

-- ========================================
-- STUDENTS
-- ========================================
alter table students enable row level security;

create policy "students_admin_all" on students
  for all using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
  );

create policy "students_teacher_view" on students
  for select using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'teacher')
    and current_status = 'active'
  );

create policy "students_self" on students
  for select using (
    profile_id = (select id from profiles where user_id = auth.uid())
  );

-- ========================================
-- CLASSROOMS
-- ========================================
alter table classrooms enable row level security;

create policy "classrooms_admin_all" on classrooms
  for all using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
  );

create policy "classrooms_teacher_view_assigned" on classrooms
  for select using (
    exists (select 1 from teacher_classrooms tc
      join teachers t on t.id = tc.teacher_id
      where t.profile_id = (select id from profiles where user_id = auth.uid())
      and tc.classroom_id = classrooms.id)
  );

-- ========================================
-- TEACHER_CLASSROOMS
-- ========================================
alter table teacher_classrooms enable row level security;

create policy "teacher_classrooms_admin_all" on teacher_classrooms
  for all using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
  );

create policy "teacher_classrooms_self" on teacher_classrooms
  for select using (
    teacher_id = (select id from teachers where profile_id = (select id from profiles where user_id = auth.uid()))
  );

-- ========================================
-- SCORE TRANSACTIONS
-- ========================================
alter table score_transactions enable row level security;

create policy "transactions_admin_all" on score_transactions
  for all using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
  );

create policy "transactions_teacher_insert" on score_transactions
  for insert with check (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'teacher')
  );

create policy "transactions_teacher_select" on score_transactions
  for select using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'teacher')
  );

create policy "transactions_student_own" on score_transactions
  for select using (
    student_id = (select id from students where profile_id = (select id from profiles where user_id = auth.uid()))
  );

-- ========================================
-- SCORE CATEGORIES
-- ========================================
alter table score_categories enable row level security;

create policy "categories_admin_all" on score_categories
  for all using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
  );

create policy "categories_read_all" on score_categories
  for select using (true);

-- ========================================
-- SETTINGS
-- ========================================
alter table settings enable row level security;

create policy "settings_admin_all" on settings
  for all using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
  );

create policy "settings_read_all" on settings
  for select using (true);

-- ========================================
-- PDPA CONSENTS
-- ========================================
alter table pdpa_consents enable row level security;

create policy "pdpa_admin_all" on pdpa_consents
  for all using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
  );

create policy "pdpa_self" on pdpa_consents
  for select using (
    profile_id = (select id from profiles where user_id = auth.uid())
  );

create policy "pdpa_insert_self" on pdpa_consents
  for insert with check (
    profile_id = (select id from profiles where user_id = auth.uid())
  );
```

### 3.5 ข้อมูลเริ่มต้น

```sql
-- ตั้งค่าพื้นฐาน
insert into settings (key, value) values
  ('school_name', '"โรงเรียนตัวอย่าง"'),
  ('school_name_en', '"Example School"'),
  ('school_logo_url', '""'),
  ('base_score', '100'),
  ('score_floor', '0'),
  ('academic_year', '"2569"'),
  ('pdpa_notice_version', '"1.0"'),
  ('pdpa_notice_text', '"โรงเรียนตัวอย่างเก็บรวบรวมข้อมูลส่วนบุคคล..."');

-- ตั้งค่าเกณฑ์การแจ้งเตือน (threshold)
insert into settings (key, value) values
  ('thresholds', '[
    {"deducted": 40, "action": "ทำทัณฑ์บนครั้งที่ 1 — เชิญผู้ปกครอง", "color": "#E68A2E"},
    {"deducted": 60, "action": "ทำทัณฑ์บนครั้งที่ 2 — เชิญผู้ปกครอง", "color": "#D9534F"},
    {"deducted": 80, "action": "ทำทัณฑ์บนครั้งที่ 3 — อาจพักการเรียน", "color": "#C9302C"},
    {"deducted": 100, "action": "ย้ายสถานศึกษา", "color": "#8B0000"}
  ]');

-- หมวดคะแนนเริ่มต้น 12 รายการ
insert into score_categories (name, type, default_points, description) values
  ('มาสาย', 'deduct', -5, 'มาโรงเรียนหรือเข้าชั้นเรียนสาย'),
  ('แต่งกายผิดระเบียบ', 'deduct', -5, 'เครื่องแบบหรือทรงผมไม่เป็นไปตามระเบียบ'),
  ('ไม่เข้าแถว/ไม่ร่วมกิจกรรม', 'deduct', -5, 'ไม่เข้าร่วมกิจกรรมตามที่โรงเรียนกำหนด'),
  ('ขาดเรียน/หนีเรียน', 'deduct', -10, 'ขาดเรียนหรือออกนอกชั้นเรียนโดยไม่ได้รับอนุญาต'),
  ('ใช้คำหยาบ/ไม่สุภาพ', 'deduct', -10, 'ใช้วาจาไม่เหมาะสมต่อผู้อื่น'),
  ('ทะเลาะวิวาท', 'deduct', -20, 'มีพฤติกรรมใช้ความรุนแรงหรือทะเลาะวิวาท'),
  ('ทำลายทรัพย์สิน', 'deduct', -20, 'ทำให้ทรัพย์สินโรงเรียนหรือผู้อื่นเสียหาย'),
  ('พกพาสิ่งต้องห้าม', 'deduct', -30, 'พกพาสิ่งของต้องห้ามตามระเบียบโรงเรียน'),
  ('จิตอาสา', 'add', 5, 'เข้าร่วมกิจกรรมจิตอาสา'),
  ('ช่วยงานโรงเรียน', 'add', 5, 'ช่วยงานหรือกิจกรรมของโรงเรียน'),
  ('สร้างชื่อเสียงให้โรงเรียน', 'add', 10, 'ได้รับรางวัลหรือสร้างชื่อเสียงให้โรงเรียน'),
  ('พฤติกรรมดีเด่น', 'add', 10, 'ได้รับการยกย่องด้านความประพฤติ');
```

---

## 4. โครงสร้างโฟลเดอร์

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx              # หน้าเข้าสู่ระบบ
│   ├── change-password/
│   │   └── page.tsx              # เปลี่ยนรหัสผ่านครั้งแรก
│   ├── pdpa-consent/
│   │   └── page.tsx              # PDPA consent (ยอมรับ/ปฏิเสธ)
│   └── layout.tsx                # Auth layout (card ตรงกลาง)
├── (dashboard)/
│   ├── page.tsx                  # Dashboard รวม (admin/teacher)
│   ├── layout.tsx                # Dashboard layout (sidebar + navbar)
│   ├── students/
│   │   ├── page.tsx              # รายชื่อนักเรียน + ค้นหา
│   │   └── [id]/
│   │       └── page.tsx          # ข้อมูลนักเรียน + ประวัติคะแนน
│   ├── score/
│   │   └── record/
│   │       └── page.tsx          # บันทึกคะแนน (เพิ่ม/ตัด)
│   ├── classrooms/
│   │   ├── page.tsx              # รายการห้องเรียน
│   │   └── [id]/
│   │       └── page.tsx          # รายละเอียดห้อง + คะแนนนักเรียน
│   ├── reports/
│   │   ├── page.tsx              # ศูนย์รวมรายงาน
│   │   ├── individual/
│   │   │   └── page.tsx          # รายงานรายบุคคล
│   │   ├── classroom/
│   │   │   └── page.tsx          # รายงานรายห้อง
│   │   └── threshold/
│   │       └── page.tsx          # ⭐ รายงานนักเรียนถึงเกณฑ์
│   ├── teachers/
│   │   └── page.tsx              # จัดการครู (admin เท่านั้น)
│   └── settings/
│       ├── page.tsx              # ตั้งค่าระบบ (admin เท่านั้น)
│       └── import/
│           └── page.tsx          # นำเข้า CSV (admin เท่านั้น)
├── student/
│   └── dashboard/
│       └── page.tsx              # นักเรียนดูคะแนนตัวเอง
├── layout.tsx                    # Root layout
├── error.tsx                     # Error boundary ทั่วไป
└── globals.css                   # Tailwind + ฟอนต์ Sarabun
```

---

## 5. ระบบเข้าสู่ระบบและบทบาท

### 5.1 สามบทบาท

| บทบาท | สิทธิ์การเข้าถึง |
|--------|---------------|
| **admin** | เห็นทุกอย่าง: นักเรียน ครู ห้องเรียน คะแนน ตั้งค่า รายงาน นำเข้า ดูรายงาน threshold ได้ |
| **teacher** | บันทึกคะแนนนักเรียน active ทุกคนในโรงเรียน ดู dashboard และรายงานเฉพาะห้องที่ได้รับมอบหมาย ดูรายงาน threshold เฉพาะนักเรียนในห้องตัวเอง |
| **student** | ดูคะแนนและประวัติของตัวเองเท่านั้น (ไม่เห็นรายงาน threshold) |

### 5.2 วิธีเข้าสู่ระบบ

- **Admin/Teacher**: เข้าสู่ระบบด้วยอีเมล + รหัสผ่าน (Supabase Auth)
- **Student**: เข้าสู่ระบบด้วย **รหัสนักเรียน** + รหัสผ่าน (ระบบหา auth user ให้อัตโนมัติ)
- หลัง login → ตรวจ `must_change_password` → ถ้า true ให้ไปเปลี่ยนรหัสผ่านก่อน
- เปลี่ยนเส้นทางตามบทบาท: `admin`/`teacher` → `/dashboard`, `student` → `/student/dashboard`
- ถ้า `is_active = false` → บล็อกการเข้าใช้

### 5.3 กฎรหัสผ่าน

- **นักเรียน**: อย่างน้อย 8 ตัวอักษร, ต้องมี พิมพ์เล็ก, พิมพ์ใหญ่, ตัวเลข, อักขระพิเศษ
- **เจ้าหน้าที่** (admin/teacher): อย่างน้อย 8 ตัวอักษร
- Admin สร้างบัญชี → ตั้งรหัสผ่านชั่วคราว → นักเรียนต้องเปลี่ยนครั้งแรก

### 5.4 การจัดการ Session

- ใช้ session management ของ Supabase Auth
- Auto-refresh token ก่อนหมดอายุ
- อนุญาตหลาย session พร้อมกัน
- Auto-logout เมื่อไม่มีกิจกรรม 8 ชั่วโมง

### 5.5 PDPA Consent Flow (บังคับก่อนเข้าใช้งาน)

**ทุกคนต้องยอมรับ PDPA ก่อนเข้าใช้งานระบบครั้งแรก** — เป็นไปตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562

**Flow การทำงาน:**

```
┌──────────────────────┐
│     LOGIN สำเร็จ      │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  ตรวจสอบ PDPA        │
│  - มี consent ล่าสุด?  │
└──────────┬───────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
  [ยังไม่ยอมรับ]  [ยอมรับแล้ว]
     │           │
     ▼           ▼
  /pdpa-consent  เข้า Dashboard
     │
     ├── กด "ยอมรับ" → บันทึก consent → Dashboard
     └── กด "ปฏิเสธ" → Logout + แจ้ง "ไม่สามารถใช้งานได้"
```

**การทำงาน:**
1. หลัง login สำเร็จ → middleware ตรวจสอบ `pdpa_consents`
2. ถ้ายังไม่เคยยอมรับ → redirect ไป `/pdpa-consent`
3. หน้า `/pdpa-consent` แสดงข้อความ PDPA + checkbox ยอมรับ
4. เมื่อกดยอมรับ → บันทึกลง `pdpa_consents` + เข้า dashboard
5. ถ้าปฏิเสธ → logout + แสดงข้อความ
6. เมื่อ Admin เปลี่ยน `pdpa_notice_version` ใน settings → ผู้ใช้ทุกคนต้องยอมรับใหม่

**MVP ตัดออก (รอ Full version):**
- การจัดการหลาย version อัตโนมัติ (Admin เปลี่ยน version → redirect ทุกคน)
- Admin dashboard สรุปสถานะ consent
- การถอน consent (revoke)
- Data portability / Right to erasure

### 5.6 การแสดงชื่อโรงเรียนและโลโก้ (School Branding)

ระบบแสดงชื่อโรงเรียนและโลโก้ในตำแหน่งต่อไปนี้:

| ตำแหน่ง | สิ่งที่แสดง | รายละเอียด |
|---------|-----------|-----------|
| **หน้า Login** | โลโก้โรงเรียน + ชื่อโรงเรียน | แสดงตรงกลางบน เหนือฟอร์ม login |
| **Sidebar (ซ้าย)** | โลโก้เล็ก + ชื่อโรงเรียน | หัว sidebar ติดตาย |
| **Navbar (บน)** | ชื่อโรงเรียน (ข้อความ) | แสดงมุมซ้ายบน ถ้า sidebar ถูก collapse |
| **รายงานทุกประเภท** | โลโก้ + ชื่อโรงเรียน | หัวรายงาน ตอนพิมพ์ |
| **หน้า PDPA Consent** | โลโก้ + ชื่อโรงเรียน | แสดงให้เห็นว่าเป็นของโรงเรียนไหน |

**การตั้งค่า:**
- Admin เปลี่ยนชื่อโรงเรียนได้ที่หน้า Settings → ฟอร์มข้อความ
- Admin อัปโหลดโลโก้ได้ที่หน้า Settings → เลือกไฟล์รูป → อัปโหลดไป Google Drive / เก็บ URL
- โลโก้ที่อัปโหลดจะแสดงทั่วทั้งระบบทันที
- รองรับรูป: jpg, jpeg, png, webp — ขนาดไม่เกิน 2MB
- ถ้าไม่มีโลโก้ → แสดงเป็นตัวอักษรย่อโรงเรียน (เช่น "ร.ร." หรือตัวย่อ)

```typescript
// วิธีอ่านค่า school branding จาก settings
const schoolName = await getSetting('school_name');      // "โรงเรียนตัวอย่าง"
const schoolLogo = await getSetting('school_logo_url');   // "https://drive.google.com/..."
```

---

## 6. ระบบคะแนน

### 6.1 หลักการทำงาน

- **คะแนนตั้งต้น**: 100 ต่อปีการศึกษา (ปรับได้ที่ settings)
- **คะแนนขั้นต่ำ**: 0 (แสดงผลไม่ต่ำกว่า 0)
- **ไม่มีคะแนนสูงสุด**: คะแนนเกิน 100 ได้ แสดงค่าจริง
- **ตัดคะแนน**: เลือกนักเรียน → หมวด → คะแนน → หมายเหตุ → บันทึก
- **เพิ่มคะแนน**: ขั้นตอนเดียวกัน สำหรับจิตอาสา/ความดี
- **บันทึกหลายคน**: เลือกนักเรียนหลายคนในรายการเดียว

### 6.2 การคำนวณคะแนนปัจจุบัน

```
คะแนนปัจจุบัน = max(100 + ผลรวมทุกรายการ, 0)
```

- หมวด `deduct` มีค่าคะแนนเป็นลบ
- หมวด `add` มีค่าคะแนนเป็นบวก
- **ไม่มีขั้นตอนอนุมัติ**ใน MVP — ทุกรายการมีผลทันที

### 6.3 การรีเซ็ตคะแนนเมื่อจบปีการศึกษา

**คะแนนจะไม่ติดตัวไปปีการศึกษาใหม่** — เมื่อ Admin เปลี่ยนปีการศึกษา (ใน settings) คะแนนของนักเรียนทุกคนจะเริ่มนับใหม่ที่ base_score (100)

```
ปีการศึกษา 2568:
  นักเรียน A: base_score = 100, ถูกตัด -50, ได้เพิ่ม +10
  → คะแนนปัจจุบัน = 60
  → คะแนนสะสมที่ถูกตัด = 50
  → เก็บประวัติทั้งหมดไว้ใน score_transactions

───────────────────── เปลี่ยนปีการศึกษา ─────────────────────

ปีการศึกษา 2569:
  นักเรียน A: base_score = 100 (รีเซ็ต)
  → คะแนนปัจจุบัน = 100
  → คะแนนสะสมที่ถูกตัด = 0 (เริ่มนับใหม่)
  → ประวัติปี 2568 ยังดูได้ผ่านตัวกรองปีการศึกษา
```

**หลักการ:**
- ทุก `score_transactions` ต้องมี `academic_year` กำกับ
- การคำนวณคะแนนปัจจุบันจะดึงเฉพาะ transactions ของปีการศึกษาปัจจุบันเท่านั้น
- Transactions ของปีการศึกษาที่แล้ว **ไม่ส่งผลต่อคะแนนปัจจุบัน**
- Admin สามารถดูประวัติคะแนนย้อนหลังได้โดยการเปลี่ยนปีการศึกษาในตัวกรอง
- ระบบไม่มีการ "เลื่อนคะแนน" หรือ "ยกยอด" จากปีเก่าไปปีใหม่โดยอัตโนมัติ

```sql
-- SQL สำหรับคำนวณคะแนนปัจจุบัน (เฉพาะปีการศึกษาปัจจุบัน)
SELECT
  s.id,
  s.first_name,
  s.last_name,
  100 + COALESCE(SUM(st.points), 0) AS current_score
FROM students s
LEFT JOIN score_transactions st ON st.student_id = s.id
  AND st.academic_year = '2569'    -- ← เฉพาะปีปัจจุบันเท่านั้น
WHERE s.id = 'student-uuid'
GROUP BY s.id;
```

### 6.4 การคำนวณคะแนนสะสมที่ถูกตัด (สำหรับ Threshold)

```
คะแนนที่ถูกตัดทั้งหมด = abs(ผลรวมของ transactions ที่ points < 0)
                       หรือ
                       max(0, base_score - current_score)
                       (ค่าที่มากกว่า)

ตัวอย่าง:
- base_score = 100, deducted = -30, added = +5
- current_score = 100 - 30 + 5 = 75
- deducted_total = 30  (ใช้ค่าสำหรับเทียบ threshold)
```

### 6.5 ระดับความประพฤติ

| ระดับ | คะแนน | การดำเนินการ |
|-------|-------|-------------|
| **ดีมาก** | 100+ | ยกย่องชมเชย |
| **ดี** | 80–99 | ปกติ |
| **พอใช้** | 50–79 | ติดตามพฤติกรรม |
| **ต้องปรับปรุง** | < 50 | แจ้งผู้ปกครอง / ทำทัณฑ์บน |

### 6.6 หมวดคะแนน

- มีหมวดเริ่มต้น 12 รายการ (8 ตัด, 4 เพิ่ม)
- Admin เพิ่ม/แก้ไข/ปิดหมวดได้ที่หน้าการตั้งค่า
- แต่ละหมวดมีคะแนนเริ่มต้น แต่ครูปรับเปลี่ยนได้ตอนบันทึก

---

## 7. ฟีเจอร์แยกตามบทบาท

### 7.1 Admin

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| Dashboard | ภาพรวม: จำนวนนักเรียน ห้องเรียน คะแนนล่าสุด |
| จัดการนักเรียน | เพิ่ม/แก้ไข/ลบ, กำหนดห้อง, เปลี่ยนสถานะ |
| จัดการครู | เพิ่ม/แก้ไข/ลบ, กำหนดห้องที่รับผิดชอบ |
| จัดการห้องเรียน | เพิ่ม/แก้ไข/ลบห้อง |
| บันทึกคะแนน | บันทึกเพิ่ม/ตัดคะแนนนักเรียนคนใดก็ได้ |
| จัดการหมวดคะแนน | เพิ่ม/แก้ไข/ปิดหมวดคะแนน |
| แนบหลักฐาน | แนบรูปจาก Google Drive ประกอบการบันทึกคะแนน |
| รายงาน | รายงานรายบุคคล, รายงานรายห้อง, **รายงาน threshold** |
| ตั้งค่า thresholds | ⭐ กำหนดเกณฑ์การแจ้งเตือน (deducted points + action) |
| นำเข้า CSV | นำเข้านักเรียนจากไฟล์ CSV |
| ตั้งค่า | ชื่อโรงเรียน, อัปโหลดโลโก้, คะแนนตั้งต้น, ปีการศึกษา, หมวดคะแนน, thresholds, PDPA notice |

### 7.2 Teacher

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| Dashboard | สรุปคะแนนเฉพาะห้องที่ได้รับมอบหมาย |
| บันทึกคะแนน | เพิ่ม/ตัดคะแนนนักเรียน active ทุกคนในโรงเรียน |
| ดูนักเรียน | ดูข้อมูล + ประวัติคะแนนนักเรียน (ทั้งโรงเรียน) |
| รายงาน | รายงานรายบุคคล, รายงานรายห้อง (เฉพาะห้องตัวเอง) |
| รายงาน threshold | ⭐ ดูรายงาน threshold เฉพาะนักเรียนในห้องตัวเอง |
| แนบหลักฐาน | แนบรูปจาก Google Drive ประกอบการบันทึกคะแนน |
| ดูห้องเรียน | รายชื่อนักเรียนพร้อมคะแนนเฉพาะห้องที่ได้รับมอบหมาย |

### 7.3 Student

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| Dashboard | คะแนนปัจจุบัน, ระดับความประพฤติ, กราฟ timeline |
| ประวัติคะแนน | รายการทั้งหมด: หมวด, คะแนน, วันที่, ผู้บันทึก |

---

## 8. Component หลัก

| Component | รายละเอียด |
|-----------|-----------|
| `<ScoreBadge />` | Badge สีตามระดับ: ดีมาก/ดี/พอใช้/ต้องปรับปรุง |
| `<ScoreTimeline />` | กราฟเส้น Recharts แสดงคะแนนตามเวลา |
| `<TransactionTable />` | ตารางประวัติคะแนน เรียงลำดับได้ |
| `<StudentSearch />` | ค้นหา + กรองนักเรียนตามชื่อ/นามสกุล/รหัส/ห้อง |
| `<ScoreRecordForm />` | ฟอร์ม: เลือกนักเรียน → หมวด → คะแนน → หมายเหตุ |
| `<BulkScoreForm />` | เลือกนักเรียนหลายคน → รายการคะแนนเดียวกัน |
| `<ClassroomStudentTable />` | รายชื่อนักเรียนพร้อมคะแนนในห้อง |
| `<ThresholdAlertBadge />` | ⭐ Badge แสดงระดับ threshold ที่นักเรียนถึง (สีตาม severity) |
| `<ThresholdTable />` | ⭐ ตารางแสดงนักเรียนที่ถึงเกณฑ์ พร้อมระดับและคะแนนที่ถูกตัด |
| `<ThresholdProgressBar />` | ⭐ แถบความคืบหน้าแสดงจำนวนคะแนนที่ถูกตัด เทียบกับ threshold ถัดไป |
| `<ThresholdConfigForm />` | ⭐ ฟอร์มให้ Admin ตั้งค่า threshold (เพิ่ม/ลด/แก้ไข) |
| `<EvidenceUploader />` | แนบรูปหลักฐานจาก Google Drive ประกอบการบันทึกคะแนน |
| `<EvidenceGallery />` | แสดงรูปหลักฐานใน student detail + report |
| `<Navbar />` | แถบนำทางตามบทบาท — แสดงชื่อโรงเรียน + รูปประจำตัวผู้ใช้ |
| `<Sidebar />` | เมนูด้านข้าง — แสดงโลโก้โรงเรียน + ชื่อโรงเรียนที่หัว sidebar |
| `<PdpaConsentPage />` | หน้ายอมรับ PDPA — แสดงข้อความ + checkbox + ปุ่มยอมรับ/ปฏิเสธ |
| `<EmptyState />` | แสดงเมื่อไม่มีข้อมูล |
| `<LoadingSkeleton />` | โครงกระดูกขณะโหลด |
| `<ErrorBoundary />` | ดัก error |

---

## 9. หน้าและเส้นทาง

| เส้นทาง | บทบาท | รายละเอียด |
|---------|-------|-----------|
| `/login` | — | หน้าเข้าสู่ระบบ |
| `/change-password` | ทั้งหมด | เปลี่ยนรหัสผ่านครั้งแรก |
| `/pdpa-consent` | ทั้งหมด | ยอมรับ PDPA ก่อนเข้าใช้งาน |
| `/dashboard` | admin/teacher | Dashboard ภาพรวม |
| `/students` | admin/teacher | รายชื่อนักเรียน |
| `/students/[id]` | admin/teacher/student | ข้อมูลนักเรียน + ประวัติคะแนน |
| `/score/record` | admin/teacher | บันทึกคะแนนใหม่ |
| `/classrooms` | admin/teacher | รายการห้องเรียน |
| `/classrooms/[id]` | admin/teacher | รายละเอียดห้องเรียน |
| `/reports` | admin/teacher | ศูนย์รวมรายงาน |
| `/reports/individual` | admin/teacher | รายงานรายบุคคล |
| `/reports/classroom` | admin/teacher | รายงานรายห้อง |
| `/reports/threshold` | admin/teacher | ⭐ รายงานนักเรียนถึงเกณฑ์ |
| `/teachers` | admin | จัดการครู |
| `/settings` | admin | ตั้งค่าระบบ: ข้อมูลโรงเรียน (ชื่อ+โลโก้), คะแนน, ปีการศึกษา, thresholds, หมวดคะแนน, PDPA |
| `/settings/import` | admin | นำเข้า CSV |
| `/student/dashboard` | student | นักเรียนดูคะแนนตัวเอง |

---

## 10. รายงานใน MVP

MVP มีรายงาน **3 ประเภท** ที่พัฒนาต่อเป็น Full Version ได้เลย:

### 10.1 รายงานรายบุคคล (Individual Report)

**ใน MVP:**
- หัวข้อข้อมูลนักเรียน: ชื่อ, นามสกุล, รหัสนักเรียน, ห้อง, ระดับความประพฤติ
- กราฟ timeline คะแนน (Recharts line chart)
- ตารางรายการทั้งหมด: วัน, หมวด, คะแนน, หมายเหตุ, ผู้บันทึก
- คะแนนปัจจุบัน + badge ระดับ
- **คะแนนที่ถูกตัดสะสม + ระดับ threshold ปัจจุบัน** (ถ้าถึงเกณฑ์)
- พิมพ์ได้ (print-friendly CSS)

**ต่อยอดเป็น Full Version:**
- เพิ่มลายเซ็นอิเล็กทรอนิกส์ นักเรียน / ผู้ปกครอง / ครู
- เพิ่มปุ่ม Export PDF (react-pdf หรือ @media print)
- เพิ่มประวัติย้อนหลังหลายปีการศึกษา
- เพิ่มแนบรูปหลักฐานในแต่ละรายการ
- เพิ่ม Audit trail ว่าใครดูรายงานนี้บ้าง

### 10.2 รายงานรายห้อง (Classroom Report)

**ใน MVP:**
- หัวข้อข้อมูลห้อง: ชื่อห้อง, ระดับชั้น, ปีการศึกษา, ครูประจำชั้น
- ตาราง: เลขที่, ชื่อ, นามสกุล, รหัสนักเรียน, คะแนนปัจจุบัน, ระดับ, จำนวนครั้งถูกตัด, จำนวนครั้งถูกเพิ่ม
- เรียงตามเลขที่ (น้อย → มาก)
- สรุปจำนวนนักเรียนแยกตามระดับความประพฤติ
- **คอลัมน์สถานะ threshold: แสดง badge ถ้านักเรียนถึงเกณฑ์ใดเกณฑ์หนึ่ง**
- พิมพ์ได้ (print-friendly CSS)

**ต่อยอดเป็น Full Version:**
- เพิ่มกราฟแท่งแจกแจงระดับความประพฤติในห้อง
- เพิ่มเกรดเฉลี่ยคะแนนของห้อง เทียบกับห้องอื่น
- เพิ่มลูกศรแนวโน้มคะแนนดีขึ้น/แย่ลง เทียบเดือนก่อน
- เพิ่ม Export CSV/Excel
- เพิ่มกรองตามช่วงวันที่ที่กำหนด

### 10.3 ⭐ รายงานนักเรียนถึงเกณฑ์ (Threshold Report) — มีเฉพาะ MVP นี้

#### ที่มา

จาก Full Version spec เดิมมี concept เรื่อง **คะแนนถูกตัด (Deducted Points)** และ **เกณฑ์การดำเนินการ (Threshold Alerts)**:

| คะแนนถูกตัด | คะแนนคงเหลือ | การดำเนินการ |
|------------|-------------|-------------|
| 40 คะแนน | 60 คะแนน | ทำทัณฑ์บนครั้งที่ 1 — เชิญผู้ปกครอง |
| 60 คะแนน | 40 คะแนน | ทำทัณฑ์บนครั้งที่ 2 — เชิญผู้ปกครอง |
| 80 คะแนน | 20 คะแนน | ทำทัณฑ์บนครั้งที่ 3 — พักการเรียน |
| 100 คะแนน | 0 คะแนน | ย้ายสถานศึกษา |

แม้ Full Version จะมีฟีเจอร์ครบกว่า (ขึ้นทะเบียนทัณฑ์บนอัตโนมัติ, สร้างเอกสาร, แจ้งเตือนผู้ปกครอง) แต่ **การรายงานว่านักเรียนถึงเกณฑ์ไหนแล้ว** เป็นฟีเจอร์พื้นฐานที่ควรมีใน MVP เพื่อให้ครูและ Admin เห็นสถานะปัจจุบันได้ทันที

#### รายละเอียดใน MVP

**จุดประสงค์:** แสดงรายชื่อนักเรียนที่ถูกตัดคะแนนสะสมถึงเกณฑ์ที่กำหนดใน settings
- Admin/Teacher ดูได้ว่านักเรียนคนไหนถึง threshold ไหนแล้ว
- เรียงตามความรุนแรงของ threshold (จากน้อยไปมาก หรือ มากไปน้อย)
- กรองตามห้องเรียน / ระดับชั้น
- กดที่นักเรียนเพื่อไปดูรายละเอียดและประวัติคะแนน

**หน้าตาราง:**

| คอลัมน์ | รายละเอียด |
|---------|-----------|
| ลำดับ | 1, 2, 3, ... |
| รูปภาพ | (ไม่ต้องมีใน MVP — เผื่อไว้) |
| ชื่อ | ชื่อจริงนักเรียน |
| นามสกุล | นามสกุลนักเรียน |
| รหัสนักเรียน | 10 หลัก |
| ห้อง | เช่น ป.1/1 |
| คะแนนปัจจุบัน | เช่น 60 |
| คะแนนที่ถูกตัดสะสม | เช่น 40 |
| ระดับ Threshold | Badge + สีตาม severity |
| การดำเนินการที่ต้องทำ | ข้อความจาก settings |
| จำนวนครั้งที่บันทึก | จำนวน transactions deduct ทั้งหมด |
| สถานะล่าสุด | (ใน MVP ใช้ badge สี) |

**Badge สีตามระดับ Threshold:**

| ระดับ | คะแนนถูกตัด | สี Badge |
|-------|------------|---------|
| ครั้งที่ 1 | 40+ | 🟠 ส้ม (#E68A2E) |
| ครั้งที่ 2 | 60+ | 🔴 แดง (#D9534F) |
| ครั้งที่ 3 | 80+ | 🔴 แดงเข้ม (#C9302C) |
| ขั้นสูงสุด | 100+ | ⚫ ดำ/แดง (#8B0000) |

**การทำงาน:**

```typescript
// Logic การคำนวณ threshold:
// 1. อ่าน thresholds จาก settings (key = 'thresholds')
// 2. คำนวณคะแนนที่ถูกตัดสะสมของนักเรียนแต่ละคน
//    deducted_total = abs(sum of all transactions with points < 0)
// 3. เทียบกับ thresholds:
//    - หา threshold ที่มากที่สุดที่ deducted_total ถึงหรือเกิน
//    - เช่น deducted_total = 55 → ถึง threshold 40 (ครั้งที่ 1) แต่ยังไม่ถึง 60
//    - deducted_total = 75 → ถึง threshold 60 (ครั้งที่ 2)
// 4. แสดงเฉพาะนักเรียนที่ถึง threshold อย่างน้อย 1 ระดับ
// 5. ถ้า deducted_total = 0 → ไม่แสดงในรายงาน
```

**การกรอง:**

| ตัวกรอง | รายละเอียด |
|---------|-----------|
| ห้องเรียน | เลือกห้อง หรือ "ทั้งหมด" (teacher เห็นเฉพาะห้องตัวเอง) |
| ระดับ Threshold | เลือก: ทั้งหมด / ครั้งที่ 1 / ครั้งที่ 2 / ครั้งที่ 3 / ขั้นสูงสุด |
| ช่วงวันที่ | (ไม่ต้องมีใน MVP — Full version เพิ่ม) |
| สถานะนักเรียน | Active เท่านั้น (นักเรียนที่ถูกตัดคะแนน) |

**Export:**
- (ใน MVP แค่ print-friendly CSS — Full version จะเพิ่ม Export CSV/PDF)

**ต่อยอดเป็น Full Version:**

| ฟีเจอร์ | ใน MVP | ใน Full Version |
|---------|--------|----------------|
| ตารางแสดงนักเรียนถึงเกณฑ์ | ✅ มี | ✅ มี + เพิ่มคอลัมน์ |
| กรองตามห้อง | ✅ มี | ✅ มี |
| กรองตามระดับ threshold | ✅ มี | ✅ มี |
| Badge สีตาม severity | ✅ มี | ✅ มี |
| Export CSV | ❌ | ✅ เพิ่ม |
| Export PDF (เอกสารทัณฑ์บน) | ❌ | ✅ สร้าง bond document อัตโนมัติ |
| แนวโน้มเทียบเดือนก่อน | ❌ | ✅ เพิ่มกราฟ |
| แจ้งเตือนอัตโนมัติเมื่อถึงเกณฑ์ | ❌ | ✅ ส่ง notification + Line/Email |
| บันทึก intervention | ❌ | ✅ ผูกกับตาราง intervention_logs |
| เอกสารทัณฑ์บนพร้อมลายเซ็น | ❌ | ✅ สร้าง bond document + print |

### 10.4 หมายเหตุ: รายงานที่จะเพิ่มใน Full Version

| รายงาน | มีใน MVP? | จะเพิ่มเมื่อไหร่ |
|--------|----------|----------------|
| ✅ รายงานรายบุคคล | **มี** | — |
| ✅ รายงานรายห้อง | **มี** | — |
| ⭐ รายงานนักเรียนถึงเกณฑ์ (Threshold) | **มี** | — |
| ❌ รายงานประจำเดือน | ไม่มี | Full version — บันทึก snapshot เพื่อกันข้อมูลเปลี่ยน |
| ❌ รายงานนักเรียนเสี่ยง | ไม่มี | Full version — กรองคะแนนต่ำกว่าเกณฑ์ (อาจรวมกับ threshold report) |
| ❌ รายงานสถิติโรงเรียน | ไม่มี | Full version — กราฟ + เปรียบเทียบ |
| ❌ หนังสือทัณฑ์บนอัตโนมัติ | ไม่มี | Full version — สร้างเอกสารจาก threshold report |

---

## 11. API Endpoints

ทุก endpoint ที่ `app/api/`:
- ตรวจ JWT token + บทบาท
- คืนค่า `{ success: boolean, data?: T, error?: string }`

### Auth

| Method | เส้นทาง | รายละเอียด |
|--------|--------|-----------|
| POST | `/api/auth/login` | เข้าสู่ระบบ (อีเมล หรือ รหัสนักเรียน + รหัสผ่าน) |
| POST | `/api/auth/logout` | ออกจากระบบ |
| GET | `/api/auth/session` | ตรวจ session + profile |

### PDPA

| Method | เส้นทาง | รายละเอียด |
|--------|--------|-----------|
| GET | `/api/pdpa/notice` | ดูข้อความ PDPA + version ปัจจุบัน |
| POST | `/api/pdpa/consent` | บันทึกการยอมรับ PDPA |
| GET | `/api/pdpa/status` | ตรวจสอบว่า consent แล้วหรือยัง |

### Students

| Method | เส้นทาง | รายละเอียด |
|--------|--------|-----------|
| GET | `/api/students` | รายชื่อนักเรียน (มีตัวกรอง) |
| GET | `/api/students/[id]` | ข้อมูลนักเรียน 1 คน |
| POST | `/api/students` | สร้างนักเรียน (admin) |
| PATCH | `/api/students/[id]` | แก้ไขนักเรียน (admin) |
| GET | `/api/students/[id]/score-history` | ประวัติคะแนนของนักเรียน |

### Score

| Method | เส้นทาง | รายละเอียด |
|--------|--------|-----------|
| POST | `/api/score/record` | บันทึกคะแนน 1 คน |
| POST | `/api/score/bulk` | บันทึกคะแนนหลายคน |
| GET | `/api/score/categories` | รายการหมวดคะแนน |

### Classrooms

| Method | เส้นทาง | รายละเอียด |
|--------|--------|-----------|
| GET | `/api/classrooms` | รายการห้องเรียน |
| GET | `/api/classrooms/[id]` | ข้อมูลห้องเรียน + นักเรียน |
| POST | `/api/classrooms` | สร้างห้อง (admin) |
| PATCH | `/api/classrooms/[id]` | แก้ไขห้อง (admin) |

### Teachers

| Method | เส้นทาง | รายละเอียด |
|--------|--------|-----------|
| GET | `/api/teachers` | รายชื่อครู (admin) |
| POST | `/api/teachers` | สร้างครู (admin) |
| PATCH | `/api/teachers/[id]` | แก้ไขครู (admin) |
| POST | `/api/teachers/assign` | กำหนดครูให้ห้อง (admin) |

### Reports

| Method | เส้นทาง | รายละเอียด |
|--------|--------|-----------|
| GET | `/api/reports/individual` | ข้อมูลรายงานรายบุคคล |
| GET | `/api/reports/classroom` | ข้อมูลรายงานรายห้อง |
| GET | `/api/reports/threshold` | ⭐ ข้อมูลรายงานนักเรียนถึงเกณฑ์ |

### Settings

| Method | เส้นทาง | รายละเอียด |
|--------|--------|-----------|
| GET | `/api/settings` | ดูค่าตั้งค่า (รวมชื่อโรงเรียน, โลโก้, thresholds) |
| PATCH | `/api/settings` | แก้ไขค่าตั้งค่า (admin) — ชื่อโรงเรียน, คะแนน, ปีการศึกษา |
| POST | `/api/settings/logo` | ⭐ อัปโหลดโลโก้โรงเรียน (admin) — เก็บเป็น Google Drive URL หรือ base64 |
| PATCH | `/api/settings/thresholds` | ⭐ แก้ไขเกณฑ์ threshold (admin) |
| POST | `/api/import/students` | นำเข้านักเรียน CSV (admin) |

### Dashboard

| Method | เส้นทาง | รายละเอียด |
|--------|--------|-----------|
| GET | `/api/dashboard/stats` | ข้อมูลภาพรวม dashboard |

---

## 12. CSS / ฟอนต์

```css
/* app/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');

:root {
  --font-sarabun: 'Sarabun', sans-serif;
}

body {
  font-family: var(--font-sarabun);
}
```

ใช้ **Sarabun** เป็นฟอนต์หลักสำหรับทุก UI

---

## 13. เกณฑ์การแจ้งเตือน (Threshold)

### 13.1 การตั้งค่า Threshold

Threshold เก็บในตาราง `settings` ที่ key `thresholds` เป็น JSON array:

```json
[
  {"deducted": 40, "action": "ทำทัณฑ์บนครั้งที่ 1 — เชิญผู้ปกครอง", "color": "#E68A2E"},
  {"deducted": 60, "action": "ทำทัณฑ์บนครั้งที่ 2 — เชิญผู้ปกครอง", "color": "#D9534F"},
  {"deducted": 80, "action": "ทำทัณฑ์บนครั้งที่ 3 — อาจพักการเรียน", "color": "#C9302C"},
  {"deducted": 100, "action": "ย้ายสถานศึกษา", "color": "#8B0000"}
]
```

Admin สามารถปรับแก้ได้ที่หน้า Settings:
- เพิ่ม/ลด จำนวนคะแนนที่กำหนดเป็นเกณฑ์
- แก้ไขข้อความการดำเนินการ
- เปลี่ยนสี badge
- **เรียงลำดับจากน้อยไปมาก** (คะแนนถูกตัดน้อย → มาก)

### 13.2 การคำนวณ

```
คะแนนที่ถูกตัดสะสม = abs(ผลรวมของ transactions ที่ points เป็นลบ)

ระดับ threshold = ค่า deducted ที่มากที่สุดที่ ≤ deducted_total

ตัวอย่าง:
- deducted_total = 35 → ไม่ถึง threshold (ยังไม่ถึง 40)
- deducted_total = 45 → ถึง threshold 40 (ครั้งที่ 1)
- deducted_total = 65 → ถึง threshold 60 (ครั้งที่ 2)
- deducted_total = 85 → ถึง threshold 80 (ครั้งที่ 3)
- deducted_total = 120 → ถึง threshold 100 (ขั้นสูงสุด)
```

### 13.3 การแสดงผลใน Dashboard

ในหน้า Dashboard ของ Admin/Teacher ควรแสดง:
- จำนวนนักเรียนที่ถึง threshold รวม (แยกตามระดับ)
- Card สรุป: "นักเรียนที่ถึงเกณฑ์ จำนวน X คน"
- ลิงก์ไปยัง `/reports/threshold`

### 13.4 ตัวอย่าง UI Threshold Report

```
┌──────────────────────────────────────────────────────────────┐
│  📊 รายงานนักเรียนถึงเกณฑ์                                    │
│  ปีการศึกษา 2569                                              │
├──────────────────────────────────────────────────────────────┤
│  ตัวกรอง: [ห้องทั้งหมด ▼]  [ระดับ threshold: ทั้งหมด ▼]        │
├──────────────────────────────────────────────────────────────┤
│  สรุป: ทั้งหมด 12 คน | ครั้งที่ 1: 5 | ครั้งที่ 2: 3 | ครั้งที่ 3: 2 | ขั้นสูงสุด: 2 │
├────┬──────────┬──────────┬──────┬──────┬────────┬───────────┤
│ #  │ ชื่อ      │ นามสกุล   │ รหัส  │ ห้อง │ คะแนน │ ถูกตัด │ ระดับ     │
├────┼──────────┼──────────┼──────┼──────┼────────┼───────────┤
│ 1  │ สมชาย    │ สุดหล่อ  │ 1234567890│ ป.6/1│  60  │ 40     │ 🟠 ครั้งที่ 1 │
│ 2  │ สมหญิง   │ สวยมาก  │ 1234567891│ ป.6/1│  40  │ 60     │ 🔴 ครั้งที่ 2 │
│ 3  │ สมศักดิ์  │ กล้าหาญ │ 1234567892│ ม.3/2│  20  │ 80     │ 🔴 ครั้งที่ 3 │
│ 4  │ สมหมาย   │ จริงใจ  │ 1234567893│ ม.3/2│   0  │ 100    │ ⚫ ขั้นสูงสุด │
├────┴──────────┴──────────┴──────┴──────┴────────┴───────────┤
│  [พิมพ์รายงาน]                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## 14. ดีไซน์เผื่อขยายไป Full Version

ส่วนนี้อธิบายว่า **MVP ต้องออกแบบยังไง** ให้เพิ่มฟีเจอร์ Full Version ทีหลังได้ง่าย

### 14.1 โครงสร้างฐานข้อมูล

| ตาราง MVP | เผื่อ Full Version ยังไง |
|-----------|------------------------|
| `profiles` | มี `is_active`, `must_change_password`, `last_login_at` พร้อมอยู่แล้ว — Full version แค่เพิ่ม `avatar_url`, `phone` |
| `students` | มี `current_status` รองรับ active/inactive/transferred/graduated/suspended — พร้อมแล้ว |
| `score_transactions` | มี `recorded_by`, `recorded_at`, `academic_year` — Full version แค่เพิ่ม `status`, `approved_by`, `approved_at`, `voided_by` |
| `score_categories` | มี `is_active` — Full version แค่เพิ่ม `requires_evidence`, `requires_approval` |
| `classrooms` | มี `academic_year` — รองรับหลายปีการศึกษา |
| `teacher_classrooms` | มี `assignment_role` — รองรับ homeroom/assistant/subject/discipline |
| `settings` | ใช้ `key-value` + `jsonb` — เพิ่มค่าใหม่ได้เลยไม่ต้อง migrate |

### 14.2 การออกแบบ API

```typescript
// ✅ MVP: return แบบนี้ — Full version แค่เพิ่มฟิลด์ ไม่เปลี่ยน structure
{
  success: true,
  data: { ... }
}

// ❌ อย่าทำแบบนี้ — เพราะเปลี่ยนได้ยาก
// { students: [...], total: 10 }
```

**แนวทาง:**
- ทุก endpoint return `{ success, data, error }` เหมือนกันหมด
- ใช้ TypeScript types เดียวกันทั้ง MVP และ Full version (แค่เพิ่ม optional fields)
- Error response ใช้ format: `{ code, message, details }` — Full version แค่เพิ่ม error codes

### 14.3 Component Design

```typescript
// ✅ Component ที่รับ props เผื่อไว้
interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';         // ✅ เผื่อไว้
  showLabel?: boolean;                 // ✅ เผื่อไว้
  className?: string;                  // ✅ เผื่อไว้
}

// ❌ Component ที่รับแค่ที่ใช้ตอนนี้
// interface ScoreBadgeProps {
//   score: number;
// }
```

**แนวทาง:**
- Component props ใช้ optional fields เผื่อ futures
- แยก business logic ออกจาก UI (custom hooks)
- ใช้ compound components pattern สำหรับของซับซ้อน

### 14.4 โฟลเดอร์ Structure

```
src/
├── components/         # UI components (reusable)
│   ├── ui/            # shadcn/ui components
│   ├── score/         # กลุ่ม component เกี่ยวกับคะแนน
│   ├── students/      # กลุ่ม component เกี่ยวกับนักเรียน
│   ├── reports/       # กลุ่ม component เกี่ยวกับรายงาน
│   └── threshold/     # ⭐ กลุ่ม component เกี่ยวกับ threshold
├── lib/               # utilities
│   ├── supabase/      # Supabase client + helpers
│   ├── utils/         # helper functions
│   └── constants.ts   # ค่าคงที่
├── hooks/             # Custom React hooks
├── types/             # TypeScript types
└── app/               # Next.js App Router
```

**ข้อดี:**
- Full version แค่เพิ่ม components/hooks/types โดยไม่ต้องย้ายของเก่า
- types/ แยกจาก implementation — reuse ได้ทั้ง MVP และ Full

### 14.5 ระบบ Permission (เผื่อไว้ตั้งแต่ MVP)

**ใน MVP:** ตรวจสอบ role โดยตรงในโค้ด

```typescript
// MVP: ตรวจ role แบบง่าย
if (profile.role !== 'admin') throw new Error('ไม่มีสิทธิ์');
```

**ต่อยอด Full Version:** แค่เปลี่ยนเป็นตรวจจากตาราง permissions

```typescript
// Full version: ใช้ permission system — structure เดิมไม่ต้องเปลี่ยน
const hasPermission = await checkPermission(profile.id, 'student.manage');
```

**วิธีเตรียมไว้:**
- สร้าง function `checkPermission(profileId, permissionCode)` ไว้ก่อน
- ใน MVP ให้ function นี้ตรวจแค่ `profile.role`
- ใน Full version แค่เปลี่ยน logic ใน function เดียว — ไม่ต้องแก้ทั้งระบบ

```typescript
// lib/permissions.ts — MVP version (เผื่อ Full version)
export async function checkPermission(
  profileId: string,
  permissionCode: string
): Promise<boolean> {
  // ===== MVP: ตรวจ role อย่างเดียว =====
  const profile = await getProfile(profileId);
  
  if (profile.role === 'admin') return true;  // admin มีสิทธิ์ทุกอย่าง
  if (profile.role === 'student') {
    // student มีสิทธิ์จำกัด
    return ['score.view_own', 'student.view_own', 'notification.view'].includes(permissionCode);
  }
  if (profile.role === 'teacher') {
    // teacher มีสิทธิ์ตาม default set
    return [
      'score.record', 'score.record_bulk',
      'student.view_all', 'report.view_monthly', 'report.view_at_risk',
      'report.view_threshold',
      'intervention.create',
      'notification.view',
    ].includes(permissionCode);
  }
  
  return false;
  
  // ===== Full version: เปลี่ยนเป็นนี้ =====
  // 1. ตรวจ profile_permission_overrides ก่อน
  // 2. ถ้าไม่มี → ตรวจ role_permissions
  // 3. return is_granted
}
```

### 14.6 Score System Design

**MVP:** `score_transactions` มีแค่บันทึกทันที

**Full Version:** เพิ่มฟิลด์ `status`, `approved_by`, `approved_at`, `voided_by`, `voided_at`, `void_reason`

```sql
-- เตรียมตารางไว้เผื่อ Full version
-- Full version จะเพิ่ม:
--   status text default 'approved'  -- pending/approved/rejected/voided
--   approved_by uuid references profiles(id)
--   approved_at timestamptz
--   voided_by uuid references profiles(id)
--   voided_at timestamptz
--   void_reason text

-- MVP ไม่ต้องเพิ่มตอนนี้ — แค่ดีไซน์โค้ดให้เพิ่มฟิลด์ได้โดยไม่พัง
```

**วิธีเตรียมไว้:**
- ในโค้ด ให้ query `score_transactions` โดย `SELECT *` — ไม่ระบุฟิลด์ตายตัว
- ใน TypeScript type ให้ fields พวกนี้เป็น optional (`status?`, `approved_by?` ฯลฯ)
- สร้าง helper function `getCurrentScore(studentId, academicYear)` ที่รวม transaction logic ไว้ที่เดียว
- สร้าง helper function `getDeductedTotal(studentId, academicYear)` สำหรับคำนวณ threshold

```typescript
// types/score.ts — เตรียม optional fields ไว้
export interface ScoreTransaction {
  id: string;
  student_id: string;
  category_id: string;
  points: number;
  note?: string;
  recorded_by: string;
  recorded_at: string;
  academic_year: string;
  // ===== เตรียมไว้สำหรับ Full version =====
  status?: 'pending' | 'approved' | 'rejected' | 'voided';
  approved_by?: string;
  approved_at?: string;
  voided_by?: string;
  voided_at?: string;
  void_reason?: string;
}

// types/threshold.ts — สำหรับ Threshold Report
export interface Threshold {
  deducted: number;
  action: string;
  color: string;
}

export interface StudentThreshold {
  student_id: string;
  first_name: string;
  last_name: string;
  student_id_number: string;
  classroom_name: string;
  current_score: number;
  deducted_total: number;
  threshold_level: number;      // deducted value ที่ถึง (40, 60, 80, 100)
  threshold_index: number;      // index ใน array (0, 1, 2, 3)
  threshold_action: string;
  threshold_color: string;
  deduct_count: number;         // จำนวนครั้งที่ถูกตัด
  add_count: number;            // จำนวนครั้งที่ถูกเพิ่ม
}
```

### 14.7 Middleware Design

```typescript
// middleware.ts — MVP (เตรียมไว้สำหรับ Full version)
export async function middleware(request: NextRequest) {
  // 1. ตรวจ session (MVP + Full)
  // 2. ตรวจ role redirect (MVP)
  // 3. ตรวจ PDPA consent → redirect /pdpa-consent (MVP — ข้อกฎหมาย)
  // 4. ===== Full version จะเพิ่ม: =====
  //    - ตรวจ permission สำหรับ route
  //    - rate limiting check
  //    - audit log
}
```

### 14.8 ตารางที่ต้องเพิ่มใน Full Version

| ตารางใหม่ | เมื่อไหร่ | เชื่อมกับตาราง MVP ยังไง |
|----------|---------|------------------------|
| `student_enrollments` | Full version | เพิ่ม enrollment รายปี — ไม่กระทบ classroom_id ใน students เดิม |
| `guardians` | Full version | เพิ่มตารางใหม่ ผูกกับนักเรียนผ่าน student_guardians |
| `student_guardians` | Full version | many-to-many ระหว่าง student กับ guardian |
| `bond_documents` | Full version | ⭐ เชื่อมกับ threshold — สร้างเอกสารเมื่อถึงเกณฑ์ |
| `intervention_logs` | Full version | ⭐ เพิ่มตารางใหม่ เชื่อมกับ threshold — บันทึกการติดตาม |
| `notifications` | Full version | เพิ่มตารางใหม่ อ้างอิง profile_id |
| `audit_logs` | ✅ **มีใน MVP** | — |
| `action_logs` | Full version | เพิ่มตารางใหม่ อ้างอิง profile_id |
| `monthly_reports` | Full version | เพิ่มตารางใหม่ อ้างอิง classroom_id |
| `pdpa_consents` | ✅ **มีใน MVP** | — |
| `permissions` | Full version | เพิ่มตารางใหม่ — แยกจาก profiles |
| `role_permissions` | Full version | เพิ่มตารางใหม่ — กำหนดสิทธิ์ตามบทบาท |
| `profile_permission_overrides` | Full version | เพิ่มตารางใหม่ — ข้อยกเว้นรายบุคคล |

### 14.9 การเชื่อมต่อ Threshold Report กับ Full Version

| ฟีเจอร์ Full Version | เชื่อมกับ Threshold Report ยังไง |
|---------------------|--------------------------------|
| `bond_documents` | เมื่อนักเรียนถึง threshold → Admin กด "สร้างเอกสารทัณฑ์บน" จาก threshold report ได้ |
| `intervention_logs` | เมื่อนักเรียนถึง threshold → ครูสามารถบันทึก intervention (โทรหาผู้ปกครอง) ได้จาก threshold report |
| `notifications` | เมื่อนักเรียนถึง threshold ใหม่ → ส่ง notification ไปยังครูประจำชั้น |
| `line_notify` | เมื่อนักเรียนถึง threshold → ส่ง line แจ้งผู้ปกครอง |
| `monthly_reports` | สรุปจำนวนนักเรียนที่ถึง threshold ในรอบเดือน |

### 14.10 สรุป: หลักการออกแบบเผื่อขยาย

| หลักการ | ใน MVP | ใน Full Version |
|---------|--------|----------------|
| API response format | `{ success, data, error }` | เหมือนเดิม — error มีรหัส error เพิ่ม |
| Types | มี optional fields เผื่อไว้ | ใช้ fields ที่เพิ่ม |
| Components | props มี optional fields | ส่ง props เพิ่ม ไม่ต้องแก้ interface |
| Database | 7 ตาราง core | เพิ่มตารางใหม่ ไม่แก้ของเดิม |
| Permission | function `checkPermission()` ตรวจ role | function เดียวกัน — logic เปลี่ยน |
| Hooks | แยก business logic | reuse hooks เดิม |
| Routes | structure ตามบทบาท | เพิ่ม route group โดยไม่ย้ายของเดิม |
| Middleware | ตรวจ session + role redirect | เพิ่ม logic โดยไม่ลบของเดิม |
| Threshold | report + settings ใน MVP | เชื่อมกับ bond, intervention, notification |

---

## 15. ฟีเจอร์ที่ควรทำตั้งแต่ MVP (ป้องกัน Rework หนัก)

ฟีเจอร์บางอย่างใน Full Version **ควรทำแต่ต้นใน MVP** เพราะถ้ามาทีหลังต้องแก้โค้ดเกือบทั้งระบบ
ตารางนี้จัดลำดับตาม **ความจำเป็น + ผลกระทบถ้าทำทีหลัง**

| ลำดับ | ฟีเจอร์ | ถ้าทำทีหลัง... | ความยากในการเพิ่มทีหลัง | คำแนะนำ |
|-------|---------|---------------|----------------------|--------|
| 🔴 1 | **โครงสร้าง DB ที่เผื่อ필ด์ไว้** | ต้อง migrate DB + แก้ query ทุกจุดที่ใช้ตารางนั้น | สูง — กระทบ data layer ทั้งหมด | เติม extra fields ตั้งแต่ create table |
| 🔴 2 | **Academic Year ในทุก transactions** | ต้องย้อนไปเพิ่มฟิลด์ academic_year ในตารางที่มีข้อมูลแล้ว — migration ยุ่ง | สูง — ต้อง backfill ข้อมูลเก่า | ✅ **ทำแล้ว** — ทุกตารางมี academic_year |
| 🔴 3 | **RLS Policies (ความปลอดภัย)** | ถ้าไม่มี RLS ตั้งแต่แรก ข้อมูลรั่วได้ — เพิ่มทีหลังต้อง audit ทุก policy ว่าครบ | สูง — เสี่ยงข้อมูลรั่วระหว่างรอ | ✅ **ทำแล้ว** — 7 ตารางมี RLS ครบ |
| 🔴 4 | **API Response Format** | ถ้าแต่ละ endpoint return format ต่างกัน → Full version ต้อง rewrite frontend เกือบหมด | กลาง — ต้องแก้ทั้ง frontend + backend | ✅ **ทำแล้ว** — `{ success, data, error }` |
| 🟠 5 | **Role-Based Auth + Redirect** | ถ้าตอนแรก auth แบบไม่มี role → เพิ่มทีหลังต้องแก้ middleware + layout + guard ทุกหน้า | สูง — กระทบทุก route | ✅ **ทำแล้ว** — 3 roles + guard |
| 🟠 6 | **แยก ชื่อ/นามสกุล ใน DB** | ถ้าเก็บเป็น full_name field เดียว → ตอนจะแยกต้อง migrate data + แก้ทุกหน้าฟอร์ม + รายงาน | กลาง — กระทบหลายจุด | ✅ **ทำแล้ว** — first_name, last_name |
| 🟠 7 | **Student Status (current_status)** | ถ้าไม่มี status → เพิ่มทีหลังต้อง audit ว่ามี code ไหนที่ลืมเช็คสถานะบ้าง | กลาง — กระทบ logic หลายจุด | ✅ **ทำแล้ว** — active/inactive/etc |
| 🟠 8 | **must_change_password** | ถ้าไม่มีตอนแรก → password policy ใช้ไม่ได้จริง student ไม่ถูกบังคับเปลี่ยน | ต่ำ — เพิ่ม middleware check ได้ | ✅ **ทำแล้ว** |
| 🟡 9 | **Evidence Upload (Google Drive)** | ถ้าต้องการแนบรูปย้อนหลัง → ไม่มีรูปตั้งแต่แรก ข้อมูลสูญ | กลาง — ต้องออกแบบ storage ใหม่ | ⬅️ **ต้องเพิ่มตอนนี้** |
| 🟡 10 | **Score Approval Status (pending/approved)** | ถ้า MVP บันทึก直接 → Full version เพิ่ม approval flow → ต้องแก้การคำนวณคะแนนทั้งระบบ | สูง — กระทบ logic การแสดงผลคะแนนทุกจุด | ⬅️ ควรเพิ่ม status field ตั้งแต่ตอนนี้ |
| 🟡 11 | **Audit Log (บันทึกการกระทำ)** | ถ้าไม่มี audit log → ย้อนหลังไม่รู้ว่าใครทำอะไรตอนไหน | กลาง — เพิ่มตารางใหม่ได้ แต่ข้อมูลย้อนหลังสูญ | ⬅️ ควรเพิ่ม audit_logs ตั้งแต่ MVP |
| 🟡 12 | **i18n structure (TH/EN)** | ถ้า hardcode ภาษาไทย → Full version ต้องหา string ทุกจุดใน code | สูง — กระทบทุก component + ต้องใช้ find/replace ทั่ว project | ใช้ message keys ตั้งแต่ต้น |
| 🟢 13 | **Score Void (ยกเลิกรายการ)** | MVP ลบ transaction ได้ → Full version เปลี่ยนเป็น void → audit ไม่ครบ | ต่ำ — เพิ่ม void fields + ปรับ UI ได้ | อาจรอ Full version ได้ |
| 🟢 14 | **Guardian Management** | ตาราง guardian ใหม่ ไม่กระทบ code เดิม | ต่ำ — เพิ่มตารางเชื่อมกับ student_id | รอ Full version ได้ |
| 🟢 15 | **Intervention Logs** | ตารางใหม่ ไม่กระทบ code เดิม | ต่ำ — เพิ่มตารางเชื่อมกับ student_id | รอ Full version ได้ |
| 🟢 16 | **Bond Documents** | ตารางใหม่ ไม่กระทบ code เดิม | ต่ำ — เพิ่มตารางใหม่ เชื่อมกับ threshold | รอ Full version ได้ |
| 🟢 17 | **Notifications** | ตารางใหม่ ไม่กระทบ code เดิม | ต่ำ — เพิ่มตารางเชื่อมกับ profile_id | รอ Full version ได้ |
| 🔴 18 | **PDPA Consent** | ข้อกฎหมาย — ถ้าไม่มี consent ถือว่าผิด พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล | สูง — ต้อง audit ย้อนหลัง + เสี่ยงถูกดำเนินคดี | ⬅️ **ต้องเพิ่มตอนนี้ (ข้อกฎหมาย)** |
| 🟢 19 | **Multi-school Config** | ออกแบบให้ config-driven ได้ยากถ้าทำทีหลัง แต่ไม่จำเป็นถ้าใช้แค่โรงเรียนเดียว | กลาง — ต้อง refactor วิธีอ่าน config | รอ Full version ได้ |

### 15.1 ฟีเจอร์แนะนำให้เพิ่มใน MVP เดี๋ยวนี้ (Priority)

จากตารางด้านบน มี 5 ฟีเจอร์ที่แนะนำให้เพิ่มใน MVP **ตอนนี้** ก่อนเริ่มเขียนโค้ด:

#### 1️⃣ Evidence Upload (Google Drive) — Priority: สูง

**เหตุผล:** ถ้าต้องการแนบรูปหลักฐานย้อนหลัง ไม่มีรูปตั้งแต่แรก → ข้อมูลสูญ
**ใน MVP:** แนบรูป 1-3 รูปต่อ transaction อัปโหลดไป Google Drive (ใช้ API key) เก็บ URL/link ไว้ใน DB
**Full version:** เปลี่ยนเป็น Supabase Storage + signed URL + virus scan + EXIF strip

**วิธีทำใน MVP:**
```sql
-- เพิ่มตาราง evidence
create table score_transaction_evidence (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid references score_transactions(id) on delete cascade,
  file_name text,
  file_url text not null,         -- Google Drive share link หรือ URL
  file_type text,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz default now()
);
```

- ใช้ Google Drive API (service account) หรือสร้าง folder แชร์แล้วให้ครูอัปโหลดเอง
- เก็บ `file_url` (Google Drive share link) ในตาราง evidence
- แสดงรูปใน student detail + report

#### 2️⃣ Score Approval Status — Priority: สูง

**เหตุผล:** การคำนวณคะแนนต้องแยก `approved` กับ `pending` ถ้าทีหลังต้องแก้ logic ทุกจุดที่คำนวณคะแนน

**ใน MVP:**
```sql
-- เพิ่มฟิลด์ใน score_transactions (ต้องมีตั้งแต่ create table)
--   status text default 'approved',
--   approved_by uuid references profiles(id),
--   approved_at timestamptz
```

**วิธีทำ:**
- MVP: ทุก transaction มี `status = 'approved'` ทันที (ไม่ต้องรอ approve)
- แต่ **มีฟิลด์ status พร้อม** — Full version แค่เปลี่ยน logic การคำนวณคะแนน
- การคำนวณคะแนนต้องกรอง `WHERE status = 'approved'` ตั้งแต่ MVP

```typescript
// MVP: คำนวณคะแนน — กรอง status ไว้ตั้งแต่ต้น
const { data } = await supabase
  .from('score_transactions')
  .select('points')
  .eq('student_id', studentId)
  .eq('academic_year', academicYear)
  .eq('status', 'approved');     // ← กรองไว้เลย

// Full version: แค่เพิ่ม WHERE status = 'approved' AND approved_by IS NOT NULL
// ไม่ต้องแก้ code ส่วนอื่น
```

#### 3️⃣ Audit Logs — Priority: กลาง

**เหตุผล:** ข้อมูลย้อนหลังสูญถ้าไม่มี audit log ตั้งแต่แรก

**ใน MVP:**
```sql
-- ตาราง audit_logs แบบง่าย
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null,              -- 'score.create', 'score.delete', 'student.create', etc
  target_type text,                  -- 'student', 'score', 'setting'
  target_id uuid,
  details jsonb,                     -- ข้อมูลเพิ่มเติม
  created_at timestamptz default now()
);
```

- MVP: บันทึกเฉพาะ action หลัก (create score, delete score, import CSV)
- Full version: เพิ่มรายละเอียด (before_data, after_data, ip_address, user_agent)
- API format: ใช้ format เดียวกัน — Full version แค่เพิ่ม fields

#### 4️⃣ i18n Structure (TH/EN) — Priority: กลาง

**เหตุผล:** ถ้า hardcode ภาษาไทยใน component → Full version ต้อง grep หา string ทุกจุด

**ใน MVP:**
```typescript
// lib/messages.ts — เก็บ string ไว้ที่เดีว ถึงจะใช้แค่ภาษาไทย
export const messages = {
  score: {
    deduct: 'ตัดคะแนน',
    add: 'เพิ่มคะแนน',
    current: 'คะแนนปัจจุบัน',
  },
  nav: {
    dashboard: 'แดชบอร์ด',
    students: 'นักเรียน',
  },
};

// ใช้ใน component:
// import { messages } from '@/lib/messages';
// <h1>{messages.nav.dashboard}</h1>
```

- **ไม่ต้องติดตั้ง next-intl** ใน MVP
- แค่สร้าง `messages/th.ts` เก็บ string ทั้งหมด
- Full version: เปลี่ยนเป็น `next-intl` + `messages/en.json` — **เปลี่ยนแค่ import**

#### 5️⃣ PDPA Consent — Priority: สูง (ข้อกฎหมาย)

**เหตุผล:** พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 กำหนดให้ต้องได้รับความยินยอมก่อนเก็บรวบรวมข้อมูล

**ใน MVP:**
- ตาราง `pdpa_consents` สำหรับบันทึกการยอมรับ
- หน้า `/pdpa-consent` แสดงข้อความ PDPA + ปุ่มยอมรับ
- Middleware ตรวจสอบ consent หลัง login
- Admin แก้ไขข้อความ PDPA ได้ที่ settings

```sql
-- ตาราง pdpa_consents — มีตั้งแต่ MVP
create table pdpa_consents (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  consent_version text not null,
  accepted boolean not null default true,
  accepted_at timestamptz default now(),
  ip_address text,
  user_agent text,
  unique (profile_id, consent_version)
);
```

**วิธีทำ:**
- หลัง login → middleware ตรวจ `pdpa_consents` → ถ้าไม่มี → redirect `/pdpa-consent`
- หน้า `/pdpa-consent`: แสดงข้อความจาก settings (`pdpa_notice_text`) + checkbox + ปุ่มยอมรับ
- บันทึก `profile_id`, `consent_version`, `ip_address`, `user_agent`
- Full version: เพิ่ม version management, compliance dashboard, revoke flow

### 15.2 สรุป: ควรทำอะไรเมื่อไหร่

| เมื่อไหร่ | ฟีเจอร์ | ผลกระทบถ้าช้า |
|----------|---------|--------------|
| **ก่อนเขียน MVP** | ✅ DB schema เผื่อฟิลด์ + academic_year | 🔴 ต้อง migrate ข้อมูล |
| **ก่อนเขียน MVP** | ✅ RLS policies | 🔴 ข้อมูลรั่ว |
| **ก่อนเขียน MVP** | ✅ Role-based auth + guard | 🔴 ต้องแก้ทุก route |
| **ก่อนเขียน MVP** | ✅ แยกชื่อ/นามสกุล | 🟠 แก้หลายจุด |
| **ก่อนเขียน MVP** | ⬅️ **เพิ่ม evidence table + status field + audit_logs + pdpa_consents** | 🟠-🔴 |
| **ระหว่าง MVP** | ใช้ message keys แทน hardcode string | 🟡 ต้อง refactor ทุก component |
| **Full version** | Guardian, Intervention, Bond, Notification | 🟢 เพิ่มตารางใหม่ ไม่กระทบของเดิม |

### 15.3 สรุป DB Schema Final (MVP + เผื่อ Full)

```sql
-- profiles — เผื่อ avatar_url, phone
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique,
  role text check (role in ('admin','teacher','student')) not null,
  first_name text not null,
  last_name text not null,
  is_active boolean default true,
  must_change_password boolean default false,
  last_login_at timestamptz,
  avatar_url text,                   -- Full version
  phone text,                        -- Full version
  created_at timestamptz default now()
);

-- score_transactions — เผื่อ approval + void fields
create table score_transactions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) not null,
  category_id uuid references score_categories(id),
  points int not null,
  note text,
  recorded_by uuid references profiles(id) not null,
  recorded_at timestamptz default now(),
  academic_year text not null,
  status text default 'approved',    -- ✅ มีตั้งแต่ MVP (approved/pending/rejected/voided)
  approved_by uuid references profiles(id),  -- ✅ เผื่อ
  approved_at timestamptz,                   -- ✅ เผื่อ
  voided_by uuid references profiles(id),    -- ✅ เผื่อ
  voided_at timestamptz,                     -- ✅ เผื่อ
  void_reason text                           -- ✅ เผื่อ
);

-- score_transaction_evidence — สำหรับแนบหลักฐาน
create table score_transaction_evidence (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid references score_transactions(id) on delete cascade,
  file_name text,
  file_url text not null,            -- Google Drive share link หรือ URL
  file_type text,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz default now()
);

-- audit_logs — แบบง่าย (MVP)
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz default now()
);
```

---

## 16. สิ่งที่ตัดออกจาก Full Version

| ฟีเจอร์ | เหตุผลที่ตัดออกจาก MVP |
|---------|----------------------|
| รองรับหลายโรงเรียน (Multi-school) | MVP = โรงเรียนเดียว ใช้ .env อย่างเดียว |
| Feature flags | ไม่มี optional features ใน MVP |
| ระบบภาษา TH/EN (i18n) | ภาษาไทยอย่างเดียว |
| getdesign notion theme | shadcn/ui + Tailwind พอ |
| ระบบสิทธิ์ละเอียด (Permissions) | Hardcode 3 roles |
| ข้อมูลผู้ปกครอง (Guardian) | MVP ไม่ต้อง |
| แนบรูปหลักฐาน (Evidence) | ✅ **มีใน MVP** — ใช้ Google Drive เก็บไฟล์ เก็บ URL ใน DB |
| ขั้นตอนอนุมัติคะแนน | ทุกรายการมีผลทันที |
| แก้ไข/ยกเลิกรายการคะแนน | Admin ลบ transaction ได้ตรง |
| รายงาน snapshot รายเดือน | รายงานดึงข้อมูลสด |
| บันทึกการติดตาม (Intervention) | ไม่ใช่ core MVP |
| เอกสารทัณฑ์บนอัตโนมัติ (Bond) | ✅ Threshold report แสดงสถานะ — แต่ยังไม่สร้างเอกสารอัตโนมัติ |
| แจ้งเตือนในระบบ (Notification) | ไม่มี |
| Audit / Action logs | ไม่มีใน MVP |
| PDPA consent | ✅ **มีใน MVP** — ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล |
| PWA support | ไม่จำเป็น |
| ตัวช่วยนำเข้าประจำปี (Annual Import Wizard) | Import CSV อย่างเดียว |
| จำกัดอัตราการเรียกใช้ (Rate Limiting) | ไม่มี |
| ส่งอีเมล / Line Notify | ไม่มี |
| Export PDF | Print-friendly CSS เท่านั้น |
| ค้นหาแบบเต็ม (Full-text search) | LIKE query ธรรมดา |
| พอร์ทัลผู้ปกครอง | ไม่มี |
| สถิติโรงเรียน (School Statistics) | แค่ timeline chart สำหรับ individual |

---

## 17. เกณฑ์การยอมรับ (Acceptance Criteria)

### ระบบเข้าสู่ระบบ
- [ ] Admin/Teacher เข้าสู่ระบบด้วยอีเมล + รหัสผ่านได้
- [ ] Student เข้าสู่ระบบด้วยรหัสนักเรียน + รหัสผ่านได้
- [ ] เปลี่ยนเส้นทางตามบทบาทหลังจาก login
- [ ] ครั้งแรกต้องเปลี่ยนรหัสผ่านก่อนเข้าใช้งาน
- [ ] บัญชีที่ถูกปิดใช้งานไม่สามารถเข้าได้

### นักเรียน
- [ ] Admin เพิ่ม/แก้ไขนักเรียนได้
- [ ] Admin กำหนดนักเรียนเข้าห้องเรียนได้
- [ ] ค้นหานักเรียนด้วยชื่อ/นามสกุล/รหัส/ห้องได้

### ห้องเรียน
- [ ] Admin สร้างห้องเรียนได้
- [ ] Admin กำหนดครูประจำห้องได้
- [ ] Teacher เห็นเฉพาะห้องที่ได้รับมอบหมายใน dashboard

### คะแนน
- [ ] Teacher บันทึกเพิ่ม/ตัดคะแนนนักเรียน active ทุกคนได้
- [ ] บันทึกคะแนนหลายคนพร้อมกันได้
- [ ] แนบรูปหลักฐานจาก Google Drive ประกอบการบันทึกคะแนนได้ (1-3 รูปต่อ transaction)
- [ ] คะแนนแสดงถูกต้อง (ตั้งต้น 100 + transactions, ขั้นต่ำ 0)
- [ ] Badge ระดับความประพฤติเปลี่ยนตามคะแนนปัจจุบัน
- [ ] ประวัติคะแนนแสดงรายการทั้งหมด
- [ ] คะแนนรีเซ็ตเป็น 100 เมื่อเปลี่ยนปีการศึกษา — คะแนนปีเก่าไม่ส่งผลต่อปีใหม่
- [ ] ประวัติคะแนนปีการศึกษาก่อนหน้ายังดูได้ผ่านตัวกรองปีการศึกษา

### Threshold
- [ ] ⭐ Admin ตั้งค่าเกณฑ์ threshold ได้ที่หน้า Settings (เพิ่ม/ลด/แก้ไข)
- [ ] ⭐ รายงาน threshold แสดงนักเรียนที่ถึงเกณฑ์เท่านั้น
- [ ] ⭐ แสดง badge สีตาม severity ของ threshold
- [ ] ⭐ กรองตามห้องเรียน และระดับ threshold ได้
- [ ] ⭐ Teacher เห็นเฉพาะนักเรียนในห้องตัวเองในรายงาน threshold
- [ ] ⭐ คำนวณคะแนนที่ถูกตัดสะสมถูกต้อง
- [ ] ⭐ เรียงลำดับตามความรุนแรงของ threshold (มากไปน้อย)

### รายงาน
- [ ] รายงานรายบุคคลแสดงกราฟ timeline + ประวัติคะแนน + สถานะ threshold
- [ ] รายงานรายห้องแสดงนักเรียนทั้งหมดพร้อมคะแนน เรียงตามเลขที่
- [ ] ⭐ รายงาน threshold แสดงตาราง + สรุปจำนวนแยกตามระดับ

### ตั้งค่า
- [ ] Admin เปลี่ยนชื่อโรงเรียน คะแนนตั้งต้น ปีการศึกษาได้
- [ ] ⭐ Admin อัปโหลดโลโก้โรงเรียนได้ (รูปจาก Google Drive หรือ URL)
- [ ] ⭐ โลโก้แสดงที่ sidebar + หน้า login
- [ ] Admin จัดการหมวดคะแนนได้
- [ ] Admin นำเข้านักเรียนจาก CSV ได้
- [ ] ⭐ Admin ตั้งค่า thresholds ได้ (คะแนน + ข้อความ + สี)
- [ ] Admin แก้ไขข้อความ PDPA ได้ที่ settings

### PDPA Consent
- [ ] หลัง login ครั้งแรก → redirect ไปหน้า /pdpa-consent
- [ ] หน้า PDPA แสดงข้อความ privacy notice จาก settings
- [ ] กด "ยอมรับ" → บันทึก consent → เข้า dashboard ได้
- [ ] กด "ปฏิเสธ" → logout + แสดงข้อความแจ้งเตือน
- [ ] ถ้ายอมรับแล้ว → login ครั้งถัดไปเข้า dashboard ได้เลย
- [ ] บันทึก consent_version, ip_address, user_agent ทุกครั้ง

### UI/UX
- [ ] ทุก UI เป็นภาษาไทย
- [ ] ใช้ฟอนต์ Sarabun ทั้งระบบ
- [ ] แสดง empty state เมื่อไม่มีข้อมูล
- [ ] มี loading skeleton ขณะโหลดข้อมูล
- [ ] มี error boundary ทุกกลุ่มเส้นทาง
- [ ] แสดงโลโก้โรงเรียน + ชื่อโรงเรียนที่ sidebar และหน้า login
- [ ] Admin อัปโหลดโลโก้โรงเรียนได้ที่หน้า Settings
