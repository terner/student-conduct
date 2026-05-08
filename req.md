# Student Conduct Score System

## ระบบคะแนนความประพฤตินักเรียน

Multi-School Ready · Config-Driven Design · Clone & Deploy

Next.js 14 \| TypeScript \| Supabase \| Vercel \| i18n (TH/EN) \| Sarabun Thai Font

## 1. Tech Stack & Dependencies

วาง prompt ส่วนนี้ในโปรเจกต์ใหม่เพื่อให้ AI สร้าง project structure และ install
ทุกอย่าง

|            |                          |                                  |
|------------|--------------------------|----------------------------------|
| **Layer**  | **Technology**           | **Purpose**                      |
| Framework  | Next.js 14 (App Router)  | SSR, routing, server actions     |
| Language   | TypeScript               | Type safety across all layers    |
| Database   | Supabase (PostgreSQL)    | Data storage + RLS security      |
| Auth       | Supabase Auth            | Login, roles, session management |
| Hosting    | Vercel                   | CI/CD, edge functions, CDN       |
| UI Library | shadcn/ui + Tailwind CSS | Component system, dark mode      |
| Charts     | Recharts                 | Score timeline, statistics       |
| i18n       | next-intl                | Thai (default) + English, bilingual UI |
| Font       | Sarabun + Geist          | Thai + Latin UI fallback         |
| Forms      | react-hook-form + zod    | Validation, type-safe forms      |
| CSV        | papaparse                | Import students & teachers       |
| Design     | getdesign notion theme   | Notion-style clean UI            |

---

## 1.1 Architecture & Design Philosophy

### Multi-School Ready (Clone & Deploy)

```
┌──────────────────────────────────────────────────────────┐
│                    Codebase (GitHub)                      │
│  school-behavior-grade/                                   │
│  ├── school.config.ts          ← Config สำหรับโรงเรียนนี้   │
│  ├── .env.local                ← Supabase keys + secrets   │
│  ├── messages/th.json          ← ภาษาไทย                   │
│  ├── messages/en.json          ← ภาษาอังกฤษ                 │
│  └── app/                      ← Next.js App Router        │
└────────────────┬─────────────────────────────────────────┘
                 │ Clone + Configure + Deploy
    ┌────────────┴────────────┐
    ▼                         ▼
┌──────────────┐        ┌──────────────┐
│ โรงเรียน ก.   │        │ โรงเรียน ข.   │
│ Vercel Proj A │        │ Vercel Proj B │
│ Supabase A    │        │ Supabase B    │
└──────────────┘        └──────────────┘
```

- **โรงเรียนละ 1 deployment** — clone repo → ตั้งค่า `school.config.ts` + `.env.local` → deploy ขึ้น Vercel
- **ข้อมูลแยกกัน** — แต่ละโรงเรียนมี Supabase project ของตัวเอง
- **Codebase เดียวกัน** — ทุกโรงเรียนใช้โค้ชเดียวกัน แต่ config ต่างกัน

### Config-Driven Design

ทุกฟีเจอร์ที่ **ไม่ใช่ MVP** ต้องมี feature flag ใน `school.config.ts`:

```typescript
// school.config.ts — ตัวอย่าง
export const schoolConfig = {
  // ─── ข้อมูลโรงเรียน ───
  school: {
    name: 'โรงเรียนตัวอย่าง',
    nameEn: 'Example School',
    logo: '/logo.png',           // path เริ่มต้น หรือ URL จาก Google Drive หลังอัปโหลด
    address: '123 ถนน...',
    phone: '02-xxx-xxxx',
  },

  // ─── Feature Flags (ปิด/เปิดฟีเจอร์) ───
  features: {
    lineNotify: false,           // 🔴 ปิด (ไม่ใช่ MVP)
    emailSummary: false,         // 🔴 ปิด (ไม่ใช่ MVP)
    pwa: false,                  // 🔴 ปิด (ไม่ใช่ MVP)
    monthlyReportSnapshot: true, // ✅ เปิด
    atRiskReport: true,          // ✅ เปิด
    interventionLog: true,       // ✅ เปิด
    bondDocument: true,          // ✅ เปิด
    evidenceUpload: true,        // ✅ เปิด
    bulkScoreRecord: true,       // ✅ เปิด
    guardianManagement: true,    // ✅ เปิด
    auditLog: true,              // ✅ เปิด
    actionLog: true,             // ✅ เปิด
    scoreApproval: true,         // ✅ เปิด
    csvExport: true,             // ✅ เปิด
    statistics: true,            // ✅ เปิด
  },

  // ─── ค่าเริ่มต้น ───
  defaults: {
    baseScore: 100,
    scoreFloor: 0,
    scoreCeiling: null,          // null = ไม่จำกัด
    displayScoreAboveBaseAs: '100+',
    academicYear: '2569',
    language: 'th',              // 'th' | 'en'
  },

  // ─── ระดับความประพฤติ ───
  conductLevels: [
    { name: 'ดีมาก', min: 100, max: 999, color: '#27500A' },
    { name: 'ดี', min: 80, max: 99, color: '#0C447C' },
    { name: 'พอใช้', min: 50, max: 79, color: '#633806' },
    { name: 'ต้องปรับปรุง', min: 0, max: 49, color: '#A32D2D' },
  ],

  // ─── เกณฑ์การแจ้งเตือน ───
  thresholds: [
    { deducted: 40, action: 'ทำทัณฑ์บนครั้งที่ 1 — เชิญผู้ปกครอง' },
    { deducted: 60, action: 'ทำทัณฑ์บนครั้งที่ 2 — เชิญผู้ปกครอง' },
    { deducted: 80, action: 'ทำทัณฑ์บนครั้งที่ 3 — อาจพักการเรียน' },
    { deducted: 100, action: 'ย้ายสถานศึกษา' },
  ],
};
```

**หลักการ:**
- `school.config.ts` = ค่าปรับแต่งของโรงเรียน + feature flags
- `.env.local` = secrets (Supabase keys, tokens)
- ถ้า feature flag = `false` → ฟีเจอร์นั้น **ไม่แสดงใน UI, ไม่มี route, ไม่มี API**
- โรงเรียนที่ไม่ต้องการฟีเจอร์พิเศษ → แค่ตั้งค่า `features.xxx = false`

### MVP Feature Set (เปิด default ทั้งหมด)

| ฟีเจอร์ | MVP | Config |
|--------|-----|--------|
| Auth (3 roles) | ✅ MVP | — |
| Student management | ✅ MVP | — |
| Score record (add/deduct) | ✅ MVP | — |
| Score categories | ✅ MVP | — |
| Dashboard (admin/teacher/student) | ✅ MVP | — |
| Classroom management | ✅ MVP | — |
| Teacher-classroom assignment | ✅ MVP | — |
| Individual & class reports | ✅ MVP | — |
| Conduct levels & scoring logic | ✅ MVP | — |
| CSV import students/teachers | ✅ MVP | — |
| Score history & timeline | ✅ MVP | — |
| Role-based permissions | ✅ MVP | — |
| PDPA consent flow | ✅ MVP | — |
| Bilingual UI (TH/EN) | ✅ MVP | — |
| **Line Notify** | ❌ | `features.lineNotify` |
| **Email Summary** | ❌ | `features.emailSummary` |
| **PWA Support** | ❌ | `features.pwa` |

## 2. Setup Commands

รันตามลำดับในเครื่อง local ก่อน deploy ขึ้น Vercel

### 2.1 Clone & Setup

> git clone <repo-url> school-conduct
>
> cd school-conduct
>
> cp school.config.example.ts school.config.ts
>
> cp .env.example .env.local

### 2.2 Install Dependencies

> npm install @supabase/supabase-js @supabase/ssr next-intl
>
> npm install @hookform/resolvers react-hook-form zod recharts sonner
>
> npm install papaparse @types/papaparse
>
> npm install lucide-react class-variance-authority clsx tailwind-merge

### 2.3 shadcn/ui

> npx shadcn@latest init
>
> npx shadcn@latest add button card dialog select table badge form input
> label textarea toast tabs

### 2.4 Notion Design Theme

> npx getdesign@latest add notion

### 2.5 Environment Variables (.env.local)

> NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
>
> NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
>
> SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

### 2.6 Deploy

> npx vercel --prod
>
> *เพิ่ม environment variables ใน Vercel dashboard หลัง deploy ด้วย*

## 3. Database Schema (Supabase SQL)

วาง SQL นี้ใน Supabase SQL Editor → Run all

### 3.1 Extensions & Core Tables

> create extension if not exists "uuid-ossp";

*profiles — linked to auth.users, stores role + name*

> create table profiles (
>
> id uuid primary key default uuid_generate_v4(),
>
> user_id uuid references auth.users(id) on delete cascade unique,
>
> role text check (role in ('admin','teacher','student')) not null,
>
> full_name text not null,
>
> is_active boolean default true,
>
> must_change_password boolean default false,
>
> last_login_at timestamptz,
>
> avatar_url text, created_at timestamptz default now()
>
> );
>
> create table academic_years (
>
> id uuid primary key default uuid_generate_v4(),
>
> name text not null, -- e.g. '2567'
>
> start_date date, end_date date,
>
> is_current boolean default false,
>
> base_score int default 100
>
> );
>
> create table classrooms (
>
> id uuid primary key default uuid_generate_v4(),
>
> name text not null, -- e.g. 'ป.1/1', 'ม.1/1'
>
> education_stage text check (education_stage in ('primary','secondary')) not null,
>
> grade_level int not null, -- primary: 1-6, secondary: 1-6
>
> academic_year_id uuid references academic_years(id),
>
> unique (name, academic_year_id)
>
> );
>
> create table students (
>
> id uuid primary key default uuid_generate_v4(),
>
> profile_id uuid references profiles(id) on delete cascade unique,
>
> student_id_number text unique,
>
> classroom_id uuid references classrooms(id),
>
> current_status text check (current_status in ('active','inactive','transferred','graduated','suspended')) default 'active'
>
> );
>
> create table guardians (
>
> id uuid primary key default uuid_generate_v4(),
>
> full_name text not null,
>
> phone text not null,
>
> phone_alt text,
>
> line_id text,
>
> email text,
>
> address text,
>
> created_at timestamptz default now()
>
> );
>
> create table student_guardians (
>
> student_id uuid references students(id) on delete cascade,
>
> guardian_id uuid references guardians(id) on delete cascade,
>
> relation text not null, -- father/mother/guardian/relative/other
>
> is_primary boolean default false,
>
> can_receive_notifications boolean default true,
>
> can_pickup_student boolean default false,
>
> primary key (student_id, guardian_id)
>
> );
>
> create table teachers (
>
> id uuid primary key default uuid_generate_v4(),
>
> profile_id uuid references profiles(id) on delete cascade unique,
>
> employee_id text unique,
>
> department text
>
> );
>
> create table teacher_classrooms (
>
> teacher_id uuid references teachers(id),
>
> classroom_id uuid references classrooms(id),
>
> assignment_role text check (assignment_role in ('homeroom','assistant','subject','discipline')) default 'homeroom',
>
> assigned_at timestamptz default now(),
>
> assigned_by uuid references profiles(id),
>
> primary key (teacher_id, classroom_id)
>
> );
>
> create table student_enrollments (
>
> id uuid primary key default uuid_generate_v4(),
>
> student_id uuid references students(id) on delete cascade,
>
> classroom_id uuid references classrooms(id),
>
> academic_year_id uuid references academic_years(id),
>
> class_number int,
>
> enrollment_status text check (enrollment_status in ('active','promoted','repeated','transferred','inactive','graduated')) default 'active',
>
> source text check (source in ('annual_import','manual','promotion_helper')) default 'annual_import',
>
> previous_enrollment_id uuid references student_enrollments(id),
>
> exit_date date,
>
> exit_reason text,
>
> created_at timestamptz default now(),
>
> unique (student_id, academic_year_id),
>
> unique (classroom_id, academic_year_id, class_number)
>
> );

### 3.1.1 Permission & Authorization Tables

> create table permissions (
>
> id uuid primary key default uuid_generate_v4(),
>
> code text unique not null, -- e.g. 'student.view_all', 'score.record'
>
> name_th text not null, name_en text not null,
>
> description_th text, description_en text,
>
> group_th text not null, -- หมวด: 'นักเรียน', 'คะแนน', 'รายงาน', 'ระบบ', 'การติดตาม', 'ทัณฑ์บน'
>
> group_en text not null,
>
> is_system boolean default false, -- true = จำเป็น ห้ามปิด
>
> is_active boolean default true,
>
> sort_order int default 0,
>
> created_at timestamptz default now()
>
> );
>
> create table role_permissions (
>
> id uuid primary key default uuid_generate_v4(),
>
> role text check (role in ('admin','teacher','student')) not null,
>
> permission_id uuid references permissions(id) on delete cascade,
>
> is_granted boolean default true, -- true = มีสิทธิ์, false = ถูกปฏิเสธ
>
> created_at timestamptz default now(),
>
> unique (role, permission_id)
>
> );
>
> -- สำหรับข้อยกเว้นรายบุคคล (override)
> create table profile_permission_overrides (
>
> id uuid primary key default uuid_generate_v4(),
>
> profile_id uuid references profiles(id) on delete cascade,
>
> permission_id uuid references permissions(id) on delete cascade,
>
> is_granted boolean not null,
>
> granted_by uuid references profiles(id),
>
> granted_at timestamptz default now(),
>
> reason text,
>
> unique (profile_id, permission_id)
>
> );

### 3.2 Score Tables

> create table score_categories (
>
> id uuid primary key default uuid_generate_v4(),
>
> name text not null,
>
> type text check (type in ('deduct','add')) not null,
>
> default_points int not null,
>
> description text,
>
> requires_evidence boolean default false,
>
> requires_approval boolean default false,
>
> is_active boolean default true,
>
> created_by uuid references profiles(id)
>
> );
>
> create table score_transactions (
>
> id uuid primary key default uuid_generate_v4(),
>
> student_id uuid references students(id),
>
> category_id uuid references score_categories(id),
>
> points int not null, -- positive=add, negative=deduct
>
> note text,
>
> recorded_by uuid references profiles(id),
>
> recorded_at timestamptz default now(),
>
> academic_year_id uuid references academic_years(id),
>
> status text default 'approved', -- pending/approved/rejected/voided
>
> approved_by uuid references profiles(id),
>
> approved_at timestamptz,
>
> voided_by uuid references profiles(id),
>
> voided_at timestamptz,
>
> void_reason text
>
> );
>
> create table score_transaction_evidence (
>
> id uuid primary key default uuid_generate_v4(),
>
> transaction_id uuid references score_transactions(id) on delete cascade,
>
> file_path text not null,
>
> file_name text,
>
> file_type text,
>
> file_size int,
>
> uploaded_by uuid references profiles(id),
>
> uploaded_at timestamptz default now(),
>
> metadata jsonb
>
> );
>
> create table bond_documents (
>
> id uuid primary key default uuid_generate_v4(),
>
> document_no text unique not null,
>
> student_id uuid references students(id),
>
> academic_year_id uuid references academic_years(id),
>
> threshold_deducted int not null,
>
> status text check (status in ('draft','generated','signed','cancelled')) default 'draft',
>
> generated_by uuid references profiles(id),
>
> generated_at timestamptz default now(),
>
> approved_by uuid references profiles(id),
>
> signed_at timestamptz,
>
> cancelled_by uuid references profiles(id),
>
> cancelled_at timestamptz,
>
> cancel_reason text,
>
> print_count int default 0,
>
> metadata jsonb
>
> );
>
> create table monthly_reports (
>
> id uuid primary key default uuid_generate_v4(),
>
> academic_year_id uuid references academic_years(id),
>
> report_month int check (report_month between 1 and 12) not null,
>
> report_year int not null,
>
> scope text check (scope in ('school','grade','classroom')) not null,
>
> classroom_id uuid references classrooms(id),
>
> generated_by uuid references profiles(id),
>
> generated_at timestamptz default now(),
>
> snapshot jsonb not null,
>
> status text check (status in ('draft','finalized','cancelled')) default 'draft',
>
> finalized_at timestamptz,
>
> unique (academic_year_id, report_month, report_year, scope, classroom_id)
>
> );
>
> create table notifications (
>
> id uuid primary key default uuid_generate_v4(),
>
> recipient_id uuid references profiles(id),
>
> type text not null, -- score_recorded/pending_approval/threshold_reached/report_ready/etc
>
> title text not null,
>
> body text,
>
> resource_type text,
>
> resource_id uuid,
>
> read_at timestamptz,
>
> created_at timestamptz default now(),
>
> metadata jsonb
>
> );
>
> create table intervention_logs (
>
> id uuid primary key default uuid_generate_v4(),
>
> student_id uuid references students(id),
>
> academic_year_id uuid references academic_years(id),
>
> related_transaction_id uuid references score_transactions(id),
>
> intervention_type text check (intervention_type in ('phone_call','parent_meeting','warning','bond','home_visit','counseling','other')) not null,
>
> contacted_guardian_id uuid references guardians(id),
>
> contact_method text check (contact_method in ('phone','line','email','in_person','letter','other')),
>
> occurred_at timestamptz default now(),
>
> summary text not null,
>
> outcome text,
>
> next_follow_up_at timestamptz,
>
> recorded_by uuid references profiles(id),
>
> created_at timestamptz default now()
>
> );
>
> create table audit_logs (
>
> id uuid primary key default uuid_generate_v4(),
>
> actor_id uuid references profiles(id),
>
> action text not null, -- 'score_add','score_delete','import_csv', etc
>
> target_type text, -- 'student','teacher','setting'
>
> target_id uuid,
>
> before_data jsonb,
>
> after_data jsonb,
>
> metadata jsonb,
>
> ip_address inet,
>
> user_agent text,
>
> created_at timestamptz default now()
>
> );
>
> create table action_logs (
>
> id uuid primary key default uuid_generate_v4(),
>
> actor_id uuid references profiles(id),
>
> event text not null, -- login_success/login_failed/view_report/export_pdf/etc
>
> resource_type text,
>
> resource_id uuid,
>
> ip_address inet,
>
> user_agent text,
>
> metadata jsonb,
>
> created_at timestamptz default now()
>
> );
>
> create table pdpa_consents (
>
> id uuid primary key default uuid_generate_v4(),
>
> subject_type text check (subject_type in ('student','guardian','teacher','admin')) not null,
>
> subject_id uuid not null,
>
> consent_type text not null, -- privacy_notice/data_processing/notification
>
> version text not null,
>
> accepted boolean not null,
>
> accepted_by uuid references profiles(id),
>
> accepted_at timestamptz default now(),
>
> ip_address inet,
>
> user_agent text,
>
> revoked_at timestamptz
>
> );
>
> create table settings (
>
> key text primary key,
>
> value jsonb,
>
> updated_by uuid references profiles(id),
>
> updated_at timestamptz default now()
>
> );
>
### 3.3 Default Settings

> insert into settings (key, value) values
>
> ('school_name', '"โรงเรียนตัวอย่าง"'),
>
> ('school_name_en', '"Example School"'),
>
> ('school_logo_url', '""'),
>
> ('base_score', '100'),
>
> ('score_floor', '0'),
>
> ('score_ceiling', 'null'),
>
> ('display_score_above_base_as', '"100+"'),
>
> ('require_approval_above_points', '20'),
>
> ('pdpa_notice_version', '"1.0"'),
>
> ('data_retention_years', '5'),
>
> ('log_retention_years', '5'),
>
> ('password_policy', '{
>
> "student_min_length": 8,
>
> "staff_min_length": 8,
>
> "max_length": 128,
>
> "allow_unicode": true,
>
> "block_common_passwords": true,
>
> "composition_required_for_students": true,
>
> "student_requires_lowercase": true,
>
> "student_requires_uppercase": true,
>
> "student_requires_number": true,
>
> "student_requires_special": true
>
> }'),
>
> ('conduct_levels', '\[
>
> {"name":"ดีมาก","min":100,"max":999,"color":"#27500A"},
>
> {"name":"ดี","min":80,"max":99,"color":"#0C447C"},
>
> {"name":"พอใช้","min":50,"max":79,"color":"#633806"},
>
> {"name":"ต้องปรับปรุง","min":0,"max":49,"color":"#A32D2D"}
>
> \]'),
>
> ('thresholds', '\[
>
> {"deducted":40,"action":"ทำทัณฑ์บนครั้งที่ 1 — เชิญผู้ปกครอง"},
>
> {"deducted":60,"action":"ทำทัณฑ์บนครั้งที่ 2 — เชิญผู้ปกครอง"},
>
> {"deducted":80,"action":"ทำทัณฑ์บนครั้งที่ 3 — อาจพักการเรียน"},
>
> {"deducted":100,"action":"ย้ายสถานศึกษา"}
>
> \]');
>
> insert into score_categories (name, type, default_points, description, requires_evidence, requires_approval) values
>
> ('มาสาย', 'deduct', -5, 'มาโรงเรียนหรือเข้าชั้นเรียนสาย', false, false),
>
> ('แต่งกายผิดระเบียบ', 'deduct', -5, 'เครื่องแบบหรือทรงผมไม่เป็นไปตามระเบียบ', false, false),
>
> ('ไม่เข้าแถว/ไม่ร่วมกิจกรรมหน้าเสาธง', 'deduct', -5, 'ไม่เข้าร่วมกิจกรรมตามที่โรงเรียนกำหนด', false, false),
>
> ('ขาดเรียน/หนีเรียน', 'deduct', -10, 'ขาดเรียนหรือออกนอกชั้นเรียนโดยไม่ได้รับอนุญาต', false, false),
>
> ('ใช้คำหยาบ/ไม่สุภาพ', 'deduct', -10, 'ใช้วาจาไม่เหมาะสมต่อผู้อื่น', false, false),
>
> ('ทะเลาะวิวาท', 'deduct', -20, 'มีพฤติกรรมใช้ความรุนแรงหรือทะเลาะวิวาท', true, true),
>
> ('ทำลายทรัพย์สิน', 'deduct', -20, 'ทำให้ทรัพย์สินโรงเรียนหรือผู้อื่นเสียหาย', true, true),
>
> ('พกพาสิ่งต้องห้าม', 'deduct', -30, 'พกพาสิ่งของต้องห้ามตามระเบียบโรงเรียน', true, true),
>
> ('จิตอาสา', 'add', 5, 'เข้าร่วมกิจกรรมจิตอาสา', false, false),
>
> ('ช่วยงานโรงเรียน', 'add', 5, 'ช่วยงานหรือกิจกรรมของโรงเรียน', false, false),
>
> ('สร้างชื่อเสียงให้โรงเรียน', 'add', 10, 'ได้รับรางวัลหรือสร้างชื่อเสียงให้โรงเรียน', false, false),
>
> ('พฤติกรรมดีเด่น', 'add', 10, 'ได้รับการยกย่องด้านความประพฤติ', false, false);

### 3.4 Database Indexes

> create index idx_profiles_user_id on profiles(user_id);
> create index idx_profiles_role on profiles(role);
> create index idx_profiles_full_name on profiles using gin(to_tsvector('simple', full_name));
>
> create index idx_students_profile_id on students(profile_id);
> create index idx_students_id_number on students(student_id_number);
> create index idx_students_classroom on students(classroom_id);
> create index idx_students_status on students(current_status);
>
> create index idx_enrollments_student on student_enrollments(student_id);
> create index idx_enrollments_academic_year on student_enrollments(academic_year_id);
> create index idx_enrollments_classroom on student_enrollments(classroom_id);
>
> create index idx_score_transactions_student on score_transactions(student_id);
> create index idx_score_transactions_category on score_transactions(category_id);
> create index idx_score_transactions_recorded_at on score_transactions(recorded_at);
> create index idx_score_transactions_status on score_transactions(status);
> create index idx_score_transactions_academic_year on score_transactions(academic_year_id);
>
> create index idx_notifications_recipient on notifications(recipient_id, read_at);
> create index idx_notifications_created_at on notifications(created_at);
>
> create index idx_audit_logs_actor on audit_logs(actor_id);
> create index idx_audit_logs_action on audit_logs(action);
> create index idx_audit_logs_created_at on audit_logs(created_at);
>
> create index idx_action_logs_actor on action_logs(actor_id);
> create index idx_action_logs_event on action_logs(event);
> create index idx_action_logs_created_at on action_logs(created_at);
>
> create index idx_bond_documents_student on bond_documents(student_id);
> create index idx_intervention_logs_student on intervention_logs(student_id);
> create index idx_teacher_classrooms_teacher on teacher_classrooms(teacher_id);
> create index idx_teacher_classrooms_classroom on teacher_classrooms(classroom_id);
> create index idx_classrooms_academic_year on classrooms(academic_year_id);
> create index idx_monthly_reports_academic_year on monthly_reports(academic_year_id);

### 3.5 Row Level Security (RLS) — ครบทุกตาราง

> -- ========================================
> -- 1. PROFILES
> -- ========================================
> alter table profiles enable row level security;
>
> create policy "profiles_self" on profiles
>   for select using (user_id = auth.uid());
>
> create policy "profiles_admin_all" on profiles
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> create policy "profiles_teacher_view" on profiles
>   for select using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'teacher')
>   );
>
> -- ========================================
> -- 2. STUDENTS
> -- ========================================
> alter table students enable row level security;
>
> create policy "students_admin_all" on students
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> create policy "students_teacher_view_active" on students
>   for select using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'teacher')
>     and current_status = 'active'
>   );
>
> create policy "students_self" on students
>   for select using (
>     profile_id = (select id from profiles where user_id = auth.uid())
>   );
>
> -- ========================================
> -- 3. CLASSROOMS
> -- ========================================
> alter table classrooms enable row level security;
>
> create policy "classrooms_admin_all" on classrooms
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> create policy "classrooms_teacher_view_assigned" on classrooms
>   for select using (
>     exists (select 1 from teacher_classrooms tc
>       join teachers t on t.id = tc.teacher_id
>       where t.profile_id = auth.uid() and tc.classroom_id = classrooms.id)
>   );
>
> create policy "classrooms_teacher_view_all_if_permitted" on classrooms
>   for select using (
>     exists (select 1 from profiles p
>       join role_permissions rp on rp.role = p.role
>       join permissions perm on perm.id = rp.permission_id
>       where p.user_id = auth.uid() and perm.code = 'student.view_all' and rp.is_granted = true)
>   );
>
> -- ========================================
> -- 4. STUDENT ENROLLMENTS
> -- ========================================
> alter table student_enrollments enable row level security;
>
> create policy "enrollments_admin_all" on student_enrollments
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> create policy "enrollments_teacher_view" on student_enrollments
>   for select using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'teacher')
>   );
>
> create policy "enrollments_student_self" on student_enrollments
>   for select using (
>     student_id = (select id from students where profile_id = (select id from profiles where user_id = auth.uid()))
>   );
>
> -- ========================================
> -- 5. SCORE TRANSACTIONS
> -- ========================================
> alter table score_transactions enable row level security;
>
> create policy "transactions_admin_all" on score_transactions
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> create policy "transactions_teacher_insert" on score_transactions
>   for insert with check (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'teacher')
>     and exists (select 1 from students s where s.id = student_id and s.current_status = 'active')
>   );
>
> create policy "transactions_teacher_select" on score_transactions
>   for select using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'teacher')
>   );
>
> create policy "transactions_student_own" on score_transactions
>   for select using (
>     student_id = (select id from students where profile_id = (select id from profiles where user_id = auth.uid()))
>   );
>
> -- ========================================
> -- 6. SCORE CATEGORIES
> -- ========================================
> alter table score_categories enable row level security;
>
> create policy "categories_admin_all" on score_categories
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> create policy "categories_read_all" on score_categories
>   for select using (true);
>
> -- ========================================
> -- 7. GUARDIANS
> -- ========================================
> alter table guardians enable row level security;
> alter table student_guardians enable row level security;
>
> create policy "guardians_admin_all" on guardians
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> create policy "guardians_teacher_view" on guardians
>   for select using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'teacher')
>   );
>
> -- ========================================
> -- 8. BOND DOCUMENTS
> -- ========================================
> alter table bond_documents enable row level security;
>
> create policy "bond_admin_all" on bond_documents
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> create policy "bond_teacher_view" on bond_documents
>   for select using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'teacher')
>   );
>
> -- ========================================
> -- 9. INTERVENTION LOGS
> -- ========================================
> alter table intervention_logs enable row level security;
>
> create policy "interventions_admin_all" on intervention_logs
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> create policy "interventions_teacher_all" on intervention_logs
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'teacher')
>   );
>
> -- ========================================
> -- 10. NOTIFICATIONS
> -- ========================================
> alter table notifications enable row level security;
>
> create policy "notifications_self" on notifications
>   for select using (recipient_id = (select id from profiles where user_id = auth.uid()));
>
> create policy "notifications_admin_all" on notifications
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> -- ========================================
> -- 11. AUDIT LOGS
> -- ========================================
> alter table audit_logs enable row level security;
>
> create policy "audit_logs_admin_select" on audit_logs
>   for select using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> -- ========================================
> -- 12. ACTION LOGS
> -- ========================================
> alter table action_logs enable row level security;
>
> create policy "action_logs_admin_select" on action_logs
>   for select using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> -- ========================================
> -- 13. SETTINGS
> -- ========================================
> alter table settings enable row level security;
>
> create policy "settings_admin_all" on settings
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> create policy "settings_read_all" on settings
>   for select using (true);
>
> -- ========================================
> -- 14. PERMISSIONS
> -- ========================================
> alter table permissions enable row level security;
> alter table role_permissions enable row level security;
> alter table profile_permission_overrides enable row level security;
>
> create policy "permissions_admin_all" on permissions
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> create policy "permissions_read_all" on permissions
>   for select using (true);
>
> -- ========================================
> -- 15. PDPA CONSENTS
> -- ========================================
> alter table pdpa_consents enable row level security;
>
> create policy "pdpa_admin_all" on pdpa_consents
>   for all using (
>     exists (select 1 from profiles where user_id = auth.uid() and role = 'admin')
>   );
>
> create policy "pdpa_self" on pdpa_consents
>   for select using (
>     subject_id = (select id from profiles where user_id = auth.uid())
>   );

## 4. Main Development Prompt

วาง prompt นี้ใน Cursor AI, Claude, หรือ ChatGPT Code Interpreter แล้วสั่ง
'Build this project'

> *ควรวางใน Cursor AI (Composer mode) เพื่อให้ generate ไฟล์ได้ครบที่สุด*

### 4.1 System Overview

> Build a complete Thai school student conduct scoring system.
>
> Stack: Next.js 14 App Router, TypeScript, Supabase, Vercel, shadcn/ui,
>
> Tailwind CSS, next-intl (th default / en), Sarabun Thai font.
>
> Design: Notion-style clean flat UI via 'npx getdesign@latest add
> notion'.

> Use Sarabun as the primary Thai font for all Thai UI, reports, and
> printable school documents. Use Geist as the Latin fallback font.
>
> All user-facing text must support Thai and English through next-intl.
>
> Multi-school ready: clone school.config.example.ts → set school info +
> feature flags → deploy. Each school runs its own Vercel + Supabase.

### 4.2 Auth & Roles

- 3 roles: admin (full access), teacher (assigned classrooms), student (self
  view only)

- Role stored in profiles.role — redirect after login based on role

- Support CSV bulk import to create users via Supabase service role

- RLS policies on all sensitive tables — no data leaks between roles

- Teacher-classroom assignment is many-to-many:

  - One teacher can be assigned to multiple classrooms.

  - One classroom can have multiple teachers.

  - Each assignment can define assignment_role.

  - Assignment controls dashboard scope, classroom reports, notifications, and
    intervention follow-up ownership.

- Teachers can report/record conduct scores for any active student in the school,
  even if the student is outside assigned classrooms.

### 4.2.1 Authentication & Login Flow

- Login page must support role-aware login in one screen.

- Admin and teacher login with email + password through Supabase Auth.

- Student login with student_id_number + password.

- For student login, the server resolves student_id_number to the linked
  Supabase Auth user/profile before signing in. Do not expose email lookup
  details to the client.

- Admin creates student accounts during CSV import or manual student creation.

- Student initial password should be a random temporary password and must be
  changed on first login.

- Password policy should follow OWASP Authentication Cheat Sheet and ASVS
  guidance where practical.

- Student password policy: minimum 8 characters, maximum 128 characters, and
  must include at least one lowercase letter, one uppercase letter, one number,
  and one special character.

- Staff password policy: minimum 8 characters and maximum 128 characters.

- Allow all printable characters including Unicode and whitespace. Do not
  silently truncate passwords.

- Block common, weak, and previously breached passwords.

- Do not require periodic password rotation unless there is evidence of
  compromise or an admin reset.

- Add login throttling/rate limiting to reduce brute-force and credential
  stuffing attacks.

  | Endpoint | Limit | Window | Action |
  |----------|-------|--------|--------|
  | `POST /api/auth/login` | 5 ครั้ง | 15 นาที | block + log action_log |
  | `POST /api/auth/forgot-password` | 3 ครั้ง | 1 ชั่วโมง | block + log |
  | `POST /api/score/record` | 100 ครั้ง | 1 ชั่วโมง | alert admin |
  | `POST /api/import/*` | 5 ครั้ง | 1 ชั่วโมง | block + audit log |
  | `GET /api/*` (general) | 300 ครั้ง | 1 ชั่วโมง | block |

  ใช้ `@upstash/ratelimit` กับ Redis (free tier) หรือ Supabase in-memory tracking
  ทุก rate limit event ต้องบันทึก action_logs

#### Session & Token Management

- **Access token expiry**: 1 ชั่วโมง (Supabase default)
- **Refresh token**: Auto-refresh ผ่าน Supabase Auth client ก่อนหมดอายุ
- **Session persistence**: localStorage (สำหรับผู้ใช้) — ใช้ Supabase session
- **Logout**: Revoke refresh token + clear session ทั้งหมด
- **Multiple sessions**: อนุญาต — ผู้ใช้ login จากหลายเครื่องได้
- **Inactivity timeout**: 8 ชั่วโมง — auto-logout เมื่อไม่มี activity
- **Device tracking** (optional): บันทึก device name, browser, IP ใน activity log

- The same password policy applies when admin resets a student password.

- profiles.must_change_password = true forces the user to the change-password
  page after first login before accessing dashboards.

- Role redirect after successful login:

  - admin → app/(dashboard)/page.tsx

  - teacher → app/(dashboard)/page.tsx

  - student → app/student/dashboard/page.tsx

- If login succeeds but no profile exists, show an error page instructing the
  user to contact admin.

- If profiles.is_active = false, block access and show account disabled message.

- Forgot password:

  - Admin/teacher use email reset.

  - Student password is reset by admin, unless the student has an email linked.

- Every successful login updates profiles.last_login_at.

### 4.2.2 Permission System — Configurable Role Permissions

- **เปลี่ยนจากการ hardcode scope ตาม role → ใช้ระบบ permission แทน**
- Admin สามารถกำหนดได้ว่าครูแต่ละคนหรือทุกรูปมีสิทธิ์อะไรบ้าง
- มี 3 ระดับ: **Default Role Permissions** → **Profile Override** (ข้อยกเว้นรายบุคคล)

#### Default Permission Sets

| หมวด | permission code | admin | teacher | student |
|------|----------------|-------|---------|---------|
| นักเรียน | `student.view_all` | ✅ | ⚙️ config | ❌ |
| | `student.view_assigned_only` | ❌ | ⚙️ config | ❌ |
| | `student.view_own` | ❌ | ❌ | ✅ |
| | `student.export` | ✅ | ⚙️ config | ❌ |
| | `student.manage` | ✅ | ❌ | ❌ |
| คะแนน | `score.record` | ✅ | ✅ | ❌ |
| | `score.record_bulk` | ✅ | ✅ | ❌ |
| | `score.approve` | ✅ | ❌ | ❌ |
| | `score.void` | ✅ | ❌ | ❌ |
| | `score.view_all_history` | ✅ | ⚙️ config | ❌ |
| | `score.view_own` | ❌ | ❌ | ✅ |
| รายงาน | `report.view_all` | ✅ | ⚙️ config | ❌ |
| | `report.view_classroom_only` | ❌ | ⚙️ config | ❌ |
| | `report.view_monthly` | ✅ | ✅ | ❌ |
| | `report.view_at_risk` | ✅ | ✅ | ❌ |
| | `report.view_statistics` | ✅ | ✅ | ❌ |
| | `report.export_pdf` | ✅ | ✅ | ❌ |
| | `report.export_csv` | ✅ | ⚙️ config | ❌ |
| | `report.finalize` | ✅ | ❌ | ❌ |
| การติดตาม | `intervention.view_all` | ✅ | ⚙️ config | ❌ |
| | `intervention.view_assigned_only` | ❌ | ⚙️ config | ❌ |
| | `intervention.create` | ✅ | ✅ | ❌ |
| ทัณฑ์บน | `bond.view` | ✅ | ⚙️ config | ❌ |
| | `bond.generate` | ✅ | ❌ | ❌ |
| | `bond.approve` | ✅ | ❌ | ❌ |
| | `bond.cancel` | ✅ | ❌ | ❌ |
| | `bond.print` | ✅ | ⚙️ config | ❌ |
| ระบบ | `settings.view` | ✅ | ❌ | ❌ |
| | `settings.edit` | ✅ | ❌ | ❌ |
| | `import.execute` | ✅ | ❌ | ❌ |
| | `export.execute` | ✅ | ⚙️ config | ❌ |
| | `audit_log.view` | ✅ | ❌ | ❌ |
| | `action_log.view` | ✅ | ❌ | ❌ |
| | `manage_users` | ✅ | ❌ | ❌ |
| | `manage_academic_years` | ✅ | ❌ | ❌ |
| | `manage_permissions` | ✅ | ❌ | ❌ |
| การแจ้งเตือน | `notification.view` | ✅ | ✅ | ✅ |
| | `notification.manage` | ✅ | ❌ | ❌ |

> ⚙️ config = Admin สามารถเปิด/ปิดได้ที่หน้า Settings → Permissions

#### Feature: "ครูเห็นนักเรียนทั้งหมด"

ในหน้า Settings → Permissions Admin จะตั้งค่าได้:

```
👁️ สิทธิ์การมองเห็นของครู

[⚙️] ครูเห็นนักเรียนทั้งหมด    → student.view_all = true
[  ] ครูเห็นเฉพาะห้องที่ได้รับมอบหมาย → student.view_assigned_only = true
     (ถ้าเปิดอันนี้ student.view_all จะถูกปิดอัตโนมัติ)

[⚙️] ครูดูรายงานทั้งหมด        → report.view_all = true
[  ] ครูดูรายงานเฉพาะห้องตัวเอง → report.view_classroom_only = true

[⚙️] ครู export ข้อมูลนักเรียนได้  → student.export = true
[⚙️] ครู export รายงาน CSV ได้    → report.export_csv = true
[⚙️] ครูดูเอกสารทัณฑ์บนได้        → bond.view = true
[⚙️] ครูพิมพ์เอกสารทัณฑ์บนได้     → bond.print = true
```

#### การตรวจสอบ Permission ใน Code

```typescript
// ตัวอย่าง server action — ตรวจสอบ permission
async function checkPermission(profileId: string, permissionCode: string): Promise<boolean> {
  // 1. ตรวจสอบ profile_permission_overrides ก่อน (ข้อยกเว้นรายบุคคล)
  // 2. ถ้าไม่มี override → ตรวจสอบ role_permissions
  // 3. return is_granted
}

// ใช้ใน server actions:
if (!await checkPermission(user.profile_id, 'score.approve')) {
  throw new Error('ไม่มีสิทธิ์อนุมัติคะแนน');
}
```

#### UI Component

- `PermissionEditor` — ตาราง checklist สำหรับ admin จัดการสิทธิ์
- `PermissionGuard` — wrapper component ซ่อน/แสดง UI ตาม permission
- Middleware ตรวจสอบ route access ตาม permission

### 4.3 Score System Logic

- Base score: 100 per academic year (configurable in settings)

- Score floor: 0 by default. Current score must not display below 0 unless
  admin changes score_floor in settings.

- Score ceiling: no hard ceiling by default. Scores can exceed 100, and UI
  should display values above base score as 100+ or the real score depending on
  display_score_above_base_as setting.

- Deduct score: select student → category → points → note → optional
  photo

- Add score: same flow for volunteer / good conduct activities

- Score report/record form supports uploading evidence photos during reporting.

- Bulk mode: select multiple students for same score event

- Score approval: transactions \> threshold require admin approval
  before final save

- Audit log: every create/edit/delete recorded in audit_logs table

- Score categories are configurable by admin and can define default points,
  active/inactive status, evidence requirement, and approval requirement.

- Approved score transactions must not be hard-deleted. Corrections use
  status = 'voided' with void_reason, voided_by, and voided_at.

- Pending transactions do not affect the student's current score until approved.

### 4.4 Conduct Levels

|               |           |                      |
|---------------|-----------|----------------------|
| **ระดับ**      | **คะแนน** | **action**           |
| **ดีมาก**      | 100+      | ยกย่องชมเชย           |
| **ดี**         | 80–99     | ปกติ                  |
| **พอใช้**      | 50–79     | ติดตามพฤติกรรม         |
| **ต้องปรับปรุง** | \< 50     | แจ้งผู้ปกครอง / ทำทัณฑ์บน |

### 4.5 Threshold Alerts

|               |                 |                            |
|---------------|-----------------|----------------------------|
| **คะแนนถูกตัด** | **คะแนนคงเหลือ** | **การดำเนินการ**            |
| 40 คะแนน      | 60 คะแนน        | ทำทัณฑ์บนครั้งที่ 1 — เชิญผู้ปกครอง |
| 60 คะแนน      | 40 คะแนน        | ทำทัณฑ์บนครั้งที่ 2 — เชิญผู้ปกครอง |
| 80 คะแนน      | 20 คะแนน        | ทำทัณฑ์บนครั้งที่ 3 — พักการเรียน  |
| 100 คะแนน     | 0 คะแนน         | ย้ายสถานศึกษา                |

## 5. App Router File Structure

|  |  |
|----|----|
| **Route / File** | **Description** |
| app/(auth)/login/page.tsx | Login page — role-based redirect |
| app/(dashboard)/page.tsx | Admin/teacher overview dashboard |
| app/(dashboard)/students/page.tsx | Student list with search & filter |
| app/(dashboard)/students/\[id\]/page.tsx | Student detail + full score history |
| app/(dashboard)/score/record/page.tsx | Record new score transaction (add/deduct) |
| app/(dashboard)/classrooms/page.tsx | Classroom list + management |
| app/(dashboard)/classrooms/\[id\]/page.tsx | Classroom detail with student scores |
| app/(dashboard)/reports/page.tsx | Report selection hub |
| app/(dashboard)/reports/monthly/page.tsx | Monthly report generator (PDF) |
| app/(dashboard)/reports/at-risk/page.tsx | At-risk students report |
| app/(dashboard)/reports/bond/\[id\]/page.tsx | Printable bond document (ทัณฑ์บน) |
| app/(dashboard)/reports/statistics/page.tsx | School-wide statistics & charts |
| app/(dashboard)/interventions/page.tsx | Contact/intervention log list |
| app/(dashboard)/interventions/\[id\]/page.tsx | Contact/intervention detail |
| app/(dashboard)/settings/page.tsx | System settings (admin only) |
| app/(dashboard)/settings/import/page.tsx | CSV import — students & teachers |
| app/(dashboard)/settings/academic-years/page.tsx | Academic year setup + annual classroom import |
| app/(dashboard)/settings/audit-log/page.tsx | Audit log viewer |
| app/(dashboard)/teachers/page.tsx | Teacher management |
| app/student/dashboard/page.tsx | Student self-view portal (own score only) |

### 5.1 REST API Endpoints (`app/api/`)

API endpoints ใช้ **Next.js Route Handlers** (`app/api/`) — ทุก endpoint ต้อง:
- ตรวจสอบ JWT token จาก Supabase Auth
- ตรวจสอบ permission (ผ่าน system permission)
- บันทึก audit_log / action_log ตามประเภท action
- Return structured response: `{ success: boolean, data?: T, error?: ErrorResponse }`

#### Auth

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/api/auth/login` | ❌ | — | Login (email/password หรือ student_id/password) |
| POST | `/api/auth/logout` | ✅ | — | Logout + revoke session |
| POST | `/api/auth/forgot-password` | ❌ | — | ส่ง reset link (admin/teacher email) |
| POST | `/api/auth/reset-password` | ✅ | — | Change password (ต้องมี temporary token) |
| GET | `/api/auth/session` | ✅ | — | Check current session + profile |

#### Students

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/students` | ✅ | `student.view_all` หรือ `student.view_assigned_only` | รายชื่อนักเรียน + filter |
| GET | `/api/students/[id]` | ✅ | `student.view_all` หรือ own student | ข้อมูลนักเรียน 1 คน |
| POST | `/api/students` | ✅ | `student.manage` | สร้างนักเรียนใหม่ |
| PATCH | `/api/students/[id]` | ✅ | `student.manage` | แก้ไขข้อมูลนักเรียน |
| DELETE | `/api/students/[id]` | ✅ | `student.manage` | Soft delete (is_active=false) |
| GET | `/api/students/[id]/score-history` | ✅ | `score.view_all_history` หรือ own | ประวัติคะแนนทั้งหมด |
| GET | `/api/students/[id]/guardians` | ✅ | `student.view_all` หรือ own | ข้อมูลผู้ปกครอง |
| POST | `/api/students/[id]/guardians` | ✅ | `student.manage` | เพิ่มผู้ปกครอง |

#### Score

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/api/score/record` | ✅ | `score.record` | บันทึกคะแนน (add/deduct) |
| POST | `/api/score/bulk` | ✅ | `score.record_bulk` | บันทึกคะแนนหลายคนพร้อมกัน |
| GET | `/api/score/pending` | ✅ | `score.approve` | รายการรออนุมัติ |
| POST | `/api/score/[id]/approve` | ✅ | `score.approve` | อนุมัติ transaction |
| POST | `/api/score/[id]/reject` | ✅ | `score.approve` | ปฏิเสธ transaction |
| POST | `/api/score/[id]/void` | ✅ | `score.void` | void transaction + เหตุผล |
| GET | `/api/score/categories` | ✅ | — | รายการหมวดคะแนน |

#### Classrooms

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/classrooms` | ✅ | `student.view_all` หรือ `student.view_assigned_only` | รายการห้องเรียน |
| GET | `/api/classrooms/[id]` | ✅ | — | ข้อมูลห้อง + รายชื่อนักเรียน |
| GET | `/api/classrooms/[id]/report` | ✅ | `report.view_all` หรือ `report.view_classroom_only` | รายงานรายห้อง |
| POST | `/api/classrooms` | ✅ | `student.manage` | สร้างห้องใหม่ |
| PATCH | `/api/classrooms/[id]` | ✅ | `student.manage` | แก้ไขห้อง |

#### Reports

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/reports/monthly` | ✅ | `report.view_monthly` | รายงานประจำเดือน |
| GET | `/api/reports/at-risk` | ✅ | `report.view_at_risk` | รายงานนักเรียนเสี่ยง |
| GET | `/api/reports/statistics` | ✅ | `report.view_statistics` | สถิติโรงเรียน |
| GET | `/api/reports/bond/[id]` | ✅ | `bond.view` | เอกสารทัณฑ์บน |
| GET | `/api/reports/export` | ✅ | `report.export_csv` or `report.export_pdf` | export รายงาน |

#### Interventions

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/interventions` | ✅ | `intervention.view_all` หรือ `intervention.view_assigned_only` | รายการ intervention |
| POST | `/api/interventions` | ✅ | `intervention.create` | บันทึก intervention |
| GET | `/api/interventions/[id]` | ✅ | — | ดู intervention 1 รายการ |

#### Settings & Import

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/settings` | ✅ | `settings.view` | ดู settings (รวมชื่อโรงเรียน, โลโก้, thresholds) |
| PATCH | `/api/settings` | ✅ | `settings.edit` | แก้ไข settings (ชื่อโรงเรียน, คะแนน, ปีการศึกษา) |
| POST | `/api/settings/logo` | ✅ | `settings.edit` | อัปโหลดโลโก้โรงเรียน — เก็บใน Supabase Storage หรือ Google Drive URL |
| POST | `/api/import/students` | ✅ | `import.execute` | CSV import นักเรียน |
| POST | `/api/import/teachers` | ✅ | `import.execute` | CSV import ครู |
| POST | `/api/import/annual` | ✅ | `import.execute` | Annual classroom import |
| GET | `/api/audit-logs` | ✅ | `audit_log.view` | ดู audit log |
| GET | `/api/action-logs` | ✅ | `action_log.view` | ดู action log |
| GET | `/api/notifications` | ✅ | `notification.view` | รายการแจ้งเตือน |

**Error Response Format:**

```typescript
type ErrorResponse = {
  code: string;      // e.g. 'UNAUTHORIZED', 'VALIDATION_ERROR', 'NOT_FOUND'
  message: string;   // ข้อความ error (i18n)
  details?: Record<string, string[]>;  // field-level errors (validation)
};
```

## 6. Reports — ทุกประเภทที่ต้องสร้าง

### 6.1 รายงานรายบุคคล (Individual Report)

- ประวัติคะแนนทั้งปีต่อนักเรียน 1 คน

- Score timeline chart (recharts line chart)

- ตารางรายการทุกรายการที่เพิ่ม/ตัดคะแนน

- ระดับความประพฤติปัจจุบัน + badge

- ช่องลายเซ็น: นักเรียน / ผู้ปกครอง / ครูประจำชั้น

- Export PDF ด้วย @media print CSS หรือ react-pdf

### 6.2 รายงานรายห้อง (Class Report)

- ตารางคะแนนนักเรียนทุกคนในห้อง เรียงน้อย → มาก

- แสดง: ชื่อ, เลขที่, คะแนนปัจจุบัน, ระดับ, จำนวนครั้งถูกตัด/เพิ่ม

- Summary bar: กราฟแจกแจงระดับความประพฤติในห้อง

- Print-ready layout

### 6.3 รายงานประจำเดือน (Monthly Report)

- เลือก: เดือน / ปีการศึกษา / ห้อง หรือ ทั้งโรงเรียน

- สรุปการตัด/เพิ่มคะแนนในช่วงนั้น

- Top 5 ความผิดที่พบบ่อยที่สุด

- นักเรียนที่คะแนนเปลี่ยนแปลงมากที่สุด (ดีขึ้น/แย่ลง)

- บันทึก snapshot ลง monthly_reports table

### 6.4 รายงานนักเรียนเสี่ยง (At-Risk Report)

- รายชื่อนักเรียนที่คะแนนต่ำกว่า 70 (configurable)

- แสดงแนวโน้ม: ลูกศรขึ้น/ลง เทียบเดือนก่อน

- ฟิลเตอร์ตามห้อง / ระดับชั้น

- Export Excel หรือ PDF

### 6.5 รายงานสถิติโรงเรียน (School Statistics)

- กราฟการกระจายคะแนน (histogram)

- ความผิดที่พบบ่อยที่สุด (bar chart)

- ห้องที่มีค่าเฉลี่ยคะแนนต่ำที่สุด

- เปรียบเทียบเดือนต่อเดือน (line chart)

### 6.6 หนังสือทัณฑ์บน (Bond Document)

- Generate เอกสารทัณฑ์บนอัตโนมัติเมื่อนักเรียนถึง threshold

- แสดงรายการความผิดที่ส่งผลให้ถึงจุดนี้

- ช่องลายเซ็น: นักเรียน / ผู้ปกครอง / ครูประจำชั้น / ผู้บริหาร

- Print button → ปริ้นทันที

- มีเลขที่เอกสาร, วันที่ออกเอกสาร, ผู้สร้าง, ผู้อนุมัติ, สถานะเอกสาร และจำนวนครั้งที่พิมพ์

- สถานะเอกสาร: draft, generated, signed, cancelled

> *เอกสารทัณฑ์บนควรล็อก — admin เท่านั้นที่ generate ได้ เพื่อป้องกันการ generate
> เองโดยไม่มีการอนุมัติ*

## 7. ระบบแจ้งเตือน & การสื่อสาร

### 7.1 In-app Notifications

- ครูประจำชั้นได้รับ notification เมื่อนักเรียนในห้องถูกตัดคะแนนโดยครูคนอื่น

- Admin ได้รับ notification เมื่อมี transaction รอ approval

- Badge count บน bell icon ใน navbar

- ใช้ Supabase Realtime subscriptions

- เก็บประวัติ notification ลงตาราง notifications เพื่อให้ผู้ใช้ดูย้อนหลังได้

- Notification ต้องมีสถานะ read/unread ผ่าน read_at

- ประเภท notification เริ่มต้น: score_recorded, pending_approval, threshold_reached, report_ready

### 7.2 Line Notify (Optional)

- ส่ง Line message ไปหาผู้ปกครองเมื่อคะแนนถึง threshold

- Message template: 'นักเรียน \[ชื่อ\] คะแนนความประพฤติเหลือ \[X\] คะแนน
  กรุณาติดต่อครูประจำชั้น'

- เพิ่ม LINE_NOTIFY_TOKEN ใน settings และ .env

- API call ผ่าน Next.js server action

### 7.3 Email Summary (Optional)

- ส่งอีเมลสรุปคะแนนประจำสัปดาห์ให้ครูประจำชั้น

- ใช้ Resend หรือ Supabase Edge Functions + SendGrid

- Email provider แนะนำให้ใช้ Resend เป็นค่าเริ่มต้นสำหรับ password reset,
  notification สำคัญ, และ email summary เท่านั้น เพื่อลดค่าใช้จ่าย

- ไม่ใช้ email 2FA ในระบบเริ่มต้น

## 8. Features เพิ่มเติมที่ควรมี

### 8.1 Audit Log

- บันทึกทุก action ใน audit_logs: สร้าง/แก้ไข/ลบคะแนน, import CSV, เปลี่ยน
  setting

- Admin ดู audit log ได้ผ่าน settings → audit log page

- แสดง: วันเวลา, ผู้ทำ, action, เป้าหมาย, ข้อมูลเดิม vs ใหม่ (metadata jsonb)

- audit_logs ใช้สำหรับเหตุการณ์ที่เปลี่ยนข้อมูลสำคัญ เช่น create/update/delete/void/approve/reject/import/export/annual_import/settings

- ต้องบันทึก before_data และ after_data เมื่อมีการแก้ไขข้อมูล

- ต้องบันทึก actor_id, target_type, target_id, ip_address, user_agent, metadata, created_at

- ห้ามแก้ไขหรือลบ audit_logs ผ่าน UI ปกติ

### 8.1.1 Action Log

- action_logs ใช้สำหรับเหตุการณ์การใช้งานที่ไม่จำเป็นต้องเปลี่ยนข้อมูล เช่น login_success, login_failed, logout, view_student, view_report, export_pdf, export_csv

- ต้องบันทึก login failed และ rate-limit events เพื่อช่วยตรวจสอบ brute-force/credential stuffing

- การดูข้อมูลส่วนบุคคลที่สำคัญ เช่น student detail, guardian contact, bond document, และ export ต้องมี action log

- Admin ดู action logs ได้จากหน้า settings → audit log โดยแยก tab Audit Logs / Action Logs

### 8.1.2 PDPA & Consent — บังคับยอมรับครั้งแรกก่อนเข้าใช้งาน

- **ผู้ใช้ทุกคนต้องยอมรับ PDPA Privacy Notice ก่อนเข้าใช้งานระบบครั้งแรก**
- เมื่อ login สำเร็จ → ตรวจสอบ pdpa_consents → ถ้ายังไม่ยอมรับ version ล่าสุด → **redirect ไปหน้า /pdpa-consent ทันที**
- เป็นหน้า full-page consent ไม่ใช่ banner หรือ popup
- ถ้าผู้ใช้กด **"ยอมรับ"** → บันทึก consent + เข้า dashboard ได้
- ถ้าผู้ใช้กด **"ปฏิเสธ"** → logout + ขึ้นข้อความ "ไม่สามารถใช้งานระบบได้หากไม่ยอมรับนโยบายความเป็นส่วนตัว กรุณาติดต่อผู้ดูแลระบบ"
- เมื่อ admin เผยแพร่ PDPA version ใหม่ → ผู้ใช้ทุกคนต้องยอมรับซ้ำก่อนเข้าใช้งานครั้งถัดไป
- เก็บประวัติ consent ทุกครั้ง: version, accepted_at, accepted_by, ip_address, user_agent
- Admin ดูสถานะ consent ของผู้ใช้ทุกคนได้ (dashboard สรุป % ที่ยอมรับ/ยังไม่ยอมรับ)
- Admin export รายงาน compliance ได้

#### Consent Flow Diagram

```
┌──────────────────────────────────────────────────────┐
│                    LOGIN                              │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │  ตรวจสอบ PDPA         │
           │  - accepted version?   │
           │  - latest version?     │
           │  - revoked?            │
           └─────────┬─────────────┘
                     │
           ┌─────────┴──────────┐
           ▼                    ▼
    [ยังไม่ยอมรับ /          [ยอมรับแล้ว]
     version ไม่ตรง /         │
     ถูก revoke]              │
           │                  ▼
           ▼            เข้า Dashboard
    ┌──────────────────────┐
    │  /pdpa-consent       │
    │  Full page consent   │
    │                      │
    │  [✅] ยอมรับ          │──→ บันทึก consent → Dashboard
    │  [❌] ปฏิเสธ          │──→ Logout + แจ้งเตือน
    └──────────────────────┘
```

#### Routes

| Route | Description |
|-------|-------------|
| `app/(auth)/pdpa-consent/page.tsx` | Full page ยอมรับ PDPA — middleware guard |
| `app/(auth)/pdpa-rejected/page.tsx` | แจ้งว่าไม่สามารถเข้าใช้ได้หากไม่ยอมรับ |

#### Middleware Logic

```typescript
// middleware.ts — ตรวจสอบ PDPA consent ทุก request
// 1. ถ้าไม่ได้ login → redirect /login
// 2. ถ้า login แล้ว:
//    a. ถ้า route == /pdpa-consent หรือ /pdpa-rejected → allow
//    b. ถ้ายังไม่ยอมรับ version ล่าสุด → redirect /pdpa-consent
//    c. ถ้าเคยปฏิเสธ (revoked_at != null) → redirect /pdpa-rejected
//    d. ถ้ายอมรับแล้ว → allow
```

#### ข้อกำหนดเพิ่มเติม

- ต้องมี PDPA notice version management — admin สามารถสร้าง version ใหม่ได้
- เมื่อ version เปลี่ยน → ผู้ใช้ทุกคนต้องยอมรับใหม่
- เก็บประวัติการยอมรับทั้งหมด ไม่ใช่แค่ล่าสุด
- มีการลงนามอิเล็กทรอนิกส์อย่างง่าย (accept button + timestamp + IP + user-agent)
- รองรับการขอถอน consent (revoke) โดยผู้ใช้ — เมื่อ revoke แล้วจะเข้าระบบไม่ได้
- Admin มีสิทธิ์เปิดให้ผู้ใช้ที่ revoke แล้วสามารถเข้าถึงข้อมูลขั้นพื้นฐานได้ (กรณีกฎหมายบังคับ)

#### PDPA Compliance — Rights Management

| สิทธิ (PDPA) | Method | Endpoint | Description |
|-------------|--------|----------|-------------|
| **Right to Access** | GET | `/api/pdpa/data/[subject_id]` | export ข้อมูลของตนเองทั้งหมด |
| **Right to Rectify** | PATCH | `/api/students/[id]` | แก้ไขข้อมูลส่วนตัว + audit log |
| **Right to Erasure** | POST | `/api/pdpa/delete-request` | ขอให้ลบข้อมูล — admin review |
| **Right to Restrict** | POST | `/api/pdpa/restrict` | จำกัดการประมวลผล |
| **Data Portability** | GET | `/api/pdpa/export` | export JSON/CSV ข้อมูลทั้งหมด |
| **Right to Object** | POST | `/api/pdpa/object` | คัดค้านการประมวลผล |

**Data Portability Flow:**
1. ผู้ใช้ขอ export ข้อมูล → สร้าง task ใน background
2. ระบบรวบรวมข้อมูล: profile, enrollment, score history, interventions
3. Export เป็น JSON/CSV → signed URL (หมดอายุ 24 ชม.)
4. ส่งลิงก์ให้ผู้ใช้ทาง notification / email
5. บันทึก action_log ทุกครั้ง

**Right to Erasure (Right to be Forgotten):**
1. ผู้ใช้ยื่นคำร้องขอให้ลบข้อมูล
2. Admin ตรวจสอบ — ระบบทำ **anonymize** (ไม่ hard delete):
   - เปลี่ยนชื่อเป็น "[ลบแล้ว]"
   - ลบเบอร์โทร, email, ที่อยู่
   - เก็บประวัติคะแนนเป็น anonymous record (ไม่ link กับ user)
   - เก็บ audit log ว่า "ถูกลบตาม PDPA request"
3. กรณีกฎหมายให้เก็บ (เช่น การศึกษา) → ต้องเก็บตาม retention period
4. บันทึก action_log + ส่ง notification ยืนยันการลบ

#### Component/Page Design

```typescript
<PdpaConsentPage>
  ├── Header: "นโยบายความเป็นส่วนตัว (Privacy Notice)"
  ├── VersionBadge: "เวอร์ชัน 2.0 — มีผล 8 พ.ค. 2569"
  ├── NoticeContent:
  │   ├── วัตถุประสงค์การเก็บข้อมูล
  │   ├── ข้อมูลที่เก็บรวบรวม
  │   ├── ฐานกฎหมายในการประมวลผล
  │   ├── ระยะเวลาเก็บรักษา
  │   ├── ผู้ประมวลผลข้อมูล (third-party)
  │   ├── สิทธิของเจ้าของข้อมูล
  │   └── ช่องทางติดต่อเจ้าหน้าที่คุ้มครองข้อมูล
  ├── ConsentOptions:
  │   ├── checkbox: "ยอมรับนโยบายความเป็นส่วนตัว" (required)
  │   └── checkbox: "ยอมรับการแจ้งเตือนผ่าน LINE/Email" (optional)
  ├── Buttons:
  │   ├── "ยอมรับและเข้าใช้งาน" (primary — disabled จนกว่า check)
  │   └── "ปฏิเสธ" (secondary — logout + แจ้งเตือน)
  └── Footer: ลิงก์ "ติดต่อผู้ดูแลระบบ"
```

### 8.2 Score Approval Flow

- ครูบันทึกคะแนน → status = 'pending' ถ้าคะแนน \> threshold ใน settings

- Admin เห็น pending list → อนุมัติ / ปฏิเสธ

- ถ้าอนุมัติ → status = 'approved', approved_by, approved_at บันทึก

- คะแนนที่ยังเป็น pending ไม่นับใน score จริง

### 8.3 CSV Import

- Students annual import template: academic_year, student_id, class_number,
  full_name, education_stage, grade_level, classroom, status

- Guardians template: student_id, guardian_name, relation, phone, phone_alt,
  line_id, email, address, is_primary, can_receive_notifications,
  can_pickup_student

- Classroom grade data must include education_stage (`primary`/`secondary`) and
  grade_level (1-6), supporting ป.1-ป.6 and ม.1-ม.6.

- Teachers annual import template: academic_year, employee_id, full_name,
  department, email, classroom, assignment_role

- ทุกปีการศึกษาใช้ annual import เป็น flow หลักสำหรับจัดนักเรียนและครูเข้าห้อง เพราะนักเรียนอาจกระจายไปอยู่ห้องใหม่

- Import ต้องสร้าง/อัปเดต classrooms, students, student_enrollments, teachers, และ teacher_classrooms ของปีการศึกษานั้น

- ถ้า student_id เดิมถูก import ในปีใหม่ ให้ใช้ student record เดิมและสร้าง student_enrollments ใหม่ ไม่สร้าง student ซ้ำ

- ถ้า student_id ไม่มีใน import ปีใหม่ ให้ถือว่าไม่มี enrollment ปีใหม่ จนกว่า admin จะ import/เพิ่มด้วยตนเอง

- Annual import ต้องมี preview แสดง new students, existing students, missing from new year, repeated students, transferred/inactive candidates, classroom changes, และ error rows

- Download template ด้วย client-side Blob + \uFEFF BOM (สำหรับ Excel Thai)

- Preview table ก่อน import — highlight error rows สีแดง

- Batch upsert ผ่าน Supabase service role

- Export CSV/Excel สำหรับนักเรียน, ครู, ห้องเรียน, รายการคะแนน, และรายงานหลัก

- Export ต้องจำกัดสิทธิ์ตาม role และบันทึก audit log ทุกครั้ง

### 8.4 Monthly Report Snapshots

- รายงานประจำเดือนต้องบันทึก snapshot ลง monthly_reports เพื่อให้ตัวเลขย้อนหลังไม่เปลี่ยนเมื่อมีการแก้ข้อมูลภายหลัง

- Snapshot ต้องเก็บสรุปคะแนนเพิ่ม/ตัด, Top 5 categories, students changed most, conduct level distribution, และ metadata ของ filter ที่ใช้

- สถานะรายงาน: draft, finalized, cancelled

- เมื่อ finalized แล้ว การแก้ไขต้องสร้าง snapshot ใหม่หรือยกเลิกฉบับเดิม พร้อม audit log

### 8.5 Intervention & Contact Logs

- บันทึกประวัติการติดตามนักเรียนเมื่อคะแนนต่ำหรือถึง threshold

- ประเภทเริ่มต้น: phone_call, parent_meeting, warning, bond, home_visit, counseling, other

- บันทึกได้ว่า ติดต่อผู้ปกครองคนใด, ช่องทางใด, วันเวลา, สรุปการคุย, ผลลัพธ์, และนัดติดตามครั้งถัดไป

- ผูก intervention กับ score transaction หรือ bond document ได้เมื่อเกี่ยวข้อง

- ครูที่ได้รับมอบหมายห้องและ Admin สามารถบันทึก intervention ได้

### 8.6 Score Rules & Default Categories

- คะแนนตั้งต้น 100 ต่อปีการศึกษา

- คะแนนต่ำสุดแสดงผลเป็น 0 โดย default แม้ transaction รวมจะต่ำกว่า 0

- คะแนนเพิ่มเกิน 100 ได้ โดย UI แสดงเป็น 100+ ตามค่า display_score_above_base_as

- หมวดคะแนนเริ่มต้นต้องแก้ไข/ปิดใช้งานได้โดย Admin

- หมวดที่มี requires_evidence = true ต้องแนบหลักฐานก่อนบันทึก

- หมวดที่มี requires_approval = true ต้องเข้า approval queue แม้คะแนนไม่เกิน threshold

### 8.7 Teacher-Classroom Assignment

- ครู 1 คนสามารถถูก assign ได้มากกว่า 1 ห้อง

- ห้องเรียน 1 ห้องสามารถมีครูได้มากกว่า 1 คน

- การ assign ห้องให้ครูต้องระบุ role ได้ เช่น homeroom, assistant, subject, discipline

- ครูสามารถ report/บันทึกพฤติกรรมนักเรียนได้ทุกคนในโรงเรียนที่มีสถานะ active

- ห้องที่ถูก assign ใช้สำหรับ dashboard scope, รายงานรายห้อง, notification, และการติดตาม intervention เป็นหลัก

- Admin จัดการ assignment ได้จากหน้า Teacher management หรือ Classroom detail

### 8.8 Student Status & Guardian Contacts

- นักเรียนมีสถานะหลัก: active, inactive, transferred, graduated, suspended

- สถานะหลักใช้สำหรับค้นหา กรองรายชื่อ รายงาน และป้องกันการบันทึกคะแนนให้นักเรียนที่ไม่ active

- Enrollment รายปีใช้เก็บห้อง, เลขที่, ปีการศึกษา, และสถานะรายปี เช่น promoted, repeated, transferred, graduated

- นักเรียน 1 คนสามารถมีผู้ปกครองได้มากกว่า 1 คน

- ต้องเก็บข้อมูลผู้ปกครองอย่างน้อย: ชื่อ, ความสัมพันธ์, เบอร์โทรหลัก

- รองรับข้อมูลเพิ่มเติม: เบอร์สำรอง, LINE ID, email, ที่อยู่

- ต้องระบุผู้ปกครองหลักได้ 1 คนต่อ 1 นักเรียนด้วย is_primary

- ผู้ปกครองแต่ละคนตั้งค่าได้ว่าจะรับ notification หรือมีสิทธิ์รับนักเรียนกลับบ้านหรือไม่

### 8.9 Score Trend

- แสดงลูกศรขึ้น/ลงข้างคะแนนแต่ละคน เทียบ 30 วันที่แล้ว

- Mini sparkline chart ใน student list

### 8.10 Evidence Upload

- แนบรูปภาพหลักฐานประกอบการ report/บันทึกพฤติกรรม ตัดคะแนน หรือเพิ่มคะแนนได้

- รองรับหลายรูปต่อ 1 score transaction ผ่านตาราง score_transaction_evidence

- Upload ไป Supabase Storage bucket 'evidence'

- จำกัดไฟล์เริ่มต้น: jpg, jpeg, png, webp — **ห้าม upload ไฟล์ .svg, .html, .exe, .pdf**

- ขนาดไฟล์สูงสุดเริ่มต้น **5 MB** ต่อรูป และสูงสุด **5 รูป** ต่อ transaction

- **Security:**
  - **Strip EXIF metadata** ก่อน save (地理位置, device info, camera info) — ใช้ `sharp` library
  - **Resize รูป**: resize ให้ width สูงสุด 1920px เพื่อลด storage + bandwidth
  - **Virus scan**: ใช้ Supabase Edge Function + ClamAV หรือ第三方 API
  - **Rename file**: เปลี่ยนชื่อไฟล์เป็น UUID-based (ป้องกัน path traversal + ข้อมูลซ้ำ)
  - **Rate limit upload**: สูงสุด 20 รูป/นาที/teacher — ป้องกัน spam
  - **File signature check**: ตรวจสอบ magic bytes ไม่ใช่แค่ extension (ป้องกันไฟล์ปลอม)

- Storage: Supabase Storage bucket 'evidence' — **private bucket** เท่านั้น

- รูปหลักฐานต้องไม่เป็น public URL ถาวร ให้ใช้ signed URL (หมดอายุใน 1 ชม.) หรือ server-side proxy

- ผู้ที่ดูรูปได้: Admin, ครูที่บันทึก, ครูที่ถูก assign ห้องของนักเรียน, และนักเรียนเจ้าของข้อมูลใน self-view ถ้า school.config.ts อนุญาต

- ถ้า score category มี requires_evidence = true ต้อง upload รูปอย่างน้อย 1 รูปก่อน submit

- การ upload/delete evidence ต้องบันทึก audit log

### 8.11 Score Correction & Void Flow

- ห้ามลบ score_transactions ที่ approved แล้วแบบถาวร

- การแก้ไขรายการที่อนุมัติแล้วต้องใช้การ void รายการเดิม พร้อมเหตุผล แล้วสร้างรายการใหม่ถ้าจำเป็น

- ครูสามารถขอยกเลิกรายการของตนเองได้ แต่ Admin ต้องอนุมัติการ void

- Admin สามารถ void รายการได้โดยตรง พร้อมระบุเหตุผล

- ทุกการ void, reject, approve, และ edit note ต้องถูกบันทึกใน audit_logs

### 8.12 Academic Year Reset & Annual Import

- Admin สามารถปิดปีการศึกษาเก่า และเปิดปีใหม่

- คะแนนเริ่มนับใหม่ตาม base_score ใหม่

- ประวัติปีเก่าดูได้ผ่านตัวกรอง 'ปีการศึกษา'

- เมื่อเปิดปีการศึกษาใหม่ ให้ใช้ Annual Classroom Import เป็น flow หลักในการจัดนักเรียนและครูเข้าห้อง

- เหตุผล: แต่ละปีนักเรียนอาจถูกกระจายไปห้องใหม่ ไม่ควรเลื่อนทั้งห้องแบบอัตโนมัติ

- Admin import รายชื่อนักเรียน/ครูตามห้องจริงของปีการศึกษาใหม่

- ระบบต้อง match นักเรียนด้วย student_id_number เพื่อเชื่อมประวัติเดิมกับ enrollment ปีใหม่

- รองรับระดับชั้นตั้งแต่ ป.1 ถึง ม.6 โดยใช้ education_stage + grade_level แยกช่วงประถมและมัธยม

- Import preview ต้องแสดงนักเรียนที่มีอยู่เดิม, นักเรียนใหม่, นักเรียนที่ไม่พบในปีใหม่, นักเรียนซ้ำชั้น, และนักเรียนที่ย้ายห้อง

- นักเรียนที่ไม่ถูก import ในปีใหม่จะไม่มี student_enrollments ของปีใหม่ แต่ประวัติปีเก่ายังค้นหาได้

- Admin สามารถ mark นักเรียนที่ไม่พบในปีใหม่เป็น transferred, inactive, หรือ graduated ได้

- Promotion helper เป็น optional เท่านั้น ใช้ช่วยคาดเดาชั้นถัดไปได้ แต่ไม่ใช่ source of truth

- หลังยืนยัน import ระบบสร้าง student_enrollments ของปีใหม่, อัปเดต classroom ปัจจุบันของนักเรียน, และเก็บประวัติปีเก่าไว้

- ต้องมี preview ก่อนยืนยัน แสดงห้องเดิม, ห้องใหม่, สถานะ, และรายการที่ต้องแก้ไข

- บันทึก annual_import ลง audit_logs

### 8.13 Bilingual UI (TH/EN) + Thai Font

- รองรับสองภาษาเต็มระบบ: **Thai (default)** และ **English**
- ทุก label, button, table header, empty state, validation error, notification, report title, และ printable document ต้องผ่าน next-intl
- ใช้ Sarabun เป็น font หลักสำหรับภาษาไทย โดยเฉพาะรายงานและเอกสารราชการ/โรงเรียน
- ใช้ Geist เป็น fallback สำหรับภาษาอังกฤษและตัวเลขใน UI
- มี locale switcher (TH/EN) ใน navbar และจำภาษาที่ผู้ใช้เลือกไว้
- ตั้งค่าภาษาเริ่มต้นได้ใน `school.config.ts` ที่ `defaults.language`
- message keys อยู่ใน `messages/th.json` และ `messages/en.json`

### 8.14 Privacy, Security & Data Retention

- SUPABASE_SERVICE_ROLE_KEY ใช้เฉพาะ server-side เท่านั้น ห้าม expose ไป client

- ปฏิบัติตาม PDPA โดยเก็บข้อมูลเท่าที่จำเป็นตามวัตถุประสงค์ของระบบคะแนนความประพฤติและการดูแลนักเรียน

- ต้องแสดง Privacy Notice/PDPA Notice ให้ผู้ใช้ที่เกี่ยวข้องรับทราบ และบันทึก consent ตาม version

- ทุก report/export ที่มีข้อมูลนักเรียนต้องตรวจ role และ scope ก่อนเสมอ

- Teacher เห็นเฉพาะนักเรียนในห้องที่ได้รับมอบหมาย

- Teacher สามารถ report/บันทึกพฤติกรรมนักเรียน active ได้ทุกคน แต่การดู dashboard/report รายห้องยังจำกัดตามห้องที่ได้รับมอบหมาย

- Student เห็นเฉพาะข้อมูลของตัวเอง

- Admin เท่านั้นที่เข้าถึง settings, import, audit logs, bond generation, และ export ทั้งโรงเรียน

- เก็บประวัติคะแนน, audit log, enrollment, และรายงานย้อนหลังอย่างน้อย 5 ปี หรือตามค่าที่ตั้งใน settings

- การลบข้อมูลสำคัญต้องเป็น soft delete หรือ status change พร้อม audit log

- เมื่อหมดระยะเวลาเก็บข้อมูล ต้องมี process archive/anonymize/delete ตาม policy ของโรงเรียน

- ข้อมูลส่วนบุคคลใน logs ต้องจำกัดเท่าที่จำเป็น หลีกเลี่ยงการเก็บ password, token, หรือข้อมูลลับใน metadata

### 8.15 PWA Support

- เพิ่ม manifest.json และ service worker

- ครูสามารถ install เป็น app บนมือถือ

- Offline fallback สำหรับ score record form (sync เมื่อมีเน็ต)

### 8.16 Edge Cases & Business Logic

| # | Edge Case | Solution |
|---|-----------|----------|
| 1 | **นักเรียนย้ายเข้ามากลางปีการศึกษา** | Admin สร้าง student → enroll ในห้องปัจจุบันของปีนั้น → คะแนนเริ่มต้นที่ base_score |
| 2 | **นักเรียนซ้ำชั้น** | enrollment ใหม่มี status = 'repeated' → ผูก previous_enrollment_id → คะแนนปีเก่าเก็บไว้ดูย้อนหลัง |
| 3 | **นักเรียนย้ายโรงเรียนออก** | mark current_status = 'transferred' + exit_date → ห้ามบันทึกคะแนนเพิ่ม |
| 4 | **การบันทึกคะแนนพร้อมกัน (race condition)** | ใช้ Supabase transaction + optimistic locking หรือ retry mechanism |
| 5 | **Concurrent login — หลาย session พร้อมกัน** | อนุญาตได้ ไม่จำกัด session ต่อ user |
| 6 | **Session timeout / auto-logout** | ตั้งค่า session expiry ใน Supabase Auth (default 1 ชม.) + warning alert ก่อน timeout |
| 7 | **วันหยุด / ปิดเทอม** | ไม่บังคับ แต่แสดง warning ถ้าบันทึกคะแนนนอกวันเรียน |
| 8 | **ลบ auth user — cascade หรือไม่?** | soft delete (is_active = false) → เก็บข้อมูลไว้ → admin purge ได้เมื่อพ้น retention period |
| 9 | **import CSV ซ้ำ — student_id_number เดิม** | match ด้วย student_id_number → upsert enrollment ใหม่ → ไม่สร้าง student ซ้ำ |
| 10 | **คะแนนติดลบเมื่อ transaction รวม < 0** | แสดง 0 ตาม score_floor setting แต่เก็บ transaction จริงในฐานข้อมูล |
| 11 | **PDF พิมพ์ฟอนต์ Sarabun ไม่ได้** | ใช้ next/font + embed font ใน CSS @media print หรือใช้ @react-pdf/renderer พร้อม font registration |
| 12 | **รูป evidence หาย / bucket ถูกลบ** | แสดง placeholder + log error + แจ้ง admin |
| 13 | **เลขที่เอกสารทัณฑ์บนซ้ำ** | ใช้ sequence หรือ UUID-based document_no + unique constraint |
| 14 | **ข้อมูล guardian ซ้ำ (นักเรียน siblings)** | guardian 1 คนผูกกับหลาย student_id ใน student_guardians ได้ |
| 15 | **ไม่มีโลโก้โรงเรียน** | แสดงตัวอักษรย่อโรงเรียน (เช่น "ร.ร." หรือ initials) แทน |

### 8.17 School Branding — ชื่อโรงเรียนและโลโก้

ระบบต้องแสดงชื่อโรงเรียนและโลโก้ในตำแหน่งต่าง ๆ ทั่วทั้งระบบ และให้ Admin สามารถจัดการได้เอง

#### 8.17.1 ตำแหน่งที่แสดง Branding

| ตำแหน่ง | สิ่งที่แสดง | รายละเอียด |
|---------|-----------|-----------|
| **หน้า Login** | โลโก้ + ชื่อโรงเรียน | แสดงตรงกลางบน เหนือฟอร์ม |
| **Sidebar (ซ้าย)** | โลโก้เล็ก + ชื่อโรงเรียน | หัว sidebar ติดตายตลอด |
| **Navbar (บน)** | ชื่อโรงเรียน (ข้อความ) | มุมซ้ายบน ถ้า sidebar ถูก collapse |
| **รายงานทุกประเภท** | โลโก้ + ชื่อโรงเรียน + ที่อยู่ | หัวรายงานตอนพิมพ์ |
| **หน้า PDPA Consent** | โลโก้ + ชื่อโรงเรียน | แสดงให้รู้ว่าเป็นของโรงเรียนไหน |
| **หน้า Forgot Password** | โลโก้ | คงความต่อเนื่องของแบรนด์ |
| **Email ที่ส่งออก** | ชื่อโรงเรียน + โลโก้ (optional) | Footer ของ email |

#### 8.17.2 การตั้งค่า

- Admin จัดการที่หน้า **Settings → ข้อมูลโรงเรียน**
- ฟอร์ม:
  - ชื่อโรงเรียน (ภาษาไทย) * — ข้อความ
  - ชื่อโรงเรียน (ภาษาอังกฤษ) — ข้อความ
  - โลโก้โรงเรียน — ปุ่มอัปโหลดรูป / แสดงรูปปัจจุบัน / ปุ่มลบ
  - ที่อยู่โรงเรียน — ข้อความ (สำหรับรายงาน)
  - เบอร์โทรโรงเรียน — ข้อความ

#### 8.17.3 การอัปโหลดโลโก้

- รองรับไฟล์: `jpg`, `jpeg`, `png`, `webp`
- ขนาดสูงสุด: **2 MB**
- อัปโหลดไปที่: **Supabase Storage** (bucket `school-branding`) หรือ **Google Drive** แล้วเก็บ URL
- หลังจากอัปโหลด → เก็บ URL ใน `settings` ที่ key `school_logo_url`
- เมื่อเปลี่ยนแปลง → แสดงผลทั่วทั้งระบบทันที (ไม่ต้องรีเฟรช)
- ถ้าไม่มีโลโก้ → แสดงตัวอักษรย่อชื่อโรงเรียน

```typescript
// ตัวอย่าง: อัปโหลดโลโก้
async function uploadSchoolLogo(file: File): Promise<string> {
  // 1. validate file type + size
  // 2. upload ไป Supabase Storage bucket 'school-branding'
  // 3. รับ public URL หรือสร้าง signed URL
  // 4. บันทึกลง settings: school_logo_url
  // 5. return URL
}

// ตัวอย่าง: อ่านค่า branding
const schoolName = await getSetting('school_name');       // "โรงเรียนตัวอย่าง"
const schoolLogo = await getSetting('school_logo_url');   // "https://xxx.supabase.co/..."
```

#### 8.17.4 API Endpoints

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/api/settings/logo` | ✅ | `settings.edit` | อัปโหลดโลโก้โรงเรียน (multipart/form-data) |
| DELETE | `/api/settings/logo` | ✅ | `settings.edit` | ลบโลโก้โรงเรียน (รีเซ็ตเป็นค่าว่าง) |

#### 8.17.5 Fallback เมื่อไม่มีโลโก้

```typescript
function getSchoolInitials(name: string): string {
  // "โรงเรียนตัวอย่าง" → "ร.ร."
  // "Example School" → "ES"
  // "วัดสุทธิวราราม" → "ว."
  return initials;
}
```

- ใช้ตัวอักษรย่อของชื่อโรงเรียน
- แสดงในวงกลมหรือสี่เหลี่ยมที่มีสีประจำโรงเรียน (default: #2563EB)
- ขนาดเท่ากับโลโก้จริง

### 8.18 Error Handling & Loading States

#### 8.18.1 Error Boundary Strategy

- Global error boundary ที่ `app/error.tsx` — รองรับ fallback UI
- Route-level error boundary สำหรับแต่ละ section
- API error handling ใน server actions — return structured error object เสมอ

```typescript
// รูปแบบ error response ใน server actions
type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;      // e.g. 'UNAUTHORIZED', 'VALIDATION_ERROR', 'DUPLICATE_ENTRY'
    message: string;   // ข้อความ error ที่ translate แล้ว
    details?: any;     // ข้อมูลเพิ่มเติม (optional)
  };
};
```

#### 8.18.2 Loading States

- ใช้ Suspense + loading.tsx ทุก route group
- Skeleton components สำหรับ:
  - Tables (SkeletonTable — 5 แถว)
  - Charts (SkeletonChart — รูป placeholder)
  - Cards (SkeletonCard)
  - Form (SkeletonForm)
- ใช้ `useTransition` สำหรับ form submission เพื่อป้องกัน double submit

#### 8.18.3 Empty States

ทุกตารางและรายการต้องมี empty state:

| Component | Empty State |
|-----------|-------------|
| `<TransactionTable />` | "ยังไม่มีประวัติการบันทึกคะแนน" + icon |
| `<StudentList />` | "ไม่พบนักเรียนตามเงื่อนไขที่ค้นหา" + ล้าง filter |
| `<ReportView />` | "ไม่มีข้อมูลสำหรับช่วงเวลาที่เลือก" |
| `<NotificationList />` | "ไม่มีการแจ้งเตือน" |
| `<InterventionLogList />` | "ยังไม่มีการบันทึกการติดต่อ" |
| `<Chart />` | "ไม่มีข้อมูลเพียงพอสำหรับแสดงกราฟ" |

#### 8.18.4 Network Error Handling

- Retry logic สำหรับ API calls (3 ครั้ง exponential backoff)
- Offline detection — แสดง banner "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์"
- Form auto-save draft ใน localStorage (สำหรับ score record form)
- Toast notification สำหรับ success/error ทุก action (ใช้ sonner)

#### 8.18.5 Form Validation

- Client-side validation: react-hook-form + zod
- Server-side validation ยืนยันอีกครั้งทุกครั้ง
- Error message เป็นภาษาไทยทุกรายการ
- Field-level error + form-level error
- Disable submit button ขณะกำลังส่ง

### 8.19 API Security & Authentication

#### 8.19.1 API Authentication Method

```
ทุก request → ตรวจสอบ JWT Bearer token
   ↓
verify token กับ Supabase Auth
   ↓
check profile.is_active
   ↓
check permission (permissions table)
   ↓
rate limit check
   ↓
log action (ถ้าเป็น action ที่ต้อง log)
   ↓
execute
```

```typescript
// middleware.ts สำหรับ /api/*
// 1. อ่าน Authorization: Bearer <token> จาก header
// 2. ตรวจสอบ JWT กับ Supabase Auth (jwt.verify)
// 3. ถ้า token หมดอายุ → reject 401
// 4. ถ้า token ถูกต้อง → get profile → check is_active
// 5. check permission (role_permissions / profile_permission_overrides)
// 6. check rate limit
// 7. ถ้าผ่าน → ไปต่อ
// 8. ถ้าไม่ผ่าน → return 403 / 429
```

#### 8.19.2 Security Headers

```typescript
// next.config.js — security headers
const securityHeaders = [
  // ป้องกัน XSS
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // ป้องกัน clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // ป้องกัน MIME sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // HTTPS only
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // Referrer policy
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Permissions policy
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Need for Next.js
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://*.vercel.app",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];
```

#### 8.19.3 API Key Management

| Key | เก็บที่ | Access | Rotation |
|-----|--------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Client-side | เมื่อเปลี่ยน project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Client-side | เมื่อเปลี่ยน project |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | **Server-only** | 90 วัน |
| `LINE_NOTIFY_TOKEN` | `.env.local` | Server-only | เมื่อถูก revoke |
| `RESEND_API_KEY` | `.env.local` | Server-only | 90 วัน |

**กฎ:**
- `SUPABASE_SERVICE_ROLE_KEY` ห้ามใช้ใน client component — **ใช้เฉพาะ server actions / API routes**
- ทุก key ต้องมี rotation plan
- ไม่ hardcode keys ใน code
- ไม่ expose keys ใน error messages

#### 8.19.4 Data Sanitization

| จุดเสี่ยง | วิธีป้องกัน |
|----------|------------|
| **XSS** ใน `note`, `full_name` field | dangerouslySetInnerHTML ❌ → use textContent ✅ |
| **XSS** ใน reports / PDF | sanitize output ก่อน render |
| **SQL injection** | Supabase client ปลอดภัย (parameterized query) |
| **CSV injection** | sanitize cell ที่ขึ้นต้นด้วย `=`, `+`, `-`, `@` |
| **Path traversal** in file upload | ใช้ UUID-based filename → ไม่ใช้ user input |
| **HTML injection** in notifications | strip HTML tags |

### 8.20 Data Validation Rules & Error Codes

#### 8.20.1 Field Validation Rules

| Field | Type | Validation | Error Message |
|-------|------|------------|---------------|
| `student_id_number` | string | 10 digits (format: `XXXXXXXXXX`) | "รหัสนักเรียนต้องเป็นตัวเลข 10 หลัก" |
| `full_name` | string | 2-100 chars, Thai/English + spaces | "ชื่อต้องมีความยาว 2-100 ตัวอักษร" |
| `phone` | string | format: `08x-xxxxxxx` หรือ `0xx-xxxxxxx` | "เบอร์โทรศัพท์ไม่ถูกต้อง" |
| `email` | string | valid email format (RFC 5322) | "รูปแบบอีเมลไม่ถูกต้อง" |
| `points` | integer | 1-999 (deduct เป็นลบ, add เป็นบวก) | "คะแนนต้องอยู่ระหว่าง 1-999" |
| `note` | string | max 500 chars | "หมายเหตุต้องไม่เกิน 500 ตัวอักษร" |
| `class_number` | integer | 1-50 | "เลขที่ต้องอยู่ระหว่าง 1-50" |
| `grade_level` | integer | 1-6 | "ชั้นปีต้องอยู่ระหว่าง 1-6" |
| `line_id` | string | max 50 chars | — |
| `file` | file | max 5MB, types: jpg/jpeg/png/webp | "ไฟล์ต้องมีขนาดไม่เกิน 5MB และเป็นรูปภาพเท่านั้น" |

#### 8.20.2 Error Code Reference

| HTTP Status | Error Code | ความหมาย | เมื่อไหร่ |
|-------------|------------|---------|----------|
| **400** | `BAD_REQUEST` | request ไม่ถูกต้อง | validation error, missing field |
| **401** | `UNAUTHORIZED` | ไม่ได้ login | token หาย หรือหมดอายุ |
| **403** | `FORBIDDEN` | ไม่มีสิทธิ์ | permission check ไม่ผ่าน |
| **404** | `NOT_FOUND` | ไม่พบข้อมูล | student/classroom/transaction id ไม่มี |
| **409** | `CONFLICT` | ข้อมูลซ้ำ | student_id_number ซ้ำ, enrollment ซ้ำ |
| **422** | `VALIDATION_ERROR` | ข้อมูลไม่ผ่าน validation | field format ไม่ถูกต้อง |
| **429** | `RATE_LIMITED` | request เกิน limit | rate limit exceeded |
| **500** | `INTERNAL_ERROR` | ระบบผิดพลาด | server error (ไม่ expose details) |
| **503** | `SERVICE_UNAVAILABLE` | ระบบไม่พร้อม | database down, maintenance |

```typescript
// ตัวอย่าง response
// Success:
{ "success": true, "data": { "id": "uuid", "name": "..." } }

// Error:
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "ข้อมูลไม่ถูกต้อง",
    "details": {
      "phone": ["เบอร์โทรศัพท์ไม่ถูกต้อง"],
      "email": ["รูปแบบอีเมลไม่ถูกต้อง"]
    }
  }
}

// Rate limited:
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "ขออภัย คุณทำรายการบ่อยเกินไป กรุณารอ 15 นาที"
  },
  "retryAfter": 900
}
```

## 9. Key Components ที่ต้องสร้าง

|                         |                                          |
|-------------------------|------------------------------------------|
| **Component**           | **Description**                          |
| \<ScoreBadge /\>        | Badge สีตามระดับ ดีมาก/ดี/พอใช้/ต้องปรับปรุง     |
| \<ScoreTimeline /\>     | Recharts line chart คะแนนตามเวลา         |
| \<TransactionTable /\>  | Sortable/filterable ตารางประวัติคะแนน      |
| \<AlertBanner /\>       | Warning เมื่อนักเรียนถึง threshold            |
| \<CsvImportDialog /\>   | Upload → preview → confirm 3-step dialog |
| \<MonthlyReportView /\> | Print-ready report layout                |
| \<BondDocument /\>      | หนังสือทัณฑ์บน printable layout              |
| \<ScoreRecordForm /\>   | Form ตัด/เพิ่มคะแนน + student search        |
| \<EvidenceUploader /\> | Upload รูปหลักฐานหลายรูปใน score report flow |
| \<EvidenceGallery /\> | แสดงรูปหลักฐานใน transaction detail/report |
| \<ApprovalQueue /\>     | รายการรอ approve (admin only)            |
| \<AuditLogTable /\>     | ตาราง audit log กรองได้                   |
| \<ActionLogTable /\> | ตาราง action log สำหรับ login/view/export events |
| \<PdpaConsentBanner /\> | แสดง PDPA notice และบันทึก consent ตาม version |
| \<PdpaConsentStatus /\> | แสดงสถานะ consent ของนักเรียน/ผู้ปกครอง/ครู |
| \<TrendArrow /\>        | ลูกศรขึ้น/ลง/คงที่ตาม score trend             |
| \<NotificationBell /\>  | Bell icon + count badge + dropdown list  |
| \<NotificationList /\> | รายการแจ้งเตือน read/unread ย้อนหลัง |
| \<AnnualClassroomImportWizard /\> | ตัวช่วยนำเข้านักเรียน/ครูตามห้องจริงของปีการศึกษาใหม่ |
| \<StudentStatusBadge /\> | แสดงสถานะ active/inactive/transferred/graduated/suspended |
| \<GuardianContactPanel /\> | แสดงและแก้ไขผู้ปกครองหลายคนต่อหนึ่งนักเรียน |
| \<ScoreVoidDialog /\> | ยกเลิกรายการคะแนนพร้อมเหตุผลและ audit log |
| \<BondDocumentStatus /\> | แสดงสถานะเอกสารทัณฑ์บนและจำนวนครั้งที่พิมพ์ |
| \<ExportMenu /\> | Export CSV/Excel/PDF ตามสิทธิ์ของผู้ใช้ |
| \<InterventionLogForm /\> | บันทึกการติดต่อ/ติดตามนักเรียนและผู้ปกครอง |
| \<MonthlyReportSnapshot /\> | แสดง monthly report snapshot ที่ finalized แล้ว |
| \<PermissionEditor /\> | ตาราง checklist สำหรับ admin จัดการสิทธิ์ตาม role/profile |
| \<PermissionGuard /\> | Wrapper component ซ่อน/แสดง UI ตาม permission |
| \<PdpaConsentPage /\> | Full page ยอมรับ PDPA — ครั้งแรก/login ครั้งถัดไปเมื่อ version เปลี่ยน |
| \<PdpaRejectedPage /\> | แสดงข้อความเมื่อผู้ใช้ปฏิเสธ PDPA — ติดต่อ admin |
| \<SkeletonTable /\> | Loading skeleton สำหรับตาราง |
| \<SkeletonChart /\> | Loading skeleton สำหรับกราฟ |
| \<EmptyState /\> | Empty state component รองรับ icon + ข้อความ + action |
| \<ErrorBoundary /\> | Error boundary wrapper สำหรับแต่ละ section |
| \<RetryButton /\> | ปุ่มลองใหม่เมื่อ network error |

## 10. Bilingual UI & i18n Setup (next-intl)

### 10.1 i18n Configuration

- Default locale: `th` (ตั้งค่าเริ่มต้นได้ใน `school.config.ts`)
- Supported locales: `th`, `en`
- All user-facing UI and report text must use message keys, not hardcoded strings
- Message files: `messages/th.json` และ `messages/en.json`
- Locale switcher (TH/EN) ใน navbar — จำภาษาที่ผู้ใช้เลือกไว้

### 10.2 Font Setup

```typescript
// app/layout.tsx
import { Sarabun, Geist } from 'next/font/google';

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-sarabun',
});

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});
```

> ใช้ Sarabun สำหรับภาษาไทย (UI, reports, documents)
> ใช้ Geist เป็น fallback สำหรับภาษาอังกฤษและตัวเลข

### 10.3 messages/th.json (excerpt)

```json
{
  "nav": {
    "dashboard": "แดชบอร์ด",
    "students": "นักเรียน",
    "reports": "รายงาน",
    "settings": "การตั้งค่า"
  },
  "score": {
    "deduct": "ตัดคะแนน",
    "add": "เพิ่มคะแนน",
    "current": "คะแนนปัจจุบัน",
    "history": "ประวัติคะแนน"
  },
  "level": {
    "excellent": "ดีมาก",
    "good": "ดี",
    "fair": "พอใช้",
    "poor": "ต้องปรับปรุง"
  },
  "report": {
    "monthly": "รายงานประจำเดือน",
    "atRisk": "นักเรียนเสี่ยง",
    "bond": "หนังสือทัณฑ์บน"
  }
}
```

## 11. Hosting & Free Tier Limits

ระบบออกแบบให้ทำงานบน **Vercel Hobby (ฟรี) + Supabase Free Tier** โดยมีข้อจำกัดดังนี้:

### 11.1 Vercel Free Tier (Hobby)

| Resource | Limit | หมายเหตุ |
|----------|-------|----------|
| **Serverless Functions (API calls)** | 100 requests/วัน | ~พอสำหรับโรงเรียน 30 ครู |
| **Function Timeout** | 10 วิ (Hobby) / 30 วิ (Pro) | ต้อง optimize CSV import, PDF generation |
| **Bandwidth** | 100 GB/เดือน | เพียงพอ |
| **Concurrent Builds** | 1 | — |
| **Custom Domain** | 1 โดเมน | — |
| **Team Members** | 1 | — |

> 💡 **ถ้าเกิน 100 requests/วัน** → อัปเกรด Pro ($20/เดือน)
> หรือใช้วิธี: Frontend Vercel ฟรี + Backend API แยกไป Supabase Edge Functions (500K requests/เดือนฟรี)

### 11.2 Supabase Free Tier

| Resource | Limit | หมายเหตุ |
|----------|-------|----------|
| **Database** | 500 MB | เพียงพอสำหรับโรงเรียน 1,000+ คน |
| **Auth Users** | 50,000 | มากเกินพอ |
| **Edge Functions** | 500K requests/เดือน | ใช้เป็น backend API เสริมได้ |
| **Realtime** | 200 concurrent | เพียงพอ |
| **Storage** | 1 GB | สำหรับรูป evidence |
| **Storage Bandwidth** | 2 GB/เดือน | ดูรูป evidence |
| **Daily Backups** | ✅ PITR 30 วัน (มี) | — |
| **Email (Auth)** | 4 emails/ชม. | password reset |
| **Projects** | 2 projects | 1 dev + 1 prod |

> 🎯 **สรุป: Vercel Hobby + Supabase Free = ฟรี 100% เพียงพอสำหรับโรงเรียนขนาดกลาง**
> ถ้าข้อมูลเกิน → อัปเกรด Supabase Pro ($25/เดือน) ได้ 8GB DB + 100GB Storage

### 11.3 การใช้งานจริง — ประมาณการณ์

| การใช้งาน | API calls/วัน |
|-----------|--------------|
| ครู login + ดู dashboard (30 คน × 2 ครั้ง) | 60 |
| บันทึกคะแนน (20 ครั้ง) | 20 |
| ดูรายงาน (10 ครั้ง) | 10 |
| ดูนักเรียน + ประวัติ (15 ครั้ง) | 15 |
| **รวม/day** | **~105** |
| **รวม/month** | **~3,150** |

> ⚠️ **Vercel Hobby 100 วัน → เสี่ยงเกินถ้ามีครู 30+ คน**
>
> **ทางออก:** ใช้ Supabase Edge Functions สำหรับ API backend (500K/เดือนฟรี)
> ให้ Vercel รับแค่ serve UI อย่างเดียว — ไม่นับรวมใน 100 requests/วัน

### 11.4 Recommended Architecture (ประหยัด API calls)

```
┌─────────────────┐
│   Vercel        │  ← รับเฉพาะ serve UI + SSR
│   (Hobby)       │     ไม่นับรวม 100 requests
└────────┬────────┘
         │
         ▼ calls API
┌─────────────────┐
│ Supabase        │  ← API endpoints ใช้ Edge Functions
│ Edge Functions  │     500K requests/เดือน ฟรี
│ (Free Tier)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Supabase DB     │  ← Database + Auth + Storage
│ (PostgreSQL)    │     500MB ฟรี
└─────────────────┘
```

### 11.5 Cold Start Prevention & High Availability

#### Cold Start คืออะไร?

```
Vercel Serverless Functions:
❌ idle ~15-30 นาที → container ถูก reclaim
❌ request ถัดไป → ต้อง spin up ใหม่ (~50-200ms delay)
❌ ถ้า Hobby tier + ไม่มี traffic ทั้งคืน → ครูเช้ามาเจอ cold start ทุกคน
```

#### 11.5.1 วิธีป้องกัน Cold Start (Vercel)

| วิธี | ระดับ | รายละเอียด |
|-----|-------|------------|
| **ใช้ Edge Functions แทน** | ✅ ฟรี | Edge Runtime = ไม่มี cold start (`runtime: 'edge'`) |
| **ISR (Incremental Static Regeneration)** | ✅ ฟรี | หน้าสถิติ / รายงานที่ data ไม่เปลี่ยนบ่อย ใช้ static + revalidate |
| **Keep-alive cron job** | ✅ ฟรี | Vercel Cron → เรียก `/api/ping` ทุก 5 นาที (ตื่นไว้) |
| **Vercel Pro ($20/เดือน)** | 💰 จ่าย | reserved concurrency — ไม่มี cold start |

```typescript
// app/api/ping/route.ts — keep-alive endpoint
export async function GET() {
  return Response.json({ status: 'alive', timestamp: new Date().toISOString() });
}
```

#### 11.5.2 Cron Job: Keep Alive (Vercel Cron)

```json
// vercel.json
{
  "cron": [
    { "path": "/api/ping", "schedule": "*/5 * * * *" },
    { "path": "/api/supabase/ping", "schedule": "*/10 * * * *" }
  ]
}
```

> **หมายเหตุ:** Vercel Hobby รองรับ Cron jobs ฟรี แต่จำกัดที่ 2 jobs

#### 11.5.3 วิธีป้องกัน Cold Start (Supabase)

```typescript
// Supabase Edge Functions — ไม่มี cold start (Edge Runtime)
// Supabase DB — ไม่มี cold start (PostgreSQL ทำงานตลอด)
// Supabase Auth — ไม่มี cold start
```

| Component | Cold Start? | หมายเหตุ |
|-----------|-------------|----------|
| Supabase DB (PostgreSQL) | ❌ **ไม่มี** | รันตลอด 24/7 |
| Supabase Auth | ❌ **ไม่มี** | JWT verification ทันที |
| Supabase Storage | ❌ **ไม่มี** | S3-compatible |
| Supabase Edge Functions | ❌ **ไม่มี** | Deno Edge Runtime |
| Vercel Serverless Functions | ✅ **มี** | ~50-200ms หลัง idle |
| Vercel Edge Functions | ❌ **ไม่มี** | ใช้ Edge Runtime แทน |

**ข้อแนะนำ:** API calls ที่ sensitive ต่อ latency (login, score record) → ใช้ **Edge Runtime**

```typescript
// app/api/score/record/route.ts
export const runtime = 'edge'; // ← ไม่มี cold start
export async function POST(req: Request) { ... }
```

#### 11.5.4 Graceful Degradation (เมื่อ Vercel หรือ Supabase Down)

| สถานการณ์ | ผลกระทบ | วิธีรับมือ |
|-----------|---------|-----------|
| **Vercel Down** | ใช้งานไม่ได้ทั้งระบบ | แสดง static fallback page |
| **Supabase DB Down** | ข้อมูลใช้งานไม่ได้ | แสดง cached data + "ระบบกำลังปรับปรุง" |
| **Supabase Auth Down** | login ไม่ได้ | แสดง "กรุณาลองใหม่ภายหลัง" + offline mode |
| **Network Error (client)** | request ล้มเหลว | retry 3 ครั้ง + offline fallback |
| **Rate Limited (429)** | request ถูก block | retry-after header + toast แจ้งผู้ใช้ |

**Offline Fallback Strategy:**
- Score Record Form — save draft ใน localStorage
- เมื่อ network กลับมา → sync อัตโนมัติ
- แสดง badge "ออฟไลน์ — กำลังซิงก์เมื่อเชื่อมต่อ"
- ถ้า conflict → แจ้ง admin

**Cached Data Strategy (SWR/React Query):**
- student list: cache 5 นาที
- score history: cache 1 นาที
- dashboard stats: cache 10 นาที
- settings: cache 30 นาที (ไม่ค่อยเปลี่ยน)

### 11.6 Security Audit Checklist

ก่อน deploy จริง ต้องตรวจสอบ checklist นี้:

```
[ ] 🔐 Authentication
  [ ] Supabase RLS เปิดทุกตาราง
  [ ] RLS policies ทำงานถูกต้อง (test ด้วย anon key)
  [ ] Service Role Key ใช้เฉพาะ server-side
  [ ] Rate limiting ทำงาน (test 5 ครั้งติด)
  [ ] Password policy ใช้ได้จริง (min 8, max 128, special chars)
  [ ] must_change_password = true → redirect จริง

[ ] 🛡️ Authorization
  [ ] Permission check ทุก API endpoint
  [ ] UI ซ่อน/แสดงตาม permission (ไม่ใช่แค่ disabled)
  [ ] Admin เท่านั้นที่เข้าถึง settings/import/audit
  [ ] Teacher เห็นเฉพาะ scope ที่ได้รับ (check config)

[ ] 🌐 Network & Headers
  [ ] HTTPS (Vercel ให้มาโดย default) ✅
  [ ] Security headers ครบ (CSP, HSTS, X-Frame-Options)
  [ ] CORS จำกัดเฉพาะโดเมนตัวเอง
  [ ] API rate limit ทุก endpoint

[ ] 📁 File Upload
  [ ] File type check (magic bytes)
  [ ] EXIF metadata ถูก strip
  [ ] File size limit (5MB)
  [ ] Virus scan (ถ้ามี)
  [ ] UUID-based filename (ไม่ใช้ user input)

[ ] 🗄️ Database
  [ ] Indexes ครบทุก foreign key + status column
  [ ] Audit logs ทำงาน (create/update/delete/void)
  [ ] Action logs ทำงาน (login/view/export)
  [ ] PDPA consents ถูกบันทึก
  [ ] PITR backup ตั้งค่าแล้ว (Supabase)

[ ] 📝 PDPA Compliance
  [ ] Privacy Notice แสดงก่อน login
  [ ] User ยอมรับก่อนเข้าใช้งานจริง
  [ ] consent version management ทำงาน
  [ ] Data portability export ใช้ได้
  [ ] Right to erasure flow พร้อมใช้งาน

[ ] 🔑 Environment Variables
  [ ] ไม่มี key hardcode ใน code
  [ ] .env.local ไม่ commit ใน git
  [ ] Vercel env vars ตั้งค่าแล้ว
  [ ] LINE_NOTIFY_TOKEN, RESEND_API_KEY ปลอดภัย

[ ] ⚡ Performance & Reliability
  [ ] Cold start protection (Edge Functions / keep-alive)
  [ ] React Query/SWR cache ตั้งค่า
  [ ] Offline fallback สำหรับ score form
  [ ] Error boundary ครอบคลุมทุก route
  [ ] Loading skeleton ทุก component
```

## 12. Acceptance Criteria

### 12.1 Auth & Roles

- Admin and teacher can log in with email + password.

- Student can log in with student_id_number + password.

- Admin, teacher, and student are redirected to the correct dashboard after login.

- Teacher dashboard and classroom reports are scoped to assigned classrooms.

- Teacher can search active students school-wide only inside the score report/record flow.

- One teacher can be assigned to multiple classrooms, and one classroom can have multiple assigned teachers.

- Student can view only their own score history and profile.

- Admin can access settings, import, audit log, reports, and bond documents.

- First login with temporary password forces password change before dashboard access.

- Password policy follows practical OWASP-aligned rules: minimum 8 characters, maximum
  128 characters, no silent truncation, block common/breached passwords, and
  login rate limiting.

- Student passwords must include lowercase, uppercase, number, and special
  character.

- Disabled users cannot access the system.

### 12.2 Student & Enrollment

- Admin can create/edit students with class number, classroom, status, and multiple guardian contacts.

- Student list can filter by academic year, classroom, grade, status, and search keyword.

- Classroom report sorts students by class_number.

- Historical enrollment remains unchanged after opening a new academic year.

### 12.3 Academic Year Annual Import

- Admin can create a new academic year and import actual classroom rosters before saving.

- Annual import is the source of truth for student/classroom and teacher/classroom assignments each year.

- Import supports ป.1-ป.6 and ม.1-ม.6.

- System matches existing students by student_id_number and creates a new student_enrollment for the new academic year.

- Import preview shows new students, existing students, missing from new year, repeated students, transferred/inactive candidates, classroom changes, and error rows.

- Students not included in the new-year import are excluded from new-year enrollment but remain searchable in history.

- Annual import confirmation creates student_enrollments, teacher_classrooms, and audit_logs.

### 12.4 Score Recording & Approval

- Teacher can record add/deduct transactions for any active student in the school.

- Score calculation respects score_floor, score_ceiling, and display_score_above_base_as settings.

- Default score categories are available after setup and can be edited or disabled by admin.

- Categories requiring evidence block submission until evidence is uploaded.

- Score report form supports uploading multiple evidence images.

- Evidence images are stored in private Supabase Storage and accessed through authorized signed URLs.

- Categories requiring approval enter approval queue regardless of point amount.

- Bulk score recording works for multiple selected students.

- Transactions above the configured approval threshold become pending.

- Pending transactions do not affect current score until approved.

- Admin can approve or reject pending transactions.

- Approved transactions cannot be hard-deleted; they can only be voided with reason and audit log.

### 12.5 Reports & Bond Documents

- Individual, class, monthly, at-risk, school statistics, and bond reports render correctly in Thai.

- Monthly reports can be saved as snapshots and finalized so historical report numbers remain stable.

- Printable reports use Sarabun for Thai text.

- Bond documents are generated only by admin and include document number, threshold, signer fields, status, and print count.

- Export CSV/Excel/PDF respects role permissions and writes audit_logs.

### 12.6 Import, Audit & Security

- CSV import validates required fields and previews errors before saving.

- Import supports Thai Excel encoding with BOM.

- All important actions create audit_logs: score create, approve, reject, void, import, export, setting change, annual_import, bond generation.

- Audit logs include actor, target, before_data, after_data, ip_address, user_agent, metadata, and timestamp.

- Login success/failure, student detail views, report views, and exports create action_logs.

- PDPA consent is recorded with notice version and can be reviewed by admin.

- Personal data export requires proper role permission and creates an action log.

- Logs must not store passwords, reset tokens, service keys, or raw secrets.

- SUPABASE_SERVICE_ROLE_KEY is never used in client components.

- RLS policies protect all sensitive tables.

### 12.7 Notifications & Interventions

- Notifications are stored in notifications table and support read/unread state.

- Admin receives notification for pending approvals.

- Assigned teachers receive notification when students in assigned classrooms reach configured thresholds.

- Teacher/Admin can create intervention logs for phone calls, parent meetings, warnings, bonds, home visits, counseling, and other follow-ups.

- Intervention logs can link to student, guardian, academic year, and related score transaction.

### 12.8 Permission System

- Admin can configure teacher permissions via Settings → Permissions page.
- Permission changes take effect immediately on next action (no re-login required).
- Default permission sets are seeded for admin, teacher, and student roles.
- Profile permission overrides (individual exceptions) override role defaults.
- Teacher can be configured to see all students (`student.view_all`) or assigned classrooms only (`student.view_assigned_only`).
- Teacher can be configured to view all reports or classroom-only reports.
- Permission check is performed server-side on every protected action (not just UI hide).
- UI components hide/show based on current user's permissions.
- PermissionEditor component shows all permissions in a grouped, searchable table.

### 12.9 PDPA Consent

- First-time users must accept the latest PDPA Privacy Notice before accessing any dashboard page.
- Login → middleware checks consent → redirect to /pdpa-consent if not yet accepted.
- /pdpa-consent page displays the full notice content with version, effective date, and checkboxes.
- User cannot bypass consent by directly navigating to a dashboard URL.
- If user rejects consent → logout + show /pdpa-rejected page with contact-admin instructions.
- When admin publishes a new PDPA version → all users must re-consent on next login.
- Every consent action is recorded: version, accepted_at, accepted_by, ip_address, user_agent.
- Admin can view consent status summary (accepted/rejected/pending) for all users.
- Admin can export PDPA compliance report.
- Users can request consent withdrawal (revoke) → system blocks access after revocation.

### 12.10 Database Indexes & Performance

- Indexes exist on all foreign keys, status columns, and commonly queried fields.
- Full-text search index is available for student name/profiles lookup.
- No sequential scans on large tables for common queries.
- Monthly report snapshots prevent historical data drift.

### 12.11 School Branding

- School name and logo appear on login page, sidebar, navbar, reports, and PDPA consent page.
- Admin can upload school logo (jpg, jpeg, png, webp, max 2MB) via Settings page.
- Logo upload stores URL in settings table and reflects across the system immediately.
- If no logo is uploaded, the system displays school initials as a text-based fallback.
- School name (TH/EN) is configurable via Settings page.
- Logo is included in all printable reports as a header.
- Logo upload/deletion is recorded in audit_logs.

### 12.12 Error Handling & User Experience

- Every data table shows appropriate empty state when no data exists.
- Loading skeletons are shown during data fetching (no blank pages or spinners only).
- Network errors show retry button with clear message.
- Form submissions are protected against double-submit.
- Validation errors are shown inline with field-level messages.
- All error messages are in Thai.

Student Conduct Score System — Complete Specification

Generated for Next.js 14 + TypeScript + Supabase + Vercel + i18n
