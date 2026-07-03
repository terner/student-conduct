# 06 — การบันทึกคะแนน

## ระบบคะแนน

- **คะแนนตั้งต้น:** 100 ต่อปีการศึกษา (แก้ไขได้ใน settings)
- **คะแนนขั้นต่ำ:** 0 (แสดงไม่ต่ำกว่า 0)
- **คะแนนเกิน 100:** แสดงเป็น "100+" (ตาม setting `display_score_above_base_as`)

## ประเภทคะแนน

| Type | ตัวอย่าง |
|------|---------|
| `deduct` (หัก) | มาสาย (-5), แต่งกายผิดระเบียบ (-5), ทะเลาะวิวาท (-20), พกพาสิ่งต้องห้าม (-30) |
| `add` (เพิ่ม) | จิตอาสา (+5), ช่วยงานโรงเรียน (+5), พฤติกรรมดีเด่น (+10) |

จัดการ categories ได้ที่ `/score/categories`

### Category Settings

- `default_points` — คะแนนเริ่มต้น
- `requires_evidence` — ต้องแนบรูปหลักฐาน
- `requires_approval` — ต้องให้ admin อนุมัติ
- `is_active` — เปิด/ปิดการใช้งาน

## การบันทึกคะแนน

### บันทึกทีละคน (`/score/record`)

1. เลือกนักเรียน
2. เลือก category (หัก/เพิ่ม)
3. ใส่คะแนน + หมายเหตุ
4. แนบรูป (ถ้า required)
5. บันทึก

### Bulk record

1. เลือก category
2. เลือกนักเรียนหลายคน
3. ใส่คะแนนเท่ากันทุกคน
4. บันทึก

## การอนุมัติคะแนน

คะแนนที่ต้องอนุมัติ:
- Category ที่ `requires_approval = true`
- คะแนนเกิน threshold (default: 20 คะแนน ตาม setting `require_approval_above_points`)

### Flow

```
ครูบันทึก → status = pending → admin อนุมัติ → status = approved → นับเป็นคะแนนจริง
                                  └─ admin ปฏิเสธ → status = rejected
```

- คะแนน `pending` ไม่นับในคะแนนปัจจุบัน
- `/score/approval` — admin เห็นรายการรออนุมัติ

## การ Void คะแนน

- คะแนนที่ approved แล้ว **ห้ามลบ** — ใช้ void แทน
- Void → `status = 'voided'` + `void_reason` + `voided_by` + `voided_at`
- คะแนน void แล้วจะไม่นับในคะแนนปัจจุบัน

## ระดับความประพฤติ

| ระดับ | คะแนน | สี |
|-------|--------|----|
| ดีมาก | 100+ | 🟢 #27500A |
| ดี | 80-99 | 🔵 #0C447C |
| พอใช้ | 50-79 | 🟤 #633806 |
| ต้องปรับปรุง | <50 | 🔴 #A32D2D |

## Thresholds — เกณฑ์แจ้งเตือน

| ถูกหัก | คะแนนคงเหลือ | การดำเนินการ |
|--------|-------------|-------------|
| 40 | 60 | ทำทัณฑ์บนครั้งที่ 1 — เชิญผู้ปกครอง |
| 60 | 40 | ทำทัณฑ์บนครั้งที่ 2 — เชิญผู้ปกครอง |
| 80 | 20 | ทำทัณฑ์บนครั้งที่ 3 — อาจพักการเรียน |
| 100 | 0 | ย้ายสถานศึกษา |

แก้ไข thresholds ได้ที่ Settings → เกณฑ์แจ้งเตือน

## DB Tables

| Table | Key |
|-------|-----|
| `score_categories` | `type` (deduct/add), `default_points` |
| `score_transactions` | `status` (pending/approved/rejected/voided), FK → students, categories |
| `score_transaction_evidence` | FK → score_transactions |
