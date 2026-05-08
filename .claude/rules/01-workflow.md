---
name: workflow
description: Multi-agent workflow, branch strategy, and execution order
---

# Workflow Rules

## ⚠️ CRITICAL: No Call to Action

**ห้ามถาม "จะให้ทำต่อมั้ย" "อยากให้..." "เริ่มเลยมั้ย" — ทำงานจนกว่างานนั้นจะเสร็จ แล้วค่อยสรุป**

- ไม่ต้องขออนุญาตก่อนทำงานขั้นถัดไป
- ถ้าติดขัด → หาทางแก้เองก่อน ถ้าจริงๆ ไม่ได้ ค่อยถาม
- งานเสร็จ = ทุกไฟล์ถูกสร้าง + testing ผ่าน + documentation updated
- หลังงานเสร็จ ให้สรุปเท่านั้น ไม่ถามว่าอยากให้ทำอะไรต่อ

## Multi-Agent Branch Strategy

โปรเจกต์นี้ใช้ **Multi-Agent workflow** — แต่ละ Agent ทำงานใน Branch ของตัวเอง มี Tester ตรวจสอบก่อน merge

```
main ── foundation layer (setup) ✅
 ├── agent/0-foundation   ← Server Actions + DB
 ├── agent/1-students     ← Student Module
 ├── agent/2-scores       ← Score Module
 ├── agent/3-classroom-teacher
 ├── agent/4-dashboard-reports
 ├── agent/5-settings     ← Settings & Admin
 └── agent/tester         ← Code Review (ทุก Agent)
```

## Dev Agent Steps

1. **Checkout branch**: `git checkout agent/X-name`
2. **Read spec**: `req.md` + `project-plan.md` + `tasklist.md`
3. **Build order**: Types → Zod validation → Server Actions → Components → Pages
4. **Batch creation**: สร้างหลายไฟล์พร้อมกันใน Agent นั้น
5. **Test**: `npm run build` ผ่านก่อน commit
6. **Commit**: `git add . && git commit -m "agent/X: description" && git push`
7. **PR**: สร้าง PR ไปหา `agent/tester`

## Tester Steps

1. ใช้ `/review` command — ตรวจ build + tsc + lint + security checklist
2. ถ้าผ่าน → merge `agent/tester` → `main`
3. ถ้าไม่ผ่าน → report error + ให้ Agent แก้

## Execution Order

```
Phase 0: Setup Supabase & Deploy     ← DB schema, auth, storage
Phase 1: Agent 0 (Foundation)        ← Server Actions + DB Queries + Utils
Phase 2: Agent 1+2+3 (Core Features) ← Students + Scores + Classroom/Teacher
Phase 3: Agent 4 (Dashboard/Reports) ← Charts, Reports, Student view
Phase 4: Agent 5 (Settings)          ← Config, Import, Audit logs
Phase 5: Polish & Deploy             ← Final testing + production deploy
```

## Git Workflow

- **Branches**: `agent/X-name` สำหรับทำงาน, `agent/tester` สำหรับ review, `main` สำหรับ production
- **Commit**: `agent/X: description` (ภาษาอังกฤษ)
- **PR**: สร้าง PR จาก agent branch → `agent/tester` เสมอ
- **After merge**: Tester merge `agent/tester` → `main`
- **CI**: ตรวจ lint + tsc + build ทุก push (ยกเว้น main)
- **Deploy**: Auto-deploy ทุก push ที่ main → Vercel
