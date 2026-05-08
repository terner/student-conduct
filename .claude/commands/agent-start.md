---
name: agent-start
description: เริ่มทำงานใน Agent branch — checkout branch, อ่าน spec, และเตรียม context
when_to_use: เมื่อเริ่มทำงานใน Agent ใหม่ หรือเริ่ม session ใหม่ใน Agent เดิม
argument-hint: [agent-name]
arguments: agent
---

# Agent Start

## ขั้นตอน
1. Checkout branch: `git checkout agent/X-name`
2. Pull ล่าสุด: `git pull origin agent/X-name`
3. อ่าน spec:
   - `req.md` — requirements
   - `project-plan.md` — plan + file tree
   - `tasklist.md` — task status
4. เริ่มทำงานตาม tasklist

## ลำดับการสร้างไฟล์
1. Types ( interfaces)
2. Zod validation schemas
3. Server actions (DB queries → actions)
4. Components
5. Pages
