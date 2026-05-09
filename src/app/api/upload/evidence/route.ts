import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const transactionId = formData.get('transaction_id') as string;

    if (!files.length || !transactionId) {
      return NextResponse.json({ error: 'Missing files or transaction_id' }, { status: 400 });
    }

    const adminClient = await createAdminClient();
    const results = [];

    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `evidence/${transactionId}/${crypto.randomUUID()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error } = await adminClient.storage
        .from('school-logos')
        .upload(fileName, buffer, { contentType: file.type, upsert: false });

      if (error) {
        console.error('[Evidence Upload] Error:', error);
        continue;
      }

      const { data: { publicUrl } } = adminClient.storage.from('school-logos').getPublicUrl(fileName);

      await adminClient.from('score_transaction_evidence').insert({
        transaction_id: transactionId,
        file_path: fileName,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      });

      results.push(publicUrl);
    }

    return NextResponse.json({ success: true, urls: results });
  } catch (err) {
    console.error('[Evidence Upload Route] Error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
