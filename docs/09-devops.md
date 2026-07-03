# 09 — DevOps

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| i18n | next-intl (TH/EN) |
| Font | Sarabun + Geist |
| Forms | react-hook-form + zod |
| CSV | papaparse |
| Cache/Rate Limit | Upstash Redis / Vercel KV |
| Storage | Vercel Blob / Supabase Storage / Google Drive |
| Email | Resend (optional) |

## Environment Variables

### Required
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_SITE_URL=https://xxx.vercel.app
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_SECRET_KEY=sb_secret_xxx
STORAGE_PROVIDER=vercel_blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=xxx
```

### Optional
```env
RESEND_API_KEY=re_xxx
RESEND_FROM=noreply@school.ac.th
LINE_NOTIFY_TOKEN=xxx
SENTRY_DSN=https://xxx (not currently used)
```

Enable Supabase Authentication → Rate Limits → IP Address Forwarding when `SUPABASE_SECRET_KEY` is set. Server-side login sends `sb-forwarded-for` so Supabase Auth rate limits by the end-user IP instead of the Vercel server IP.

## Auth Rate Limits

`POST /api/auth/login` uses two app-side limits before/around Supabase Auth:

| Limit | Scope | Window | Behavior |
|-------|-------|--------|----------|
| Login request throttle | IP address | 600 requests/minute | Blocks request floods before auth lookup |
| Failed login lockout | IP address + email/student ID | 5 invalid password attempts/10 minutes | Blocks only that identity on that IP; successful login clears the failed counter |

Supabase Auth should be configured with a high enough sign-up/sign-in limit for expected school traffic and IP Address Forwarding enabled. The app still relies on Upstash Redis/Vercel KV in production so counters are shared across serverless instances; local/dev falls back to in-memory counters.

## Build & Deploy

### Local Dev
```bash
npm run dev -- -p 3002
```

### Build
```bash
npm run build
```

### Deploy Vercel
```bash
vercel --prod
```

### Force Redeploy
```bash
vercel redeploy khaowang-conduct.vercel.app
```

### Vercel CLI Commands
```bash
vercel env ls production       # list env vars
vercel env add KEY production  # add env var
vercel env rm KEY production   # remove env var
vercel logs                     # view logs
```

## Database

### Dev Supabase
- URL: `https://yiejvcmpulyervsehdzj.supabase.co`

### Production Supabase
- URL: `https://erwlsittkndolqihjyqz.supabase.co`

### Import / Query Workflow Used In This Repo

- Working DB connection path for agent automation is Supabase CLI linked mode:

```bash
supabase link --project-ref yiejvcmpulyervsehdzj --password "$SUPABASE_DB_PASSWORD" --workdir supabase
supabase db query --linked --workdir supabase --query "select now()"
```

- Direct `psql` against `db.<project-ref>.supabase.co` may fail from IPv4-only paths; use Supabase pooler or linked mode instead.
- `supabase db query --linked -f` applies SQL files, but raw pg_dump `COPY ... \.` payloads from `data.sql` must be converted to `INSERT` before replay.
- Supporting files for the 2026-06-04 import:
  - `supabase/reset-target-for-import.sql`
  - `scripts/generate-import-sql.mjs`
  - `supabase/backups/khaowang-2026-06-04/`

### MCP Tools
```typescript
// List tables
mcp__supabase-prod__list_tables({ schemas: ["public"] })

// Execute SQL
mcp__supabase-prod__execute_sql({ query: "SELECT ..." })

// Apply migration
mcp__supabase-prod__apply_migration({ name: "migration_name", query: "SQL" })
```

## RLS Policies

All tables have RLS enabled with policies:
- `*_read_auth` — authenticated users can read
- `*_write_auth` / `*_all_auth` — full CRUD for authenticated users

Current policies in production (added 2026-05-14):
- `classrooms`: read, insert, update, delete
- `academic_years`, `education_stages`, `grade_levels`: read, write, update, delete
- `score_categories`, `score_transactions`: read, write, update, delete
- `students`, `student_enrollments`: read, write, update, delete
- `teachers`, `teacher_classrooms`: ALL
- `guardians`, `student_guardians`: ALL
- All other tables: ALL

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # login, first-password, change-password, pdpa, reset-password
│   ├── (dashboard)/      # main app pages
│   │   ├── settings/     # settings + subpages (academic-years, education-stages, grade-levels, import, logs, profile, teacher-positions)
│   │   ├── score/        # record, history, approval, categories
│   │   ├── reports/      # individual, classroom, statistics, threshold, bond
│   │   ├── classrooms/   # list + detail
│   │   ├── students/     # list + detail
│   │   ├── teachers/     # list + detail
│   │   └── dashboard/
│   └── api/              # auth/login, upload/*, blob/*, storage/test
├── components/
│   ├── features/         # students, teachers, classrooms, scores, settings, reports
│   ├── layout/           # sidebar, topbar, auth guards, user menu
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── actions/          # server actions
│   ├── db/queries/       # database queries
│   ├── security/         # roles, validate-input, rate-limit, headers
│   ├── audit/            # audit logging
│   ├── supabase/         # client/server config
│   ├── cache/            # ttl-cache (Redis)
│   └── validation/       # Zod schemas
├── types/
└── hooks/
```
