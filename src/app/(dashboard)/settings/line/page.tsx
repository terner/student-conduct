'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, CheckCircle2, Copy, MessageCircle, Save, ShieldCheck, TestTube2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { getLineSettingsPageData, saveLineSettings } from '@/lib/actions/settings.action';

interface LineSettingsData {
  line_enabled: boolean;
  has_channel_secret: boolean;
  has_channel_access_token: boolean;
  line_liff_id: string;
  line_liff_url: string;
  webhook_path: string;
  register_path: string;
  credential_source: {
    channel_secret: 'database' | 'environment' | 'missing';
    channel_access_token: 'database' | 'environment' | 'missing';
  };
}

type LineCredentialSource = LineSettingsData['credential_source']['channel_secret'];

interface LineInfoResponse {
  success: boolean;
  data?: { basicId?: string; displayName?: string };
  error?: string;
}

function LineStatusBadge({ ready, label }: { ready: boolean; label: string }) {
  return (
    <Badge variant={ready ? 'secondary' : 'destructive'} className="h-6 rounded-md">
      {ready ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {label}
    </Badge>
  );
}

export default function LineSettingsPage() {
  const settingsT = useTranslations('settings');
  const commonT = useTranslations('common');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [data, setData] = useState<LineSettingsData | null>(null);
  const [form, setForm] = useState({
    line_enabled: true,
    line_channel_secret: '',
    line_channel_access_token: '',
    line_liff_id: '',
    line_liff_url: '',
  });
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const webhookUrl = useMemo(() => {
    if (!data) return '';
    return `${origin}${data.webhook_path}`;
  }, [data, origin]);

  const registerUrl = useMemo(() => {
    if (!data) return '';
    return form.line_liff_url || `${origin}${data.register_path}`;
  }, [data, form.line_liff_url, origin]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getLineSettingsPageData();
    if (result.success && result.data) {
      const nextData = result.data as LineSettingsData;
      setData(nextData);
      setForm({
        line_enabled: nextData.line_enabled,
        line_channel_secret: '',
        line_channel_access_token: '',
        line_liff_id: nextData.line_liff_id,
        line_liff_url: nextData.line_liff_url,
      });
    } else if (!result.success) {
      toast(settingsT('genericError'), { description: result.error.message });
    }
    setLoading(false);
  }, [settingsT]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    toast(commonT('copied'));
  }

  async function save() {
    setSaving(true);
    const result = await saveLineSettings(form);
    if (result.success) {
      toast(settingsT('saveSuccess'));
      await loadData();
    } else {
      toast(settingsT('genericError'), { description: result.error.message });
    }
    setSaving(false);
  }

  async function testConnection() {
    setTesting(true);
    try {
      const response = await fetch('/api/line/info', { cache: 'no-store' });
      const result = await response.json().catch(() => null) as LineInfoResponse | null;

      if (response.ok && result?.success) {
        toast(settingsT('lineTestSuccess'), { description: result.data?.displayName || result.data?.basicId });
      } else {
        toast(settingsT('lineTestFailed'), { description: result?.error || settingsT('genericError') });
      }
    } catch {
      toast(settingsT('lineTestFailed'), { description: settingsT('genericError') });
    }
    setTesting(false);
  }

  function sourceLabel(source: LineCredentialSource) {
    if (source === 'database') return settingsT('lineSourceDatabase');
    if (source === 'environment') return settingsT('lineSourceEnvironment');
    return settingsT('lineSourceMissing');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="size-8" />
          <p className="text-sm text-muted-foreground">{commonT('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">{settingsT('lineOa')}</h1>
          <p className="text-sm text-muted-foreground">{settingsT('lineOaDescription')}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="size-5" />
                {settingsT('lineConnection')}
              </CardTitle>
              <CardDescription>{settingsT('lineConnectionDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Label>{settingsT('lineChannelSecret')}</Label>
                    {data && <LineStatusBadge ready={data.has_channel_secret} label={sourceLabel(data.credential_source.channel_secret)} />}
                  </div>
                  <Input
                    type="password"
                    value={form.line_channel_secret}
                    onChange={(event) => setForm({ ...form, line_channel_secret: event.target.value })}
                    placeholder={settingsT('lineKeepExistingSecret')}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Label>{settingsT('lineChannelAccessToken')}</Label>
                    {data && <LineStatusBadge ready={data.has_channel_access_token} label={sourceLabel(data.credential_source.channel_access_token)} />}
                  </div>
                  <Input
                    type="password"
                    value={form.line_channel_access_token}
                    onChange={(event) => setForm({ ...form, line_channel_access_token: event.target.value })}
                    placeholder={settingsT('lineKeepExistingToken')}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="min-w-0">
                  <Label htmlFor="line_enabled">{settingsT('lineEnabled')}</Label>
                  <p className="text-xs text-muted-foreground">{settingsT('lineEnabledDescription')}</p>
                </div>
                <input
                  id="line_enabled"
                  type="checkbox"
                  checked={form.line_enabled}
                  onChange={(event) => setForm({ ...form, line_enabled: event.target.checked })}
                  className="size-4 shrink-0"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="size-5" />
                {settingsT('lineLiff')}
              </CardTitle>
              <CardDescription>{settingsT('lineLiffDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="line_liff_id">{settingsT('lineLiffId')}</Label>
                  <Input
                    id="line_liff_id"
                    value={form.line_liff_id}
                    onChange={(event) => setForm({ ...form, line_liff_id: event.target.value })}
                    placeholder={settingsT('lineLiffIdPlaceholder')}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line_liff_url">{settingsT('lineLiffUrl')}</Label>
                  <Input
                    id="line_liff_url"
                    type="url"
                    value={form.line_liff_url}
                    onChange={(event) => setForm({ ...form, line_liff_url: event.target.value })}
                    placeholder={settingsT('lineLiffUrlPlaceholder')}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label>{settingsT('lineWebhookUrl')}</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                    <Button type="button" variant="outline" size="icon" onClick={() => copy(webhookUrl)} disabled={!webhookUrl}>
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{settingsT('lineRegisterUrl')}</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={registerUrl} className="font-mono text-xs" />
                    <Button type="button" variant="outline" size="icon" onClick={() => copy(registerUrl)} disabled={!registerUrl}>
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg">{settingsT('lineActions')}</CardTitle>
              <CardDescription>{settingsT('lineActionsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={save} disabled={saving} className="w-full">
                {saving ? <Spinner className="mr-2 size-4" /> : <Save className="mr-2 size-4" />}
                {saving ? commonT('saving') : settingsT('saveSettings')}
              </Button>
              <Button type="button" variant="outline" onClick={testConnection} disabled={testing} className="w-full">
                {testing ? <Spinner className="mr-2 size-4" /> : <TestTube2 className="mr-2 size-4" />}
                {testing ? settingsT('lineTesting') : settingsT('lineTestConnection')}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg">{settingsT('lineRichMenu')}</CardTitle>
              <CardDescription>{settingsT('lineRichMenuDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-hidden rounded-lg border bg-muted/30">
                <Image
                  src="/line/rich-menu.png"
                  alt={settingsT('lineRichMenu')}
                  width={500}
                  height={337}
                  loading="eager"
                  unoptimized
                  className="aspect-[2500/1686] w-full object-cover"
                />
              </div>
              <p className="text-xs text-muted-foreground">{settingsT('lineRichMenuHelp')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
