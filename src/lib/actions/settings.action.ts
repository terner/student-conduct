'use server';

import { withAuth } from '@/lib/server-action';
import { canManageSettings, getRoles } from '@/lib/security/roles';
import { createAdminClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

export async function getSettingsPageData() {
  return withAuth(async (profile) => {
    const roles = getRoles(profile);

    if (!canManageSettings(profile)) {
      return { success: true, data: { roles, settings: {}, thresholds: [] } };
    }

    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from('settings')
      .select('key, value');

    if (error) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const settings: Record<string, unknown> = {};
    for (const row of data || []) {
      settings[row.key as string] = row.value;
    }
    if (!settings.storage_provider) {
      settings.storage_provider = process.env.STORAGE_PROVIDER || (process.env.BLOB_READ_WRITE_TOKEN ? 'vercel_blob' : 'supabase');
    }

    return {
      success: true,
      data: {
        roles,
        settings,
        thresholds: Array.isArray(settings.thresholds) ? settings.thresholds : [],
      },
    };
  });
}

export async function saveSystemSettings(input: {
  settings: Record<string, unknown>;
  thresholds: Array<{ deducted: number; action: string; color: string }>;
}) {
  return withAuth(async (profile) => {
    if (!canManageSettings(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const adminClient = await createAdminClient();
    const { data: beforeRows } = await adminClient
      .from('settings')
      .select('key, value');
    const beforeSettings = Object.fromEntries((beforeRows || []).map((row) => [row.key, row.value]));
    const rows = [
      ['school_name', input.settings.school_name],
      ['school_name_en', input.settings.school_name_en],
      ['school_logo', input.settings.school_logo],
      ['base_score', input.settings.base_score],
      ['score_floor', input.settings.score_floor],
      ['thresholds', input.thresholds],
      ['storage_provider', input.settings.storage_provider],
      ['google_drive_enabled', input.settings.google_drive_enabled],
      ['google_drive_client_email', input.settings.google_drive_client_email],
      ['google_drive_private_key', input.settings.google_drive_private_key],
      ['google_drive_profile_folder_id', input.settings.google_drive_profile_folder_id],
      ['google_drive_evidence_folder_id', input.settings.google_drive_evidence_folder_id],
    ].map(([key, value]) => ({
      key,
      value: value ?? null,
      updated_by: profile.id,
    }));

    const { error } = await adminClient
      .from('settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    await logAudit({
      actorId: profile.id,
      action: 'settings_update',
      targetType: 'settings',
      beforeData: beforeSettings,
      afterData: Object.fromEntries(rows.map((row) => [row.key, row.value])),
      metadata: { keys: rows.map((row) => row.key) },
    });

    return { success: true, data: { saved: rows.length } };
  });
}
