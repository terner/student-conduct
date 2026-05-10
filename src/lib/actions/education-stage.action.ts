'use server';

import { withAuth } from '@/lib/server-action';
import { canManageSchoolData } from '@/lib/security/roles';
import { createClient } from '@/lib/supabase/server';
import { clearTtlCacheByPrefix, getTtlCache, setTtlCache } from '@/lib/cache/ttl-cache';

const MASTER_DATA_TTL_MS = 10 * 60 * 1000;

export async function getEducationStages() {
  return withAuth(async () => {
    const cached = getTtlCache<unknown[]>('education-stages:all');
    if (cached) return { success: true, data: cached };

    const supabase = await createClient();
    const { data } = await supabase
      .from('education_stages')
      .select('*')
      .order('sort_order', { ascending: true });
    const stages = data || [];
    setTtlCache('education-stages:all', stages, MASTER_DATA_TTL_MS);
    return { success: true, data: stages };
  });
}

export async function addEducationStage(data: {
  code: string;
  name_th: string;
  name_en?: string;
  sort_order: number;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }
    const supabase = await createClient();
    const { error } = await supabase.from('education_stages').insert(data);
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    clearTtlCacheByPrefix('education-stages:');
    return { success: true, data: null };
  });
}

export async function updateEducationStage(id: string, data: {
  name_th?: string;
  name_en?: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }
    const supabase = await createClient();
    const { error } = await supabase.from('education_stages').update(data).eq('id', id);
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    clearTtlCacheByPrefix('education-stages:');
    return { success: true, data: null };
  });
}

export async function deleteEducationStage(id: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }
    const supabase = await createClient();
    const { count } = await supabase.from('classrooms').select('*', { count: 'exact', head: true }).eq('education_stage_id', id);
    if (count && count > 0) {
      return { success: false, error: { code: 'IN_USE', message: `มี ${count} ห้องเรียนที่ใช้ระดับนี้อยู่ ไม่สามารถลบได้` } };
    }
    const { error } = await supabase.from('education_stages').delete().eq('id', id);
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    clearTtlCacheByPrefix('education-stages:');
    return { success: true, data: null };
  });
}
