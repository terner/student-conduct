# 02 — การติดตั้งและตั้งค่าเริ่มต้น

## ขั้นตอน

### 1. Clone + ติดตั้ง

```bash
git clone <repo-url>
cd khaowang-conduct
cp .env.example .env.local
cp school.config.example.ts school.config.ts
npm install
```

### 2. Environment Variables (`.env.local`)

```env
# Supabase — Client
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# Supabase — Server
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_SECRET_KEY=sb_secret_xxx

# Storage
STORAGE_PROVIDER=vercel_blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx

# Site URL (for email redirects)
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app

# Redis / Vercel KV (required in production for shared login/upload rate limits)
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=xxx

# Email — Resend (optional)
RESEND_API_KEY=re_xxx
RESEND_FROM=noreply@school.ac.th

# Line Notify (optional)
LINE_NOTIFY_TOKEN=xxx
```

### 3. Supabase Setup

1. สร้าง project ที่ [supabase.com](https://supabase.com)
2. รัน SQL schema จาก `req.md` Section 3 (Database Schema) ใน SQL Editor
3. เปิด RLS ทุกตารางตาม Section 3.5
4. ตั้งค่า Authentication → Email (optional: custom SMTP สำหรับส่ง reset password email)
5. เปิด Authentication → Rate Limits → IP Address Forwarding แล้วตั้ง `SUPABASE_SECRET_KEY` เพื่อให้ Supabase Auth rate limit จาก IP ผู้ใช้จริงเมื่อ login ผ่าน server
   - Production app login request throttle: 600 requests/minute/IP
   - Invalid password lockout: 5 failed attempts/10 minutes per IP + email/student ID
6. Enable Realtime สำหรับตารางที่ใช้ (profiles, notifications, score_transactions ฯลฯ)

### 4. Deploy Vercel

```bash
vercel --prod
```

แล้วเพิ่ม environment variables ใน Vercel Dashboard → Settings → Environment Variables

### 5. Login ครั้งแรก

สร้าง admin user ผ่าน Supabase Dashboard:
1. Authentication → Users → Add User
2. กรอก email + password
3. ไป SQL Editor: `INSERT INTO profiles (user_id, role, full_name) VALUES ('<user_id>', ARRAY['superadmin'], 'Super Admin');`
4. Login ที่เว็บ

### 6. ตั้งค่าเริ่มต้นผ่าน UI

1. **Settings → ข้อมูลโรงเรียน** — ใส่ชื่อโรงเรียน, อัปโหลด logo
2. **Settings → ระดับชั้นการศึกษา** — เพิ่ม อนุบาล, ประถม, มัธยมต้น, มัธยมปลาย
3. **Settings → ชั้นปี** — เพิ่มชั้นปีแต่ละระดับ
4. **Settings → ปีการศึกษา** — ตั้งค่าปีปัจจุบัน
5. **Settings → คะแนน** — ตั้ง base score, score floor
6. **Settings → เกณฑ์แจ้งเตือน** — ตั้ง thresholds (40/60/80/100)
7. **Settings → Storage** — เลือก storage provider + test connection

### 7. เพิ่มข้อมูล

1. **นำเข้าข้อมูล → นำเข้าครู** — CSV import ครู
2. **นำเข้าข้อมูล → นำเข้านักเรียน** — CSV import นักเรียน + ผู้ปกครอง
3. **ห้องเรียน** — สร้างห้องเรียนตามโครงสร้าง
4. **รายชื่อครู → จัดการ** — assign ครูเข้าห้อง
