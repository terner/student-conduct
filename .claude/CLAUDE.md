# Student Conduct Score System — Project Context

> ⚡ **ระบบคะแนนความประพฤตินักเรียน** — Multi-School Ready, Full Version (ไม่ใช่ MVP)

**Stack:** Next.js 16 + Turbopack · TypeScript · Supabase · shadcn/ui v4 (@base-ui/react) · Tailwind v4 · next-intl (TH/EN) · Recharts · react-hook-form + Zod · papaparse

**Hosting:** Vercel (Hobby) — [student-conduct.vercel.app](https://student-conduct.vercel.app)

**MCP:** Supabase (project: `yiejvcmpulyervsehdzj`) · Vercel

---

## 📂 Rule Files (Loaded Automatically)

| File | หัวข้อ |
|------|--------|
| `.claude/rules/01-workflow.md` | Multi-agent workflow, branch strategy, execution order |
| `.claude/rules/02-database.md` | Supabase, Auth, Env Vars, Score Logic, PDPA |
| `.claude/rules/03-ui.md` | shadcn/ui v4, Tailwind, Code Style, Roles |
| `.claude/rules/04-security.md` | XSS, RLS, Env Var rules, Security Red Flags |

## 🤖 Agents

| Agent | ไฟล์ | หน้าที่ |
|-------|------|--------|
| Tester | `.claude/agents/tester.md` | Review code ก่อน merge |

## 📋 Commands

| Command | ใช้ตอน |
|---------|--------|
| `/build-check` | ก่อน commit/PR — รัน build + tsc + lint |
| `/review` | Review โค้ด — full checklist สำหรับ Tester |
| `/agent-start` | เริ่มทำงานใน Agent branch |

## 🛠 Skills

| Skill | ใช้ตอน |
|-------|--------|
| `server-action` | สร้าง server action ใหม่ |
| `supabase-query` | เขียน DB queries |
| `component-table` | สร้าง table component |
| `form-validation` | สร้าง form + Zod validation |

---

## Quick Start

```bash
# Dev: เริ่มทำงาน
/agent-start

# Tester: Review PR
/review

# ใครก็ได้: ตรวจ build
/build-check
```

## Key Documents

| File | Purpose |
|------|---------|
| `req.md` | **Full version spec** (หลัก) |
| `project-plan.md` | Multi-agent plan + agent breakdown |
| `tasklist.md` | Task tracking + progress |
| `school.config.example.ts` | School configuration template |

> 💡 **Tip:** ใช้ `/build-check` ก่อน push ทุกครั้ง ใช้ `/review` ก่อน merge ทุกครั้ง
