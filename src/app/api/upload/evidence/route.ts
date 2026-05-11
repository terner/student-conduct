import { canApproveScores, canRecordScores } from '@/lib/security/roles';
import { getRequestAuditInfo, logAudit } from '@/lib/audit/log';
import { apiMessage } from '@/lib/i18n/api';
import { getStorageProvider } from '@/lib/storage/config';
import { uploadFileToVercelBlob } from '@/lib/storage/vercel-blob';
import { getGoogleDriveConfig, isGoogleDriveReady, uploadFileToGoogleDrive } from '@/lib/storage/google-drive';
import { createAdminClient, createClientWithUser } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkUploadRateLimit, safeFileExtension, validateEvidenceFiles } from '@/lib/storage/upload-validation';

export const runtime = 'nodejs';

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
      .eq('is_active', true)
      .maybeSingle();

    if (!profile || !canRecordScores(profile)) {
      return NextResponse.json({ error: apiMessage(request, 'forbidden') }, { status: 403 });
    }

    if (!(await checkUploadRateLimit(`evidence:${profile.id}`))) {
      return NextResponse.json({ error: apiMessage(request, 'rateLimited') }, { status: 429 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const transactionId = formData.get('transaction_id') as string;

    if (!transactionId) return NextResponse.json({ error: apiMessage(request, 'missingFilesOrTransaction') }, { status: 400 });
    const validationError = validateEvidenceFiles(files);
    if (validationError) return NextResponse.json({ error: apiMessage(request, validationError) }, { status: 400 });

    const adminClient = await createAdminClient();
    const { data: transaction, error: transactionError } = await adminClient
      .from('score_transactions')
      .select('id, recorded_by')
      .eq('id', transactionId)
      .maybeSingle();

    if (transactionError || !transaction) {
      return NextResponse.json({ error: apiMessage(request, 'transactionNotFound') }, { status: 404 });
    }

    if (!canApproveScores(profile) && transaction.recorded_by !== profile.id) {
      return NextResponse.json({ error: apiMessage(request, 'forbidden') }, { status: 403 });
    }

    const results = [];
    const storageProvider = await getStorageProvider(adminClient);
    const driveConfig = storageProvider === 'google_drive' ? await getGoogleDriveConfig(adminClient) : null;
    const useGoogleDrive = driveConfig ? isGoogleDriveReady(driveConfig, 'evidence') : false;

    if (storageProvider === 'google_drive' && !useGoogleDrive) {
      return NextResponse.json({ error: apiMessage(request, 'googleDriveEvidenceNotConfigured') }, { status: 500 });
    }

    for (const file of files) {
      const ext = safeFileExtension(file, 'jpg');
      const fileName = `evidence-${transactionId}-${crypto.randomUUID()}.${ext}`;

      if (storageProvider === 'vercel_blob') {
        const upload = await uploadFileToVercelBlob('evidence', file, fileName);
        const fileUrl = upload.access === 'private' ? `/api/blob/${upload.pathname}` : upload.url;

        await adminClient.from('score_transaction_evidence').insert({
          transaction_id: transactionId,
          file_path: upload.pathname,
          file_url: fileUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: profile.id,
          storage_provider: 'vercel_blob',
          metadata: {
            pathname: upload.pathname,
            blob_url: upload.url,
            access: upload.access,
          },
        });

        results.push(fileUrl);
        continue;
      }

      if (storageProvider === 'google_drive' && useGoogleDrive && driveConfig) {
        const upload = await uploadFileToGoogleDrive(driveConfig, 'evidence', file, fileName);

        await adminClient.from('score_transaction_evidence').insert({
          transaction_id: transactionId,
          file_path: `gdrive:${upload.id}`,
          file_url: upload.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: profile.id,
          storage_provider: 'google_drive',
          metadata: {
            drive_file_id: upload.id,
            web_view_link: upload.webViewLink,
            web_content_link: upload.webContentLink,
          },
        });

        results.push(upload.publicUrl);
        continue;
      }

      const storagePath = `evidence/${transactionId}/${crypto.randomUUID()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error } = await adminClient.storage
        .from('evidence')
        .upload(storagePath, buffer, { contentType: file.type, upsert: false });

      if (error) {
        console.error('[Evidence Upload] Error:', error);
        continue;
      }

      const { data: { publicUrl } } = adminClient.storage.from('evidence').getPublicUrl(storagePath);

      await adminClient.from('score_transaction_evidence').insert({
        transaction_id: transactionId,
        file_path: storagePath,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: profile.id,
        storage_provider: 'supabase',
      });

      results.push(publicUrl);
    }

    if (results.length > 0) {
      await logAudit({
        actorId: profile.id,
        action: 'evidence_upload',
        targetType: 'score_transaction',
        targetId: transactionId,
        afterData: { count: results.length, urls: results },
        ...requestInfo,
      });
    }

    return NextResponse.json({ success: true, urls: results });
  } catch (err) {
    console.error('[Evidence Upload Route] Error:', err);
    return NextResponse.json({ error: apiMessage(request, 'uploadFailed') }, { status: 500 });
  }
}
