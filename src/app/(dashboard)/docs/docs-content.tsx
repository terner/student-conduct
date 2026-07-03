'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';

const sections = [
  { id: 'roles', title: 'สิทธิ์และบทบาท' },
  { id: 'structure', title: 'โครงสร้างโรงเรียน' },
  { id: 'teachers', title: 'การจัดการครู' },
  { id: 'students', title: 'การจัดการนักเรียน' },
  { id: 'scores', title: 'ระบบคะแนน' },
  { id: 'reports', title: 'รายงาน' },
  { id: 'settings', title: 'ตั้งค่าระบบ' },
  { id: 'faq', title: 'คำถามที่พบบ่อย' },
];

export function DocsContent() {
  const [active, setActive] = useState('roles');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-10% 0px -80% 0px' }
    );

    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r bg-card overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">คู่มือการใช้งาน</span>
        </div>
        <nav className="space-y-0.5">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                active === s.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${active === s.id ? 'rotate-90' : ''}`} />
              {s.title}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8 space-y-10">
          <div className="pb-4 border-b">
            <h1 className="text-2xl font-bold">คู่มือการใช้งาน</h1>
            <p className="text-muted-foreground mt-1">ระบบคะแนนความประพฤตินักเรียน</p>
          </div>

          <WikiSection id="roles" title="สิทธิ์และบทบาท">
            <p>ระบบมีผู้ใช้งาน 4 ประเภท แต่ละประเภทมีหน้าที่และสิทธิ์ต่างกัน:</p>
            <WikiTable headers={['ประเภทผู้ใช้', 'หน้าที่หลัก', 'ทำอะไรได้บ้าง']}>
              {[
                ['ผู้ดูแลสูงสุด', 'ดูแลทั้งระบบ', 'ทำได้ทุกอย่าง — ตั้งค่าระบบ, จัดการผู้ใช้, อนุมัติคะแนน, ดูรายงาน, เปลี่ยนตราโรงเรียน'],
                ['ผู้ดูแลระบบ', 'จัดการงานโรงเรียน', 'จัดการนักเรียน ครู ห้องเรียน, อนุมัติคะแนน, ดูรายงาน, ตั้งค่าระบบ (ยกเว้นเปลี่ยนตราโรงเรียน)'],
                ['ครู', 'บันทึกคะแนน', 'บันทึกคะแนน, ดูรายงาน, จัดการนักเรียนในห้องที่ดูแล'],
                ['นักเรียน', 'ดูคะแนนตัวเอง', 'ดูคะแนนและประวัติของตัวเอง'],
              ]}
            </WikiTable>

            <h4 className="font-semibold mt-6 mb-2">เปรียบเทียบสิทธิ์แต่ละประเภท</h4>
            <WikiTable headers={['หมวด', 'สิทธิ์', 'ผู้ดูแลสูงสุด', 'ผู้ดูแลระบบ', 'ครู', 'นักเรียน']}>
              {[
                ['คะแนน', 'บันทึกคะแนน', '✅', '✅', '✅', '❌'],
                ['', 'อนุมัติคะแนน', '✅', '✅', '❌', '❌'],
                ['', 'ยกเลิกคะแนน', '✅', '✅', '❌', '❌'],
                ['', 'จัดการประเภทคะแนน', '✅', '✅', '❌', '❌'],
                ['', 'ดูคะแนนทั้งหมด', '✅', '✅', '✅', '❌'],
                ['', 'ดูคะแนนตัวเอง', '✅', '✅', '✅', '✅'],
                ['นักเรียน', 'ดูรายชื่อ', '✅', '✅', '✅', '❌'],
                ['', 'เพิ่ม/แก้ไข/ลบ', '✅', '✅', '❌', '❌'],
                ['', 'นำเข้าจากไฟล์', '✅', '✅', '❌', '❌'],
                ['', 'ส่งออกข้อมูล', '✅', '✅', '❌', '❌'],
                ['ครู', 'ดูรายชื่อ', '✅', '❌', '❌', '❌'],
                ['', 'เพิ่ม/แก้ไข/ลบ', '✅', '✅', '❌', '❌'],
                ['', 'จัดครูเข้าห้อง', '✅', '✅', '❌', '❌'],
                ['ห้องเรียน', 'ดู', '✅', '✅', '✅', '❌'],
                ['', 'เพิ่ม/แก้ไข/ลบ', '✅', '✅', '❌', '❌'],
                ['รายงาน', 'รายงานประจำเดือน / นักเรียนเสี่ยง / ถึงเกณฑ์', '✅', '✅', '✅', '❌'],
                ['', 'ส่งออกรายงาน', '✅', '✅', '❌', '❌'],
                ['ติดตาม', 'ดู/บันทึกการติดตาม', '✅', '✅', '✅', '❌'],
                ['ตั้งค่า', 'จัดการตั้งค่า / เกณฑ์', '✅', '✅', '❌', '❌'],
                ['ตรวจสอบ', 'ดูบันทึกการใช้งาน', '✅', '✅', '❌', '❌'],
                ['ความเป็นส่วนตัว', 'ดูข้อมูลความยินยอม', '✅', '✅', '❌', '❌'],
                ['แจ้งเตือน', 'ดูการแจ้งเตือน', '✅', '✅', '✅', '✅'],
                ['พิเศษ', 'เปลี่ยนตราโรงเรียน', '✅', '❌', '❌', '❌'],
                ['', 'ทดสอบระบบเก็บไฟล์', '✅', '❌', '❌', '❌'],
              ]}
            </WikiTable>

            <h4 className="font-semibold mt-6 mb-2">เมนูที่แต่ละคนมองเห็น</h4>
            <WikiTable headers={['หมวด', 'เมนู', 'ผู้ดูแลสูงสุด', 'ผู้ดูแลระบบ', 'ครู', 'นักเรียน']}>
              {[
                ['ภาพรวม', 'แดชบอร์ด', '✅', '✅', '❌', '❌'],
                ['นักเรียน', 'รายชื่อนักเรียน', '✅', '❌', '❌', '❌'],
                ['', 'นำเข้าข้อมูล', '✅', '✅', '❌', '❌'],
                ['ครู', 'รายชื่อครู', '✅', '❌', '❌', '❌'],
                ['ห้องเรียน', 'ห้องเรียน', '✅', '✅', '❌', '❌'],
                ['คะแนน', 'บันทึกคะแนน', '✅', '✅', '✅', '❌'],
                ['', 'ประวัติคะแนน', '✅', '✅', '❌', '❌'],
                ['', 'หมวดหมู่คะแนน', '✅', '✅', '❌', '❌'],
                ['', 'รออนุมัติ', '✅', '✅', '❌', '❌'],
                ['รายงาน', 'รายงาน', '✅', '✅', '❌', '❌'],
                ['', 'รายงานห้องเรียน', '❌', '❌', '✅', '❌'],
                ['ตั้งค่า', 'ตั้งค่า', '✅', '✅', '❌', '❌'],
                ['ส่วนตัว', 'คะแนนของฉัน', '❌', '❌', '❌', '✅'],
              ]}
            </WikiTable>

            <h4 className="font-semibold mt-6 mb-2">หมายเหตุสำหรับครู</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>บันทึกคะแนนให้นักเรียนได้<strong className="text-foreground">ทุกคนในโรงเรียน</strong> (ไม่จำกัดแค่ห้องที่สอน)</li>
              <li>แก้ไขข้อมูลและรีเซ็ตรหัสผ่านให้นักเรียนได้<strong className="text-foreground">เฉพาะห้องที่ตัวเองเป็นครูประจำชั้นหรือครูที่ปรึกษา</strong></li>
              <li>ดูรายงานได้เฉพาะห้องเรียนที่ตัวเองสอน</li>
            </ul>
          </WikiSection>

          <WikiSection id="structure" title="โครงสร้างโรงเรียน">
            <p>ระบบจัดข้อมูลโรงเรียนเป็นลำดับชั้นแบบนี้:</p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-0.5 my-3">
              <div>📅 <strong>ปีการศึกษา</strong> — เช่น 2569</div>
              <div className="ml-5">🏫 <strong>ระดับชั้น</strong> — อนุบาล, ประถม, มัธยมต้น, มัธยมปลาย</div>
              <div className="ml-10">📚 <strong>ชั้นปี</strong> — อ.1, ป.1 ถึง ป.6, ม.1 ถึง ม.6</div>
              <div className="ml-14">🚪 <strong>ห้องเรียน</strong> — เช่น ป.1/1, ม.1/1, ม.1/2</div>
            </div>

            <h4 className="font-semibold mt-4 mb-2">วิธีจัดการ:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li><strong className="text-foreground">ปีการศึกษา:</strong> เข้าที่ ตั้งค่า → โครงสร้างชั้นเรียน → ปีการศึกษา</li>
              <li><strong className="text-foreground">ระดับชั้น:</strong> เข้าที่ ตั้งค่า → โครงสร้างชั้นเรียน → ระดับชั้นการศึกษา</li>
              <li><strong className="text-foreground">ชั้นปี:</strong> เข้าที่ ตั้งค่า → โครงสร้างชั้นเรียน → ชั้นปี</li>
              <li><strong className="text-foreground">ห้องเรียน:</strong> เข้าที่หน้า ห้องเรียน → เลือกระดับชั้น → เลือกชั้นปี → ใส่จำนวนห้อง</li>
            </ul>
          </WikiSection>

          <WikiSection id="teachers" title="การจัดการครู">
            <h4 className="font-semibold mb-2">เพิ่มครูเข้าใช้งาน</h4>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
              <li>ไปหน้า <strong className="text-foreground">รายชื่อครูผู้สอน</strong></li>
              <li>กดปุ่ม &quot;เพิ่มครู&quot;</li>
              <li>กรอกข้อมูล: คำนำหน้า, ชื่อ, อีเมล, รหัสเจ้าหน้าที่</li>
              <li>เลือกประเภทผู้ใช้: ครู, ผู้ดูแลระบบ, หรือผู้ดูแลสูงสุด</li>
              <li>กดบันทึก — ระบบจะสร้างบัญชีให้ครูโดยอัตโนมัติ</li>
            </ol>

            <h4 className="font-semibold mt-4 mb-2">รีเซ็ตรหัสผ่านให้ครู</h4>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
              <li>ไปหน้า <strong className="text-foreground">รายชื่อครูผู้สอน</strong></li>
              <li>คลิกปุ่ม <code className="bg-muted px-1 rounded text-xs">⋯</code> ท้ายแถวชื่อครู</li>
              <li>เลือก <strong className="text-foreground">รีเซ็ตรหัสผ่าน</strong></li>
              <li>ระบบจะส่งลิงก์ตั้งรหัสผ่านไปที่อีเมลของครู</li>
              <li>ครูกดลิงก์ในอีเมล → ตั้งรหัสผ่านใหม่ → เข้าสู่ระบบได้ทันที</li>
            </ol>

            <h4 className="font-semibold mt-4 mb-2">มอบหมายครูประจำห้อง</h4>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
              <li>คลิกชื่อครู → เลือกแท็บ <strong className="text-foreground">ห้องเรียน</strong></li>
              <li>เลือกห้องและบทบาท: ครูประจำชั้น, ครูที่ปรึกษา, ครูประจำวิชา, หรือครูฝ่ายปกครอง</li>
            </ol>
          </WikiSection>

          <WikiSection id="students" title="การจัดการนักเรียน">
            <h4 className="font-semibold mb-2">เพิ่มนักเรียน</h4>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
              <li>ไปหน้า <strong className="text-foreground">รายชื่อนักเรียน</strong></li>
              <li>กดปุ่ม &quot;เพิ่มนักเรียน&quot;</li>
              <li>กรอกข้อมูล: คำนำหน้า, ชื่อ, รหัสนักเรียน, ห้องเรียน, ผู้ปกครอง</li>
              <li>ถ้าต้องการเพิ่มทีละหลายคน ให้ใช้ <strong className="text-foreground">นำเข้าจากไฟล์</strong> (เข้าได้ที่ ตั้งค่า → นำเข้าข้อมูล)</li>
            </ol>

            <h4 className="font-semibold mt-4 mb-2">สถานะของนักเรียน</h4>
            <WikiTable headers={['สถานะ', 'ความหมาย']}>
              {[
                ['กำลังศึกษา', 'เรียนปกติ เข้าสู่ระบบได้'],
                ['พักการเรียน', 'พักการเรียนชั่วคราว เข้าสู่ระบบไม่ได้'],
                ['ย้ายโรงเรียน', 'ย้ายออกจากโรงเรียน'],
                ['จบการศึกษา', 'เรียนจบหลักสูตร'],
                ['ถูกพักการเรียน', 'ถูกลงโทษพักการเรียน'],
              ]}
            </WikiTable>

            <h4 className="font-semibold mt-4 mb-2">รีเซ็ตรหัสผ่านให้นักเรียน</h4>
            <p className="text-sm text-muted-foreground">คลิกชื่อนักเรียน → กดปุ่ม &quot;รีเซ็ตรหัสผ่าน&quot; — ผู้ดูแลระบบและครูประจำชั้นหรือครูที่ปรึกษาเท่านั้นที่ทำได้</p>
          </WikiSection>

          <WikiSection id="scores" title="ระบบคะแนน">
            <h4 className="font-semibold mb-2">กฎการให้คะแนน</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>นักเรียนทุกคนเริ่มต้นปีการศึกษาที่ <strong className="text-foreground">100 คะแนน</strong></li>
              <li>ทำผิด → <strong className="text-foreground">หักคะแนน</strong></li>
              <li>ทำความดี → <strong className="text-foreground">เพิ่มคะแนน</strong></li>
              <li>คะแนนต่ำสุดแสดงเป็น <strong className="text-foreground">0</strong> (ไม่ติดลบ)</li>
              <li>คะแนนเกิน 100 แสดงเป็น <strong className="text-foreground">100+</strong></li>
            </ul>

            <h4 className="font-semibold mt-4 mb-2">วิธีบันทึกคะแนน</h4>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
              <li>ไปหน้า <strong className="text-foreground">บันทึกคะแนน</strong></li>
              <li>ค้นหาชื่อนักเรียน</li>
              <li>คลิกชื่อนักเรียน → เลือกแท็บ <strong className="text-foreground">คะแนน</strong></li>
              <li>เลือกประเภท (หัก/เพิ่ม) → ใส่คะแนน → เพิ่มหมายเหตุ</li>
              <li>บางกรณีต้อง<strong className="text-foreground">แนบรูป</strong> หรือ<strong className="text-foreground">รออนุมัติ</strong>จากผู้ดูแลก่อน</li>
            </ol>

            <h4 className="font-semibold mt-4 mb-2">ระดับความประพฤติ</h4>
            <WikiTable headers={['ระดับ', 'ช่วงคะแนน']}>
              {[
                ['ดีมาก', '100 ขึ้นไป'],
                ['ดี', '80 – 99'],
                ['พอใช้', '50 – 79'],
                ['ต้องปรับปรุง', 'ต่ำกว่า 50'],
              ]}
            </WikiTable>

            <h4 className="font-semibold mt-4 mb-2">เกณฑ์การแจ้งเตือน</h4>
            <p className="text-sm text-muted-foreground mb-2">เมื่อคะแนนของนักเรียนถูกลดจนถึงจุด ระบบจะแจ้งเตือนให้ดำเนินการตามขั้นตอน:</p>
            <WikiTable headers={['ถูกหักสะสม', 'คะแนนเหลือ', 'สิ่งที่ต้องทำ']}>
              {[
                ['40 คะแนน', '60 คะแนน', 'ทำทัณฑ์บนครั้งที่ 1 — เชิญผู้ปกครอง'],
                ['60 คะแนน', '40 คะแนน', 'ทำทัณฑ์บนครั้งที่ 2 — เชิญผู้ปกครอง'],
                ['80 คะแนน', '20 คะแนน', 'ทำทัณฑ์บนครั้งที่ 3 — อาจพักการเรียน'],
                ['100 คะแนน', '0 คะแนน', 'ย้ายสถานศึกษา'],
              ]}
            </WikiTable>
          </WikiSection>

          <WikiSection id="reports" title="รายงาน">
            <WikiTable headers={['รายงาน', 'เนื้อหา', 'ใครดูได้']}>
              {[
                ['รายบุคคล', 'ประวัติคะแนนและกราฟของนักเรียน 1 คน', 'ผู้ดูแลสูงสุด, ผู้ดูแลระบบ, ครู'],
                ['รายห้อง', 'ตารางคะแนนนักเรียนทั้งห้อง', 'ผู้ดูแลสูงสุด, ผู้ดูแลระบบ, ครู'],
                ['นักเรียนเสี่ยง', 'นักเรียนที่คะแนนต่ำ', 'ผู้ดูแลสูงสุด, ผู้ดูแลระบบ, ครู'],
                ['นักเรียนถึงเกณฑ์', 'นักเรียนที่คะแนนถึงเกณฑ์แจ้งเตือน', 'ผู้ดูแลสูงสุด, ผู้ดูแลระบบ, ครู'],
                ['สถิติโรงเรียน', 'ภาพรวมคะแนนทั้งโรงเรียน', 'ผู้ดูแลสูงสุด, ผู้ดูแลระบบ'],
                ['ทัณฑ์บน', 'เอกสารทัณฑ์บนสำหรับพิมพ์', 'ผู้ดูแลสูงสุด, ผู้ดูแลระบบ'],
              ]}
            </WikiTable>
          </WikiSection>

          <WikiSection id="settings" title="ตั้งค่าระบบ">
            <p className="text-sm text-muted-foreground mb-3">เข้าได้ที่เมนู <strong className="text-foreground">ตั้งค่า</strong> (เฉพาะผู้ดูแลสูงสุดและผู้ดูแลระบบ)</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li><strong className="text-foreground">ข้อมูลโรงเรียน:</strong> เปลี่ยนชื่อโรงเรียน, ตราโรงเรียน</li>
              <li><strong className="text-foreground">คะแนน:</strong> คะแนนเริ่มต้น, คะแนนต่ำสุด</li>
              <li><strong className="text-foreground">เกณฑ์แจ้งเตือน:</strong> กำหนดว่าเมื่อคะแนนลดถึงเท่าไหร่ต้องทำอะไร และกำหนดสี</li>
              <li><strong className="text-foreground">โครงสร้างชั้นเรียน:</strong> จัดการปีการศึกษา, ระดับชั้น, ชั้นปี</li>
              <li><strong className="text-foreground">ที่เก็บไฟล์:</strong> เลือกว่าจะเก็บไฟล์ไว้ที่ไหน (ระบบคลาวด์ของ Vercel, Supabase, หรือ Google Drive)</li>
            </ul>
          </WikiSection>

          <WikiSection id="faq" title="คำถามที่พบบ่อย">
            <WikiFaq q="เพิ่มครูแล้ว ครูเข้าสู่ระบบไม่ได้?">
              ครูต้องใช้อีเมลที่ลงทะเบียนไว้กับรหัสผ่าน ซึ่งรหัสผ่านเริ่มต้นคือ <strong>Teacher@123</strong> เมื่อเข้าสู่ระบบครั้งแรก ระบบจะบังคับให้เปลี่ยนรหัสผ่านใหม่
            </WikiFaq>
            <WikiFaq q="ครูไม่เห็นเมนูรายชื่อครู?">
              เมนูรายชื่อครูมีไว้สำหรับ <strong>ผู้ดูแลสูงสุดเท่านั้น</strong> ผู้ดูแลระบบและครูจะไม่เห็นเมนูนี้
            </WikiFaq>
            <WikiFaq q="รีเซ็ตรหัสผ่านให้ครู?">
              ผู้ดูแลระบบกดปุ่ม <code className="bg-muted px-1 rounded text-xs">⋯</code> ท้ายแถวชื่อครู → เลือก รีเซ็ตรหัสผ่าน — ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลของครู
            </WikiFaq>
            <WikiFaq q="ลบห้องเรียนไม่ได้?">
              ต้องไม่มีนักเรียนอยู่ในห้องนั้น และต้องเป็นผู้ดูแลสูงสุดหรือผู้ดูแลระบบเท่านั้นถึงจะลบได้
            </WikiFaq>
            <WikiFaq q="คะแนนเกิน 100?">
              ระบบจะแสดงเป็น <strong>100+</strong> (สามารถปรับเปลี่ยนการแสดงผลได้ที่ ตั้งค่า)
            </WikiFaq>
            <WikiFaq q="รีเซ็ตรหัสผ่านแล้วครูไม่ได้รับอีเมล?">
              ระบบมีข้อจำกัดส่งอีเมลได้ <strong>4 ฉบับต่อชั่วโมงทั้งโรงเรียน</strong> ถ้าส่งเกินจะติดขัด — ให้รอ 1 ชั่วโมงแล้วลองใหม่ หรือติดต่อผู้ดูแลระบบให้ตั้งค่าอีเมลภายนอก
            </WikiFaq>
            <WikiFaq q="ขึ้นปีการศึกษาใหม่ต้องทำอย่างไร?">
              เข้าที่ ตั้งค่า → ปีการศึกษา → กด &quot;ขึ้นปีการศึกษาถัดไป&quot; — ระบบจะคัดลอกห้องเรียนและครูให้โดยอัตโนมัติ
            </WikiFaq>
          </WikiSection>

          <div className="text-center text-xs text-muted-foreground py-8 border-t">
            ระบบคะแนนความประพฤตินักเรียน · สำหรับครูและผู้ดูแลโรงเรียน
          </div>
        </div>
      </main>
    </div>
  );
}

function WikiSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id}>
      <h2 className="text-lg font-semibold mb-4 pb-2 border-b">{title}</h2>
      {children}
    </section>
  );
}

function WikiTable({ headers, children }: { headers: string[]; children: ReactNode[] }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/50">
            {headers.map(h => (
              <th key={h} className="text-left px-3 py-2 border-b font-medium text-xs uppercase tracking-wider text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children.map((row, i: number) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
              {(Array.isArray(row) ? row : [row]).map((cell, j: number) => (
                <td key={j} className="px-3 py-2 text-muted-foreground">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WikiFaq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="border rounded-lg p-4 mb-2 group">
      <summary className="font-medium cursor-pointer text-sm">{q}</summary>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </details>
  );
}
