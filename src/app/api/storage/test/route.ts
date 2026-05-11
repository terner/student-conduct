import { NextResponse } from 'next/server';
import { createAdminClient, createClientWithUser } from '@/lib/supabase/server';
import { getStorageProvider } from '@/lib/storage/config';
import { deleteVercelBlob, uploadFileToVercelBlob } from '@/lib/storage/vercel-blob';
import { getGoogleDriveConfig, testGoogleDriveConnection } from '@/lib/storage/google-drive';
import { apiMessage } from '@/lib/i18n/api';
import { getRequestAuditInfo, logAction } from '@/lib/audit/log';

export const runtime = 'nodejs';

function hasRole(role: string | string[] | null, target: string): boolean {
  if (!role) return false;
  return Array.isArray(role) ? role.includes(target) : role === target;
}

export async function POST(request: Request) {
  const requestInfo = getRequestAuditInfo(request);
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
    return NextResponse.json({ error: apiMessage(request, 'forbidden') }, { status: 403 });
  }

  const adminClient = await createAdminClient();
  const provider = await getStorageProvider(adminClient);

  try {
    if (provider === 'vercel_blob') {
      const file = new File(['ok'], `storage-health-${Date.now()}.txt`, { type: 'text/plain' });
      const upload = await uploadFileToVercelBlob('evidence', file, file.name);
      await deleteVercelBlob(upload.pathname);
    } else if (provider === 'google_drive') {
      const config = await getGoogleDriveConfig(adminClient);
      await testGoogleDriveConnection(config);
    } else {
      const path = `health-check/storage-health-${Date.now()}.txt`;
      const { error } = await adminClient.storage
        .from('school-logos')
        .upload(path, Buffer.from('ok'), { contentType: 'text/plain', upsert: false });
      if (error) throw error;
      await adminClient.storage.from('school-logos').remove([path]);
    }

    await logAction({
      actorId: profile.id,
      event: 'storage_test_success',
      resourceType: 'storage_provider',
      resourceId: null,
      metadata: { provider },
      ...requestInfo,
    });
    return NextResponse.json({ success: true, provider });
  } catch (error) {
    await logAction({
      actorId: profile.id,
      event: 'storage_test_failed',
      resourceType: 'storage_provider',
      metadata: {
        provider,
        error: error instanceof Error ? error.message : String(error),
      },
      ...requestInfo,
    });
    return NextResponse.json({ error: apiMessage(request, 'storageTestFailed'), provider }, { status: 500 });
  }
}
