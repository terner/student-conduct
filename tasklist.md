# ✅ Task List — Student Conduct Score System

## ระบบคะแนนความประพฤตินักเรียน

> Actual project status — updated 2026-05-10
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
- [x] Settings มี Google Drive config fields สำหรับ phase upload ต่อไป
- [x] Build ผ่านด้วย `npm run build`

## 📋 ฟีเจอร์ที่ยังต้องทำต่อ

### High Priority
- [ ] **i18n integration in pages** — all pages use hardcoded Thai, need `useTranslations()`
- [ ] **Google Drive upload integration** — ใช้ config ใน Settings เพื่ออัปโหลดรูป profile และ score evidence ไป Google Drive
- [ ] **Annual rollover/import** — flow ขึ้นปีใหม่, สร้าง/เลือกห้องรายปี, ย้าย enrollment, preview import ก่อนบันทึก
- [ ] **Permission/Admin UI** — หน้า UI สำหรับกำหนด role/เพิ่ม admin ให้ครูบางคน และจัดการ permissions

### Medium Priority
- [ ] **Student status management** — change status (active/inactive/transferred/graduated) พร้อม enrollment history
- [ ] **Audit/action logs coverage** — บันทึก import/export/settings/role/score/classroom changes ให้ครบ
- [ ] **Guardian management UI** — รองรับผู้ปกครองหลายคนต่อ student profile
- [ ] **Score approval hardening** — ตรวจ pending/approve/reject/void + evidence + audit log ให้ครบ
- [ ] **Monthly reports** — generate + snapshot + PDF
- [ ] **School statistics page** — charts, histograms
- [ ] **CSV export** — export students/scores/reports
- [ ] **Notifications realtime** — approval/threshold events + unread state
- [ ] **Bond document generation** — generate/print/sign flow

### Low Priority / Nice to Have
- [ ] **Rate limiting** — @upstash/ratelimit
- [ ] **ScoreTimeline chart** — recharts line chart component
- [ ] **PDPA version management** — admin publish new version
- [ ] **School branding in login page** — show logo + school name

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
| i18n | ⏳ 25% | Config + switcher done, pages not fully translated |
| Reports | ✅ 80% | Individual, classroom, threshold, bond |
| Advanced Features | ✅ 60% | Evidence, bonds, interventions, notifications, approval, academic years |
| Testing | ✅ 新增 | 219 tests across 6 files (vitest) |
| Infrastructure | ✅ 90% | school.config.ts, loading/error states, nav links |
| **Overall** | **~88%** | Production-ready test data + academic structure done; upload/rollover/permissions remain |
