---
name: "source-command-build-check"
description: "รัน build + tsc + lint พร้อมกัน — ใช้ก่อน push หรือเปิด PR"
---

# source-command-build-check

Use this skill when the user asks to run the migrated source command `build-check`.

## Command Template

# Build Check

รันคำสั่งตรวจสอบโค้ดทั้ง 3 อย่าง:

```bash
npm run build
```

ถ้า build ผ่าน:

```bash
npx tsc --noEmit
npm run lint
```

## ผลลัพธ์

- ✅ ทั้งหมดผ่าน = พร้อม commit/PR
- ❌ มี error = แจ้งรายละเอียดให้แก้ก่อน
