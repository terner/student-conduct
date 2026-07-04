import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { formatZodError, safeParse, buildQueryParams, validatedAction } from '../form-utils';

describe('formatZodError', () => {
  it('formats single field error', () => {
    const schema = z.object({ name: z.string().min(1, 'required') });
    const result = schema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted.code).toBe('VALIDATION_ERROR');
      expect(formatted.details).toHaveProperty('name');
      expect(formatted.details.name[0]).toBe('required');
    }
  });

  it('formats multiple field errors', () => {
    const schema = z.object({
      name: z.string().min(1, 'required'),
      age: z.number().min(18, 'must be 18+'),
    });
    const result = schema.safeParse({ name: '', age: 10 });
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted.details).toHaveProperty('name');
      expect(formatted.details).toHaveProperty('age');
    }
  });

  it('formats nested path errors', () => {
    const schema = z.object({
      address: z.object({
        city: z.string().min(1, 'required'),
      }),
    });
    const result = schema.safeParse({ address: { city: '' } });
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted.details).toHaveProperty('address.city');
    }
  });

  it('returns a descriptive message', () => {
    const schema = z.object({ name: z.string().min(1) });
    const result = schema.safeParse({ name: '' });
    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted.message).toBeTruthy();
    }
  });
});

describe('safeParse', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().min(0),
  });

  it('returns success with parsed data', () => {
    const result = safeParse(schema, { name: 'John', age: 15 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'John', age: 15 });
    }
  });

  it('returns error for invalid data', () => {
    const result = safeParse(schema, { name: '', age: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error.details).toHaveProperty('name');
      expect(result.error.details).toHaveProperty('age');
    }
  });

  it('returns error for completely wrong data type', () => {
    const result = safeParse(schema, 'not-an-object');
    expect(result.success).toBe(false);
  });

  it('returns error for null', () => {
    const result = safeParse(schema, null);
    expect(result.success).toBe(false);
  });

  it('returns error for undefined', () => {
    const result = safeParse(schema, undefined);
    expect(result.success).toBe(false);
  });
});

describe('buildQueryParams', () => {
  const schema = z.object({
    page: z.number().int().min(1).default(1),
    search: z.string().optional(),
    status: z.string().optional(),
  });

  it('builds params from valid data', () => {
    const params = buildQueryParams(schema, { page: 2, search: 'test' });
    expect(params.get('page')).toBe('2');
    expect(params.get('search')).toBe('test');
  });

  it('omits empty/undefined values', () => {
    const params = buildQueryParams(schema, { page: 1, search: '', status: undefined });
    expect(params.has('search')).toBe(false);
    expect(params.has('status')).toBe(false);
  });

  it('returns empty params for invalid data', () => {
    const params = buildQueryParams(schema, { page: -1 });
    expect(params.toString()).toBe('');
  });

  it('includes null values as empty strings', () => {
    const params = buildQueryParams(schema, { page: 1, search: null });
    expect(params.has('search')).toBe(false);
  });
});

describe('validatedAction', () => {
  const schema = z.object({
    name: z.string().min(1, 'required'),
    age: z.number().int().min(0),
  });

  const mockProfile = {
    id: 'profile-uuid',
    user_id: 'user-uuid',
    role: 'admin' as const,
    first_name: 'Admin',
    last_name: 'User',
    is_active: true,
    must_change_password: false,
    created_at: '2026-01-01',
  };

  it('validates successfully and calls handler', async () => {
    const handler = vi.fn().mockResolvedValue({ success: true as const, data: { id: '123' } });
    const result = await validatedAction(schema, handler, { name: 'John', age: 15 }, mockProfile);
    expect(result.success).toBe(true);
    expect(handler).toHaveBeenCalledWith({ name: 'John', age: 15 }, mockProfile);
  });

  it('returns validation error for invalid data', async () => {
    const handler = vi.fn();
    const result = await validatedAction(schema, handler, { name: '', age: -1 }, mockProfile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns XSS_DETECTED error for XSS input', async () => {
    const handler = vi.fn();
    const result = await validatedAction(schema, handler, { name: '<script>alert(1)</script>', age: 15 }, mockProfile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.code).toBe('XSS_DETECTED');
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns INTERNAL_ERROR when handler throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('DB connection failed'));
    const result = await validatedAction(schema, handler, { name: 'John', age: 15 }, mockProfile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.message).toBeTruthy();
      expect(result.error?.message).not.toContain('DB connection failed');
    }
  });

  it('returns INTERNAL_ERROR with default message for non-Error throws', async () => {
    const handler = vi.fn().mockRejectedValue('string error');
    const result = await validatedAction(schema, handler, { name: 'John', age: 15 }, mockProfile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.code).toBe('INTERNAL_ERROR');
    }
  });
});
