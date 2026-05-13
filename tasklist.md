# ✅ Task List — Student Conduct Score System

## ระบบคะแนนความประพฤตินักเรียน

> Actual project status — updated 2026-05-11
> ระบบทำงานแล้วบน production (Vercel + Supabase)

---

## ✅ สรุปสถานะปัจจุบัน

### Database Schema (Supabase) — ✅ เสร็จสมบูรณ์
| ตาราง | สถานะ | ข้อมูล |
|-------|--------|--------|
| `profiles` | ✅ | 331 records |
| `academic_years` | ✅ | 1 record |
| `education_stages` | ✅ | 5 records |
| `grade_levels` | ✅ | 12 records |
| `classrooms` | ✅ | 24 records |
| `students` | ✅ | 300 records |
| `student_enrollments` | ✅ | 300 records |
| `guardians` | ✅ | 300 records |
| `student_guardians` | ✅ | 300 records |
| `teachers` | ✅ | 30 records |
| `teacher_positions` | ✅ | 7 records |
| `teacher_classrooms` | ✅ | 25 records |
| `score_categories` | ✅ | 13 records |
| `score_transactions` | ✅ | 103 records |
| `score_transaction_evidence` | ✅ | Empty |
| `permissions` | ✅ | 33 records |
| `role_permissions` | ✅ | 48 records |
| `profile_permission_overrides` | ✅ | Empty |
| `settings` | ✅ | 15 records |
| `audit_logs` | ✅ | Empty |
| `action_logs` | ✅ | Empty |
| `notifications` | ✅ | Empty |
| `bond_documents` | ✅ | Empty |
| `monthly_reports` | ✅ | Empty |
| `intervention_logs` | ✅ | Empty |
| `pdpa_consents` | ✅ | Empty |

### API Routes — ✅ เสร็จสมบูรณ์ (พื้นฐาน)
| Route | สถานะ |
|-------|--------|
| `POST /api/auth/login` | ✅ รองรับ role-based redirect, student login, must_change_password |
| `GET /api/auth/logout` | ✅ |
| `GET /api/auth/debug` | ✅ |
| `POST /api/upload/logo` | ✅ |

### Backend Actions — ✅ เสร็จสมบูรณ์ (พื้นฐาน)
| File | สถานะ |
|------|--------|
| `src/lib/actions/student.action.ts` | ✅ Student CRUD + dashboard |
| `src/lib/actions/score.action.ts` | ✅ Score record |
| `src/lib/actions/classroom.action.ts` | ✅ Classroom CRUD |
| `src/lib/actions/teacher.action.ts` | ✅ Teacher CRUD |
| `src/lib/actions/grade-level.action.ts` | ✅ Grade level CRUD |
| `src/lib/actions/teacher-position.action.ts` | ✅ Teacher position CRUD |
| `src/lib/actions/report.action.ts` | ✅ Report generation |
| `src/lib/actions/dashboard.action.ts` | ✅ Dashboard + PDPA + must_change_password |

### DB Queries — ✅ เสร็จสมบูรณ์
| File | สถานะ |
|------|--------|
| `student.queries.ts` | ✅ |
| `score.queries.ts` | ✅ |
| `classroom.queries.ts` | ✅ |
| `teacher.queries.ts` | ✅ |
| `dashboard.queries.ts` | ✅ |

### Validation — ✅ เสร็จสมบูรณ์
| File | สถานะ |
|------|--------|
| `schemas.ts` | ✅ 25+ Zod schemas |
| `form-utils.ts` | ✅ Form utilities |

### Security — ✅ เสร็จสมบูรณ์ (พื้นฐาน)
| File | สถานะ |
|------|--------|
| `sanitize.ts` | ✅ XSS sanitization |
| `validate-input.ts` | ✅ Input validation |
| `headers.ts` | ✅ Security headers |

### UI Components — ✅ เสร็จสมบูรณ์ (พื้นฐาน)
| Component | สถานะ |
|-----------|--------|
| `student-table.tsx` | ✅ |
| `student-search.tsx` | ✅ พร้อม academic year + stage + grade level + classroom filter |
| `student-form.tsx` | ✅ พร้อม current year + grade level + classroom dependency + guardian fields |
| `student-detail.tsx` | ✅ แสดงครูประจำชั้น/ที่ปรึกษา + guardian fields |
| `score-record-form.tsx` | ✅ พร้อม category Select fix |
| `score-transaction-table.tsx` | ✅ |
| `score-category-form.tsx` | ✅ |
| `score-badge.tsx` | ✅ |
| `classroom-table.tsx` | ✅ |
| `classroom-form.tsx` | ✅ สร้างห้องแบบ ระดับชั้น → ชั้นปี → จำนวนห้อง |
| `teacher-table.tsx` | ✅ |
| `teacher-form.tsx` | ✅ |
| `app-sidebar.tsx` | ✅ |
| `top-bar.tsx` | ✅ |
| `user-menu.tsx` | ✅ |
| `language-switcher.tsx` | ✅ |
| `FormField.tsx` | ✅ |
| `SafeText.tsx` | ✅ |
| `empty.tsx` | ✅ |
| `spinner.tsx` | ✅ |

### Auth System — ✅ เสร็จสมบูรณ์ (พื้นฐาน)
| Feature | สถานะ |
|---------|--------|
| Login (email/password) | ✅ |
| Login (student_id/password) | ✅ newly added |
| Role-based redirect | ✅ admin/teacher → /dashboard, student → /student/dashboard |
| must_change_password check | ✅ redirect to /change-password |
| PDPA consent check | ✅ redirect to /pdpa-consent |
| proxy.ts middleware | ✅ auth guard + locale cookie |
| Logout | ✅ |
| Change password | ✅ |

### Pages — ✅ เสร็จสมบูรณ์ (พื้นฐาน)
| Page | สถานะ |
|------|--------|
| `/` → redirect `/login` | ✅ |
| `/login` | ✅ รองรับ staff + student login |
| `/pdpa-consent` | ✅ |
| `/pdpa-rejected` | ✅ |
| `/change-password` | ✅ |
| `/dashboard` | ✅ Admin/teacher dashboard + PDPA + must_change_password check |
| `/student/dashboard` | ✅ Student self-view + PDPA + must_change_password check |
| `/students` | ✅ Student list + search + filter |
| `/students/[id]` | ✅ Student detail |
| `/score/record` | ✅ Score record |
| `/score/categories` | ✅ Score categories management |
| `/classrooms` | ✅ Classroom list |
| `/classrooms/[id]` | ✅ Classroom detail |
| `/teachers` | ✅ Teacher list |
| `/teachers/[id]` | ✅ Teacher detail |
| `/reports` | ✅ Report hub |
| `/reports/individual` | ✅ |
| `/reports/classroom` | ✅ |
| `/reports/threshold` | ✅ |
| `/settings` | ✅ School info + logo upload |
| `/settings/academic-years` | ✅ Academic year management |
| `/settings/education-stages` | ✅ Education stage management |
| `/settings/grade-levels` | ✅ Grade level management |
| `/settings/teacher-positions` | ✅ Teacher position management |
| `/settings/import` | ✅ CSV import |
| `/settings/logs` | ✅ Audit log viewer |

### Infrastructure — ✅ เสร็จสมบูรณ์
| Feature | สถานะ |
|---------|--------|
| Next.js 16 App Router | ✅ |
| TypeScript | ✅ |
| Tailwind v4 | ✅ |
| shadcn/ui 30+ components | ✅ |
| Supabase client (server.ts, client.ts) | ✅ Custom auth (base64 cookie) |
| i18n (next-intl) | ✅ Configured (messages files exist) |
| Language switcher | ✅ |
| ThemeProvider + dark mode | ✅ |
| Security headers + CSP | ✅ |
| Vercel deployment | ✅ |
| GitHub Actions CI | ✅ |
| School logo upload (Supabase Storage) | ✅ |

---

## ✅ งานล่าสุดที่ทำแล้ว (2026-05-13)

- [x] **Education Structure Tree View** — `/settings/education-stages` เป็น tree view (ระดับ → ชั้นปี → ห้องเรียน) ในหน้าเดียว
- [x] สร้างห้องอัตโนมัติ: `{ชั้นปี}/{เลขถัดไป}` — ไม่ต้องกรอก form, กด `+` ปุ๊บสร้างปั๊บ
- [x] ลบห้องได้เฉพาะห้องสุดท้ายในชั้นปี, ลบชั้นปีได้เมื่อไม่มีห้อง, ลบระดับได้เมื่อไม่มีชั้นปี
- [x] **Teacher CSV Import** — `importTeachersCsv` server action + ปุ่มบนหน้ารายชื่อครู, headers ไทย/อังกฤษ
- [x] **Teacher Detail Redesign** — แยกครูประจำชั้น/ครูผู้ช่วย, avatar, contact tiles, สิทธิ์ badge
- [x] **Teacher Form Redesign** — avatar กลาง, ปุ่มแนวตั้งเต็มกว้าง `h-11`, สิทธิ์มีคำอธิบาย, ช่องสูงเท่ากัน
- [x] **Responsive Filter Grids** — ทุกหน้าใช้ `sm:grid-cols-2 lg:grid-cols-[...]` ไม่ต้องกำหนดทีละ breakpoint
- [x] **UUID Display Fix** — `itemToStringLabel` บนทุก filter Select ป้องกัน UUID แสดงใน UI
- [x] **SelectTrigger `!h-10` Fix** — ทุก filter Select สูง 40px เท่ากับ Input
- [x] **N+1 Query Fix** — `listClassrooms` batch student/teacher counts (49 queries → 3 queries)
- [x] **Dashboard Layout Swap** — นักเรียนถึงเกณฑ์คู่กับแจกแจงคะแนน, รายการล่าสุดด้านล่าง
- [x] **TopBar Sticky** — `sticky top-0 z-10` + `overflow-hidden h-dvh`
- [x] **Phone Format Display** — `formatPhoneDisplay()` → `XXX-XXX-XXXX` ทั่วระบบ (teacher table, student detail)
- [x] **Classroom Table Clickable** — กด row ไป `/classrooms/[id]`, dropdown action มี stopPropagation
- [x] **Classroom Filter** — เพิ่ม dropdown "ชื่อห้อง" ในหน้า `/classrooms`
- [x] **Avatar Upload Fix** — `studentSchema` เพิ่ม `avatar_url`, `teacherSchema` แก้ `.url()` → `.string()`
- [x] **Login Form Fix** — `handleQuickLogin` ใช้ `finally` แทน `catch` สำหรับ `setLoading(false)`
- [x] **Score History Filters** — หน้า `/score/history` มี filter: ค้นหา, ระดับ, ชั้นปี, ห้อง, ประเภท
- [x] **Teacher Page Filters** — ค้นหา, สิทธิ์, สถานะ, แผนก + click row → detail
- [x] **Classroom Table** — เอาคอลัมน์ชั้นปีออก, เพิ่ม filter ชื่อห้อง, responsive grid

## ✅ งานก่อนหน้า (2026-05-10)

- [x] เพิ่ม global academic year selector และให้มีผลกับ dashboard/students/classrooms/score record
- [x] เพิ่ม master data `grade_levels` และ migration `supabase/migrations/20260510120000_add_grade_levels_master_data.sql`
- [x] เพิ่มหน้า `/settings/grade-levels` สำหรับสร้าง/แก้ไข/ปิดใช้งานชั้นปี
- [x] เพิ่มแท็บ Settings → โครงสร้างชั้นเรียน พร้อม shortcut ไปปีการศึกษา/ระดับชั้น/ชั้นปี/ห้องเรียน
- [x] ปรับการสร้างห้องเรียนเป็น ระดับชั้น → ชั้นปี → จำนวนห้อง และตั้งชื่อห้องจาก `grade_levels.name`
- [x] ผูกห้องเรียนเดิมกับ `grade_level_id` ครบแล้ว
- [x] ปรับ filter นักเรียนและบันทึกคะแนนให้ใช้ชั้นปีจาก DB ไม่ fix ใน code
- [x] เพิ่มข้อมูลนักเรียน/CSV: คำนำหน้า, ผู้ปกครอง, ความสัมพันธ์, เบอร์โทรผู้ปกครอง
- [x] เพิ่มข้อมูลครู: คำนำหน้า, เบอร์โทร, e-mail, ตำแหน่งครู
- [x] เพิ่ม teacher positions และ UI กำหนดตำแหน่งครู
- [x] ตารางรายชื่อนักเรียนแสดงคะแนนปัจจุบัน และคลิก row เพื่อเปิด profile ได้
- [x] ประวัติคะแนน modal แสดง evidence image ถ้ามี
- [x] Settings มี Google Drive config fields และ upload route เริ่มรองรับ Google Drive สำหรับ profile/evidence แล้ว
- [x] ปรับ policy ปีการศึกษา: topbar ใช้ดูย้อนหลัง, import/record score ทำได้เฉพาะปีปัจจุบัน, หน้า academic years ไม่มีปุ่มตั้ง current แบบเลือกเอง
- [x] เพิ่ม action ขึ้นปีการศึกษาถัดไป: เช็คว่าปีเดิมสิ้นสุดแล้ว, copy ห้อง/ครูประจำห้อง, แล้วตั้งปีถัดไปเป็น current อัตโนมัติ
- [x] ปรับรายงานรายห้องเรียนไม่ให้ Select แสดง classroom id แทนชื่อห้อง
- [x] ขยาย i18n coverage แล้ว: `messages/th.json` และ `messages/en.json` มีประมาณ 722 strings ต่อภาษา ครอบคลุม navigation, dashboard, reports/settings/students หลายส่วน, ปีการศึกษา, import CSV, master data, profile/audit log และ common UI หลัก
- [x] แปลง i18n บางส่วนของ reports, score, settings, teacher/student management และ PDF/profile flow แล้ว แต่ยังไม่ครบแบบ strict ทุกข้อความที่ผู้ใช้เห็น
- [x] ย้าย validation/Zod error messages หลักใน `src/lib/validation/schemas.ts` ไปอยู่ใน namespace `validation` ของ `messages/th.json` และ `messages/en.json` โดย schema ใช้ข้อความ default จาก message file แทนการฝังประโยคไทยใน schema
- [x] แปลง Layout/UI เล็ก ๆ เป็น i18n แล้ว: sidebar disabled tooltip/current-year text, notification bell title/empty state/date locale, dashboard error page และ `/students/me` loading/not-found state
- [x] แปลง auth pages เป็น i18n แล้ว: change password, PDPA consent และ PDPA rejected
- [x] เพิ่ม audit/action logging helper กลางแบบ best-effort และต่อกับ settings, teacher role/status/assignment, student add/edit/status/archive/import, score record/bulk/approve/void/category, classroom create/edit/delete/teacher assignment, upload logo/avatar/evidence และ login success/failure
- [x] ปรับ `/settings/logs` ให้แสดงทั้ง Audit logs และ Action logs แยก tab
- [x] เพิ่ม storage provider config ให้เลือกได้ระหว่าง Vercel Blob, Google Drive และ Supabase Storage; Vercel Blob ใช้ `BLOB_READ_WRITE_TOKEN`/`STORAGE_PROVIDER` และ evidence รองรับ private blob ผ่าน `/api/blob/...`
- [x] ทดสอบ Vercel Blob ด้วย token จริงแล้ว: upload/read/delete ผ่านสำหรับ logo, profile และ evidence แบบ private store
- [x] เพิ่ม storage test connection ใน Settings, upload validation/rate limit กลาง, API error messages ตาม locale, evidence bucket fallback เป็น `evidence`, และ audit IP/user-agent สำหรับ upload/storage test
- [x] เพิ่ม threshold notification จาก event record/approve คะแนนปีปัจจุบัน พร้อม recipient admin/superadmin + homeroom/assistant, duplicate guard ผ่าน metadata และ mark-read ownership
- [x] เพิ่ม pagination/load-more ให้หน้า list หลักแล้ว: `/teachers`, `/classrooms`, `/classrooms/[id]`, `/reports/individual`, `/reports/threshold`, `/reports/bond`, `/settings/logs`, `/interventions`, และ notification bell
- [x] Build ผ่านด้วย `npm run build`

## 📋 ฟีเจอร์ที่ยังต้องทำต่อ

### High Priority
- [ ] **i18n integration ทั้งระบบ — งานคงเหลือหลังทำ partial แล้ว**  
  ทำไปแล้ว: config + language switcher + message files TH/EN ประมาณ 722 strings ต่อภาษา และแปลงหน้าหลักหลายส่วนแล้ว  
  เหลือทำต่อ:
  - [x] Upload/storage API error messages ที่แสดงถึงผู้ใช้ผ่าน message files แล้ว
  - [x] Notification bell แสดง type label และ event threshold message แล้ว
  - [x] Auth login route และ `/api/auth/me/student` ใช้ API message files แล้ว
  - [ ] Server action errors และ API routes อื่นที่ยังเหลือ
  - [ ] ตรวจ hardcoded ที่เหลือใน reports/score/settings/teacher/student profile/PDF ให้ครบแบบ strict
  - [ ] แยก domain data ที่ไม่ควร i18n เช่น CSV Thai headers, คำนำหน้า, sample import data ออกจาก UI copy ที่ต้อง i18n
- [ ] **รายงานนักเรียนถึงเกณฑ์ + การแจ้งเตือน**
  - [x] แปลง `/reports/threshold` เป็น i18n สำหรับ UI/filters หลักแล้ว
  - [x] เพิ่ม filter/search/pagination และ export filename ที่มีปีการศึกษา
  - [x] สร้าง notification เมื่อ student reached threshold จาก record/approve score event ของปีปัจจุบัน
  - [x] แจ้ง admin/superadmin และครูประจำห้อง/ครูที่ปรึกษาตาม `teacher_classrooms`
  - [x] ป้องกัน duplicate notification ต่อ threshold/ปีการศึกษา/recipient ผ่าน metadata
  - [x] Notification bell แสดง type/link target และ mark read เฉพาะ notification ของตัวเอง
- [ ] **Storage production hardening**
  - [x] เพิ่มปุ่ม test connection ใน Settings
  - [x] ตรวจ Vercel Blob token หรือ Google Drive service account/folder permission ตาม provider ที่เลือกผ่าน `/api/storage/test`
  - [x] แก้ evidence fallback จาก bucket `school-logos` เป็น bucket `evidence`
  - [x] Validate evidence type/size/count ให้ชัด และห้ามไฟล์เสี่ยงตาม req
  - [x] เพิ่ม rate limit upload และ audit log พร้อม IP/user-agent สำหรับ upload/storage test
  - [x] Verify/ปรับ evidence modal fallback URL ให้ใช้ bucket `evidence`; private blob/profile photo ยังใช้ `/api/blob/...` จาก upload route เดิม
- [x] **Annual rollover/import** — หลังขึ้นปีใหม่แล้วมี flow นำเข้า enrollment ปีปัจจุบันพร้อม preview ก่อนบันทึก และ reuse นักเรียนเดิมด้วย `student_id_number`
  - [x] หน้า import แยกขั้น preview → confirm ก่อนเขียนข้อมูลจริง
  - [x] backend import จำกัดเฉพาะปีการศึกษาปัจจุบันที่ยังไม่ปิด
  - [x] backend import match นักเรียนเดิมด้วย `student_id_number` แล้วสร้าง/อัปเดต `student_enrollments` ของปีใหม่แทนการสร้างบัญชีซ้ำ
  - [x] นักเรียนที่ไม่ถูก import ในปีใหม่จะไม่มี enrollment ปีใหม่ และประวัติปีเก่ายังคงอยู่
- [x] **Role assignment UI** — จัดการ role `teacher/admin/superadmin` ผ่านฟอร์มรายชื่อครูแล้ว

### Medium Priority
- [ ] **Student status management** — change status (active/inactive/transferred/graduated) พร้อม enrollment history
- [x] **Audit/action logs coverage ระดับ MVP** — มี helper กลาง, login action logs, viewer audit/action logs และบันทึก action สำคัญแล้ว
- [x] **Audit/action logs hardening** — เพิ่ม coverage viewer/action logs, login/upload rate-limit events, score view audit, และ before/after สำหรับ approve/void/import ที่สำคัญ
- [x] **Academic year backend hardening** — edit student/import/score/approval จำกัดเฉพาะปีปัจจุบันที่เปิดอยู่ และ action ขึ้นปีใหม่ block เมื่อปีเดิมยังไม่สิ้นสุด
- [x] **Score approval hardening** — approve ได้เฉพาะ pending, void ได้เฉพาะ pending/approved, ตรวจ evidence และปีการศึกษาปัจจุบันก่อนแก้คะแนน พร้อม audit before/after
- [x] **School statistics page** — charts/histograms ในเมนู Reports (`/reports/statistics`) สำหรับสรุปภาพรวมคะแนนพฤติกรรมของโรงเรียน
- [x] **Notifications realtime** — notification bell refresh จาก Supabase realtime channel พร้อม fallback polling/focus refresh
- [x] **Score approval realtime + notifications** — หน้าอนุมัติคะแนน refresh จาก Supabase realtime สำหรับ pending queue, dashboard/threshold refresh เฉพาะคะแนนที่ approved/เคย approved, และส่ง notification ไปยัง admin/superadmin เมื่อมีคะแนนรออนุมัติ

### Low Priority / Nice to Have
- [x] **Production rate limiting + shared cache** — ใช้ Upstash Redis ผ่าน Vercel Marketplace สำหรับ login/upload/storage test และ cache master data/select list โดย fallback เป็น in-memory เมื่อไม่มี env
- [x] **Teacher CSV Import** — `importTeachersCsv` server action + ปุ่ม Import บนหน้ารายชื่อครู, headers ไทย/อังกฤษ
- [x] **Education Structure Tree View** — `/settings/education-stages` tree view พร้อม auto-create/delete classrooms
- [x] **Responsive Filter Grids** — ทุกหน้า filter ใช้ responsive grid, `!h-10` fix, `itemToStringLabel` UUID fix
- [x] **Phone Format Display** — `formatPhoneDisplay()` → `XXX-XXX-XXXX` ทั่วระบบ
- [x] **N+1 Query Fix** — `listClassrooms` batch student/teacher counts (49→3)
- [x] **TopBar Sticky** — `sticky top-0` + `overflow-hidden h-dvh`
- [x] **Dashboard Layout Swap** — นักเรียนถึงเกณฑ์คู่กับแจกแจงคะแนน, รายการล่าสุดด้านล่าง
- [x] **Avatar Upload Fix** — `studentSchema` + `avatar_url`, `teacherSchema` แก้ `.url()` → `.string()`
- [x] **Classroom Table Clickable** — กด row ไปหน้ารายละเอียด
- [ ] **ScoreTimeline chart** — recharts line chart component
- [ ] **PDPA version management** — admin publish new version
- [x] **School branding in login page** — show logo + school name from Settings on login page
- [x] **Production error monitoring** — เพิ่ม Sentry SDK สำหรับ Next.js, client/server/edge instrumentation, source map upload config, CSP connect-src สำหรับ Sentry ingest, token-gated API test route `/api/debug/sentry` และ verify page `/sentry-example-page`

---

## 📊 Progress Summary

| หมวด | สถานะ | รายละเอียด |
|------|--------|-----------|
| Database Schema (25+ tables) | ✅ 100% | All tables with data, including education_stages + grade_levels |
| API Routes | ✅ 85% | Core auth + upload + evidence |
| Backend Actions | ✅ 95% | All CRUD + dashboard + auth + teacher CSV import |
| Validation | ✅ 100% | 25+ Zod schemas, avatar_url fixed |
| Security | ✅ 70% | Sanitization + headers, limited rate limiting |
| UI Components | ✅ 90% | Teacher form redesign, tree view, responsive filters, phone format |
| Pages | ✅ 95% | 30+ routes, all pages with responsive filters, clickable rows |
| Auth Flow | ✅ 95% | Login, student login, role redirect, PDPA fix, must_change_password |
| Academic Structure | ✅ 98% | Tree view manage years/stages/grade levels/classrooms; auto-create classrooms; N+1 fixed |
| i18n | ⏳ 65% | Config + switcher done; TH/EN messages ~730 strings each; main UI partially translated |
| Reports | ✅ 85% | Individual, classroom, threshold, bond, statistics, score history with filters |
| Advanced Features | ✅ 70% | Evidence, bonds, interventions, notifications, approval, teacher CSV import |
| Testing | ✅ Playwright | Playwright installed for e2e testing |
| Infrastructure | ✅ 95% | school.config.ts, loading/error states, nav links, sticky topbar, Supabase max-rows configured |
| **Overall** | **~92%** | Production-ready; tree view, teacher import, responsive filters, phone format, N+1 fix, avatar fix done |
