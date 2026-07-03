'use server';

import { revalidatePath } from 'next/cache';
import { withAuth } from '@/lib/server-action';
import { canManageSchoolData } from '@/lib/security/roles';
import { createAdminClient } from '@/lib/supabase/server';
import { guardianManageSchema } from '@/lib/validation/schemas';
import { validateXSS } from '@/lib/security/validate-input';
import { logAudit } from '@/lib/audit/log';
import { serverMessage } from '@/lib/i18n/server';

export async function listGuardians(studentId: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.generalForbidden') } };
    }

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('student_guardians')
      .select(`
        id,
        student_id,
        relation,
        is_primary,
        guardians:guardian_id (
          id,
          prefix,
          first_name,
          last_name,
          full_name,
          phone,
          email,
          address,
          occupation
        )
      `)
      .eq('student_id', studentId)
      .order('is_primary', { ascending: false });

    if (error) {
      return { success: false, error: { code: 'QUERY_ERROR', message: await serverMessage('apiErrors.genericTryAgain') } };
    }

    const guardians = (data || []).map((row) => {
      const g = row.guardians as unknown as Record<string, unknown>;
      return {
        link_id: row.id as string,
        guardian_id: g?.id as string,
        prefix: (g?.prefix as string) || '',
        first_name: (g?.first_name as string) || '',
        last_name: (g?.last_name as string) || '',
        full_name: (g?.full_name as string) || '',
        phone: (g?.phone as string) || '',
        email: (g?.email as string) || '',
        address: (g?.address as string) || '',
        occupation: (g?.occupation as string) || '',
        relation: row.relation as string,
        is_primary: row.is_primary as boolean,
      };
    });

    return { success: true, data: guardians };
  });
}

export async function createGuardian(studentId: string, data: {
  prefix?: string;
  first_name: string;
  last_name: string;
  relation: string;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const validated = guardianManageSchema.parse(data);

    const xssCheck = validateXSS({
      first_name: validated.first_name,
      last_name: validated.last_name,
      phone: validated.phone || '',
      email: validated.email || '',
      address: validated.address || '',
      occupation: validated.occupation || '',
    });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: await serverMessage('apiErrors.xssDetected') } };
    }

    const supabase = await createAdminClient();

    // Check if guardian already exists (by name match)
    const fullName = [validated.prefix, validated.first_name, validated.last_name].filter(Boolean).join(' ');
    const { data: existing } = await supabase
      .from('guardians')
      .select('id')
      .eq('full_name', fullName)
      .maybeSingle();

    let guardianId: string;

    if (existing?.id) {
      guardianId = existing.id as string;
      // Update existing guardian info
      await supabase
        .from('guardians')
        .update({
          prefix: validated.prefix || null,
          first_name: validated.first_name,
          last_name: validated.last_name,
          phone: validated.phone || null,
          email: validated.email || null,
          address: validated.address || null,
          occupation: validated.occupation || null,
        })
        .eq('id', guardianId);
    } else {
      // Create new guardian
      const { data: created, error: createError } = await supabase
        .from('guardians')
        .insert({
          prefix: validated.prefix || null,
          first_name: validated.first_name,
          last_name: validated.last_name,
          full_name: fullName,
          phone: validated.phone || null,
          email: validated.email || null,
          address: validated.address || null,
          occupation: validated.occupation || null,
        })
        .select('id')
        .single();

      if (createError || !created) {
        return { success: false, error: { code: 'CREATE_FAILED', message: await serverMessage('apiErrors.genericTryAgain') } };
      }
      guardianId = created.id as string;
    }

    // Link guardian to student
    const { error: linkError } = await supabase
      .from('student_guardians')
      .insert({
        student_id: studentId,
        guardian_id: guardianId,
        relation: validated.relation,
        is_primary: false,
      });

    if (linkError) {
      if (linkError.code === '23505') {
        return { success: false, error: { code: 'DUPLICATE', message: await serverMessage('apiErrors.guardianAlreadyLinked') } };
      }
      return { success: false, error: { code: 'LINK_FAILED', message: await serverMessage('apiErrors.genericTryAgain') } };
    }

    await logAudit({
      actorId: profile.id,
      action: 'guardian_create',
      targetType: 'guardian',
      targetId: guardianId,
      afterData: { student_id: studentId, ...validated },
    });

    revalidatePath(`/students/${studentId}`);
    return { success: true, data: { guardian_id: guardianId } };
  });
}

export async function updateGuardian(guardianId: string, data: {
  prefix?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const validated = guardianManageSchema.partial().parse(data);

    const xssCheck = validateXSS({
      first_name: validated.first_name || '',
      last_name: validated.last_name || '',
      phone: validated.phone || '',
      email: validated.email || '',
      address: validated.address || '',
      occupation: validated.occupation || '',
    });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: await serverMessage('apiErrors.xssDetected') } };
    }

    const supabase = await createAdminClient();

    const updateData: Record<string, unknown> = {};
    if (validated.prefix !== undefined) updateData.prefix = validated.prefix || null;
    if (validated.first_name !== undefined) updateData.first_name = validated.first_name;
    if (validated.last_name !== undefined) updateData.last_name = validated.last_name;
    if (validated.phone !== undefined) updateData.phone = validated.phone || null;
    if (validated.email !== undefined) updateData.email = validated.email || null;
    if (validated.address !== undefined) updateData.address = validated.address || null;
    if (validated.occupation !== undefined) updateData.occupation = validated.occupation || null;

    // Update full_name if name parts changed
    if (validated.first_name !== undefined || validated.last_name !== undefined || validated.prefix !== undefined) {
      const { data: current } = await supabase
        .from('guardians')
        .select('prefix, first_name, last_name')
        .eq('id', guardianId)
        .single();
      if (current) {
        const prefix = validated.prefix !== undefined ? (validated.prefix || '') : (current.prefix || '');
        const firstName = validated.first_name !== undefined ? validated.first_name : current.first_name;
        const lastName = validated.last_name !== undefined ? validated.last_name : current.last_name;
        updateData.full_name = [prefix, firstName, lastName].filter(Boolean).join(' ');
      }
    }

    const { error } = await supabase
      .from('guardians')
      .update(updateData)
      .eq('id', guardianId);

    if (error) {
      return { success: false, error: { code: 'UPDATE_FAILED', message: await serverMessage('apiErrors.genericTryAgain') } };
    }

    await logAudit({
      actorId: profile.id,
      action: 'guardian_update',
      targetType: 'guardian',
      targetId: guardianId,
      afterData: updateData,
    });

    revalidatePath('/students');
    return { success: true, data: null };
  });
}

export async function deleteGuardian(linkId: string, studentId: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const supabase = await createAdminClient();

    // Get the link info before deleting
    const { data: link } = await supabase
      .from('student_guardians')
      .select('guardian_id')
      .eq('id', linkId)
      .single();

    const { error } = await supabase
      .from('student_guardians')
      .delete()
      .eq('id', linkId);

    if (error) {
      return { success: false, error: { code: 'DELETE_FAILED', message: await serverMessage('apiErrors.genericTryAgain') } };
    }

    await logAudit({
      actorId: profile.id,
      action: 'guardian_delete',
      targetType: 'student_guardian',
      targetId: linkId,
      metadata: { student_id: studentId, guardian_id: link?.guardian_id },
    });

    revalidatePath(`/students/${studentId}`);
    return { success: true, data: null };
  });
}
