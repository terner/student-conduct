# 🏫 Student Conduct Score System — Project Plan

## ระบบคะแนนความประพฤตินักเรียน

Multi-School Ready · Config-Driven Design · Clone & Deploy

---

## 1. ภาพรวม (Project Overview)

### 1.1 เป้าหมาย
สร้างระบบบันทึก ติดตาม และรายงานคะแนนความประพฤตินักเรียน สำหรับโรงเรียนไทย
- ครูบันทึกคะแนนดี/ไม่ดี ของนักเรียน
- Admin จัดการนักเรียน ครู ห้องเรียน และดูรายงาน
- นักเรียนดูประวัติคะแนนของตนเอง
- รองรับหลายโรงเรียน (clone project → ตั้งค่า → deploy)

### 1.2 สถาปัตยกรรม

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                      │
│  Next.js 14 App Router + TypeScript + shadcn/ui          │
│  - SSR / Server Components                                │
│  - API Routes (REST)                                      │
│  - Server Actions                                         │
│  - Middleware (Auth + PDPA + i18n)                        │
└────────────┬─────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────┐
│                   Backend (Supabase)                      │
│  - PostgreSQL Database (RLS enabled)                      │
│  - Auth Service (bcrypt, JWT, session)                    │
│  - Edge Functions (API เสริม, 500K req/เดือนฟรี)           │
│  - Storage (evidence รูปภาพ)                               │
│  - Realtime (แจ้งเตือน)                                    │
└──────────────────────────────────────────────────────────┘
```

### 1.3 Multi-School Design

```
GitHub Repo (codebase เดียวกัน)
    │
    ├── school.config.ts.example → school.config.ts
    ├── .env.example → .env.local
    │
    ├── โรงเรียน ก. → Vercel Project A + Supabase A
    ├── โรงเรียน ข. → Vercel Project B + Supabase B
    └── โรงเรียน ค. → Vercel Project C + Supabase C
```

แต่ละโรงเรียน clone → config → deploy → ใช้ได้ทันที
ข้อมูลแยกกันคนละ Supabase project

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 (App Router) | SSR, routing, API, server actions |
| Language | TypeScript | Type safety |
| Database | Supabase (PostgreSQL) | Data + RLS |
| Auth | Supabase Auth | Login, roles, JWT |
| Hosting | Vercel (Hobby/Pro) | CI/CD, CDN |
| UI | shadcn/ui + Tailwind | Components, dark mode |
| Charts | Recharts | Score timeline, statistics |
| i18n | next-intl | TH/EN bilingual |
| Font | Sarabun + Geist | Thai + Latin |
| Forms | react-hook-form + zod | Validation |
| CSV | papaparse | Import/Export |
| Design | getdesign notion theme | Clean UI |
| State | React Query (TanStack Query) | Server state, cache |
| PDF | @react-pdf/renderer | Reports, bond docs |

---

## 3. Milestones & Timeline

### Phase 1: Foundation (Week 1-2)
- [ ] Init Next.js + TypeScript project
- [ ] Setup Supabase project + DB schema
- [ ] Setup i18n (next-intl) + font (Sarabun + Geist)
- [ ] Setup shadcn/ui + Tailwind + Notion theme
- [ ] Create `school.config.ts` + `.env` structure
- [ ] Auth: Login page + Supabase Auth integration
- [ ] Auth: 3 roles (admin/teacher/student) + redirect
- [ ] Auth: Middleware (auth guard + PDPA guard)
- [ ] PDPA: Consent page + forced accept flow

### Phase 2: Core Features (Week 3-4)
- [ ] Student CRUD + list + search + filter
- [ ] Classroom management
- [ ] Teacher management + assignment to classrooms
- [ ] Score categories (admin configurable)
- [ ] Score record form (add/deduct)
- [ ] Bulk score recording
- [ ] Score history + transaction table
- [ ] Score timeline chart (Recharts)
- [ ] Evidence upload (Supabase Storage)
- [ ] Score approval flow (pending → approve/reject)
- [ ] Score void flow (correction)

### Phase 3: Dashboard & Reports (Week 5-6)
- [ ] Admin dashboard (overview, stats)
- [ ] Teacher dashboard (classroom scope)
- [ ] Student dashboard (self-view)
- [ ] Individual report + PDF
- [ ] Classroom report + PDF
- [ ] Monthly report + snapshot
- [ ] At-risk report
- [ ] School statistics + charts
- [ ] Bond document (ทัณฑ์บน) + PDF

### Phase 4: Advanced Features (Week 7-8)
- [ ] Permission system (permissions table + UI editor)
- [ ] Intervention & contact logs
- [ ] In-app notifications (Supabase Realtime)
- [ ] Audit log + action log viewer
- [ ] CSV import (students, teachers, annual)
- [ ] Academic year management + annual import wizard
- [ ] Guardian management (multiple per student)
- [ ] Score trend arrows + sparkline
- [ ] Settings page (admin)
- [ ] Export CSV/Excel/PDF

### Phase 5: Polish & Security (Week 9-10)
- [ ] Security headers (CSP, HSTS, etc.)
- [ ] Rate limiting (all endpoints)
- [ ] File upload security (EXIF strip, resize, scan)
- [ ] Data validation hardening
- [ ] PDPA rights (data portability, erasure)
- [ ] Error boundary + loading states
- [ ] Empty states + edge cases
- [ ] PWA support (manifest, service worker)
- [ ] Cold start protection (Edge Functions, keep-alive)
- [ ] Security audit checklist

### Phase 6: Multi-School & Deployment (Week 11-12)
- [ ] `school.config.ts` complete (all feature flags)
- [ ] Documentation: README, setup guide
- [ ] Deployment guide for new schools
- [ ] Vercel deployment + env vars
- [ ] Supabase project setup guide
- [ ] Test with real school data
- [ ] Performance optimization
- [ ] Bug fixes

---

## 4. Database Schema Overview

### Core Tables (8)
`profiles` · `academic_years` · `classrooms` · `students` · `guardians` · `student_guardians` · `teachers` · `teacher_classrooms`

### Enrollment (1)
`student_enrollments`

### Score (3)
`score_categories` · `score_transactions` · `score_transaction_evidence`

### Documents (1)
`bond_documents`

### Features (5)
`monthly_reports` · `notifications` · `intervention_logs` · `audit_logs` · `action_logs`

### Security (4)
`pdpa_consents` · `permissions` · `role_permissions` · `profile_permission_overrides`

### Config (1)
`settings`

> **Total: 23 tables** — ดู schema เต็มใน `req.md` Section 3

---

## 5. API Overview

| Group | Endpoints | Auth | Permission |
|-------|-----------|------|------------|
| Auth | login, logout, forgot, reset, session | ❌/✅ | — |
| Students | CRUD, score-history, guardians | ✅ | student.* |
| Score | record, bulk, approve, reject, void | ✅ | score.* |
| Classrooms | list, detail, report | ✅ | student.* |
| Reports | monthly, at-risk, statistics, bond | ✅ | report.* |
| Interventions | list, create, detail | ✅ | intervention.* |
| Settings | get, update, import, logs | ✅ | settings.* |

> ดู endpoints เต็มใน `req.md` Section 5.1

---

## 6. Config-Driven Design (Feature Flags)

ใน `school.config.ts`:

```typescript
features: {
  lineNotify: false,        // ❌ ไม่ใช่ MVP
  emailSummary: false,      // ❌ ไม่ใช่ MVP
  pwa: false,               // ❌ ไม่ใช่ MVP
  monthlyReportSnapshot: true,
  atRiskReport: true,
  interventionLog: true,
  bondDocument: true,
  evidenceUpload: true,
  bulkScoreRecord: true,
  guardianManagement: true,
  auditLog: true,
  actionLog: true,
  scoreApproval: true,
  csvExport: true,
  statistics: true,
}
```

> ถ้า feature flag = false → ฟีเจอร์นั้นไม่แสดงใน UI, ไม่มี route, ไม่มี API

---

## 7. Free Tier Limits

| Service | Limit | หมายเหตุ |
|---------|-------|----------|
| Vercel Hobby | 100 API calls/วัน | ~พอสำหรับ 30 ครู |
| Supabase Free | 500MB DB + 1GB Storage | ~พอสำหรับ 1,000 นักเรียน |
| Supabase Edge Functions | 500K requests/เดือน | API backend |
| Supabase Auth | 50,000 users | มากเกินพอ |

> ⚠️ ถ้าเกิน Vercel 100 calls/วัน → ใช้ Supabase Edge Functions เป็น API backend (500K/เดือนฟรี)

---

## 8. Key Directories Structure

```
school-conduct/
├── school.config.ts            # Config + feature flags
├── school.config.example.ts    # ตัวอย่าง config
├── .env.local                  # Secrets (ไม่อยู่ใน git)
├── .env.example                # ตัวอย่าง env
├── messages/
│   ├── th.json                 # ภาษาไทย
│   └── en.json                 # ภาษาอังกฤษ
├── app/
│   ├── (auth)/                 # Login, PDPA consent
│   ├── (dashboard)/            # Admin/Teacher routes
│   ├── student/                # Student self-view
│   └── api/                    # REST API endpoints
├── components/
│   ├── ui/                     # shadcn/ui
│   ├── shared/                 # Reusable components
│   └── features/               # Feature-specific
├── lib/
│   ├── supabase/               # Supabase client
│   ├── i18n/                   # next-intl config
│   └── permissions/            # Permission check
└── types/                      # TypeScript types
```
