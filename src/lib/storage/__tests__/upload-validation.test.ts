import { describe, expect, it } from 'vitest';
import {
  checkUploadRateLimit,
  safeFileExtension,
  validateEvidenceFiles,
  validateSingleImageUpload,
} from '../upload-validation';

describe('upload validation', () => {
  it('accepts allowed image uploads', () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    expect(validateSingleImageUpload(file, 'avatar')).toBeNull();
  });

  it('rejects SVG images', () => {
    const file = new File(['x'], 'photo.svg', { type: 'image/svg+xml' });
    expect(validateSingleImageUpload(file, 'avatar')).toBe('imageTypeInvalid');
  });

  it('rejects evidence count above the per-transaction limit', () => {
    const files = Array.from({ length: 6 }, (_, index) => (
      new File(['x'], `evidence-${index}.jpg`, { type: 'image/jpeg' })
    ));
    expect(validateEvidenceFiles(files)).toBe('tooManyEvidenceFiles');
  });

  it('sanitizes file extensions', () => {
    const file = new File(['x'], 'photo.jp<g', { type: 'image/jpeg' });
    expect(safeFileExtension(file, 'png')).toBe('jpg');
  });

  it('limits repeated uploads in a time window', async () => {
    const key = `test-${crypto.randomUUID()}`;
    await expect(checkUploadRateLimit(key, 2, 60_000)).resolves.toBe(true);
    await expect(checkUploadRateLimit(key, 2, 60_000)).resolves.toBe(true);
    await expect(checkUploadRateLimit(key, 2, 60_000)).resolves.toBe(false);
  });
});
