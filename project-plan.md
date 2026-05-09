# 🏫 Student Conduct Score System — Project Plan

## ระบบคะแนนความประพฤตินักเรียน

Multi-School Ready · Config-Driven Design · Clone & Deploy

---

## 1. สถานะปัจจุบัน (Current State)

### ✅ เสร็จแล้ว (Foundation Layer)

| หมวด | สิ่งที่ทำ | ไฟล์ |
|------|-----------|------|
| **Project** | Next.js 16 + TypeScript + Tailwind v4 | `next.config.ts`, `tsconfig.json` |
| **UI Components** | shadcn/ui 31 components (sidebar, dialog, table, ฯลฯ) | `src/components/ui/*` |
| **Design System** | Sidebar, TopBar, UserMenu, LanguageSwitcher, Empty, Spinner | `src/components/layout/*`, `src/components/ui/empty.tsx` |
| **Dark Mode** | next-themes + CSS variables light/dark | `src/components/theme-provider.tsx`, `src/app/globals.css` |
| **Types** | 15+ interfaces (Student, Score, Classroom, Teacher, ฯลฯ) | `src/types/*` |
| **Validation** | Zod 30+ schemas + form-utils | `src/lib/validation/*` |
| **Security** | XSS sanitization (8 functions), CSP headers, OWASP compliance | `src/lib/security/*` |
| **Auth** | Middleware (auth guard, role routing, PDPA check, must_change_password) | `src/middleware.ts` |
| **Server Actions** | withAuth wrapper, checkPermission, getAuthProfile | `src/lib/server-action.ts` |
| **Supabase Clients** | client.ts, server.ts, admin.ts | `src/lib/supabase/*` |
| **Config** | school.config.example.ts + .env.example | root |
| **CI/CD** | GitHub Actions CI (lint+tsc+build) + CD (Vercel) | `.github/workflows/*` |
| **i18n** | Message files TH/EN | `messages/th.json`, `messages/en.json` |
| **Font** | Sarabun (Thai) + Geist (Latin) | `src/app/layout.tsx` |

### 🔶 หน้าที่ยังเป็น Placeholder

| Route | File | สถานะ |
|-------|------|--------|
| `/login` | `src/app/(auth)/login/page.tsx` | placeholder |
| `/dashboard` | `src/app/(dashboard)/page.tsx` | placeholder |
| `/students` | `src/app/(dashboard)/students/page.tsx` | placeholder |
| `/classrooms` | `src/app/(dashboard)/classrooms/page.tsx` | placeholder |
| `/score/record` | `src/app/(dashboard)/score/record/page.tsx` | placeholder |
| `/reports` | `src/app/(dashboard)/reports/page.tsx` | placeholder |
| `/reports/individual` | `src/app/(dashboard)/reports/individual/page.tsx` | placeholder |
| `/reports/classroom` | `src/app/(dashboard)/reports/classroom/page.tsx` | placeholder |
| `/reports/threshold` | `src/app/(dashboard)/reports/threshold/page.tsx` | placeholder |
| `/teachers` | `src/app/(dashboard)/teachers/page.tsx` | placeholder |
| `/settings` | `src/app/(dashboard)/settings/page.tsx` | placeholder |
| `/settings/import` | `src/app/(dashboard)/settings/import/page.tsx` | placeholder |
| `/student/dashboard` | `src/app/student/dashboard/page.tsx` | placeholder |
| `/` (root) | `src/app/page.tsx` | placeholder |

### ❌ ยังขาด / ต้องทำ

| หัวข้อ | รายละเอียด |
|--------|-----------|
| Supabase project | ยังไม่มี connection string จริงใน `.env.local` |
| Database schema | SQL ใน `req.md` section 3 ยังไม่ได้ migrate |
| Auth login จริง | หน้า login placeholder, ยังไม่เชื่อม Supabase Auth |
| PDPA consent page | ยังไม่สร้าง `/pdpa-consent` |
| Change password page | ยังไม่สร้าง `/change-password` |
| CRUD operations | ทุก module (students, scores, classrooms, teachers) ยังไม่มี |
| Server actions | ยังไม่มี action files สำหรับแต่ละ module |
| API routes | ยังไม่มี REST endpoints |
| Dashboard data | ยังไม่มี stats/query |
| Reports | ยังไม่มี logic สำหรับ generate reports |
| CSV import | ยังไม่เชื่อม papaparse |
| Evidence upload | ยังไม่เชื่อม Supabase Storage |

---

## 2. Multi-Agent Workflow

### Agent T — Tester & Code Reviewer

เพิ่มบทบาท **Tester/Reviewer** เพื่อตรวจสอบโค้ดก่อน merge:

```
ตรวจก่อน merge (ใช้ /review command):
┌─────────────────────────────────────────┐
│  ✅ Build ผ่าน (npm run build)          │
│  ✅ TypeScript error (npx tsc --noEmit) │
│  ✅ Lint ผ่าน (npm run lint)            │
│  ✅ XSS sanitization ครบทุก input       │
│  ✅ Zod validate ทุก server action      │
│  ✅ ไม่มี SERVICE_ROLE_KEY ใน client    │
│  ✅ ใช้ i18n message keys (ไม่ hardcode) │
│  ✅ Loading + empty state ครบ           │
│  ✅ Error boundary ครอบ section          │
└─────────────────────────────────────────┘

🚫 Security Red Flags (ต้อง reject ทันที):
│  🔴 dangerouslySetInnerHTML โดยไม่ใช้ SafeHtml
│  🔴 SERVICE_ROLE_KEY ใน client component
│  🔴 eval() หรือ new Function()
│  🔴 import createAdminClient ใน page component
│  🔴 env ไม่มี NEXT_PUBLIC_ ใช้ใน client
└─────────────────────────────────────────┘
```

Branch: `agent/tester`
Agent definition: `.claude/agents/tester.md` (ใช้ Claude Code sub-agent system)
Command: `/review` — รัน checklist เต็มรูปแบบ
Rules: `.claude/rules/04-security.md` — security red flags

---

### หลักการ

ทำงานแบบ **batch generation** — สร้างหลายไฟล์พร้อมกันในแต่ละรอบ แบ่งตาม **Agent (กลุ่มงาน)** ที่ independent กัน:

```
รอบที่ 0: Setup Supabase
         └── สร้าง project + migrate DB + ตั้งค่า auth

รอบที่ 1: Foundation Agent (Agent 0)
         ├── lib/actions/*.action.ts
         ├── lib/db/queries/*.queries.ts    ← 5-10 ไฟล์พร้อมกัน
         └── lib/utils/csv.ts

รอบที่ 2: Feature Agents (Agent 1 + 2 + 3) — พร้อมกัน
         ├── components/features/xxx/*.tsx
         ├── app/*/page.tsx                 ← 8-15 ไฟล์ต่อ Agent
         └── app/*/[id]/page.tsx

รอบที่ 3: Dashboard Agents (Agent 4 + 5) — พร้อมกัน
         ├── components/features/dashboard/*.tsx
         ├── components/features/settings/*.tsx
         └── app/*/page.tsx
```

### กฎ Multi-Agent

1. **ไม่มีการแก้ไขไฟล์ซ้อนกัน** — แต่ละ Agent ทำงานใน directory ของตัวเอง
2. **ใช้ types ร่วมกัน** — ทุก Agent ใช้ types/validation จาก `src/types/*` และ `src/lib/validation/*`
3. **Interface มาก่อน Implementation** — สร้าง types + server actions + queries ก่อน components/pages
4. **Batch > Sequential** — สร้างให้ครบ module ในครั้งเดียว ดีกว่าสร้างทีละไฟล์
5. **Build หลังแต่ละ Phase** — ทดสอบ build ทั้งโปรเจกต์หลังทุก Agent ใน Phase นั้นเสร็จ

---

## 3. Agent Breakdown

### Agent 0 — Foundation (ทำครั้งเดียวก่อนเริ่ม Agent อื่น)

```
📦 src/lib/
├── actions/
│   ├── student.action.ts     → Server actions สำหรับ Student CRUD
│   ├── score.action.ts       → Server actions สำหรับ Score
│   ├── classroom.action.ts   → Server actions สำหรับ Classroom
│   ├── teacher.action.ts     → Server actions สำหรับ Teacher
│   └── report.action.ts      → Server actions สำหรับ Reports
├── db/
│   ├── queries/
│   │   ├── student.queries.ts
│   │   ├── score.queries.ts
│   │   ├── classroom.queries.ts
│   │   └── teacher.queries.ts
│   └── index.ts
└── utils/
    ├── csv.ts                → CSV import/export (papaparse)
    └── pdf.ts                → PDF generation
```

### Agent 1 — Student Module

```
📦 src/
├── app/(dashboard)/students/
│   ├── page.tsx              → Student list (table + search + filter)
│   └── [id]/
│       └── page.tsx          → Student detail (profile + score history)
├── components/features/students/
│   ├── student-table.tsx     → Sortable table
│   ├── student-search.tsx    → Search + filter bar
│   ├── student-form.tsx      → Create/edit form
│   ├── student-detail.tsx    → Profile detail card
│   └── student-status-badge.tsx
```

### Agent 2 — Score Module

```
📦 src/
├── app/(dashboard)/score/
│   ├── record/
│   │   └── page.tsx          → Score record form + recent transactions
│   └── categories/
│       └── page.tsx          → Manage score categories (admin)
├── components/features/scores/
│   ├── score-record-form.tsx → Add/deduct form
│   ├── score-transaction-table.tsx
│   ├── score-category-form.tsx
│   ├── score-badge.tsx       → แสดงระดับความประพฤติ
│   ├── score-timeline.tsx    → Recharts timeline chart
│   ├── score-void-dialog.tsx
│   └── evidence-uploader.tsx
```

### Agent 3 — Classroom & Teacher Module

```
📦 src/
├── app/(dashboard)/classrooms/
│   ├── page.tsx              → Classroom list
│   └── [id]/
│       └── page.tsx          → Classroom detail (students + teachers)
├── app/(dashboard)/teachers/
│   ├── page.tsx              → Teacher list
│   └── [id]/
│       └── page.tsx          → Teacher detail + assigned classrooms
├── components/features/classrooms/
│   ├── classroom-table.tsx
│   ├── classroom-form.tsx
│   ├── teacher-table.tsx
│   ├── teacher-form.tsx
│   └── teacher-classroom-assign.tsx
```

### Agent 4 — Dashboard & Reports Module

```
📦 src/
├── app/(dashboard)/
│   ├── page.tsx              → Admin dashboard (stats + charts)
│   └── reports/
│       ├── page.tsx          → Report hub
│       ├── individual/
│       │   └── page.tsx      → Individual report + PDF
│       ├── classroom/
│       │   └── page.tsx      → Classroom report + PDF
│       └── threshold/
│           └── page.tsx      → At-risk threshold report
├── app/student/
│   └── dashboard/
│       └── page.tsx          → Student self-view dashboard
├── components/features/dashboard/
│   ├── stats-cards.tsx
│   ├── score-distribution-chart.tsx
│   ├── recent-transactions.tsx
│   └── at-risk-alert.tsx
```

### Agent 5 — Settings & Admin Module

```
📦 src/
├── app/(dashboard)/settings/
│   ├── page.tsx              → Settings hub
│   ├── import/
│   │   └── page.tsx          → CSV import wizard
│   └── logs/
│       └── page.tsx          → Audit log viewer
├── components/features/settings/
│   ├── school-info-form.tsx
│   ├── score-config-form.tsx
│   ├── threshold-config.tsx
│   ├── csv-import-dialog.tsx
│   ├── audit-log-table.tsx
│   └── academic-year-select.tsx
```

---

## 4. Execution Order

```
Phase 0: Setup Supabase (ต้องทำก่อน)
├── สร้าง Supabase project จริง
├── รัน Database Schema (SQL จาก req.md section 3)
├── ตั้งค่า Auth providers
├── ตั้งค่า Storage bucket
├── เติม .env.local
└── ทดสอบ connection

Phase 1: Foundation (Agent 0)
├── สร้าง Server Actions ทุก module
├── สร้าง DB query functions
├── สร้าง CSV + PDF utilities
└── build test

Phase 2: Core Features (Agent 1 + 2 + 3 พร้อมกัน)
├── Agent 1: Student Module
├── Agent 2: Score Module
└── Agent 3: Classroom & Teacher Module
└── build test

Phase 3: Reports & Dashboard (Agent 4)
├── Admin/Teacher/Student dashboards
├── Reports (individual, class, threshold)
└── build test

Phase 4: Settings (Agent 5)
├── Settings pages
├── CSV import
├── Audit log
└── build test

Phase 5: Polish & Deploy
├── Loading states (skeleton)
├── Empty states
├── Edge cases
├── Error boundaries
└── Deploy to Vercel
```

---

## 5. File Architecture

```
school-conduct/
├── school.config.ts                # Config + feature flags
├── school.config.example.ts        # ตัวอย่าง config
├── .env.local                      # Secrets (ไม่อยู่ใน git)
├── .env.example                    # ตัวอย่าง env
├── messages/
│   ├── th.json                     # ภาษาไทย
│   └── en.json                     # ภาษาอังกฤษ
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (ThemeProvider + TooltipProvider)
│   │   ├── globals.css             # Tailwind + CSS variables + dark mode
│   │   ├── page.tsx                # Landing page
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # SidebarProvider + AppSidebar + TopBar
│   │   │   ├── page.tsx            # Admin dashboard
│   │   │   ├── students/
│   │   │   ├── classrooms/
│   │   │   ├── teachers/
│   │   │   ├── score/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   └── student/
│   │       ├── layout.tsx
│   │       └── dashboard/page.tsx
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components (31 files)
│   │   ├── layout/                 # AppSidebar, TopBar, UserMenu, LanguageSwitcher
│   │   └── features/               # Feature-specific components (ยังไม่มี)
│   │       ├── students/
│   │       ├── scores/
│   │       ├── classrooms/
│   │       ├── teachers/
│   │       ├── dashboard/
│   │       ├── reports/
│   │       └── settings/
│   ├── lib/
│   │   ├── supabase/               # client.ts, server.ts, admin.ts
│   │   ├── validation/             # schemas.ts, form-utils.ts
│   │   ├── security/               # sanitize.ts, validate-input.ts, headers.ts
│   │   ├── actions/                # Server actions (ยังไม่มี)
│   │   ├── db/                     # DB queries (ยังไม่มี)
│   │   └── utils.ts                # cn() helper
│   ├── hooks/
│   │   └── use-mobile.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── config.ts
│   └── middleware.ts               # Auth + PDPA + role guard
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── req.md                          # Full requirements document
└── project-plan.md                 # This file
```

---

## 6. Tech Stack Status

| Layer | Technology | สถานะ |
|-------|-----------|--------|
| Framework | Next.js 16 (App Router, Turbopack) | ✅ |
| Language | TypeScript | ✅ |
| Database | Supabase (PostgreSQL) | ❌ ยังไม่มี project |
| Auth | Supabase Auth | ❌ ยังไม่เชื่อม |
| Hosting | Vercel (Hobby) | ❌ ยังไม่ deploy |
| UI | shadcn/ui 31 components + Tailwind v4 | ✅ |
| Charts | Recharts | ✅ ติดตั้งแล้ว |
| i18n | next-intl | 🔶 มี messages files แต่ routing ยังไม่เชื่อม |
| Font | Sarabun + Geist | ✅ |
| Forms | react-hook-form + zod | ✅ |
| CSV | papaparse | ✅ ติดตั้งแล้ว |
| Validation | Zod 30+ schemas | ✅ |
| Security | XSS, CSP, OWASP | ✅ |
| CI/CD | GitHub Actions | ✅ |
| Dark Mode | next-themes | ✅ |
| Design System | Carbonflow patterns | ✅ |

---

## 7. Supabase Setup Checklist (ต้องทำก่อนเริ่ม Phase 1)

- [ ] สร้าง Supabase project ใหม่ (Free tier)
- [ ] รัน Database Schema SQL (จาก `req.md` section 3) ใน Supabase SQL Editor
- [ ] เปิด Auth methods (Email/Password)
- [ ] สร้าง Storage bucket ชื่อ `evidence`
- [ ] ตั้งค่า RLS policies (หรือใช้ Service Role key สำหรับ dev)
- [ ] คัดลอก project URL + anon key + service role key ไปใส่ `.env.local`
- [ ] ทดสอบ connection ด้วย `npm run dev`
- [ ] สร้าง admin user เริ่มต้น
- [ ] ทดสอบ login ผ่านหน้า /login

---

## 8. Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Multi-agent ไฟล์ overlap | แต่ละ Agent มี directory ของตัวเอง, types/validation ใช้อันเดียวกัน |
| Server action ไม่มี DB จริง | Agent 0 สร้าง action abstraction ก่อน, ค่อยเชื่อม DB ที่หลัง |
| Recharts version conflict | lock version ใน package.json |
| i18n routing ซับซ้อน | Simplified approach (state-based) ก่อน, ค่อย migrate |
| Build fail จาก dependency | CI จะแจ้งก่อน merge |
