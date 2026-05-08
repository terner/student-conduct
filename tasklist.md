# ✅ Task List — Student Conduct Score System

## ระบบคะแนนความประพฤตินักเรียน

> Task-based tracking — แต่ละ任务是独立的工作单元
> ทำงานแบบ Multi-Agent: แยก branch แยก PR ทำงานพร้อมกัน

---

## 🎯 Active Tasks (Current Sprint)

### Phase 0: Setup Supabase & Deploy 🔄

- [ ] **รัน Database Schema** — เอา SQL ไปรันที่ Supabase SQL Editor
- [ ] **สร้าง Admin User** — เพิ่ม user ใน Supabase Auth สำหรับทดสอบ
- [ ] **Deploy ขึ้น Vercel** — ใช้ CI/CD auto deploy
- [ ] **ตั้ง Domain (optional)** — custom domain ถ้าต้องการ

### Agent 0: Foundation — Server Actions & DB Queries

- [ ] `src/lib/actions/student.action.ts` — Student CRUD server actions
- [ ] `src/lib/actions/score.action.ts` — Score record/approve/void actions
- [ ] `src/lib/actions/classroom.action.ts` — Classroom CRUD actions
- [ ] `src/lib/actions/teacher.action.ts` — Teacher CRUD actions
- [ ] `src/lib/actions/report.action.ts` — Report generation actions
- [ ] `src/lib/db/queries/student.queries.ts` — Student query functions
- [ ] `src/lib/db/queries/score.queries.ts` — Score query functions
- [ ] `src/lib/db/queries/classroom.queries.ts` — Classroom query functions
- [ ] `src/lib/db/queries/teacher.queries.ts` — Teacher query functions
- [ ] `src/lib/utils/csv.ts` — CSV import/export (papaparse)
- [ ] `src/lib/utils/pdf.ts` — PDF generation

### Agent 1: Student Module

- [ ] `components/features/students/student-table.tsx` — Sortable table
- [ ] `components/features/students/student-search.tsx` — Search + filter
- [ ] `components/features/students/student-form.tsx` — Create/edit form
- [ ] `components/features/students/student-detail.tsx` — Profile card
- [ ] `components/features/students/student-status-badge.tsx`
- [ ] `app/(dashboard)/students/page.tsx` — Student list page
- [ ] `app/(dashboard)/students/[id]/page.tsx` — Student detail page

### Agent 2: Score Module

- [ ] `components/features/scores/score-record-form.tsx` — Add/deduct form
- [ ] `components/features/scores/score-transaction-table.tsx` — History table
- [ ] `components/features/scores/score-category-form.tsx` — Category mgmt
- [ ] `components/features/scores/score-badge.tsx` — Conduct level badge
- [ ] `components/features/scores/score-timeline.tsx` — Recharts chart
- [ ] `components/features/scores/score-void-dialog.tsx` — Void/correction
- [ ] `components/features/scores/evidence-uploader.tsx` — File upload
- [ ] `app/(dashboard)/score/record/page.tsx` — Score record page
- [ ] `app/(dashboard)/score/categories/page.tsx` — Category page

### Agent 3: Classroom & Teacher Module

- [ ] `components/features/classrooms/classroom-table.tsx`
- [ ] `components/features/classrooms/classroom-form.tsx`
- [ ] `components/features/classrooms/teacher-table.tsx`
- [ ] `components/features/classrooms/teacher-form.tsx`
- [ ] `components/features/classrooms/teacher-classroom-assign.tsx`
- [ ] `app/(dashboard)/classrooms/page.tsx` — Classroom list
- [ ] `app/(dashboard)/classrooms/[id]/page.tsx` — Classroom detail
- [ ] `app/(dashboard)/teachers/page.tsx` — Teacher list
- [ ] `app/(dashboard)/teachers/[id]/page.tsx` — Teacher detail

### Agent 4: Dashboard & Reports

- [ ] `components/features/dashboard/stats-cards.tsx` — Summary cards
- [ ] `components/features/dashboard/score-distribution-chart.tsx`
- [ ] `components/features/dashboard/recent-transactions.tsx`
- [ ] `components/features/dashboard/at-risk-alert.tsx`
- [ ] `app/(dashboard)/page.tsx` — Admin dashboard
- [ ] `app/student/dashboard/page.tsx` — Student dashboard
- [ ] `app/(dashboard)/reports/individual/page.tsx` — Individual report
- [ ] `app/(dashboard)/reports/classroom/page.tsx` — Classroom report
- [ ] `app/(dashboard)/reports/threshold/page.tsx` — Threshold report

### Agent 5: Settings & Admin

- [ ] `components/features/settings/school-info-form.tsx`
- [ ] `components/features/settings/score-config-form.tsx`
- [ ] `components/features/settings/threshold-config.tsx`
- [ ] `components/features/settings/csv-import-dialog.tsx`
- [ ] `components/features/settings/audit-log-table.tsx`
- [ ] `components/features/settings/academic-year-select.tsx`
- [ ] `app/(dashboard)/settings/page.tsx` — Settings hub
- [ ] `app/(dashboard)/settings/import/page.tsx` — CSV import
- [ ] `app/(dashboard)/settings/logs/page.tsx` — Audit log viewer

### Auth & PDPA

- [ ] `app/(auth)/login/page.tsx` — Login form
- [ ] `app/(auth)/pdpa-consent/page.tsx` — PDPA consent
- [ ] `app/(auth)/change-password/page.tsx` — Change password
- [ ] `app/(auth)/pdpa-rejected/page.tsx` — PDPA rejected

---

## ✅ Completed Tasks (Foundation Layer)

- [x] Next.js 16 + TypeScript + Tailwind v4
- [x] shadcn/ui 31 components
- [x] Sarabun + Geist fonts
- [x] Security headers + CSP
- [x] 15+ TypeScript interfaces
- [x] Zod 30+ validation schemas
- [x] XSS sanitization + OWASP compliance
- [x] Auth middleware (guard + role routing + PDPA)
- [x] Supabase clients (client.ts, server.ts, admin.ts)
- [x] ThemeProvider + dark mode (next-themes)
- [x] AppSidebar + TopBar + UserMenu + LanguageSwitcher
- [x] Empty + Spinner components
- [x] GitHub Actions CI + Deploy
- [x] Vercel project + env vars + MCP
- [x] Supabase MCP connected
- [x] school.config.example.ts + .env.example
- [x] req.md + project-plan.md + tasklist.md

---

## 📊 Progress

| Agent | Files | Status |
|-------|-------|--------|
| Foundation (setup) | 60+ files | ✅ Done |
| Agent 0 (Server/DB) | 11 files | ❌ Not started |
| Agent 1 (Students) | 7 files | ❌ Not started |
| Agent 2 (Score) | 9 files | ❌ Not started |
| Agent 3 (Classroom/Teacher) | 9 files | ❌ Not started |
| Agent 4 (Dashboard/Reports) | 9 files | ❌ Not started |
| Agent 5 (Settings) | 9 files | ❌ Not started |
| Auth & PDPA | 4 files | ❌ Not started |
| **Total remaining** | **58 files** | |
