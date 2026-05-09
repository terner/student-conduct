'use server';

import { createClient, createClientWithUser } from '@/lib/supabase/server';
import { validateXSS } from '@/lib/security/validate-input';
import { hasRole, getRoles } from '@/lib/security/roles';
import { NextResponse } from 'next/server';

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
  const { supabase, user } = await createClientWithUser();

  if (!user) {
    return { profile: null, error: 'UNAUTHORIZED' as const };
  }

  // Defensive: user object exists but id is undefined (edge case from setSession)
  if (!user.id) {
    return { profile: null, error: 'UNAUTHORIZED' as const };
  }

  const { data: profile } = await supabase
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
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
      },
    };
  }
}

/**
 * Check permission helper — reads from DB `role_permissions` table
 *
 * Supports multi-role: checks ALL roles assigned to the user.
 * If any role has 'admin', all permissions are granted.
 */
export async function checkPermission(
  profileId: string,
  permissionCode: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .maybeSingle();

  if (!profile) return false;

  const roles = getRoles(profile);

  // Admin role grants all permissions
  if (roles.includes('admin')) return true;

  // Query DB for the specific permission across all user roles
  const { data: perms } = await supabase
    .from('role_permissions')
    .select('permissions!inner(code), is_granted')
    .in('role', roles)
    .eq('is_granted', true);

  if (!perms || perms.length === 0) return false;

  return perms.some(
    (p: any) => p.permissions?.code === permissionCode
  );
}
