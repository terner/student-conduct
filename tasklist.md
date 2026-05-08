# ✅ Task List — Student Conduct Score System

## ระบบคะแนนความประพฤตินักเรียน

> แต่ละ task มี checkbox ให้ติ๊กเมื่อทำเสร็จ
> ลำดับตาม Phase — ควรทำตามลำดับ

---

## 📦 Phase 1: Foundation (Week 1-2)

### 1.1 Project Setup
- [ ] `npx create-next-app@latest school-conduct --typescript --tailwind --app --src-dir`
- [ ] ติดตั้ง dependencies: `npm install @supabase/supabase-js @supabase/ssr next-intl react-hook-form zod recharts sonner papaparse lucide-react class-variance-authority clsx tailwind-merge`
- [ ] `npx shadcn@latest init`
- [ ] `npx shadcn@latest add button card dialog select table badge form input label textarea toast tabs sheet dropdown-menu avatar separator`
- [ ] `npx getdesign@latest add notion`
- [ ] สร้าง `school.config.ts` + `school.config.example.ts`
- [ ] สร้าง `.env.example` + `.env.local`
- [ ] สร้าง `types/` directory — TypeScript types ทั้งหมด
- [ ] ตั้งค่า ESLint + Prettier

### 1.2 Database (Supabase)
- [ ] สร้าง Supabase project
- [ ] รัน SQL schema: Core tables (`profiles`, `academic_years`, `classrooms`, `students`, `guardians`, `student_guardians`, `teachers`, `teacher_classrooms`, `student_enrollments`)
- [ ] รัน SQL schema: Score tables (`score_categories`, `score_transactions`, `score_transaction_evidence`, `bond_documents`, `monthly_reports`)
- [ ] รัน SQL schema: Feature tables (`notifications`, `intervention_logs`, `audit_logs`, `action_logs`, `pdpa_consents`, `settings`)
- [ ] รัน SQL schema: Permission tables (`permissions`, `role_permissions`, `profile_permission_overrides`)
- [ ] รัน database indexes (ดูใน req.md 3.4)
- [ ] รัน RLS policies (ดูใน req.md 3.5)
- [ ] รัน default settings + seed data (score categories, permissions)
- [ ] Test RLS policies ด้วย anon key

### 1.3 i18n + Font
- [ ] ตั้งค่า `next-intl` — `i18n.ts`, `request.ts`, `navigation.ts`
- [ ] สร้าง `messages/th.json` — ข้อความภาษาไทยทั้งหมด
- [ ] สร้าง `messages/en.json` — ข้อความภาษาอังกฤษทั้งหมด
- [ ] ตั้งค่า Sarabun + Geist font ใน `app/layout.tsx`
- [ ] ทดสอบ locale switcher (TH/EN)
- [ ] middleware i18n routing

### 1.4 Auth System
- [ ] สร้าง `lib/supabase/client.ts` — Supabase client (browser)
- [ ] สร้าง `lib/supabase/server.ts` — Supabase client (server)
- [ ] สร้าง `lib/supabase/admin.ts` — Service role client (server-only)
- [ ] สร้าง Login page `app/(auth)/login/page.tsx`
- [ ] Login form — email/password (admin/teacher)
- [ ] Login form — student_id/password (student)
- [ ] Role-aware redirect หลัง login
- [ ] Forgot password flow (admin/teacher email)
- [ ] Student password reset by admin
- [ ] `must_change_password` flow
- [ ] `is_active` check + disabled message
- [ ] Rate limiting (5 ครั้ง/15 นาที)
- [ ] บันทึก `last_login_at` + `action_logs`

### 1.5 Middleware
- [ ] สร้าง `middleware.ts` — Auth guard
- [ ] Auth guard: protect `/dashboard/*`, `/student/*`, `/api/*`
- [ ] PDPA guard: redirect to `/pdpa-consent` ถ้ายังไม่ยอมรับ
- [ ] Role guard: admin → admin routes, teacher → teacher routes
- [ ] i18n middleware: locale detection + redirect

### 1.6 PDPA Consent
- [ ] สร้าง `app/(auth)/pdpa-consent/page.tsx` — full page consent
- [ ] สร้าง `app/(auth)/pdpa-rejected/page.tsx`
- [ ] Consent logic: check version → redirect → accept → save
- [ ] PDPA version management (admin update → re-consent)
- [ ] Consent revoke flow

### 1.7 Layout & Navigation
- [ ] สร้าง `app/layout.tsx` — root layout + font + i18n
- [ ] สร้าง `app/(dashboard)/layout.tsx` — dashboard layout
- [ ] Navbar: logo, navigation, locale switcher, notification bell, user menu
- [ ] Sidebar (responsive: desktop sidebar, mobile bottom nav)
- [ ] NotificationBell component + dropdown
- [ ] Locale switcher button (TH/EN)

---

## 🎯 Phase 2: Core Features (Week 3-4)

### 2.1 Student Management
- [ ] `app/(dashboard)/students/page.tsx` — Student list
- [ ] Student search (name, student_id, classroom)
- [ ] Student filter (status, grade, classroom, academic year)
- [ ] Student table: name, ID, classroom, status, current score, conduct level
- [ ] `app/(dashboard)/students/[id]/page.tsx` — Student detail
- [ ] Student profile: info, status badge, guardian panel
- [ ] Score history table (TransactionTable component)
- [ ] Score timeline chart (ScoreTimeline component)
- [ ] Conduct level badge (ScoreBadge component)
- [ ] Trend arrow (TrendArrow component)
- [ ] Student CRUD (admin only)
- [ ] StudentStatusBadge component
- [ ] GuardianContactPanel component
- [ ] EvidenceGallery component

### 2.2 Classroom Management
- [ ] `app/(dashboard)/classrooms/page.tsx` — Classroom list
- [ ] Classroom CRUD (admin)
- [ ] `app/(dashboard)/classrooms/[id]/page.tsx` — Classroom detail
- [ ] Student list in classroom (sorted by class_number)
- [ ] Teacher assignment in classroom
- [ ] Classroom report (score summary, conduct distribution)

### 2.3 Teacher Management
- [ ] `app/(dashboard)/teachers/page.tsx` — Teacher list
- [ ] Teacher CRUD (admin)
- [ ] Assignment to classrooms (homeroom, assistant, subject, discipline)
- [ ] Teacher-classroom assignment UI
- [ ] Permission override UI (profile_permission_overrides)

### 2.4 Score System
- [ ] `app/(dashboard)/score/record/page.tsx` — Score record form
- [ ] Student search + select (school-wide for active students)
- [ ] Score category select (add/deduct)
- [ ] Points input + note
- [ ] Evidence upload (EvidenceUploader component)
- [ ] Bulk mode: select multiple students
- [ ] Score approval flow (pending → approve/reject)
- [ ] `app/(dashboard)/score/pending/page.tsx` — Approval queue
- [ ] ApprovalQueue component
- [ ] ScoreVoidDialog component
- [ ] Score correction flow (void + reason + new record)
- [ ] AlertBanner component (เมื่อถึง threshold)
- [ ] Score calculation logic (base, floor, ceiling, display)

### 2.5 Evidence Upload
- [ ] Supabase Storage bucket 'evidence' (private)
- [ ] EvidenceUploader component — multi-file, preview, remove
- [ ] File validation: type (jpg/jpeg/png/webp), size (5MB), count (5)
- [ ] EXIF metadata strip (sharp library)
- [ ] Image resize (max 1920px width)
- [ ] UUID-based filename
- [ ] Signed URL generation (1 hour expiry)
- [ ] EvidenceGallery component — view in transaction detail
- [ ] Audit log for upload/delete

---

## 📊 Phase 3: Dashboard & Reports (Week 5-6)

### 3.1 Dashboards
- [ ] `app/(dashboard)/page.tsx` — Admin dashboard
  - Total students, teachers, classrooms
  - Score distribution chart
  - Recent transactions
  - Pending approvals count
  - At-risk students summary
- [ ] Teacher dashboard (scoped to assigned classrooms)
- [ ] `app/student/dashboard/page.tsx` — Student self-view
  - Current score + conduct level
  - Score timeline
  - Recent transactions
  - Personal profile

### 3.2 Individual Report
- [ ] Score history (all transactions in academic year)
- [ ] Score timeline chart
- [ ] Conduct level badge
- [ ] Signature fields: student, guardian, homeroom teacher
- [ ] Print layout (CSS @media print)
- [ ] PDF export

### 3.3 Classroom Report
- [ ] Student table: class_number, name, current score, level, count(deduct), count(add)
- [ ] Sort by score (ascending)
- [ ] Conduct level distribution bar chart
- [ ] Print-ready layout

### 3.4 Monthly Report
- [ ] `app/(dashboard)/reports/monthly/page.tsx`
- [ ] Select: month, academic year, scope (school/grade/classroom)
- [ ] Summary: total deduct, total add
- [ ] Top 5 most common violations
- [ ] Students with biggest score change (up/down)
- [ ] Save snapshot to `monthly_reports` table
- [ ] Finalize snapshot (prevent changes)
- [ ] MonthlyReportView component

### 3.5 At-Risk Report
- [ ] `app/(dashboard)/reports/at-risk/page.tsx`
- [ ] Students with score < threshold (configurable, default 70)
- [ ] Trend arrow (up/down vs last month)
- [ ] Filter: classroom, grade level
- [ ] Export CSV/PDF

### 3.6 School Statistics
- [ ] `app/(dashboard)/reports/statistics/page.tsx`
- [ ] Score distribution histogram
- [ ] Most common violations (bar chart)
- [ ] Classrooms with lowest average score
- [ ] Month-over-month comparison (line chart)
- [ ] Filter: academic year, grade level

### 3.7 Bond Document (ทัณฑ์บน)
- [ ] `app/(dashboard)/reports/bond/[id]/page.tsx`
- [ ] Auto-generate when threshold reached
- [ ] Document number (unique, sequential)
- [ ] Student info + violation list
- [ ] Signature fields: student, guardian, teacher, principal
- [ ] Document status: draft, generated, signed, cancelled
- [ ] Print count tracking
- [ ] Admin-only generate permission
- [ ] BondDocument component + PDF
- [ ] BondDocumentStatus component

---

## 🚀 Phase 4: Advanced Features (Week 7-8)

### 4.1 Permission System
- [ ] Seed `permissions` table (all permission codes)
- [ ] Seed `role_permissions` (admin, teacher, student defaults)
- [ ] `lib/permissions/check.ts` — checkPermission() function
- [ ] `components/shared/PermissionGuard.tsx` — wrapper component
- [ ] `app/(dashboard)/settings/permissions/page.tsx` — Permission editor
- [ ] Grouped, searchable permission table
- [ ] Role-level toggle + per-profile override
- [ ] Middleware permission check for API routes

### 4.2 Intervention & Contact Logs
- [ ] `app/(dashboard)/interventions/page.tsx` — Intervention list
- [ ] `app/(dashboard)/interventions/[id]/page.tsx` — Detail
- [ ] InterventionLogForm component
- [ ] Types: phone_call, parent_meeting, warning, bond, home_visit, counseling, other
- [ ] Guardian selection + contact method
- [ ] Summary + outcome + follow-up date
- [ ] Link to score transaction or bond document

### 4.3 Notifications
- [ ] `components/shared/NotificationBell.tsx` — Bell icon + badge count
- [ ] `components/shared/NotificationList.tsx` — Dropdown + history
- [ ] Real-time subscription (Supabase Realtime)
- [ ] Types: score_recorded, pending_approval, threshold_reached, report_ready
- [ ] Read/unread state (read_at)
- [ ] Auto-create on score record, threshold, approval needed

### 4.4 Audit & Action Logs
- [ ] `app/(dashboard)/settings/audit-log/page.tsx` — Audit log viewer
- [ ] `components/shared/AuditLogTable.tsx` — Filterable table
- [ ] `components/shared/ActionLogTable.tsx` — Filterable table
- [ ] Tabs: Audit Logs / Action Logs
- [ ] Filter: date range, actor, action, target_type
- [ ] Record every: create/update/delete/void/approve/reject/import/export

### 4.5 CSV Import
- [ ] `app/(dashboard)/settings/import/page.tsx` — Import hub
- [ ] Student import template download (with BOM for Excel)
- [ ] Teacher import template download
- [ ] Annual classroom import wizard
- [ ] CsvImportDialog component — Upload → Preview → Confirm (3-step)
- [ ] Preview table: new, existing, changed, error rows (red highlight)
- [ ] Batch upsert via service role
- [ ] Audit log for every import

### 4.6 Academic Year
- [ ] `app/(dashboard)/settings/academic-years/page.tsx` — Year setup
- [ ] Create academic year + set current
- [ ] AnnualClassroomImportWizard component
- [ ] Preview: old classroom → new classroom, missing students
- [ ] Promotion helper (optional, not source of truth)
- [ ] Year-end summary

### 4.7 Guardian Management
- [ ] GuardianContactPanel component (view/edit)
- [ ] Multiple guardians per student
- [ ] Primary guardian flag
- [ ] Contact info: phone, phone_alt, line_id, email, address
- [ ] Notification preference + pickup permission

### 4.8 Settings
- [ ] `app/(dashboard)/settings/page.tsx` — Settings page
- [ ] School info: name, logo, address
- [ ] Score: base, floor, ceiling, display format
- [ ] Conduct levels: edit names, colors, thresholds
- [ ] Score categories: enable/disable, points, require evidence/approval
- [ ] Security: password policy config

### 4.9 Export
- [ ] ExportMenu component (CSV/Excel/PDF)
- [ ] Student list export
- [ ] Score history export
- [ ] Report export (PDF)
- [ ] Permission check before export
- [ ] Audit log every export

---

## 🔒 Phase 5: Polish & Security (Week 9-10)

### 5.1 Security
- [ ] Security headers in `next.config.js` (CSP, HSTS, X-Frame-Options)
- [ ] CORS configuration
- [ ] Rate limiting: all API endpoints (implement with middleware)
- [ ] File upload: EXIF strip + resize + magic byte check
- [ ] Data sanitization: XSS, CSV injection
- [ ] Environment variable audit (no keys in client)

### 5.2 PDPA Compliance
- [ ] Data portability: export all user data (JSON/CSV)
- [ ] Right to erasure: anonymize user data
- [ ] Consent version management (admin)
- [ ] Privacy notice in consent page
- [ ] PDPA compliance report for admin

### 5.3 Error Handling
- [ ] `app/error.tsx` — Global error boundary
- [ ] Route-level error boundaries
- [ ] SkeletonTable, SkeletonChart, SkeletonCard components
- [ ] EmptyState component (icon + message + action)
- [ ] Network error retry (3 times, exponential backoff)
- [ ] Offline detection banner
- [ ] Form auto-save draft (localStorage)
- [ ] Toast notification for all actions (sonner)
- [ ] Form validation: client (zod) + server

### 5.4 Edge Cases
- [ ] Student transfers mid-year
- [ ] Grade retention (ซ้ำชั้น)
- [ ] Concurrent score recording (race condition)
- [ ] Session timeout handling
- [ ] Duplicate detection (import, enrollment)
- [ ] Score below floor display
- [ ] Missing evidence handling
- [ ] Bond document number uniqueness

### 5.5 PWA (optional — feature flag)
- [ ] `manifest.json`
- [ ] Service worker (workbox)
- [ ] Install prompt
- [ ] Offline fallback for score form
- [ ] Cache strategy (API data)

---

## 🌍 Phase 6: Multi-School & Deployment (Week 11-12)

### 6.1 Multi-School Config
- [ ] Complete `school.config.ts` (all feature flags working)
- [ ] Feature flag check in all API routes + pages
- [ ] Feature flag check in navigation (hide disabled features)
- [ ] School-specific branding (logo, name, colors)

### 6.2 Documentation
- [ ] `README.md` — Project overview + setup guide
- [ ] `CONTRIBUTING.md` — How to contribute
- [ ] `DEPLOYMENT.md` — Step-by-step deploy guide
- [ ] `API.md` — API documentation

### 6.3 Deployment
- [ ] Vercel project setup + environment variables
- [ ] Supabase project setup guide
- [ ] `school.config.ts` setup guide
- [ ] Custom domain setup
- [ ] SSL (Vercel auto)

### 6.4 Testing
- [ ] Auth flow test (3 roles)
- [ ] Score recording test (add/deduct/approve/void)
- [ ] CSV import test (students, teachers, annual)
- [ ] Report generation test (all 6 types)
- [ ] PDF generation test
- [ ] Permission system test
- [ ] PDPA consent flow test
- [ ] Multi-school config test (clone + configure + deploy)
- [ ] Rate limiting test
- [ ] File upload security test
- [ ] RLS policy test

### 6.5 Performance
- [ ] React Query cache configuration
- [ ] Image optimization (next/image)
- [ ] Bundle analysis (webpack-bundle-analyzer)
- [ ] Lighthouse audit (target: 90+ performance)
- [ ] Cold start protection (Edge Functions + keep-alive)

### 6.6 Launch
- [ ] Security audit checklist (req.md 11.6)
- [ ] Final data validation
- [ ] Staff training guide
- [ ] Go-live checklist
- [ ] Monitoring setup (Vercel Analytics + Supabase Logs)

---

## 📋 Quick Reference: Task Count

| Phase | Tasks |
|-------|-------|
| Phase 1: Foundation | ~45 tasks |
| Phase 2: Core Features | ~35 tasks |
| Phase 3: Dashboard & Reports | ~30 tasks |
| Phase 4: Advanced Features | ~40 tasks |
| Phase 5: Polish & Security | ~25 tasks |
| Phase 6: Multi-School & Deploy | ~25 tasks |
| **Total** | **~200 tasks** |

---

## 🎯 MVP Priority (ทำก่อน)

Tasks ที่จำเป็นสำหรับ MVP (ไม่มี feature flag ปิด):

1. ✅ Auth (3 roles + login + redirect)
2. ✅ PDPA consent ตอนแรกเข้า
3. ✅ Student CRUD
4. ✅ Classroom management
5. ✅ Teacher + assignment
6. ✅ Score record (add/deduct)
7. ✅ Score history + timeline
8. ✅ Dashboard (admin/teacher/student)
9. ✅ Individual + classroom report
10. ✅ Conduct levels + scoring logic
11. ✅ CSV import (students + teachers)
12. ✅ Permission system
13. ✅ i18n (TH/EN)
14. ✅ Audit log + action log
15. ✅ Edge cases + error handling

> 🔴 **Non-MVP** (อยู่ใน feature flag ปิด default): Line Notify, Email Summary, PWA
