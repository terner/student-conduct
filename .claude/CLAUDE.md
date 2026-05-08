# Student Conduct Score System — Project Context

## Project Overview

**ระบบคะแนนความประพฤตินักเรียน** — Multi-School Ready, Config-Driven Design

**Stack:** Next.js 14 (App Router), TypeScript, Supabase (Auth + DB + Storage), shadcn/ui + Tailwind CSS, next-intl (TH/EN), Recharts, react-hook-form + zod, papaparse, Sarabun Thai Font

**Hosting:** Vercel (Hobby tier — 100 API calls/day limit)

## Architecture

```
student-conduct/
├── req.md                   # Full version spec
├── reqmvp.md                # MVP spec (reference)
├── school.config.ts         # School configuration + feature flags
├── .env.local               # Supabase keys, secrets
├── messages/
│   ├── th.json              # ภาษาไทย (default)
│   └── en.json              # ภาษาอังกฤษ
└── app/
    ├── (auth)/              # Login, change-password, pdpa-consent
    ├── (dashboard)/         # Admin/teacher dashboard
    └── student/             # Student self-view portal
```

## Three User Roles

| Role | Scope |
|------|-------|
| **admin** | Full access — settings, import, audit, all reports, bond documents |
| **teacher** | Record scores for any active student; dashboard/reports scoped to assigned classrooms |
| **student** | Self-view only — own score history, current score |

## Critical Rules

### Database (Supabase)

- **RLS must be enabled on every sensitive table** — never bypass RLS
- All queries use Supabase client — never raw SQL
- Use explicit column lists in `.select()`, never `select('*')`
- All student/transaction queries must filter by `academic_year` for current year
- Status fields: `score_transactions.status` must be `'approved'` to count in current score
- Audit logs: every create/update/delete/void/approve must write to `audit_logs`
- PDPA consents must be recorded before allowing dashboard access

### Authentication

- Admin/Teacher: login with email + password via Supabase Auth
- Student: login with `student_id_number` + password (resolve to auth user server-side)
- Use `createServerClient()` from `@supabase/ssr` in Server Components
- Use `createBrowserClient()` from `@supabase/ssr` in Client Components
- Protected routes check `getUser()` + profile + PDPA consent via middleware
- `must_change_password=true` → force redirect to change-password page
- Rate limiting on auth endpoints (5 attempts/15 min window)

### API Design

- All endpoints return: `{ success: boolean, data?: T, error?: ErrorResponse }`
- Error format: `{ code: string, message: string, details?: Record<string, string[]> }`
- Every protected endpoint checks permission via `checkPermission()` system
- Log important actions to `audit_logs` (data mutations) or `action_logs` (views/exports)

### Score System Logic

- Base score: 100 per academic year (configurable in settings)
- Score floor: 0 (display never below 0)
- No hard ceiling — scores can exceed 100
- **Score resets every academic year** — new year = new base_score, history preserved
- Deducted total = abs(sum of negative point transactions in current year)
- Threshold alerts fire when deducted_total reaches configured thresholds (40/60/80/100)

### Code Style

- Thai for all user-facing UI (Sarabun font), English for code
- Server Components by default — Client Components only for interactivity
- Zod schemas for ALL input validation (forms, API, env vars)
- Immutable patterns — spread operator, never mutate
- Loading states: Suspense + loading.tsx + skeleton components
- Empty states: every table/list must show empty state message in Thai
- Error boundaries: global + route-level

### PDPA Compliance (Legal Requirement)

- Every user must accept latest PDPA version before accessing dashboard
- Middleware checks `pdpa_consents` after login → redirect `/pdpa-consent` if needed
- Store consent version, IP, user-agent for audit trail
- Rejecting consent → logout + block access

## Key Files Reference

| File | Purpose |
|------|---------|
| `req.md` | **Full version spec** — ใช้เป็นหลัก |
| `reqmvp.md` | MVP spec — reference สำหรับการตัดสินใจ feature flags |
| `school.config.example.ts` | Template for school configuration |
| `app/(dashboard)/reports/threshold/page.tsx` | ⭐ Threshold report page |

## MCP Servers (Project)

- **Supabase** — database operations, schema inspection, query debugging
- **Memory** — inherited from global for session persistence

## ECC Workflow

```bash
# Planning a feature
/plan "Add teacher-classroom assignment page"

# Code review before commit
/code-review

# Security scan for PDPA compliance
/security-scan

# Before pushing
/git-workflow
```

## Git Workflow

- `feat:` new features, `fix:` bug fixes, `refactor:` code changes
- Direct commits on `main` (small project), PR workflow when collaborating
- Lint + type-check before commit
- Keep `req.md` and `reqmvp.md` in sync with actual implementation
