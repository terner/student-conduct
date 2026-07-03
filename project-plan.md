# 🏫 Student Conduct Score System — Project Plan

## ระบบคะแนนความประพฤตินักเรียน

Multi-School Ready · Config-Driven Design · Clone & Deploy

**Updated: 2026-06-04 — ระบบทำงานบน Production แล้ว และเอกสารถูก sync หลัง import target database**

---

## 1. สถานะปัจจุบัน (Current State)

### ✅ Core Features — Implementation Complete

| หมวด | สถานะ | รายละเอียด |
|------|--------|-----------|
| **Database Schema** | ✅ 25+ tables | profiles, students, teachers, academic_years, education_stages, grade_levels, classrooms, enrollments, guardians, score tables, permissions, settings, logs — พร้อมข้อมูลทดสอบ |
| **Auth System** | ✅ | Supabase Auth (email/password + student_id/password), base64url session cookie, role-based redirect |
| **Login Page** | ✅ | รองรับ staff login (email) + student login (student_id), role redirect, must_change_password check |
| **Dashboard** | ✅ | Admin/Teacher: stats cards + score distribution + recent transactions + at-risk alerts |
| **Student Dashboard** | ✅ | Student self-view: current score + history |
| **Student Management** | ✅ | List + search/filter + create/edit + detail page + guardian fields + current score column |
| **Score Recording** | ✅ | Add/deduct form + category management |
| **Classroom Management** | ✅ | List + create/edit + detail page + create by ระดับชั้น → ชั้นปี → จำนวนห้อง |
| **Academic Structure** | ✅ | Manage academic years, education stages, grade levels, classrooms |
| **Teacher Management** | ✅ | List + create/edit + detail page + classroom assignment + teacher positions |
| **Reports** | ✅ | Individual, classroom, threshold reports |
| **Settings** | ✅ | School info + logo upload + CSV import + audit log viewer + Google Drive config + academic structure hub |
| **PDPA Consent** | ✅ | Consent page + rejected page + check on login |
| **Change Password** | ✅ | Page + must_change_password enforcement |
| **Auth Middleware** | ✅ | proxy.ts — auth guard + locale cookie |
| **Security** | ✅ | XSS sanitization + CSP headers + input validation |
| **Validation** | ✅ | 25+ Zod schemas + form-utils |
| **UI Components** | ✅ | 30+ shadcn/ui components + custom features |

### ✅ ข้อมูลทดสอบปัจจุบัน (Supabase)

| ข้อมูล | จำนวน |
|--------|-------|
| นักเรียน | 689 |
| ครู | 32 |
| ห้องเรียน | 24 |
| ระดับชั้นการศึกษา | 5 |
| ชั้นปี | 12 |
| ผู้ปกครอง | 0 |
| ธุรกรรมคะแนน | 2 |

### 🔶 ฟีเจอร์ที่ยังต้องทำต่อ

| ฟีเจอร์ | Priority | Notes |
|---------|----------|-------|
| i18n in pages | High | เหลือ hardcoded strings ใน server actions, reports, score, settings, profile, PDF และต้องแยก domain data ออกจาก UI copy |
| Permission editor | High | role assignment ระดับครูทำแล้ว แต่ editor สำหรับ `role_permissions` / `profile_permission_overrides` ยังไม่ครบ |
| Export/report completeness | Medium | monthly snapshot, school statistics export, PDF/Excel export ยังต้องเก็บงาน |
| Guardian management UI | Medium | ตาราง/flow ผู้ปกครองจริงยังไม่มีข้อมูลหลัง import และยังไม่มี UI เต็ม |
| Bond documents | Medium | tables/page บางส่วนมีแล้ว แต่ flow generation/print ยังไม่ครบ |
| RLS/permission review | Medium | ต้อง review policy ก่อน production use จริง |
| Storage migration completeness | Medium | SQL import รอบนี้ไม่รวม storage binary files และไม่ได้ reset metadata ทั้งหมด |
| school.config.ts feature flags | Low | Config-driven feature flags ยังไม่ enforce ครบ |

---

## 2. Multi-Agent Workflow (Reference — ใช้สำหรับ Phase 2)

### Agent T — Tester & Code Reviewer

Branch: `agent/tester`
Agent definition: `.claude/agents/tester.md` (ใช้ Claude Code sub-agent system)
Command: `/review` — รัน checklist เต็มรูปแบบ

### หลักการ

ทำงานแบบ **batch generation** สำหรับ Phase 2 features:

```
Phase 2: Advanced Features (ทำตาม priority)
├── High: i18n, Guardian UI, Evidence Upload
├── Medium: Score Approval, Bonds, Interventions, Notifications
├── Low: Statistics, Rate Limiting, school.config.ts
└── Build test หลังแต่ละ feature
```

---

## 3. Agent Breakdown (Reference สำหรับ Phase 2 Features)

### ฟีเจอร์ที่ต้องทำเพิ่ม

```
📦 High Priority
├── i18n: ปิดงาน hardcoded strings และ server action/API messages ให้ครบ
├── Guardian UI: เพิ่ม/แก้ไข/ลบ ผู้ปกครองในหน้ารายละเอียดนักเรียน
└── Permission editor: จัดการ role permission overrides แบบละเอียด

📦 Medium Priority
├── Bond Documents: generate, sign, print (ใช้ตาราง bond_documents)
├── Interventions: CRUD UI + student history
├── Export/Reports: monthly snapshot, PDF/Excel, school stats export
└── Storage migration cleanup: metadata/binary import strategy

📦 Low Priority
├── school.config.ts (feature flags)
├── Guardian data seed/import backfill if required
└── Loading Skeleton Components
```

---

## 4. Execution Order (Done)

### ✅ Phase 0: Setup Supabase — Done
- ✅ สร้าง Supabase project + รัน Database Schema
- ✅ ตั้งค่า Auth + Storage bucket (school-logos)
- ✅ RLS policies + seed data

### ✅ Phase 1: Foundation (Agent 0) — Done
- ✅ Server Actions ทุก module
- ✅ DB query functions
- ✅ CSV utilities

### ✅ Phase 2: Core Features — Done
- ✅ Student Module (CRUD + search + filter)
- ✅ Score Module (record + categories)
- ✅ Classroom & Teacher Module

### ✅ Phase 3: Reports & Dashboard — Done
- ✅ Admin/Teacher/Student dashboards
- ✅ Reports (individual, class, threshold)

### ✅ Phase 4: Settings — Done
- ✅ Settings hub + CSV import + Audit log viewer

### ✅ Phase 5: Deploy — Done
- ✅ Vercel deployment + custom domain
- ✅ Auth flow + PDPA + role-based access

---

## 5. File Architecture (Actual)

```
school-conduct/
├── school.config.example.ts        # ตัวอย่าง config
├── .env.example                    # ตัวอย่าง env
├── messages/
│   ├── th.json                     # ภาษาไทย
│   └── en.json                     # ภาษาอังกฤษ
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── globals.css             # Tailwind + CSS variables + dark mode
│   │   ├── page.tsx                # → redirect /login
│   │   ├── proxy.ts                # Auth middleware (Next.js 16)
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx      # Staff + Student login tabs
│   │   │   ├── pdpa-consent/page.tsx
│   │   │   ├── pdpa-rejected/page.tsx
│   │   │   └── change-password/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Sidebar + TopBar + school branding
│   │   │   ├── dashboard/page.tsx  # Admin/Teacher dashboard
│   │   │   ├── students/page.tsx + [id]/page.tsx
│   │   │   ├── classrooms/page.tsx + [id]/page.tsx
│   │   │   ├── teachers/page.tsx + [id]/page.tsx
│   │   │   ├── score/record/page.tsx + categories/page.tsx
│   │   │   ├── reports/page.tsx + individual/ + classroom/ + threshold/
│   │   │   └── settings/page.tsx + academic-years/ + education-stages/ + grade-levels/ + teacher-positions/ + import/ + logs/
│   │   ├── student/dashboard/page.tsx
│   │   └── api/
│   │       ├── auth/login/route.ts + logout/route.ts + debug/route.ts
│   │       └── upload/logo/route.ts
│   ├── components/
│   │   ├── ui/                     # shadcn/ui 30+ components
│   │   ├── layout/                 # AppSidebar, TopBar, UserMenu, LanguageSwitcher
│   │   └── features/               # Feature components
│   │       ├── students/ (5 files)
│   │       ├── scores/ (4 files)
│   │       ├── classrooms/ (3 files)
│   │       ├── teachers/ (2 files)
│   ├── lib/
│   │   ├── supabase/               # client.ts, server.ts, admin.ts
│   │   ├── validation/             # schemas.ts (25+ Zod), form-utils.ts
│   │   ├── security/               # sanitize.ts, validate-input.ts, headers.ts
│   │   ├── actions/                # server action files: students, score, classrooms, teachers, academic years, grade levels, etc.
│   │   ├── db/                     # 5 query files + index.ts
│   │   └── utils.ts + utils/
│   ├── i18n/                       # next-intl config
│   ├── types/                      # TypeScript interfaces
│   └── middleware.ts (deleted)     # → ใช้ proxy.ts แทน
├── tasklist.md                     # Project status tracking
├── req.md                          # Full requirements document
├── supabase/migrations/            # Schema migration files
└── project-plan.md                 # This file
```

---

## 6. Tech Stack Status

| Layer | Technology | สถานะ |
|-------|-----------|--------|
| Framework | Next.js 16 (App Router) | ✅ Production |
| Language | TypeScript | ✅ |
| Database | Supabase (PostgreSQL) | ✅ Production — 25+ tables with data |
| Auth | Supabase Auth + Custom session cookie | ✅ |
| Hosting | Vercel (Hobby) | ✅ Live |
| UI | shadcn/ui 30+ components + Tailwind v4 | ✅ |
| Charts | Recharts | ✅ ติดตั้งแล้ว |
| i18n | next-intl | 🔶 Config done, pages not translated |
| Font | Sarabun + Geist | ✅ |
| Forms | react-hook-form + zod | ✅ |
| CSV | papaparse | ✅ |
| Validation | Zod 25+ schemas | ✅ |
| Security | XSS sanitization + CSP headers | ✅ |
| CI/CD | GitHub Actions | ✅ |
| Dark Mode | next-themes | ✅ |
| Storage | Supabase Storage (school-logos bucket) | ✅ |

---

## 7. Supabase Setup (✅ Done)

- ✅ สร้าง Supabase project (Free tier)
- ✅ รัน Database Schema SQL (25+ tables, including education_stages + grade_levels)
- ✅ เปิด Auth methods (Email/Password)
- ✅ สร้าง Storage bucket: `school-logos`
- ✅ ตั้งค่า RLS policies ทุกตาราง
- ✅ ตั้งค่า .env.local + Vercel environment variables
- ✅ สร้าง admin/test users
- ✅ Seed data: score_categories, settings, permissions, role_permissions

---

## 8. Monitoring & Alerts

| Metric | Tool | Notes |
|--------|------|-------|
| API calls | Vercel Dashboard | 100 req/day on Hobby |
| DB size | Supabase Dashboard | 500MB free |
| Auth errors | Supabase Auth logs | Track failed logins |
| Storage | Supabase Storage | 1GB free for evidence |
| Build fails | GitHub Actions | Email notification |
