# Supabase MCP Authentication

## สถานะ
- MCP config ใน `.mcp.json` พร้อมแล้ว
- ต้องการ Supabase Personal Access Token (PAT) เพื่อ authenticate

## วิธีสร้าง PAT
1. ไปที่ https://supabase.com/dashboard/account/tokens
2. คลิก "Create New Token"
3. ใส่ชื่อ เช่น "claude-code-mcp"
4. เลือก scope: `database:write` (สำหรับรัน SQL schema)
5. คลิก Create
6. คัดลอก token ที่ได้

## วิธีใช้กับ MCP
เมื่อได้ PAT แล้ว รัน:
```bash
cd /Users/watcharathatsrithanesiganon/Documents/GitHub/school-behavior-grade
claude mcp remove supabase
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=yiejvcmpulyervsehdzj" --header "Authorization: Bearer <PAT_TOKEN>"
```

จากนั้น restart Claude session ใหม่ MCP tools จะพร้อมใช้งาน

## Scopes ที่ต้องการสำหรับ MCP
- `database:write` — รัน SQL schema, migrate database
- `database:read` — อ่านข้อมูลจาก Database
- `projects:read` — อ่าน project settings
- `storage:read` — อ่านไฟล์ evidence
