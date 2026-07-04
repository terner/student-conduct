'use server';

import { withAuth } from '@/lib/server-action';
import { canManageSettings, getRoles } from '@/lib/security/roles';
import { createAdminClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { serverApiMessage } from '@/lib/i18n/server';
import { getLineBotInfo, getLinePublicConfig } from '@/lib/line/client';
import { isVercelBlobReady } from '@/lib/storage/vercel-blob';

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
      return { success: false, error: { code: 'INTERNAL_ERROR', message: await serverApiMessage('databaseError') } };
    }

    const settings: Record<string, unknown> = {};
    for (const row of data || []) {
      settings[row.key as string] = row.value;
    }
    if (!settings.storage_provider) {
      settings.storage_provider = process.env.STORAGE_PROVIDER || (process.env.BLOB_READ_WRITE_TOKEN ? 'vercel_blob' : 'supabase');
    }
    if (typeof settings.school_logo === 'string' && settings.school_logo.startsWith('/api/blob/') && !isVercelBlobReady()) {
      settings.school_logo = '';
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
      return { success: false, error: { code: 'FORBIDDEN', message: await serverApiMessage('superadminOnly') } };
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
      ['resend_api_key', input.settings.resend_api_key],
      ['resend_from', input.settings.resend_from],
    ].map(([key, value]) => ({
      key,
      value: value ?? null,
      updated_by: profile.id,
    }));

    const { error } = await adminClient
      .from('settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: await serverApiMessage('databaseError') } };
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

const lineSettingKeys = [
  'line_enabled',
  'line_channel_secret',
  'line_channel_access_token',
  'line_liff_id',
  'line_liff_url',
];

function stringSetting(settings: Record<string, unknown>, key: string) {
  const value = settings[key];
  return typeof value === 'string' ? value : '';
}

export async function getLineSettingsPageData() {
  return withAuth(async (profile) => {
    const roles = getRoles(profile);
    if (!roles.includes('superadmin')) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverApiMessage('superadminOnly') } };
    }

    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from('settings')
      .select('key, value')
      .in('key', lineSettingKeys);

    if (error) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: await serverApiMessage('databaseError') } };
    }

    const settings = Object.fromEntries((data || []).map((row) => [row.key as string, row.value]));
    const publicConfig = await getLinePublicConfig();

    return {
      success: true,
      data: {
        roles,
        line_enabled: settings.line_enabled !== false,
        has_channel_secret: Boolean(stringSetting(settings, 'line_channel_secret') || process.env.LINE_CHANNEL_SECRET),
        has_channel_access_token: Boolean(stringSetting(settings, 'line_channel_access_token') || process.env.LINE_CHANNEL_ACCESS_TOKEN),
        line_liff_id: stringSetting(settings, 'line_liff_id') || process.env.NEXT_PUBLIC_LIFF_ID || '',
        line_liff_url: stringSetting(settings, 'line_liff_url') || publicConfig.liffUrl || '',
        webhook_path: '/api/line/webhook',
        register_path: '/line/register',
        credential_source: {
          channel_secret: stringSetting(settings, 'line_channel_secret') ? 'database' : process.env.LINE_CHANNEL_SECRET ? 'environment' : 'missing',
          channel_access_token: stringSetting(settings, 'line_channel_access_token') ? 'database' : process.env.LINE_CHANNEL_ACCESS_TOKEN ? 'environment' : 'missing',
        },
      },
    };
  });
}

export async function saveLineSettings(input: {
  line_enabled: boolean;
  line_channel_secret?: string;
  line_channel_access_token?: string;
  line_liff_id?: string;
  line_liff_url?: string;
}) {
  return withAuth(async (profile) => {
    const roles = getRoles(profile);
    if (!roles.includes('superadmin')) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverApiMessage('superadminOnly') } };
    }

    const adminClient = await createAdminClient();
    const rows: Array<{ key: string; value: unknown; updated_by: string }> = [
      { key: 'line_enabled', value: input.line_enabled, updated_by: profile.id },
      { key: 'line_liff_id', value: input.line_liff_id?.trim() || null, updated_by: profile.id },
      { key: 'line_liff_url', value: input.line_liff_url?.trim() || null, updated_by: profile.id },
    ];

    if (input.line_channel_secret?.trim()) {
      rows.push({ key: 'line_channel_secret', value: input.line_channel_secret.trim(), updated_by: profile.id });
    }
    if (input.line_channel_access_token?.trim()) {
      rows.push({ key: 'line_channel_access_token', value: input.line_channel_access_token.trim(), updated_by: profile.id });
    }

    const { error } = await adminClient
      .from('settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: await serverApiMessage('databaseError') } };
    }

    await logAudit({
      actorId: profile.id,
      action: 'line_settings_update',
      targetType: 'settings',
      afterData: {
        line_enabled: input.line_enabled,
        line_liff_id: input.line_liff_id?.trim() || null,
        line_liff_url: input.line_liff_url?.trim() || null,
        line_channel_secret: input.line_channel_secret?.trim() ? '[updated]' : '[unchanged]',
        line_channel_access_token: input.line_channel_access_token?.trim() ? '[updated]' : '[unchanged]',
      },
      metadata: { keys: rows.map((row) => row.key) },
    });

    return { success: true, data: { saved: rows.length } };
  });
}

export async function testLineConnection() {
  return withAuth(async (profile) => {
    const roles = getRoles(profile);
    if (!roles.includes('superadmin')) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverApiMessage('superadminOnly') } };
    }

    try {
      const result = await getLineBotInfo();
      if (!result.success) {
        return { success: false, error: { code: 'LINE_ERROR', message: result.error || await serverApiMessage('genericTryAgain') } };
      }
      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LINE_ERROR',
          message: error instanceof Error ? error.message : await serverApiMessage('genericTryAgain'),
        },
      };
    }
  });
}
