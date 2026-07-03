'use server';

import { withAuth } from '@/lib/server-action';
import { canManageSchoolData } from '@/lib/security/roles';
import { createClient } from '@/lib/supabase/server';
import { clearTtlCacheByPrefix, getTtlCache, setTtlCache } from '@/lib/cache/ttl-cache';
import { serverMessage } from '@/lib/i18n/server';

const MASTER_DATA_TTL_MS = 10 * 60 * 1000;

export interface TeacherPositionItem {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export async function getTeacherPositions(options: { includeInactive?: boolean } = {}) {
  return withAuth(async (profile) => {
    const includeInactive = Boolean(options.includeInactive && canManageSchoolData(profile));
    const cacheKey = `teacher-positions:${includeInactive ? 'all' : 'active'}`;
    const cached = await getTtlCache<TeacherPositionItem[]>(cacheKey);
    if (cached) return { success: true, data: cached };

    const supabase = await createClient();
    let query = supabase
      .from('teacher_positions')
      .select('id, name, sort_order, is_active')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    const positions = (data || []) as TeacherPositionItem[];
    await setTtlCache(cacheKey, positions, MASTER_DATA_TTL_MS);
    return { success: true, data: positions };
  });
}

export async function addTeacherPosition(data: { name: string; sort_order: number }) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }
    const name = data.name.trim();
    if (!name) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: await serverMessage('apiErrors.teacherPositionNameRequired') } };
    }

    const supabase = await createClient();
    const { error } = await supabase.from('teacher_positions').insert({
      name,
      sort_order: data.sort_order || 100,
      is_active: true,
    });
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    await clearTtlCacheByPrefix('teacher-positions:');
    return { success: true, data: null };
  });
}

export async function updateTeacherPosition(id: string, data: {
  name?: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    updateData.updated_at = new Date().toISOString();

    const supabase = await createClient();
    const { error } = await supabase.from('teacher_positions').update(updateData).eq('id', id);
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    await clearTtlCacheByPrefix('teacher-positions:');
    return { success: true, data: null };
  });
}

export async function deleteTeacherPosition(id: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const supabase = await createClient();
    const { data: position } = await supabase
      .from('teacher_positions')
      .select('name')
      .eq('id', id)
      .single();

    if (position?.name) {
      const { count } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('position', position.name);
      if (count && count > 0) {
        const { error } = await supabase
          .from('teacher_positions')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
        await clearTtlCacheByPrefix('teacher-positions:');
        return { success: true, data: { deactivated: true, used_count: count } };
      }
    }

    const { error } = await supabase.from('teacher_positions').delete().eq('id', id);
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    await clearTtlCacheByPrefix('teacher-positions:');
    return { success: true, data: { deactivated: false, used_count: 0 } };
  });
}
