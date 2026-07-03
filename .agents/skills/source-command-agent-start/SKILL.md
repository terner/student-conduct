---
name: "source-command-agent-start"
description: "เริ่มทำงานใน Agent branch — checkout branch, อ่าน spec, และเตรียม context"
---

# source-command-agent-start

Use this skill when the user asks to run the migrated source command `agent-start`.

## Command Template

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
