type SettingRow = {
  key: string;
  value: unknown;
};

export type StorageProvider = 'vercel_blob' | 'google_drive' | 'supabase';

function normalizeSettingValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value == null) return '';
  return String(value);
}

export async function getStorageProvider(client: unknown): Promise<StorageProvider> {
  const settingsClient = client as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: SettingRow | null; error: { message: string } | null }>;
        };
      };
    };
  };

  const { data } = await settingsClient
    .from('settings')
    .select('key, value')
    .eq('key', 'storage_provider')
    .maybeSingle();

  const provider = normalizeSettingValue(data?.value);
  if (provider === 'google_drive' || provider === 'supabase') return provider;
  if (provider === 'vercel_blob') return provider;

  const envProvider = process.env.STORAGE_PROVIDER;
  if (envProvider === 'vercel_blob' || envProvider === 'google_drive' || envProvider === 'supabase') {
    return envProvider;
  }

  return process.env.BLOB_READ_WRITE_TOKEN ? 'vercel_blob' : 'supabase';
}
