import { NextResponse } from 'next/server';
import { createClientWithUser, createAdminClient } from '@/lib/supabase/server';
import { getGoogleDriveConfig, isGoogleDriveReady, uploadFileToGoogleDrive } from '@/lib/storage/google-drive';
import { getRequestAuditInfo, logAudit } from '@/lib/audit/log';
import { apiMessage } from '@/lib/i18n/api';
import { hasAnyRole } from '@/lib/security/roles';
import { getStorageProvider } from '@/lib/storage/config';
import { uploadFileToVercelBlob } from '@/lib/storage/vercel-blob';
import { checkUploadRateLimit, safeFileExtension, validateSingleImageUpload } from '@/lib/storage/upload-validation';

export const runtime = 'nodejs';

function normalizeOwnerType(value: FormDataEntryValue | null): 'student' | 'teacher' {
  return value === 'teacher' ? 'teacher' : 'student';
}

function safeOwnerId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100);
}

export async function POST(request: Request) {
  const requestInfo = getRequestAuditInfo(request);
  try {
    const { user } = await createClientWithUser();
    if (!user?.id) {
      return NextResponse.json({ error: apiMessage(request, 'unauthorized') }, { status: 401 });
    }

    const adminClient = await createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: apiMessage(request, 'uploadForbidden') }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const profileOwnerId = String(formData.get('student_id') || formData.get('owner_id') || '').trim();
    const ownerType = normalizeOwnerType(formData.get('owner_type'));

    if (!profileOwnerId) {
      return NextResponse.json({ error: apiMessage(request, 'missingProfileOwner') }, { status: 400 });
    }
    if (!hasAnyRole(profile, ['admin', 'superadmin'])) {
      return NextResponse.json({ error: apiMessage(request, 'uploadForbidden') }, { status: 403 });
    }

    if (!(await checkUploadRateLimit(`avatar:${profile.id}`))) {
      return NextResponse.json({ error: apiMessage(request, 'rateLimited') }, { status: 429 });
    }

    const validationError = validateSingleImageUpload(file, 'avatar');
    if (validationError) return NextResponse.json({ error: apiMessage(request, validationError) }, { status: 400 });
    const uploadFile = file;
    if (!uploadFile) return NextResponse.json({ error: apiMessage(request, 'fileRequired') }, { status: 400 });

    const fileExt = safeFileExtension(uploadFile, 'png');
    const fileName = `${ownerType}-${safeOwnerId(profileOwnerId)}.${fileExt}`;
    const storageProvider = await getStorageProvider(adminClient);

    if (storageProvider === 'vercel_blob') {
      const upload = await uploadFileToVercelBlob('profile', uploadFile, fileName);
      const urlBase = upload.access === 'private' ? `/api/blob/${upload.pathname}` : upload.url;
      const url = `${urlBase}?v=${Date.now()}`;
      await logAudit({
        actorId: profile.id,
        action: 'avatar_upload',
        targetType: ownerType,
        targetId: profileOwnerId,
        afterData: { url, provider: upload.provider, pathname: upload.pathname, access: upload.access },
        metadata: { file_name: uploadFile.name, file_type: uploadFile.type, file_size: uploadFile.size },
        ...requestInfo,
      });
      return NextResponse.json({ success: true, url, provider: upload.provider });
    }

    const driveConfig = await getGoogleDriveConfig(adminClient);

    if (storageProvider === 'google_drive') {
      if (!isGoogleDriveReady(driveConfig, 'profile')) {
        return NextResponse.json({ error: apiMessage(request, 'googleDriveProfileNotConfigured') }, { status: 500 });
      }

      const upload = await uploadFileToGoogleDrive(driveConfig, 'profile', uploadFile, fileName);
      await logAudit({
        actorId: profile.id,
        action: 'avatar_upload',
        targetType: ownerType,
        targetId: profileOwnerId,
        afterData: { url: upload.publicUrl, provider: 'google_drive', file_id: upload.id },
        metadata: { file_name: uploadFile.name, file_type: uploadFile.type, file_size: uploadFile.size },
        ...requestInfo,
      });
      return NextResponse.json({
        success: true,
        url: upload.publicUrl,
        provider: 'google_drive',
        file_id: upload.id,
      });
    }

    const fileBuffer = Buffer.from(await uploadFile.arrayBuffer());

    const { error: uploadError } = await adminClient
      .storage
      .from('student-photos')
      .upload(fileName, fileBuffer, {
        contentType: uploadFile.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Upload Avatar] Storage error:', uploadError);
      return NextResponse.json({ error: apiMessage(request, 'uploadFailed') }, { status: 500 });
    }

    const { data: { publicUrl } } = adminClient
      .storage
      .from('student-photos')
      .getPublicUrl(fileName);
    const url = `${publicUrl}?v=${Date.now()}`;

    await logAudit({
      actorId: profile.id,
      action: 'avatar_upload',
      targetType: ownerType,
      targetId: profileOwnerId,
      afterData: { url, provider: 'supabase' },
      metadata: { file_name: uploadFile.name, file_type: uploadFile.type, file_size: uploadFile.size },
      ...requestInfo,
    });

    return NextResponse.json({ success: true, url });
  } catch (err) {
    console.error('[Upload Avatar] Error:', err);
    return NextResponse.json({ error: apiMessage(request, 'internalError') }, { status: 500 });
  }
}
