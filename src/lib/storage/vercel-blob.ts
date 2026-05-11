import { del, put } from '@vercel/blob';

export type BlobUploadTarget = 'logo' | 'profile' | 'evidence';

export type BlobUploadResult = {
  url: string;
  pathname: string;
  provider: 'vercel_blob';
  access: 'public' | 'private';
};

const folderByTarget: Record<BlobUploadTarget, string> = {
  logo: 'branding',
  profile: 'profiles',
  evidence: 'evidence',
};

export function isVercelBlobReady() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function accessForTarget(target: BlobUploadTarget): 'public' | 'private' {
  const allAccess = process.env.BLOB_ACCESS;
  const targetAccess = process.env[`BLOB_${target.toUpperCase()}_ACCESS`];
  const access = targetAccess || allAccess;
  if (access === 'private') return 'private';
  if (access === 'public') return 'public';
  return 'private';
}

export async function uploadFileToVercelBlob(target: BlobUploadTarget, file: File, fileName: string): Promise<BlobUploadResult> {
  if (!isVercelBlobReady()) {
    throw new Error('ยังไม่ได้ตั้งค่า Vercel Blob token');
  }

  const pathname = `${folderByTarget[target]}/${fileName}`;
  const access = accessForTarget(target);
  const result = await put(pathname, file, {
    access,
    addRandomSuffix: target === 'evidence',
    contentType: file.type || 'application/octet-stream',
  });

  return {
    url: result.url,
    pathname: result.pathname,
    provider: 'vercel_blob',
    access,
  };
}

export async function deleteVercelBlob(pathnameOrUrl: string) {
  if (!isVercelBlobReady()) {
    throw new Error('ยังไม่ได้ตั้งค่า Vercel Blob token');
  }
  await del(pathnameOrUrl);
}
