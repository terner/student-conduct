'use client';

import { useState } from 'react';
import { Shield, AlertCircle, Check } from 'lucide-react';
import { acceptPDPA, getCurrentUserRole } from '@/lib/actions/dashboard.action';

export default function PdpaConsentPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    console.log('🔄 Accept button clicked, accepted=', accepted);

    try {
      const res = await acceptPDPA();
      console.log('✅ acceptPDPA result:', res);

      if (res.success) {
        const roleRes = await getCurrentUserRole();
        console.log('✅ Role result:', roleRes);

        if (roleRes.success && roleRes.data) {
          const roles = Array.isArray(roleRes.data.role) ? roleRes.data.role : roleRes.data.role ? [roleRes.data.role] : []
          console.log('📋 Roles:', roles);

          let redirectUrl = '/dashboard';
          if (roles.includes('student') && !roles.includes('admin') && !roles.includes('teacher') && !roles.includes('superadmin')) {
            redirectUrl = '/student/dashboard';
          } else if (roles.includes('teacher') && !roles.includes('admin') && !roles.includes('superadmin')) {
            redirectUrl = '/score/record';
          }

          console.log('🔀 Redirecting to:', redirectUrl);
          window.location.href = redirectUrl;
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(res.error?.message || 'เกิดข้อผิดพลาดในการบันทึก');
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ Exception:', err);
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      setLoading(false);
    }
  }

  const isButtonDisabled = !accepted || loading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">นโยบายความเป็นส่วนตัว</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            PDPA Consent — การยินยอมให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล
          </p>
        </div>

        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p>โรงเรียนจัดเก็บข้อมูลส่วนบุคคลของท่านเพื่อใช้ในการดำเนินการด้านการศึกษา การบันทึกคะแนนความประพฤติ และการติดต่อสื่อสารที่เกี่ยวข้อง</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>ชื่อ-นามสกุล, รหัสนักเรียน/เจ้าหน้าที่, รูปถ่าย</li>
            <li>ข้อมูลคะแนนความประพฤติและประวัติการกระทำความผิด</li>
            <li>ข้อมูลการติดต่อ (เบอร์โทร, อีเมล, Line ID)</li>
            <li>ข้อมูลผู้ปกครองและผู้ติดต่อฉุกเฉิน</li>
          </ul>
          <p>ท่านสามารถยกเลิกความยินยอมได้ตลอดเวลา โดยแจ้งที่ฝ่ายบริหารของโรงเรียน</p>

          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => {
                const val = e.target.checked;
                console.log('☑️ Checkbox onChange:', val, 'prev accepted:', accepted);
                setAccepted(val);
              }}
              className="mt-1 h-4 w-4"
            />
            <span>ข้าพเจ้ายินยอมให้โรงเรียนเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลตามวัตถุประสงค์ที่แจ้งข้างต้น</span>
          </label>

          {/* Debug info */}
          <div className="text-xs text-gray-400 mt-2">
            Debug: accepted={String(accepted)}, disabled={String(isButtonDisabled)}
          </div>
        </div>

        <form onSubmit={handleAccept} className="flex gap-2 justify-end">
          <a
            href="/pdpa-rejected"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            ไม่ยอมรับ
          </a>
          <button
            type="submit"
            disabled={isButtonDisabled}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
              isButtonDisabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? 'กำลังบันทึก...' : (
              <>
                <Check className="h-4 w-4" />
                ยอมรับ
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
