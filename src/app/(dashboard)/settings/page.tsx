'use client';

import { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { Save, Plus, Trash2, Download, ListChecks, Upload, Image as ImageIcon, X, CalendarDays, UserCog, HardDrive, School, Users, BookOpen, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { getSettingsPageData, saveSystemSettings } from '@/lib/actions/settings.action';
import { getScoreRecordingAvailability } from '@/lib/actions/score.action';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

type SettingValue = string | number | boolean | null;

function inputSetting(settings: Record<string, SettingValue>, key: string, fallback: string | number = '') {
  const value = settings[key];
  return typeof value === 'string' || typeof value === 'number' ? value : fallback;
}

export default function SettingsPage() {
  const settingsT = useTranslations('settings');
  const commonT = useTranslations('common');
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [settings, setSettings] = useState<Record<string, SettingValue>>({});
  const [thresholds, setThresholds] = useState<Array<{ deducted: number; action: string; color: string }>>([]);
  const [selectedYearOpen, setSelectedYearOpen] = useState(false);
  const [testingStorage, setTestingStorage] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    loadAccessAndSettings();
  }, []);

  useEffect(() => {
    if (!selectedAcademicYearId) {
      void Promise.resolve().then(() => setSelectedYearOpen(false));
      return;
    }

    let cancelled = false;
    Promise.resolve()
      .then(() => getScoreRecordingAvailability(selectedAcademicYearId))
      .then((result) => {
        if (!cancelled) setSelectedYearOpen(Boolean(result.success && result.data?.can_record));
      })
      .catch(() => {
        if (!cancelled) setSelectedYearOpen(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAcademicYearId]);

  async function loadAccessAndSettings() {
    setLoading(true);
    const result = await getSettingsPageData();
    if (result.success && result.data) {
      setRoles(result.data.roles);
      setSettings(result.data.settings as Record<string, SettingValue>);
      setThresholds(result.data.thresholds as Array<{ deducted: number; action: string; color: string }>);
    } else if (!result.success) {
      alert(result.error.message);
    }
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    const result = await saveSystemSettings({ settings, thresholds });
    if (!result.success) {
      alert(result.error.message);
    } else {
      toast(settingsT('saveSuccess'));
      await loadAccessAndSettings();
    }
    setSaving(false);
  }

  function addThreshold() {
    setThresholds([...thresholds, { deducted: 20, action: '', color: '#FEF3C7' }]);
  }

  function removeThreshold(index: number) {
    setThresholds(thresholds.filter((_, i) => i !== index));
  }

  async function testStorageConnection() {
    setTestingStorage(true);
    try {
      const res = await fetch('/api/storage/test', { method: 'POST' });
      const result = await res.json();
      if (!res.ok) {
        toast(settingsT('storageTestFailed'), { description: result.error || settingsT('genericError') });
        return;
      }
      toast(settingsT('storageTestSuccess'), { description: settingsT('storageTestSuccessDescription', { provider: result.provider }) });
    } catch {
      toast(settingsT('storageTestFailed'));
    } finally {
      setTestingStorage(false);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">{commonT('loading')}</p></div></div>;

  if (!roles.includes('superadmin')) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{settingsT('title')}</h1>
          <p className="text-muted-foreground mt-1">{settingsT('adminToolsDescription')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {selectedYearOpen && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="h-5 w-5" />
                  {settingsT('importData')}
                </CardTitle>
                <CardDescription>{settingsT('importDataDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" nativeButton={false} render={<a href="/settings/import" />}>
                  {settingsT('openImportPage')}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCog className="h-5 w-5" />
                {settingsT('myProfile')}
              </CardTitle>
              <CardDescription>{settingsT('myProfileDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" nativeButton={false} render={<a href="/settings/profile" />}>
                {settingsT('openProfilePage')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{settingsT('title')}</h1>
          <p className="text-muted-foreground mt-1">{settingsT('description')}</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? commonT('saving') : settingsT('saveSettings')}
        </Button>
      </div>

      <Tabs defaultValue="school">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="school">{settingsT('schoolInfo')}</TabsTrigger>
          <TabsTrigger value="scores">{settingsT('scores')}</TabsTrigger>
          <TabsTrigger value="thresholds">{settingsT('thresholds')}</TabsTrigger>
          <TabsTrigger value="academic-structure">{settingsT('academicStructure')}</TabsTrigger>
          <TabsTrigger value="storage">{settingsT('storage')}</TabsTrigger>
        </TabsList>

        <TabsContent value="school" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{settingsT('schoolInfo')}</CardTitle>
              <CardDescription>{settingsT('schoolInfoDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{settingsT('schoolNameTh')}</Label>
                <Input value={inputSetting(settings, 'school_name')} onChange={e => setSettings({...settings, school_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{settingsT('schoolNameEn')}</Label>
                <Input value={inputSetting(settings, 'school_name_en')} onChange={e => setSettings({...settings, school_name_en: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{settingsT('schoolLogo')}</Label>
                <div className="flex items-center gap-4">
                  {settings.school_logo ? (
                    <div className="relative">
                      <NextImage src={String(settings.school_logo)} alt="Logo" width={96} height={96} unoptimized className="size-24 rounded-xl object-cover border shadow-sm" />
                      <button
                        type="button"
                        className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-1"
                        onClick={() => setSettings({...settings, school_logo: ''})}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="size-24 rounded-xl border-2 border-dashed flex items-center justify-center text-muted-foreground bg-muted/30">
                      <ImageIcon className="size-8" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <Upload className="size-4" />
                      <span>{settingsT('chooseImage')}</span>
                    </div>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.gif,.webp"
                      className="hidden"
                      disabled={saving}
                      onChange={async (e) => {
                        const input = e.currentTarget;
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          alert(settingsT('logoFileTooLarge'));
                          input.value = '';
                          return;
                        }
                        // Validate dimensions
                        const img = new Image();
                        const url = URL.createObjectURL(file);
                        try {
                          await new Promise<void>((resolve, reject) => {
                            img.onload = () => resolve();
                            img.onerror = () => reject(new Error(settingsT('logoLoadFailed')));
                            img.src = url;
                          });
                          // Warn if not roughly square
                          const ratio = Math.max(img.width, img.height) / Math.min(img.width, img.height);
                          if (ratio > 1.1) {
                            if (!confirm(settingsT('logoNotSquareConfirm'))) {
                              URL.revokeObjectURL(url);
                              input.value = '';
                              return;
                            }
                          }
                        } catch {
                          // proceed anyway if validation fails
                        } finally {
                          URL.revokeObjectURL(url);
                        }
                        setSaving(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const res = await fetch('/api/upload/logo', { method: 'POST', body: formData });
                          const result = await res.json();
                          if (res.ok && result.url) {
                            const updatedSettings = { ...settings, school_logo: result.url };
                            setSettings(updatedSettings);
                            const saveResult = await saveSystemSettings({ settings: updatedSettings, thresholds });
                            if (!saveResult.success) {
                              alert(saveResult.error.message);
                            } else {
                              toast(settingsT('logoUploadSuccess'));
                              await loadAccessAndSettings();
                            }
                          } else {
                            alert(result.error || settingsT('logoUploadFailed'));
                          }
                        } catch {
                          alert(settingsT('logoUploadError'));
                        } finally {
                          setSaving(false);
                          input.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settingsT('logoHelp')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scores" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{settingsT('scoreSettings')}</CardTitle>
              <CardDescription>{settingsT('scoreSettingsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{settingsT('baseScore')}</Label>
                <Input
                  type="number"
                  value={inputSetting(settings, 'base_score', 100)}
                  onChange={e => setSettings({...settings, base_score: parseInt(e.target.value) || 100})}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label>{settingsT('scoreFloor')}</Label>
                <Input
                  type="number"
                  value={inputSetting(settings, 'score_floor', 0)}
                  onChange={e => setSettings({...settings, score_floor: parseInt(e.target.value) || 0})}
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="thresholds" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{settingsT('thresholdsTitle')}</CardTitle>
                <CardDescription>{settingsT('thresholdsDescription')}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addThreshold}>
                <Plus className="mr-2 h-4 w-4" />{settingsT('addThreshold')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {thresholds.map((t, i) => (
                <div key={i} className="flex items-end gap-3 p-3 rounded-lg border">
                  <div className="space-y-1 w-24">
                    <Label className="text-xs">{settingsT('deductedAt')}</Label>
                    <Input type="number" value={t.deducted} onChange={e => {
                      const n = [...thresholds];
                      n[i].deducted = parseInt(e.target.value) || 0;
                      setThresholds(n);
                    }} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">{settingsT('thresholdAction')}</Label>
                    <Input value={t.action} onChange={e => {
                      const n = [...thresholds];
                      n[i].action = e.target.value;
                      setThresholds(n);
                    }} placeholder={settingsT('thresholdActionPlaceholder')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{settingsT('color')}</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {['#EF4444','#F97316','#EAB308','#22C55E','#3B82F6','#8B5CF6','#EC4899','#78716C'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { const n = [...thresholds]; n[i].color = c; setThresholds(n); }}
                          className={`size-7 rounded-full border-2 transition-all ${t.color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeThreshold(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic-structure" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{settingsT('academicStructure')}</CardTitle>
              <CardDescription>{settingsT('academicStructureDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="outline" className="h-auto justify-start py-4" nativeButton={false} render={<a href="/settings/academic-years" />}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {settingsT('manageAcademicYears')}
                </Button>
                <Button variant="outline" className="h-auto justify-start py-4" nativeButton={false} render={<a href="/settings/education-stages" />}>
                  <ListChecks className="mr-2 h-4 w-4" />
                  {settingsT('manageEducationStructure')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                {settingsT('storage')}
              </CardTitle>
              <CardDescription>{settingsT('storageDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storage_provider">{settingsT('storageProvider')}</Label>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <Select
                    value={String(settings.storage_provider || 'supabase')}
                    onValueChange={(value) => setSettings({ ...settings, storage_provider: value })}
                    itemToStringLabel={(value) => String(value)}
                  >
                    <SelectTrigger id="storage_provider" className="w-full md:w-[320px]">
                      <SelectValue placeholder={settingsT('storageProvider')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vercel_blob" label={settingsT('storageProviderVercelBlob')}>
                        {settingsT('storageProviderVercelBlob')}
                      </SelectItem>
                      <SelectItem value="google_drive" label={settingsT('storageProviderGoogleDrive')}>
                        {settingsT('storageProviderGoogleDrive')}
                      </SelectItem>
                      <SelectItem value="supabase" label={settingsT('storageProviderSupabase')}>
                        {settingsT('storageProviderSupabase')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={testStorageConnection} disabled={testingStorage}>
                    {testingStorage && <Spinner className="mr-2 size-4" />}
                    {settingsT('testStorageConnection')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {String(settings.storage_provider || 'supabase') === 'vercel_blob'
                    ? settingsT('vercelBlobHelp')
                    : String(settings.storage_provider || 'supabase') === 'google_drive'
                      ? settingsT('googleDriveDescription')
                      : settingsT('supabaseStorageHelp')}
                </p>
              </div>

              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <Label htmlFor="google_drive_enabled">{settingsT('googleDriveEnabled')}</Label>
                  <p className="text-xs text-muted-foreground">{settingsT('googleDriveEnabledDescription')}</p>
                </div>
                <input
                  id="google_drive_enabled"
                  type="checkbox"
                  checked={Boolean(settings.google_drive_enabled)}
                  onChange={(e) => setSettings({ ...settings, google_drive_enabled: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="google_drive_client_email">{settingsT('googleDriveServiceAccountEmail')}</Label>
                  <Input
                    id="google_drive_client_email"
                    value={inputSetting(settings, 'google_drive_client_email')}
                    onChange={(e) => setSettings({ ...settings, google_drive_client_email: e.target.value })}
                    placeholder={settingsT('googleDriveServiceAccountEmailPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_drive_profile_folder_id">{settingsT('googleDriveProfileFolderId')}</Label>
                  <Input
                    id="google_drive_profile_folder_id"
                    value={inputSetting(settings, 'google_drive_profile_folder_id')}
                    onChange={(e) => setSettings({ ...settings, google_drive_profile_folder_id: e.target.value })}
                    placeholder={settingsT('googleDriveFolderIdPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="google_drive_evidence_folder_id">{settingsT('googleDriveEvidenceFolderId')}</Label>
                <Input
                  id="google_drive_evidence_folder_id"
                  value={inputSetting(settings, 'google_drive_evidence_folder_id')}
                  onChange={(e) => setSettings({ ...settings, google_drive_evidence_folder_id: e.target.value })}
                  placeholder={settingsT('googleDriveFolderIdPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="google_drive_private_key">{settingsT('googleDrivePrivateKey')}</Label>
                <Textarea
                  id="google_drive_private_key"
                  value={inputSetting(settings, 'google_drive_private_key')}
                  onChange={(e) => setSettings({ ...settings, google_drive_private_key: e.target.value })}
                  placeholder={settingsT('googleDrivePrivateKeyPlaceholder')}
                  rows={5}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  {settingsT('privateKeySecretHelp')}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <Label className="text-base">📧 อีเมล (Resend)</Label>
                  <p className="text-xs text-muted-foreground">ส่งอีเมลแจ้งเตือน, รีเซ็ตรหัสผ่าน, รายงาน</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resend_api_key">Resend API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="resend_api_key"
                      type="password"
                      value={inputSetting(settings, 'resend_api_key')}
                      onChange={(e) => setSettings({ ...settings, resend_api_key: e.target.value })}
                      placeholder="re_xxxxxxxxxxxx"
                      className="font-mono text-xs flex-1"
                    />
                    <Button type="button" variant="outline" onClick={async () => {
                      setTestingEmail(true);
                      try {
                        const res = await fetch('/api/email/test', { method: 'POST' });
                        const result = await res.json();
                        if (res.ok && result.success) {
                          toast('✅ ส่งอีเมลทดสอบสำเร็จ');
                        } else {
                          toast('❌ ส่งไม่สำเร็จ', { description: result.error || 'Unknown error' });
                        }
                      } catch {
                        toast('❌ ส่งไม่สำเร็จ');
                      } finally {
                        setTestingEmail(false);
                      }
                    }} disabled={testingEmail}>
                      {testingEmail ? 'กำลังส่ง...' : 'ทดสอบส่ง'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">API key จาก resend.com → API Keys</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resend_from">อีเมลผู้ส่ง (From)</Label>
                  <Input
                    id="resend_from"
                    value={inputSetting(settings, 'resend_from')}
                    onChange={(e) => setSettings({ ...settings, resend_from: e.target.value })}
                    placeholder="ระบบคะแนน <noreply@school.ac.th>"
                  />
                  <p className="text-xs text-muted-foreground">ต้อง verify domain ที่ Resend ก่อนส่งจริง</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
