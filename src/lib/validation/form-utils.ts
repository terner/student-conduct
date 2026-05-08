import { z } from 'zod';
import type { ApiResponse } from '@/types';

/**
 * Format Zod errors to our ApiResponse format
 */
export function formatZodError<T>(error: z.ZodError<T>): ApiResponse<never>['error'] {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!details[path]) details[path] = [];
    details[path].push(issue.message);
  }

  return {
    code: 'VALIDATION_ERROR',
    message: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบ',
    details,
  };
}

/**
 * Safe parse with formatted error response
 * 
 * Usage:
 *   const parsed = safeParse(schema, data);
 *   if (!parsed.success) return parsed;
 *   const { data: validData } = parsed;
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ApiResponse<never>['error'] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: formatZodError(result.error) };
}

/**
 * Wrapper for server actions with validation + XSS check
 * 
 * Usage:
 *   export const createStudent = validatedAction(studentSchema, async (data, profile) => {
 *     // data is typed and validated
 *     return { success: true, data: result };
 *   });
 */
import { containsXSS } from '@/lib/security/validate-input';
import type { Profile } from '@/types';

export async function validatedAction<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput, profile: Profile) => Promise<ApiResponse<TOutput>>,
  input: unknown,
  profile: Profile,
): Promise<ApiResponse<TOutput>> {
  // 1. XSS check
  if (containsXSS(input)) {
    return {
      success: false,
      error: {
        code: 'XSS_DETECTED',
        message: 'ตรวจพบรูปแบบข้อมูลที่ไม่ปลอดภัย',
      },
    };
  }

  // 2. Validation
  const parsed = safeParse(schema, input);
  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }

  // 3. Execute handler with validated data
  try {
    return await handler(parsed.data, profile);
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่',
      },
    };
  }
}

/**
 * Build query params from schema for safe URL construction
 * Prevents query parameter injection
 */
export function buildQueryParams(
  schema: z.ZodSchema,
  data: Record<string, unknown>
): URLSearchParams {
  const result = schema.safeParse(data);
  if (!result.success) return new URLSearchParams();

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(result.data)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  return params;
}
