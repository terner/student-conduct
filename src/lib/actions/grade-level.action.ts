'use server';

import { withAuth } from '@/lib/server-action';
import { canManageSchoolData } from '@/lib/security/roles';
import { createClient } from '@/lib/supabase/server';
import { clearTtlCacheByPrefix, getTtlCache, setTtlCache } from '@/lib/cache/ttl-cache';

const MASTER_DATA_TTL_MS = 10 * 60 * 1000;

export interface GradeLevelItem {
  id: string;
  education_stage_id: string;
  education_stage_name?: string;
  code: string;
  name: string;
  level_no: number;
  sort_order: number;
  is_active: boolean;
}

export async function getGradeLevels(options: {
  education_stage_id?: string;
  includeInactive?: boolean;
} = {}) {
  return withAuth(async (profile) => {
    const includeInactive = Boolean(options.includeInactive && canManageSchoolData(profile));
    const cacheKey = `grade-levels:${options.education_stage_id || 'all'}:${includeInactive ? 'all' : 'active'}`;
    const cached = await getTtlCache<GradeLevelItem[]>(cacheKey);
    if (cached) return { success: true, data: cached };

    const supabase = await createClient();
    let query = supabase
      .from('grade_levels')
      .select('id, education_stage_id, code, name, level_no, sort_order, is_active, education_stages(name_th)')
      .order('sort_order', { ascending: true })
      .order('level_no', { ascending: true });

    if (options.education_stage_id) {
      query = query.eq('education_stage_id', options.education_stage_id);
    }
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };

    const levels = (data || []).map((row) => ({
      id: row.id as string,
      education_stage_id: row.education_stage_id as string,
      education_stage_name: ((row.education_stages as unknown as Record<string, unknown>)?.name_th as string) || '',
      code: row.code as string,
      name: row.name as string,
      level_no: row.level_no as number,
      sort_order: row.sort_order as number,
      is_active: row.is_active as boolean,
    })) as GradeLevelItem[];
    await setTtlCache(cacheKey, levels, MASTER_DATA_TTL_MS);
    return { success: true, data: levels };
  });
}

export async function addGradeLevel(data: {
  education_stage_id: string;
  code: string;
  name: string;
  level_no: number;
  sort_order: number;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const supabase = await createClient();
    const { error } = await supabase.from('grade_levels').insert({
      education_stage_id: data.education_stage_id,
      code: data.code.trim(),
      name: data.name.trim(),
      level_no: data.level_no,
      sort_order: data.sort_order,
      is_active: true,
    });
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    await clearTtlCacheByPrefix('grade-levels:');
    return { success: true, data: null };
  });
}

export async function updateGradeLevel(id: string, data: {
  code?: string;
  name?: string;
  level_no?: number;
  sort_order?: number;
  is_active?: boolean;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.code !== undefined) updateData.code = data.code.trim();
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.level_no !== undefined) updateData.level_no = data.level_no;
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const supabase = await createClient();
    const { error } = await supabase.from('grade_levels').update(updateData).eq('id', id);
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    await clearTtlCacheByPrefix('grade-levels:');
    return { success: true, data: null };
  });
}

export async function deleteGradeLevel(id: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const supabase = await createClient();
    const { count } = await supabase
      .from('classrooms')
      .select('*', { count: 'exact', head: true })
      .eq('grade_level_id', id);

    if (count && count > 0) {
      const { error } = await supabase
        .from('grade_levels')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
      await clearTtlCacheByPrefix('grade-levels:');
      return { success: true, data: { deactivated: true, used_count: count } };
    }

    const { error } = await supabase.from('grade_levels').delete().eq('id', id);
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    await clearTtlCacheByPrefix('grade-levels:');
    return { success: true, data: { deactivated: false, used_count: 0 } };
  });
}
