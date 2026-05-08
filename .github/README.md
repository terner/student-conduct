# CI/CD Pipeline

## Workflows

| Workflow | Trigger | ทำอะไร |
|----------|---------|--------|
| `ci.yml` | Push (non-main) + PR to main | Lint, type-check, build |
| `deploy.yml` | Push to main | Build, Deploy to Vercel, Run DB migration |

## Local Checks (ก่อน push)

```bash
npm run lint        # ESLint
npm run type-check  # TypeScript
npm run build       # Next.js build
npm test            # Unit tests (when available)
```

## Required Secrets

สำหรับ Deploy pipeline ต้อง set ใน GitHub repo → Settings → Secrets and variables:

| Secret | ที่มา |
|--------|-------|
| `VERCEL_TOKEN` | Vercel Account → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel Project → Settings → General → Project ID |
| `VERCEL_PROJECT_ID` | Vercel Account → Settings → General → Team ID |
| `SUPABASE_PROJECT_REF` | Supabase Dashboard → Project → Settings → Reference |
| `SUPABASE_ACCESS_TOKEN` | Supabase Dashboard → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | Supabase Database password |
