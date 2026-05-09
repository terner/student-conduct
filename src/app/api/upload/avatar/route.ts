import { NextResponse } from 'next/server';
import { createClientWithUser, createAdminClient } from '@/lib/supabase/server';

function hasRole(role: string | string[] | null, target: string): boolean {
  if (!role) return false;
  return Array.isArray(role) ? role.includes(target) : role === target;
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await createClientWithUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile || (!hasRole(profile.role, 'admin') && !hasRole(profile.role, 'teacher'))) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์อัปโหลด' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const studentId = formData.get('student_id') as string | null;

    if (!file || !studentId) {
      return NextResponse.json({ error: 'กรุณาเลือกรูปภาพและระบุนักเรียน' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'รองรับเฉพาะไฟล์ PNG, JPG, GIF, WebP' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'ไฟล์ต้องมีขนาดไม่เกิน 2MB' }, { status: 400 });
    }

    const adminClient = await createAdminClient();
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${studentId}.${fileExt}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient
      .storage
      .from('student-photos')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Upload Avatar] Storage error:', uploadError);
      return NextResponse.json({ error: 'ไม่สามารถอัปโหลดรูปภาพได้' }, { status: 500 });
    }

    const { data: { publicUrl } } = adminClient
      .storage
      .from('student-photos')
      .getPublicUrl(fileName);

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('[Upload Avatar] Error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}
