# ✅ Task List — Student Conduct Score System

## ระบบคะแนนความประพฤตินักเรียน

> Actual project status — updated 2026-06-04
> ระบบทำงานแล้วบน production (Vercel + Supabase)

---

## ✅ สรุปสถานะปัจจุบัน

### Database Schema (Supabase) — ✅ เสร็จสมบูรณ์
| ตาราง | สถานะ | ข้อมูล |
|-------|--------|--------|
| `profiles` | ✅ | 724 records |
| `academic_years` | ✅ | 1 record |
| `education_stages` | ✅ | 5 records |
| `grade_levels` | ✅ | 12 records |
| `classrooms` | ✅ | 24 records |
| `students` | ✅ | 689 records |
| `student_enrollments` | ✅ | 689 records |
| `guardians` | ✅ | 0 records |
| `student_guardians` | ✅ | 0 records |
| `teachers` | ✅ | 32 records |
| `teacher_positions` | ✅ | 7 records |
| `teacher_classrooms` | ✅ | 31 records |
| `score_categories` | ✅ | 82 records |
| `score_transactions` | ✅ | 2 records |
| `score_transaction_evidence` | ✅ | Empty |
| `permissions` | ✅ | 33 records |
| `role_permissions` | ✅ | 48 records |
| `profile_permission_overrides` | ✅ | Empty |
| `settings` | ✅ | 22 records |
| `audit_logs` | ✅ | 171 records |
| `action_logs` | ✅ | 217 records |
| `notifications` | ✅ | 18 records |
| `bond_documents` | ✅ | Empty |
| `monthly_reports` | ✅ | Empty |
| `intervention_logs` | ✅ | Empty |
| `pdpa_consents` | ✅ | 34 records |

### Import / Migration Snapshot — 2026-06-04
- Target project ref: `yiejvcmpulyervsehdzj`
- Source dump: `supabase/backups/khaowang-2026-06-04/{roles.sql,schema.sql,data.sql}`
- Working path ที่ใช้ได้จริง: `supabase link --project-ref yiejvcmpulyervsehdzj --password "$SUPABASE_DB_PASSWORD" --workdir supabase` แล้ว apply/query ผ่าน `supabase db query --linked`
- `schema.sql` apply ได้ตรง
- `data.sql` จาก pg_dump แบบ `COPY` ต้องแปลงเป็น `INSERT` ก่อน replay ใน linked mode
- ไฟล์ช่วยสำหรับ rerun:
  - `supabase/reset-target-for-import.sql`
  - `scripts/generate-import-sql.mjs`
- ข้อจำกัดที่ยังเหลือ: `storage.buckets` และ `storage.objects` ของ target ไม่ได้ถูก reset ทับทั้งหมด และ binary files ของ Storage ไม่ได้อยู่ใน SQL dump

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
| `sortable-table-head.tsx` / `table-helpers.ts` | ✅ helper กลางสำหรับ table sort/nullable display/status lookup |
| `student-table.tsx` | ✅ ใช้ helper กลาง + sortable headers + no literal fallback |
| `student-search.tsx` | ✅ พร้อม academic year + stage + grade level + classroom filter |
| `student-form.tsx` | ✅ พร้อม current year + grade level + classroom dependency + guardian fields |
| `student-detail.tsx` | ✅ แสดงครูประจำชั้น/ที่ปรึกษา + guardian fields |
| `score-record-form.tsx` | ✅ พร้อม category Select fix |
| `score-transaction-table.tsx` | ✅ ใช้ helper กลาง + sortable headers + no literal fallback หลัก |
| `score-category-form.tsx` | ✅ |
| `score-badge.tsx` | ✅ |
| `classroom-table.tsx` | ✅ ใช้ helper กลาง + sortable headers + no literal fallback |
| `classroom-form.tsx` | ✅ สร้างห้องแบบ ระดับชั้น → ชั้นปี → จำนวนห้อง |
| `teacher-table.tsx` | ✅ ใช้ helper กลาง + sortable headers + no literal fallback |
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

## ✅ งานล่าสุดที่ทำแล้ว (2026-05-10)

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
- [x] ปรับ shared data table layout ให้ใช้ page-level pagination toolbar ตรงกันแล้วใน `/classrooms`, `/teachers`, `/score/record`, `/score/history`, `/interventions`, `/settings/logs`, `/reports/individual`, `/reports/bond`, `/reports/threshold`
- [x] Build ผ่านด้วย `npm run build`

## 📋 ฟีเจอร์ที่ยังต้องทำต่อ

### UI / UX Task Backlog

#### Modal Standardization
- [ ] Standardize operational modals to the shared modal pattern in `design.md`
  - scope:
    - `src/components/features/scores/score-transaction-table.tsx`
    - `src/app/(dashboard)/reports/individual/page.tsx`
    - `src/app/(dashboard)/classrooms/page.tsx`
    - `src/app/(dashboard)/classrooms/[id]/page.tsx`
    - `src/app/(dashboard)/students/page.tsx`
    - `src/app/(dashboard)/teachers/page.tsx`
    - `src/app/(dashboard)/score/categories/page.tsx`
    - `src/app/(dashboard)/settings/education-stages/page.tsx`
    - `src/app/(dashboard)/settings/teacher-positions/page.tsx`
    - `src/components/ui/dialog.tsx`
    - `src/components/ui/command.tsx`
  - requirements:
    - mobile = full-screen sheet for detail / long-form modals
    - desktop = centered modal
    - explicit close affordance
    - internal scroll containment
    - no duplicated header/body summary data
    - no hardcoded copy / no fallback literals
  - detailed follow-up:
    - [ ] Scores: convert transaction detail dialog to shared shell and normalize void confirm mobile footer behavior
    - [ ] Reports Individual: audit current sheet behavior and decide keep-as-sheet vs normalize pattern
    - [ ] Classrooms: normalize add/edit modal shell and verify nested student detail behavior
    - [ ] Students: normalize add/edit/error/delete modal shells
    - [ ] Teachers: normalize teacher form modal shell and modal-to-modal transitions
    - [ ] Score Categories: normalize add/edit/delete modal shells
    - [ ] Settings Education Stages: normalize all form/delete modals as one settings modal family
    - [ ] Settings Teacher Positions: normalize add/edit/delete modals
    - [ ] Shared dialog infrastructure: split compact confirm, form modal, and detail modal patterns without over-generalizing
    - [ ] Verification pass: mobile overflow, desktop centering, scroll, close affordance, no duplicate summary, no hardcoded/fallback

#### Settings Page Design / Responsive
- [ ] Redesign `/settings` to match shared admin surface expectations
  - file: `src/app/(dashboard)/settings/page.tsx`
  - goals:
    - stronger information hierarchy
    - mobile-safe layout
    - cleaner subsection grouping
    - no fallback / no hardcoded copy
  - tasks:
    - [ ] Header and primary save action responsiveness
      - [x] mobile header/action layout changed to stacked title + full-width save button
      - [x] desktop keeps single-row title + action layout
      - [x] add mobile bottom save action bar for long-form usability
      - [x] finalize save pattern as desktop top action + mobile bottom action bar
      - mobile stacked layout
      - desktop single-row layout
      - decide sticky top action vs bottom mobile action vs repeated save affordance
      - keep save/loading feedback close to the action
    - [ ] Settings navigation tabs
      - [x] replace wrap-prone mobile tabs with horizontal scroll tabs
      - replace wrapped tab row with stable responsive navigation
      - ensure active section remains obvious
      - evaluate desktop side-nav vs top tabs
    - [ ] Section surface consistency
      - [x] align major tabs around the same subsection surface pattern (`rounded-lg border p-4`)
      - [x] normalize content spacing rhythm across school, scores, thresholds, academic structure, and storage
      - normalize section intro, field grouping, subsection separation, and spacing rhythm
      - reduce card-inside-card feeling
    - [ ] School info section
      - [x] move school names + logo into responsive two-column layout
      - [x] change logo upload affordance from plain text link to action block
      - make logo preview/upload responsive
      - improve upload affordance hierarchy
      - keep preview/remove/upload grouped
    - [ ] Score settings section
      - [x] regroup base score and score floor into compact responsive grid
      - regroup compact numeric controls into responsive grid
      - improve scanability without extra decoration
    - [ ] Thresholds section
      - [x] redesign threshold item layout to stack cleanly on small screens
      - redesign threshold item layout for mobile
      - stack deducted/action/color/remove on small screens
      - stabilize desktop widths
      - review add button crowding in card header
    - [ ] Academic structure section
      - [x] wrap launcher actions in the same subsection surface pattern as other settings tabs
      - align launcher buttons to one shared admin shortcut pattern
    - [ ] Storage section
      - [x] separate provider selection from provider-specific config and email settings
      - [x] move provider selection into its own subsection surface and make test action mobile-safe
      - split into provider selection, provider-specific settings, connection test, email delivery settings
      - reduce form fatigue and unrelated field adjacency
    - [ ] Storage provider conditional UI
      - [x] show Google Drive fields only when `google_drive` is the active provider
      - show active-provider fields only unless there is a strong operational reason not to
      - document persistence behavior for hidden fields
    - [ ] Email settings row layout
      - [x] stack API key field + test action on mobile
      - [x] move Resend API key placeholder into i18n
      - stack API key field + test action on mobile
      - move remaining literal placeholder text into i18n
      - keep loading state from shifting layout
    - [ ] Input density and form rhythm
      - standardize fixed widths and grid/flex behavior
    - [ ] Non-superadmin variant
      - [x] align shortcut cards with the main settings surface language and button pattern
      - align shortcut-card surface with main settings IA

#### Notification Information Architecture
- [ ] Audit notification UI duplication between dashboard blocks and top-bar notification center
  - canonical inbox should remain `src/components/layout/notification-bell.tsx`
  - [x] remove duplicate notification-like sidebar section so inbox semantics stay with `NotificationBell`
  - [x] verify dashboard at-risk block is watchlist/threshold summary data, not notification inbox data
  - [ ] if a dashboard block uses the same notification data source, remove duplicate notification surface
  - [ ] if a dashboard block is a watchlist/at-risk queue, rename and restyle it so it is not presented as `การแจ้งเตือน`
  - verify data-source separation between:
    - notification inbox
    - at-risk/watchlist summary
    - academic-year alert banners

### High Priority
- [ ] **i18n integration ทั้งระบบ — งานคงเหลือหลังทำ partial แล้ว**  
  ทำไปแล้ว: config + language switcher + message files TH/EN ประมาณ 722 strings ต่อภาษา และแปลงหน้าหลักหลายส่วนแล้ว  
  เหลือทำต่อ:
  - [x] Upload/storage API error messages ที่แสดงถึงผู้ใช้ผ่าน message files แล้ว
  - [x] Notification bell แสดง type label และ event threshold message แล้ว
  - [x] Auth login route และ `/api/auth/me/student` ใช้ API message files แล้ว
  - [x] เพิ่ม table helper กลางสำหรับ sortable header, nullable cell display, status label และ compare functions
  - [x] ปรับ shared data tables หลัก (`student-table`, `teacher-table`, `classroom-table`, `score-transaction-table`) ให้ไม่มี literal fallback หลักและรองรับ sort
  - [x] ปรับ page-level table บางส่วน (`dashboard`, `interventions`, `settings/logs`, `settings/academic-years`) ให้ใช้ helper กลาง/no fallback/sort แล้ว
  - [x] ปรับ API routes ชุดแรกให้ใช้ `apiErrors`/`apiMessage` และไม่ส่ง raw provider/database/auth error ออก response: `email/test`, `notifications`, `blob`, `auth/login`, `auth/debug`, `auth/force-password-change`
  - [ ] **No fallback / no hardcode: API + server action responses**
    - [x] ปิด core response helpers: `src/lib/server-action.ts`, `src/lib/validation/form-utils.ts`, `src/lib/security/validate-input.ts`
    - [x] ปิด infra errors: `src/lib/email.ts`, `src/lib/storage/vercel-blob.ts`, `src/lib/storage/google-drive.ts`
    - [x] ปิด server action raw errors/UI namespace leakage ชุดหลัก: `student.action.ts`, `dashboard.action.ts`, `teacher.action.ts`, `classroom.action.ts`, `academic-year.action.ts`, `settings.action.ts`, `education-stage.action.ts`, `grade-level.action.ts`, `teacher-position.action.ts`
    - [x] ปิด query-layer hardcoded error ที่ leak ได้ใน `classroom.queries.ts`, `teacher.queries.ts`, `student.queries.ts` ให้เป็น error code แล้ว map กลับผ่าน action/i18n
    - [x] ปิด user-facing error response ใน `report.action.ts` และ `score.action.ts` ให้ใช้ `serverApiMessage`
    - [x] ปิด user-facing notification/email/classroom duplicate copy ใน lib/action layer ให้ใช้ `messages/*` (`score-approval`, `threshold`, `email.ts`, `classroom.action.ts`)
    - [x] ปิด `importStudentsCsv(...)` ใน scope import: CSV aliases ผ่าน domain constants, error responses ผ่าน `serverApiMessage`, default domain fallback ผ่าน constants
    - [x] ห้ามส่ง `error.message`, `authError.message`, `updateError.message`, `err.message` เป็น user-facing response ใน scope ที่แก้รอบนี้; map เป็น `apiErrors.*` หรือ action error key ที่ชัดเจน
    - [ ] ห้ามใช้ UI namespace เช่น `authPages.*`, `settings.*` ใน API/action response ยกเว้นเป็น success copy ที่ caller ไม่ใช้เป็น API error — เหลือ success copy ใน `dashboard.action.ts` ให้ตัดสินใจแยก namespace
  - [ ] **No fallback / no hardcode: Client UI**
    - [ ] ปิด literal loading/placeholder/title/sr-only/aria-label ใน layout และ UI primitives: `loading.tsx`, `classrooms/loading.tsx`, `reports/loading.tsx`, `score/*/loading.tsx`, `components/ui/sidebar.tsx`, `dialog.tsx`, `sheet.tsx`, `spinner.tsx`, `components/layout/*`
    - [x] ปิด `alert(...)`, `confirm(...)`, `toast('...')`, และ `result.error || fallback` ใน `settings/page.tsx`, `teachers/page.tsx`, `student-form.tsx`, `teacher-form.tsx`, `settings/profile/page.tsx`
    - [x] ปิด scoped page-level table fallback รอบนี้: `students/page.tsx`, `students/error.tsx`, `classrooms/page.tsx`, `settings/education-stages/page.tsx`, `student/dashboard/page.tsx`, `score-transaction-table.tsx`
    - [x] ปิด scoped `reports/*` fallback ที่สแกนเจอรอบนี้: `reports/individual`, `reports/classroom`, `reports/threshold`, `reports/bond`, `reports/statistics`
    - [x] ปิด `commonT('notAvailable')`, `'-'`, raw status/type fallback และ empty-label fallback ที่แสดงผลใน UI ส่วนที่ยังไม่ได้ไล่ครบ: `classrooms/[id]/page.tsx`, `teachers/[id]/page.tsx`, `score/*`
    - [ ] ไล่ page-level tables ที่ยังต้องใช้ helper กลาง/no fallback/sort: settings import, teacher positions
    - [x] ปรับ `score/record` ให้ใช้ shared pagination toolbar + rows-per-page + sortable headers + helper กลาง
  - [ ] **No fallback / no hardcode: Domain data separation**
    - [x] แยกคำนำหน้า (`เด็กชาย`, `เด็กหญิง`, `นาย`, `นางสาว`, `นาง`, `คุณ`) และ teacher default position/legacy prefix ออกจาก UI copy เป็น domain constants
    - [x] แยก CSV import aliases หลักของ student/teacher ออกจาก UI translation เป็น domain constants/helpers (`src/lib/domain/csv.ts`)
    - [ ] ไล่ CSV/export headers ต่อใน `settings/import/page.tsx` และ export helpers อื่นที่อยู่นอก student/teacher import scope
    - [ ] แยก sample import data และ stage codes (`primary`, `secondary`, `highschool`) ว่าเป็น stored/domain values ไม่ใช่ UI labels
    - [ ] แยก docs/wiki content ยาวใน `docs/docs-content.tsx` เป็นงาน content/i18n แยก ไม่ปนกับ workflow UI
- [x] **รายงานนักเรียนถึงเกณฑ์ + การแจ้งเตือน**
  - [x] แปลง `/reports/threshold` เป็น i18n สำหรับ UI/filters หลักแล้ว
  - [x] เพิ่ม filter/search/pagination และ export filename ที่มีปีการศึกษา
  - [x] สร้าง notification เมื่อ student reached threshold จาก record/approve score event ของปีปัจจุบัน
  - [x] แจ้ง admin/superadmin และครูประจำห้อง/ครูที่ปรึกษาตาม `teacher_classrooms`
  - [x] ป้องกัน duplicate notification ต่อ threshold/ปีการศึกษา/recipient ผ่าน metadata
  - [x] Notification bell แสดง type/link target และ mark read เฉพาะ notification ของตัวเอง
- [x] **Storage production hardening**
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
- [ ] **Storage migration completeness** — ถ้าต้องการทับ target ให้ครบทั้งระบบ ยังต้องมีแผน cleanup/import ฝั่ง `storage` metadata และ binary objects แยกจาก SQL dump

### Medium Priority
- [x] **Student status management** — import/rollover รองรับสถานะ `active`, `repeated`, `transferred`, `inactive`, `graduated` และเก็บ enrollment history แล้ว; เหลือแค่ review UX หากจะขยายเพิ่ม
- [x] **Audit/action logs coverage ระดับ MVP** — มี helper กลาง, login action logs, viewer audit/action logs และบันทึก action สำคัญแล้ว
- [x] **Audit/action logs hardening** — เพิ่ม coverage viewer/action logs, login/upload rate-limit events, score view audit, และ before/after สำหรับ approve/void/import ที่สำคัญ
- [x] **Academic year backend hardening** — edit student/import/score/approval จำกัดเฉพาะปีปัจจุบันที่เปิดอยู่ และ action ขึ้นปีใหม่ block เมื่อปีเดิมยังไม่สิ้นสุด
- [x] **Score approval hardening** — approve ได้เฉพาะ pending, void ได้เฉพาะ pending/approved, ตรวจ evidence และปีการศึกษาปัจจุบันก่อนแก้คะแนน พร้อม audit before/after
- [x] **School statistics page** — charts/histograms ในเมนู Reports (`/reports/statistics`) สำหรับสรุปภาพรวมคะแนนพฤติกรรมของโรงเรียน
- [x] **Notifications realtime** — notification bell refresh จาก Supabase realtime channel พร้อม fallback polling/focus refresh
- [x] **Score approval realtime + notifications** — หน้าอนุมัติคะแนน refresh จาก Supabase realtime สำหรับ pending queue, dashboard/threshold refresh เฉพาะคะแนนที่ approved/เคย approved, และส่ง notification ไปยัง admin/superadmin เมื่อมีคะแนนรออนุมัติ
- [ ] **Export/report completeness** — monthly snapshot, school statistics export, PDF/Excel export ยังต้องเก็บงานปลายทางให้ครบ
- [ ] **Permission editor รายละเอียด** — role assignment ระดับครูมีแล้ว แต่ editor สำหรับ `role_permissions` / `profile_permission_overrides` ยังไม่ครบ production policy
- [ ] **RLS/permission production review** — ยังต้องทบทวน policy เชิงละเอียดก่อนใช้งานจริง

### Low Priority / Nice to Have
- [x] **Production rate limiting + shared cache** — ใช้ Upstash Redis ผ่าน Vercel Marketplace สำหรับ login/upload/storage test และ cache master data/select list โดย fallback เป็น in-memory เมื่อไม่มี env
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
| Backend Actions | ✅ 90% | All CRUD + dashboard + auth |
| Validation | ✅ 100% | 25+ Zod schemas |
| Security | ✅ 70% | Sanitization + headers, no rate limiting |
| UI Components | ✅ 85% | Evidence uploader, notification bell |
| Pages | ✅ 95% | 30 routes including approval, bonds, interventions, academic years |
| Auth Flow | ✅ 95% | Login, student login, role redirect, PDPA fix, must_change_password |
| Academic Structure | ✅ 95% | Manage years/stages/grade levels/classrooms; annual rollover still pending |
| i18n | ⏳ 65% | Config + switcher done; TH/EN messages ~722 strings each; main UI partially translated; strict coverage still pending for auth, validation, API/server errors, notification, and remaining hardcoded copy |
| Reports | ✅ 80% | Individual, classroom, threshold, bond |
| Advanced Features | ✅ 60% | Evidence, bonds, interventions, notifications, approval, academic years |
| Testing | ✅ 新增 | 219 tests across 6 files (vitest) |
| Infrastructure | ✅ 90% | school.config.ts, loading/error states, nav links |
| **Overall** | **~88%** | Production-ready test data + academic structure done; upload/rollover/permissions remain |

## Table Scope Notes

- Shared data tables ที่ตอนนี้เข้า pattern กลางแล้ว:
  - `/students`
  - `/teachers`
  - `/classrooms`
  - `/score/record`
  - `/interventions`
  - `/settings/logs`
  - `/reports/individual`
  - `/reports/bond`
  - `/reports/threshold`
- Fixed-order / report-detail tables ที่ตั้งใจไม่บังคับ pagination toolbar:
  - `/reports/classroom`
  - `/reports/statistics`
  - `/student/dashboard`
  - `student-detail-dialog`
- Preview/sample/config tables ที่ยังเป็น scope แยก:
  - `/settings/import`
  - `/settings/teacher-positions`
  - `/settings/academic-years`
