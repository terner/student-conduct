---
name: security
description: Security rules — XSS, RLS, env vars, red flags
---

# Security Rules

## XSS Sanitization

- ทุก user input ที่แสดงใน UI ต้องผ่าน `sanitizeHtml()` หรือ `SafeText` component
- ใช้ `src/lib/security/sanitize.ts` utility functions
- ห้ามใช้ `dangerouslySetInnerHTML` โดยไม่ใช้ `SafeHtml` wrapper

## RLS & Service Role

- **ห้ามใช้ SERVICE_ROLE_KEY ใน client component** (ไม่มี `NEXT_PUBLIC_` prefix)
- import `createAdminClient()` ได้เฉพาะใน server actions และ API routes
- RLS bypass ต้องจำกัดเฉพาะ server-side เท่านั้น

## Security Red Flags (ต้อง reject ทันที)

| Flag | เหตุผล |
|------|--------|
| 🔴 `dangerouslySetInnerHTML` โดยไม่ใช้ `SafeHtml` | XSS vulnerability |
| 🔴 `SUPABASE_SERVICE_ROLE_KEY` ใน client component | Secret leak |
| 🔴 `eval()` หรือ `new Function()` | Code injection |
| 🔴 `import createAdminClient` ใน page component | RLS bypass risk |
| 🔴 env var ที่ไม่มี `NEXT_PUBLIC_` ใช้ใน client | Secret leak |

## Env Var Rules

- Client components: ใช้เฉพาะ `NEXT_PUBLIC_*` env vars
- Server components: ใช้ `SUPABASE_*` (no prefix)
- Middleware: ใช้ `SUPABASE_URL` + `SUPABASE_ANON_KEY`
- `.env.local` ต้องมีค่าจริง ส่วน `.env.example` มี template
