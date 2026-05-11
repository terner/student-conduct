export const IMAGE_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
export const EVIDENCE_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

const TWO_MB = 2 * 1024 * 1024;
const MAX_EVIDENCE_FILES = 5;
import { checkRateLimit } from '@/lib/security/rate-limit';

export type UploadTarget = 'logo' | 'avatar' | 'evidence';

export function validateSingleImageUpload(file: File | null, target: UploadTarget) {
  if (!file) return 'fileRequired';
  const allowed: readonly string[] = target === 'evidence' ? EVIDENCE_UPLOAD_TYPES : IMAGE_UPLOAD_TYPES;
  if (!allowed.includes(file.type)) {
    return target === 'evidence' ? 'evidenceTypeInvalid' : 'imageTypeInvalid';
  }
  if (file.size > TWO_MB) return 'fileTooLarge';
  return null;
}

export function validateEvidenceFiles(files: File[]) {
  if (files.length === 0) return 'missingFilesOrTransaction';
  if (files.length > MAX_EVIDENCE_FILES) return 'tooManyEvidenceFiles';
  for (const file of files) {
    const error = validateSingleImageUpload(file, 'evidence');
    if (error) return error;
  }
  return null;
}

export async function checkUploadRateLimit(key: string, limit = 20, windowMs = 60_000) {
  return checkRateLimit(`upload:${key}`, limit, windowMs);
}

export function safeFileExtension(file: File, fallback: string) {
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || fallback;
}
