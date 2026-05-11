import { NextResponse } from 'next/server';
import { createClientWithUser, createAdminClient } from '@/lib/supabase/server';
import { getGoogleDriveConfig, isGoogleDriveReady, uploadFileToGoogleDrive } from '@/lib/storage/google-drive';
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
    const { supabase, user } = await createClientWithUser();
    if (!user?.id) {
      return NextResponse.json({ error: apiMessage(request, 'unauthorized') }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile || !hasRole(profile.role, 'superadmin')) {
      return NextResponse.json({ error: apiMessage(request, 'uploadForbidden') }, { status: 403 });
    }

    if (!checkUploadRateLimit(`avatar:${profile.id}`)) {
      return NextResponse.json({ error: apiMessage(request, 'rateLimited') }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const profileOwnerId = (formData.get('student_id') || formData.get('owner_id')) as string | null;
    const ownerType = (formData.get('owner_type') as string | null) || 'student';

    if (!profileOwnerId) {
      return NextResponse.json({ error: apiMessage(request, 'missingProfileOwner') }, { status: 400 });
    }
    const validationError = validateSingleImageUpload(file, 'avatar');
    if (validationError) return NextResponse.json({ error: apiMessage(request, validationError) }, { status: 400 });
    const uploadFile = file;
    if (!uploadFile) return NextResponse.json({ error: apiMessage(request, 'fileRequired') }, { status: 400 });

    const adminClient = await createAdminClient();
    const fileExt = safeFileExtension(uploadFile, 'png');
    const fileName = `${ownerType}-${profileOwnerId}.${fileExt}`;
    const storageProvider = await getStorageProvider(adminClient);

    if (storageProvider === 'vercel_blob') {
      const upload = await uploadFileToVercelBlob('profile', uploadFile, fileName);
      const url = upload.access === 'private' ? `/api/blob/${upload.pathname}` : upload.url;
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

    await logAudit({
      actorId: profile.id,
      action: 'avatar_upload',
      targetType: ownerType,
      targetId: profileOwnerId,
      afterData: { url: publicUrl, provider: 'supabase' },
      metadata: { file_name: uploadFile.name, file_type: uploadFile.type, file_size: uploadFile.size },
      ...requestInfo,
    });

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('[Upload Avatar] Error:', err);
    return NextResponse.json({ error: apiMessage(request, 'internalError') }, { status: 500 });
  }
}
