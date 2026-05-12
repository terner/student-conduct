'use server';

import { createAdminClient, getUserFromCookie } from '@/lib/supabase/server';
import { getRoles } from '@/lib/security/roles';

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: Record<string, string[]> } };

/**
 * Get authenticated user's profile
 *
 * Uses createClientWithUser() to avoid the redundant
 * setSession() + getUser() double call pattern.
 */
export async function getAuthProfile() {
  const user = await getUserFromCookie();

  if (!user) {
    return { profile: null, error: 'UNAUTHORIZED' as const };
  }

  // Defensive: user object exists but id is undefined (edge case from setSession)
  if (!user.id) {
    return { profile: null, error: 'UNAUTHORIZED' as const };
  }

  const adminClient = await createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    return { profile: null, error: 'FORBIDDEN' as const };
  }

  return { profile, error: null };
}

/**
 * Generic server action wrapper with auth + XSS check
 */
export async function withAuth<T>(
  handler: (profile: NonNullable<Awaited<ReturnType<typeof getAuthProfile>>['profile']>) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    const { profile, error } = await getAuthProfile();
    if (!profile) {
      return {
        success: false,
        error: {
          code: error || 'UNAUTHORIZED',
          message: 'ไม่ได้รับอนุญาตให้ดำเนินการ',
        },
      };
    }
    return await handler(profile);
  } catch (err) {
    console.error('[withAuth] Handler error:', err);
    let message = 'เกิดข้อผิดพลาด';
    if (err instanceof Error) {
      message = err.message || 'เกิดข้อผิดพลาด';
    } else if (err && typeof err === 'object') {
      const obj = err as Record<string, unknown>;
      message = typeof obj.message === 'string' ? obj.message
        : typeof obj.error === 'string' ? obj.error
        : typeof obj.code === 'string' ? obj.code
        : String(err);
    }
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: message || 'เกิดข้อผิดพลาด',
      },
    };
  }
}

/**
 * Check permission helper — reads from DB `role_permissions` table
 *
 * Supports multi-role: checks ALL roles assigned to the user.
 * If any role has 'superadmin', all permissions are granted.
 */
export async function checkPermission(
  profileId: string,
  permissionCode: string
): Promise<boolean> {
  const supabase = await createAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .maybeSingle();

  if (!profile) return false;

  const roles = getRoles(profile);

  // Superadmin role grants all permissions
  if (roles.includes('superadmin')) return true;

  // Query DB for the specific permission across all user roles
  const { data: perms } = await supabase
    .from('role_permissions')
    .select('permissions!inner(code), is_granted')
    .in('role', roles)
    .eq('is_granted', true);

  if (!perms || perms.length === 0) return false;

  return perms.some((permissionRow: Record<string, unknown>) => {
    const permission = permissionRow.permissions as Record<string, unknown> | null | undefined;
    return permission?.code === permissionCode;
  });
}
