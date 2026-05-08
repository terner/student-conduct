---
name: database
description: Supabase database rules, queries, env vars, and auth
---

# Database & Auth Rules

## Supabase Database

- **RLS must be enabled on every sensitive table** — never bypass RLS
- All queries use Supabase client — never raw SQL
- Use explicit column lists in `.select()`, never `select('*')`
- All student/transaction queries must filter by `academic_year` for current year
- Status fields: `score_transactions.status` must be `'approved'` to count in current score
- Audit logs: every create/update/delete/void/approve must write to `audit_logs`
- PDPA consents must be recorded before allowing dashboard access

## Authentication

- Admin/Teacher: login with email + password via Supabase Auth
- Student: login with `student_id_number` + password (resolve to auth user server-side)
- Use `createServerClient()` from `@supabase/ssr` in Server Components
- Use `createBrowserClient()` from `@supabase/ssr` in Client Components
- Protected routes check `getUser()` + profile + PDPA consent via middleware
- `must_change_password=true` → force redirect to change-password page
- Rate limiting on auth endpoints (5 attempts/15 min window)

## Supabase Env Vars (Vercel Integration)

| Variable | ใช้ใน |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client components |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client components (anon key) |
| `SUPABASE_URL` | Server components, middleware |
| `SUPABASE_ANON_KEY` | Server components, middleware |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client (server only) |

## Score System Logic

- Base score: 100 per academic year (configurable in settings)
- Score floor: 0 (display never below 0)
- No hard ceiling — scores can exceed 100
- **Score resets every academic year** — new year = new base_score, history preserved
- Deducted total = abs(sum of negative point transactions in current year)
- Threshold alerts fire when deducted_total reaches configured thresholds (40/60/80/100)

## API Design

- All endpoints return: `{ success: boolean, data?: T, error?: ErrorResponse }`
- Error format: `{ code: string, message: string, details?: Record<string, string[]> }`
- Every protected endpoint checks permission via `checkPermission()` system
- Log important actions to `audit_logs` (data mutations) or `action_logs` (views/exports)

## PDPA Compliance (Legal Requirement)

- Every user must accept latest PDPA version before accessing dashboard
- Middleware checks `pdpa_consents` after login → redirect `/pdpa-consent` if needed
- Store consent version, IP, user-agent for audit trail
- Rejecting consent → logout + block access
