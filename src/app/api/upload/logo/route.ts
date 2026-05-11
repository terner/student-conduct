import { NextResponse } from 'next/server';
import { createAdminClient, createClientWithUser } from '@/lib/supabase/server';
import { getRequestAuditInfo, logAudit } from '@/lib/audit/log';
import { apiMessage } from '@/lib/i18n/api';
import { getStorageProvider } from '@/lib/storage/config';
import { uploadFileToVercelBlob } from '@/lib/storage/vercel-blob';
import { checkUploadRateLimit, safeFileExtension, validateSingleImageUpload } from '@/lib/storage/upload-validation';

export const runtime = 'nodejs';

function hasRole(role: string | string[] | null, target: string): boolean {
  if (!role) return false;
  return Array.isArray(role) ? role.includes(target) : role === target;
}

export async function POST(request: Request) {
  const requestInfo = getRequestAuditInfo(request);
  try {
    // Check auth
    const { supabase, user } = await createClientWithUser();
    if (!user?.id) {
      return NextResponse.json({ error: apiMessage(request, 'unauthorized') }, { status: 401 });
    }

    // Check profile role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !hasRole(profile.role, 'superadmin')) {
      return NextResponse.json({ error: apiMessage(request, 'uploadForbidden') }, { status: 403 });
    }

    if (!(await checkUploadRateLimit(`logo:${profile.id}`))) {
      return NextResponse.json({ error: apiMessage(request, 'rateLimited') }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    const validationError = validateSingleImageUpload(file, 'logo');
    if (validationError) return NextResponse.json({ error: apiMessage(request, validationError) }, { status: 400 });
    const uploadFile = file;
    if (!uploadFile) return NextResponse.json({ error: apiMessage(request, 'fileRequired') }, { status: 400 });

    // Upload to Supabase Storage using admin client (bypass RLS)
    const adminClient = await createAdminClient();
    const fileExt = safeFileExtension(uploadFile, 'png');
    const fileName = `school-logo-${Date.now()}.${fileExt}`;
    const storageProvider = await getStorageProvider(adminClient);

    if (storageProvider === 'vercel_blob') {
      const upload = await uploadFileToVercelBlob('logo', uploadFile, fileName);
      const url = upload.access === 'private' ? `/api/blob/${upload.pathname}` : upload.url;
      await logAudit({
        actorId: profile.id,
        action: 'logo_upload',
        targetType: 'settings',
        afterData: { school_logo: url, provider: upload.provider, pathname: upload.pathname, access: upload.access },
        metadata: { file_name: uploadFile.name, file_type: uploadFile.type, file_size: uploadFile.size },
        ...requestInfo,
      });

      return NextResponse.json({ success: true, url, provider: upload.provider });
    }

    const fileBuffer = Buffer.from(await uploadFile.arrayBuffer());

    const { error: uploadError } = await adminClient
      .storage
      .from('school-logos')
      .upload(fileName, fileBuffer, {
        contentType: uploadFile.type,
        upsert: true, // Replace existing logo
      });

    if (uploadError) {
      console.error('[Upload Logo] Storage error:', uploadError);
      return NextResponse.json({ error: apiMessage(request, 'uploadFailed') }, { status: 500 });
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
      metadata: { file_name: uploadFile.name, file_type: uploadFile.type, file_size: uploadFile.size },
      ...requestInfo,
    });

    return NextResponse.json({ success: true, url });
  } catch (err) {
    console.error('[Upload Logo] Error:', err);
    return NextResponse.json({ error: apiMessage(request, 'internalError') }, { status: 500 });
  }
}
