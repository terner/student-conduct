'use server';

import { withAuth } from '@/lib/server-action';
import { canManageSchoolData } from '@/lib/security/roles';
import { createAdminClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { serverMessage } from '@/lib/i18n/server';

export async function getRolePermissions() {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const supabase = await createAdminClient();

    const [permResult, rpResult] = await Promise.all([
      supabase.from('permissions').select('id, name, description, category').order('category').order('name'),
      supabase.from('role_permissions').select('role, permission_id'),
    ]);

    if (permResult.error) {
      return { success: false, error: { code: 'QUERY_ERROR', message: await serverMessage('apiErrors.genericTryAgain') } };
    }

    return {
      success: true,
      data: {
        permissions: permResult.data || [],
        rolePermissions: rpResult.data || [],
      },
    };
  });
}

export async function updateRolePermissions(data: { role: string; permission_id: string }[]) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const supabase = await createAdminClient();

    // Delete all existing role_permissions and re-insert
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .neq('role', '__never__'); // delete all rows

    if (deleteError) {
      return { success: false, error: { code: 'DELETE_FAILED', message: await serverMessage('apiErrors.genericTryAgain') } };
    }

    // Always grant all permissions to superadmin
    const { data: allPerms } = await supabase.from('permissions').select('id');
    const superadminPerms = (allPerms || []).map(p => ({ role: 'superadmin', permission_id: p.id }));

    const insertData = [...superadminPerms, ...data.filter(d => d.role !== 'superadmin')];

    if (insertData.length > 0) {
      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(insertData);

      if (insertError) {
        return { success: false, error: { code: 'INSERT_FAILED', message: await serverMessage('apiErrors.genericTryAgain') } };
      }
    }

    await logAudit({
      actorId: profile.id,
      action: 'permission_update',
      targetType: 'role_permissions',
      targetId: 'all',
      afterData: { count: insertData.length },
    });

    return { success: true, data: null };
  });
}

export async function getProfileOverrides() {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('profile_permission_overrides')
      .select('profile_id, permission_id, allowed, profiles!inner(full_name)')
      .limit(200);

    if (error) {
      return { success: false, error: { code: 'QUERY_ERROR', message: await serverMessage('apiErrors.genericTryAgain') } };
    }

    const overrides = (data || []).map(row => {
      const prof = row.profiles as unknown as { full_name?: string };
      return {
        profile_id: row.profile_id as string,
        permission_id: row.permission_id as string,
        allowed: row.allowed as boolean,
        profile_name: prof?.full_name || '',
      };
    });

    return { success: true, data: overrides };
  });
}

export async function setProfileOverride(profileId: string, permissionId: string, allowed: boolean) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const supabase = await createAdminClient();
    const { error } = await supabase
      .from('profile_permission_overrides')
      .upsert({ profile_id: profileId, permission_id: permissionId, allowed }, { onConflict: 'profile_id,permission_id' });

    if (error) {
      return { success: false, error: { code: 'UPSERT_FAILED', message: await serverMessage('apiErrors.genericTryAgain') } };
    }

    await logAudit({
      actorId: profile.id,
      action: 'permission_override_set',
      targetType: 'profile_permission_overrides',
      targetId: `${profileId}:${permissionId}`,
      afterData: { allowed },
    });

    return { success: true, data: null };
  });
}

export async function clearProfileOverride(profileId: string, permissionId: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const supabase = await createAdminClient();
    const { error } = await supabase
      .from('profile_permission_overrides')
      .delete()
      .eq('profile_id', profileId)
      .eq('permission_id', permissionId);

    if (error) {
      return { success: false, error: { code: 'DELETE_FAILED', message: await serverMessage('apiErrors.genericTryAgain') } };
    }

    return { success: true, data: null };
  });
}
