---
name: review
description: ตรวจสอบโค้ดเต็มรูปแบบ — build + tsc + lint + security สำหรับ Tester Agent
when_to_use: เมื่อต้อง review PR หรือโค้ดจาก Agent อื่นก่อน merge
argument-hint: [agent-branch]
arguments: branch
---

# Code Review

รัน checklist เต็มรูปแบบสำหรับ Tester:

## 1. Build Check
```bash
npm run build
npx tsc --noEmit
npm run lint
```

## 2. Security Scan
- ค้นหา `dangerouslySetInnerHTML` ที่ไม่ใช้ `SafeHtml`
- ค้นหา `SUPABASE_SERVICE_ROLE_KEY` หรือ `service_role` ใน client components
- ค้นหา `eval(`, `new Function(`
- ค้นหา `createAdminClient` imports ใน page components
- ตรวจสอบ env vars: ไม่มี `NEXT_PUBLIC_` missing ใน client

## 3. Code Quality
- Zod validation ใน server actions ทุกตัว
- ใช้ types จาก `src/types/*` (ไม่สร้าง type ใหม่ใน component)
- ใช้ `render` prop (ไม่ใช่ `asChild`) กับ shadcn/ui
- Loading + empty states ครบ
- Error boundary ครอบ section

## 4. Result
รายงานผลด้วย checkbox:
- [x] = ผ่าน
- [ ] = ไม่ผ่าน (ระบุไฟล์ + บรรทัด)
