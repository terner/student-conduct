'use server';

import { revalidatePath } from 'next/cache';
import { withAuth } from '@/lib/server-action';
import { canManageSchoolData } from '@/lib/security/roles';
import { createAdminClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { serverMessage } from '@/lib/i18n/server';

interface BondDocumentInput {
  student_id: string;
  threshold_deducted: number;
  academic_year_id?: string;
}

/**
 * Generate a bond document for a student who reached a threshold.
 * Auto-generates document number in format: BD-YYYY-NNNN
 */
export async function generateBondDocument(input: BondDocumentInput) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const supabase = await createAdminClient();

    // Get current academic year if not provided
    let academicYearId = input.academic_year_id;
    if (!academicYearId) {
      const { data: currentYear } = await supabase
        .from('academic_years')
        .select('id, name')
        .eq('is_current', true)
        .maybeSingle();
      if (!currentYear) {
        return { success: false, error: { code: 'NO_CURRENT_YEAR', message: await serverMessage('apiErrors.noCurrentAcademicYear') } };
      }
      academicYearId = currentYear.id as string;
    }

    // Generate document number
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('bond_documents')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`);
    const seq = ((count || 0) + 1).toString().padStart(4, '0');
    const documentNo = `BD-${year}-${seq}`;

    const { data, error } = await supabase
      .from('bond_documents')
      .insert({
        student_id: input.student_id,
        academic_year_id: academicYearId,
        threshold_deducted: input.threshold_deducted,
        document_no: documentNo,
        status: 'generated',
        generated_at: new Date().toISOString(),
        generated_by: profile.id,
      })
      .select('id, document_no')
      .single();

    if (error) {
      return { success: false, error: { code: 'CREATE_FAILED', message: await serverMessage('apiErrors.genericTryAgain') } };
    }

    await logAudit({
      actorId: profile.id,
      action: 'bond_generate',
      targetType: 'bond_document',
      targetId: data.id as string,
      afterData: { document_no: documentNo, student_id: input.student_id, threshold: input.threshold_deducted },
    });

    revalidatePath('/reports/bond');
    return { success: true, data: { id: data.id, document_no: data.document_no } };
  });
}

/**
 * Update bond document status (e.g., mark as signed)
 */
export async function updateBondStatus(bondId: string, status: 'draft' | 'generated' | 'signed' | 'cancelled') {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const supabase = await createAdminClient();

    const updateData: Record<string, unknown> = { status };
    if (status === 'signed') {
      updateData.signed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('bond_documents')
      .update(updateData)
      .eq('id', bondId);

    if (error) {
      return { success: false, error: { code: 'UPDATE_FAILED', message: await serverMessage('apiErrors.genericTryAgain') } };
    }

    await logAudit({
      actorId: profile.id,
      action: `bond_${status}`,
      targetType: 'bond_document',
      targetId: bondId,
      afterData: { status },
    });

    revalidatePath('/reports/bond');
    return { success: true, data: null };
  });
}

/**
 * List bond documents with optional filters
 */
export async function listBondDocuments(params?: { student_id?: string; status?: string; page?: number; limit?: number }) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const supabase = await createAdminClient();
    const page = params?.page || 1;
    const limit = params?.limit || 25;
    const from = (page - 1) * limit;

    let query = supabase
      .from('bond_documents')
      .select('*, students(student_id_number, profiles!inner(full_name, prefix)), academic_years(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (params?.student_id) {
      query = query.eq('student_id', params.student_id);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const { data, count, error } = await query;

    if (error) {
      return { success: false, error: { code: 'QUERY_ERROR', message: await serverMessage('apiErrors.genericTryAgain') } };
    }

    return { success: true, data: { documents: data || [], total: count || 0 } };
  });
}
