import { createSign } from 'node:crypto';

type SettingRow = {
  key: string;
  value: unknown;
};

export type GoogleDriveTarget = 'profile' | 'evidence';

export type GoogleDriveUploadResult = {
  id: string;
  name: string;
  webViewLink?: string;
  webContentLink?: string;
  publicUrl: string;
};

type GoogleDriveConfig = {
  enabled: boolean;
  clientEmail: string;
  privateKey: string;
  profileFolderId: string;
  evidenceFolderId: string;
};

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

function normalizeSettingValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value == null) return '';
  return String(value);
}

function settingMap(rows: SettingRow[] | null) {
  const map = new Map<string, string>();
  for (const row of rows || []) {
    map.set(row.key, normalizeSettingValue(row.value));
  }
  return map;
}

export async function getGoogleDriveConfig(client: unknown): Promise<GoogleDriveConfig> {
  const keys = [
    'google_drive_enabled',
    'google_drive_client_email',
    'google_drive_private_key',
    'google_drive_profile_folder_id',
    'google_drive_evidence_folder_id',
  ];

  const settingsClient = client as {
    from: (table: string) => {
      select: (columns: string) => {
        in: (column: string, values: string[]) => Promise<{ data: SettingRow[] | null; error: { message: string } | null }>;
      };
    };
  };

  const { data, error } = await settingsClient
    .from('settings')
    .select('key, value')
    .in('key', keys);

  if (error) {
    throw new Error(`โหลดการตั้งค่า Google Drive ไม่สำเร็จ: ${error.message}`);
  }

  const settings = settingMap(data);
  return {
    enabled: settings.get('google_drive_enabled') === 'true',
    clientEmail: settings.get('google_drive_client_email') || '',
    privateKey: (settings.get('google_drive_private_key') || '').replace(/\\n/g, '\n'),
    profileFolderId: settings.get('google_drive_profile_folder_id') || '',
    evidenceFolderId: settings.get('google_drive_evidence_folder_id') || '',
  };
}

export function isGoogleDriveReady(config: GoogleDriveConfig, target: GoogleDriveTarget) {
  const folderId = target === 'profile' ? config.profileFolderId : config.evidenceFolderId;
  return Boolean(config.enabled && config.clientEmail && config.privateKey && folderId);
}

async function getAccessToken(config: GoogleDriveConfig) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: config.clientEmail,
    scope: DRIVE_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsignedJwt = `${header}.${payload}`;
  const signature = createSign('RSA-SHA256').update(unsignedJwt).sign(config.privateKey);
  const assertion = `${unsignedJwt}.${base64Url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Drive auth failed: ${detail}`);
  }

  const data = await response.json() as { access_token?: string };
  if (!data.access_token) {
    throw new Error('Google Drive auth failed: missing access token');
  }
  return data.access_token;
}

async function makeFilePublic(fileId: string, accessToken: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Drive permission failed: ${detail}`);
  }
}

export async function uploadFileToGoogleDrive(
  config: GoogleDriveConfig,
  target: GoogleDriveTarget,
  file: File,
  fileName: string,
): Promise<GoogleDriveUploadResult> {
  const folderId = target === 'profile' ? config.profileFolderId : config.evidenceFolderId;
  if (!isGoogleDriveReady(config, target)) {
    throw new Error('ยังไม่ได้ตั้งค่า Google Drive ให้ครบถ้วน');
  }

  const accessToken = await getAccessToken(config);
  const boundary = `school-behavior-${crypto.randomUUID()}`;
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: file.type || 'application/octet-stream',
  };
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\n\r\n`,
    Buffer.from(await file.arrayBuffer()),
    `\r\n--${boundary}--`,
  ]);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Drive upload failed: ${detail}`);
  }

  const result = await response.json() as Omit<GoogleDriveUploadResult, 'publicUrl'>;
  await makeFilePublic(result.id, accessToken);

  return {
    ...result,
    publicUrl: `https://drive.google.com/uc?export=view&id=${result.id}`,
  };
}
