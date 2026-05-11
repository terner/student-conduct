import { NextResponse } from 'next/server';
import { createAdminClient, createClientWithUser } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';

function hasRole(role: string | string[] | null, target: string): boolean {
  if (!role) return false;
  return Array.isArray(role) ? role.includes(target) : role === target;
}

export async function POST(request: Request) {
  try {
    // Check auth
    const { supabase, user } = await createClientWithUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    // Check profile role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !hasRole(profile.role, 'superadmin')) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์อัปโหลด' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'กรุณาเลือกรูปภาพ' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'รองรับเฉพาะไฟล์ PNG, JPG, GIF, WebP' }, { status: 400 });
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'ไฟล์ต้องมีขนาดไม่เกิน 2MB' }, { status: 400 });
    }

    // Upload to Supabase Storage using admin client (bypass RLS)
    const adminClient = await createAdminClient();
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `school-logo-${Date.now()}.${fileExt}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient
      .storage
      .from('school-logos')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true, // Replace existing logo
      });

    if (uploadError) {
      console.error('[Upload Logo] Storage error:', uploadError);
      return NextResponse.json({ error: 'ไม่สามารถอัปโหลดรูปภาพได้' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = adminClient
      .storage
      .from('school-logos')
      .getPublicUrl(fileName);

    const url = `${publicUrl}?v=${Date.now()}`;
    await logAudit({
      actorId: profile.id,
      action: 'logo_upload',
      targetType: 'settings',
      afterData: { school_logo: url },
      metadata: { file_name: file.name, file_type: file.type, file_size: file.size },
    });

    return NextResponse.json({ success: true, url });
  } catch (err) {
    console.error('[Upload Logo] Error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}
