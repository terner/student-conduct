@RTK.md

## ภาษา / Language

คุยไทยเสมอ

## Project Context

อ่าน `.claude/CLAUDE.md` สำหรับภาพรวมโปรเจกต์

Rule files โหลดอัตโนมัติ:
- `.claude/rules/01-workflow.md` — Multi-agent workflow + branch strategy
- `.claude/rules/02-database.md` — Supabase rules + env vars
- `.claude/rules/03-ui.md` — shadcn/ui v4 + code style
- `.claude/rules/04-security.md` — XSS + RLS + security red flags

Commands:
- `/build-check` — รัน build + tsc + lint
- `/review` — Full code review checklist
- `/agent-start` — เริ่มทำงาน Agent branch

Agents:
- `.claude/agents/tester.md` — Tester/Reviewer agent
