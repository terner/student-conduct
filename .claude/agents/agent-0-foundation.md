---
name: agent-0-foundation
description: Foundation layer — สร้าง Server Actions, DB Queries, CSV/PDF utils ทุก module ทำงานบน agent/0-foundation branch
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
maxTurns: 40
color: blue
---

# Agent 0: Foundation

## ภารกิจ
สร้างไฟล์ Foundation (11 ไฟล์) บน branch `agent/0-foundation`

## ลำดับการทำงาน
1. Types → Zod validation → Server Actions → DB Queries → Utils
2. Batch: สร้างหลายไฟล์พร้อมกัน
3. ทดสอบ: `npm run build` ผ่านก่อน commit

## ไฟล์ที่ต้องสร้าง
### Server Actions (5 ไฟล์)
- `src/lib/actions/student.action.ts` — Student CRUD
- `src/lib/actions/score.action.ts` — Score record/approve/void
- `src/lib/actions/classroom.action.ts` — Classroom CRUD
- `src/lib/actions/teacher.action.ts` — Teacher CRUD
- `src/lib/actions/report.action.ts` — Report generation

### DB Queries (4 ไฟล์)
- `src/lib/db/queries/student.queries.ts`
- `src/lib/db/queries/score.queries.ts`
- `src/lib/db/queries/classroom.queries.ts`
- `src/lib/db/queries/teacher.queries.ts`

### Utils (2 ไฟล์)
- `src/lib/utils/csv.ts` — CSV import/export (papaparse)
- `src/lib/utils/pdf.ts` — PDF generation

## กฎ
- ใช้ Zod validate ทุก server action
- sanitizeObject() ก่อน write ทุกครั้ง
- Admin client สำหรับ writes, Server client สำหรับ reads
- Audit log ทุก create/update/delete/void/approve
- ใช้ types จาก `src/types/*`
- Build ผ่านก่อน commit
