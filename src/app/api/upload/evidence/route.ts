import { canApproveScores, canRecordScores } from '@/lib/security/roles';
import { logAudit } from '@/lib/audit/log';
import { getGoogleDriveConfig, isGoogleDriveReady, uploadFileToGoogleDrive } from '@/lib/storage/google-drive';
import { createAdminClient, createClientWithUser } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { supabase, user } = await createClientWithUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!profile || !canRecordScores(profile)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const transactionId = formData.get('transaction_id') as string;

    if (!files.length || !transactionId) {
      return NextResponse.json({ error: 'Missing files or transaction_id' }, { status: 400 });
    }

    const adminClient = await createAdminClient();
    const { data: transaction, error: transactionError } = await adminClient
      .from('score_transactions')
      .select('id, recorded_by')
      .eq('id', transactionId)
      .maybeSingle();

    if (transactionError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (!canApproveScores(profile) && transaction.recorded_by !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const results = [];
    const driveConfig = await getGoogleDriveConfig(adminClient);
    const useGoogleDrive = isGoogleDriveReady(driveConfig, 'evidence');

    if (driveConfig.enabled && !useGoogleDrive) {
      return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า Google Drive สำหรับหลักฐานให้ครบถ้วน' }, { status: 500 });
    }

    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `evidence-${transactionId}-${crypto.randomUUID()}.${ext}`;

      if (useGoogleDrive) {
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
        .from('school-logos')
        .upload(storagePath, buffer, { contentType: file.type, upsert: false });

      if (error) {
        console.error('[Evidence Upload] Error:', error);
        continue;
      }

      const { data: { publicUrl } } = adminClient.storage.from('school-logos').getPublicUrl(storagePath);

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
      });
    }

    return NextResponse.json({ success: true, urls: results });
  } catch (err) {
    console.error('[Evidence Upload Route] Error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
