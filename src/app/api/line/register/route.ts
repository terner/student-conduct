import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logAction } from '@/lib/audit/log';

/**
 * Register guardian LINE link
 * Links a LINE userId to a student through the guardian system
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { line_user_id, student_id, phone, relation } = body;

    if (!line_user_id || !student_id) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const validRelations = ['father', 'mother', 'guardian', 'relative', 'other'];
    if (relation && !validRelations.includes(relation)) {
      return NextResponse.json({ success: false, error: 'ความสัมพันธ์ไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Check if this LINE user is already linked to this student
    const { data: existingLink } = await supabase
      .from('guardian_line_links')
      .select('id')
      .eq('line_user_id', line_user_id)
      .eq('student_id', student_id)
      .maybeSingle();

    if (existingLink) {
      // Reactivate if was inactive
      await supabase
        .from('guardian_line_links')
        .update({ is_active: true, phone: phone || null, relation: relation || 'guardian' })
        .eq('id', existingLink.id);

      return NextResponse.json({ success: true, message: 'เชื่อมต่อสำเร็จ (อัปเดตข้อมูลเดิม)' });
    }

    // Check if LINE user is linked to too many students (limit 5)
    const { count } = await supabase
      .from('guardian_line_links')
      .select('id', { count: 'exact', head: true })
      .eq('line_user_id', line_user_id)
      .eq('is_active', true);

    if ((count || 0) >= 5) {
      return NextResponse.json({ success: false, error: 'เชื่อมต่อนักเรียนได้สูงสุด 5 คน' }, { status: 400 });
    }

    // Create the link
    const { error: linkError } = await supabase
      .from('guardian_line_links')
      .insert({
        line_user_id,
        student_id,
        phone: phone || null,
        relation: relation || 'guardian',
        is_active: true,
      });

    if (linkError) {
      console.error('[LINE Register] Link error:', linkError);
      return NextResponse.json({ success: false, error: 'ลงทะเบียนไม่สำเร็จ' }, { status: 500 });
    }

    // Also create/update guardian record if phone provided
    if (phone) {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('id', student_id)
        .single();

      if (student) {
        // Upsert guardian
        const fullName = `ผู้ปกครอง LINE`;
        const { data: existingGuardian } = await supabase
          .from('guardians')
          .select('id')
          .eq('full_name', fullName)
          .maybeSingle();

        let guardianId = existingGuardian?.id;
        if (!guardianId) {
          const { data: created } = await supabase
            .from('guardians')
            .insert({ full_name: fullName, phone })
            .select('id')
            .single();
          guardianId = created?.id;
        }

        if (guardianId) {
          // Link guardian to student if not already linked
          await supabase
            .from('student_guardians')
            .upsert({
              student_id,
              guardian_id: guardianId,
              relation: relation || 'guardian',
              is_primary: false,
            }, { onConflict: 'student_id,guardian_id', ignoreDuplicates: true });
        }
      }
    }

    await logAction({
      event: 'line_register',
      resourceType: 'guardian_line_link',
      metadata: { student_id, relation, has_phone: !!phone },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true, message: 'ลงทะเบียนสำเร็จ' });
  } catch (err) {
    console.error('[LINE Register] Error:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}
