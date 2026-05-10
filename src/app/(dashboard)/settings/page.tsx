'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Download, ListChecks, Upload, Image as ImageIcon, X, CalendarDays, UserCog, HardDrive, Layers, School, Users, BookOpen, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { getSettingsPageData, saveSystemSettings } from '@/lib/actions/settings.action';
import { getScoreRecordingAvailability } from '@/lib/actions/score.action';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';
import { toast } from 'sonner';

export default function SettingsPage() {
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [thresholds, setThresholds] = useState<Array<{ deducted: number; action: string; color: string }>>([]);
  const [selectedYearOpen, setSelectedYearOpen] = useState(false);

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
      setSettings(result.data.settings as Record<string, any>);
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
      toast('บันทึกการตั้งค่าสำเร็จ');
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

  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">กำลังโหลด...</p></div></div>;

  if (!roles.includes('superadmin')) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">การตั้งค่า</h1>
          <p className="text-muted-foreground mt-1">เครื่องมือสำหรับผู้ดูแลระบบ</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {selectedYearOpen && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="h-5 w-5" />
                  นำเข้าข้อมูล
                </CardTitle>
                <CardDescription>นำเข้ารายชื่อนักเรียนจากไฟล์ CSV</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" nativeButton={false} render={<a href="/settings/import" />}>
                  เปิดหน้านำเข้าข้อมูล
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCog className="h-5 w-5" />
                โปรไฟล์ของฉัน
              </CardTitle>
              <CardDescription>ดูข้อมูลบัญชีและสิทธิ์การใช้งานของคุณ</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" nativeButton={false} render={<a href="/settings/profile" />}>
                เปิดหน้าโปรไฟล์
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
          <h1 className="text-2xl font-bold">การตั้งค่า</h1>
          <p className="text-muted-foreground mt-1">จัดการระบบ: ข้อมูลโรงเรียน, คะแนน, เกณฑ์การแจ้งเตือน</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </Button>
      </div>

      <Tabs defaultValue="school">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="school">ข้อมูลโรงเรียน</TabsTrigger>
          <TabsTrigger value="scores">คะแนน</TabsTrigger>
          <TabsTrigger value="thresholds">เกณฑ์แจ้งเตือน</TabsTrigger>
          <TabsTrigger value="academic-structure">โครงสร้างชั้นเรียน</TabsTrigger>
          <TabsTrigger value="google-drive">Google Drive</TabsTrigger>
          <TabsTrigger value="tools">เครื่องมือ</TabsTrigger>
        </TabsList>

        <TabsContent value="school" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลโรงเรียน</CardTitle>
              <CardDescription>ชื่อโรงเรียนและข้อมูลพื้นฐาน</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ชื่อโรงเรียน (ภาษาไทย)</Label>
                <Input value={settings.school_name || ''} onChange={e => setSettings({...settings, school_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>ชื่อโรงเรียน (ภาษาอังกฤษ)</Label>
                <Input value={settings.school_name_en || ''} onChange={e => setSettings({...settings, school_name_en: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>โลโก้โรงเรียน</Label>
                <div className="flex items-center gap-4">
                  {settings.school_logo ? (
                    <div className="relative">
                      <img src={settings.school_logo} alt="Logo" className="size-24 rounded-xl object-cover border shadow-sm" />
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
                      <span>เลือกรูปภาพ</span>
                    </div>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.gif,.webp"
                      className="hidden"
                      disabled={saving}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          alert('ไฟล์ต้องมีขนาดไม่เกิน 2MB');
                          return;
                        }
                        // Validate dimensions
                        const img = new Image();
                        const url = URL.createObjectURL(file);
                        try {
                          await new Promise<void>((resolve, reject) => {
                            img.onload = () => resolve();
                            img.onerror = () => reject(new Error('โหลดรูปไม่สำเร็จ'));
                            img.src = url;
                          });
                          // Warn if not roughly square
                          const ratio = Math.max(img.width, img.height) / Math.min(img.width, img.height);
                          if (ratio > 1.1) {
                            if (!confirm('รูปไม่เป็นสี่เหลี่ยมจัตุรัส แนะนำให้ใช้ 512x512px หรือ 1024x1024px\n\nต้องการอัปโหลดต่อหรือไม่?')) {
                              URL.revokeObjectURL(url);
                              e.currentTarget.value = '';
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
                              toast('อัปโหลดโลโก้โรงเรียนสำเร็จ');
                              await loadAccessAndSettings();
                            }
                          } else {
                            alert(result.error || 'อัปโหลดไม่สำเร็จ');
                          }
                        } catch {
                          alert('เกิดข้อผิดพลาดในการอัปโหลด');
                        } finally {
                          setSaving(false);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  รองรับ PNG, JPG, GIF, WebP ขนาดไฟล์ไม่เกิน 2MB แนะนำรูปสี่เหลี่ยมจัตุรัส 512x512px หรือ 1024x1024px
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scores" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>การตั้งค่าคะแนน</CardTitle>
              <CardDescription>คะแนนตั้งต้นและขอบเขต</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>คะแนนตั้งต้น (Base Score)</Label>
                <Input
                  type="number"
                  value={settings.base_score || 100}
                  onChange={e => setSettings({...settings, base_score: parseInt(e.target.value) || 100})}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label>คะแนนขั้นต่ำ (Score Floor)</Label>
                <Input
                  type="number"
                  value={settings.score_floor || 0}
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
                <CardTitle>เกณฑ์การแจ้งเตือน</CardTitle>
                <CardDescription>กำหนดระดับคะแนนที่ถูกหักสะสมที่จะแจ้งเตือน</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addThreshold}>
                <Plus className="mr-2 h-4 w-4" />เพิ่มเกณฑ์
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {thresholds.map((t, i) => (
                <div key={i} className="flex items-end gap-3 p-3 rounded-lg border">
                  <div className="space-y-1 w-24">
                    <Label className="text-xs">หักถึง</Label>
                    <Input type="number" value={t.deducted} onChange={e => {
                      const n = [...thresholds];
                      n[i].deducted = parseInt(e.target.value) || 0;
                      setThresholds(n);
                    }} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">การดำเนินการ</Label>
                    <Input value={t.action} onChange={e => {
                      const n = [...thresholds];
                      n[i].action = e.target.value;
                      setThresholds(n);
                    }} placeholder="เช่น แจ้งผู้ปกครอง" />
                  </div>
                  <div className="space-y-1 w-20">
                    <Label className="text-xs">สี</Label>
                    <Input type="color" value={t.color || '#FEF3C7'} onChange={e => {
                      const n = [...thresholds];
                      n[i].color = e.target.value;
                      setThresholds(n);
                    }} />
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
              <CardTitle>โครงสร้างชั้นเรียน</CardTitle>
              <CardDescription>ตั้งค่าตามลำดับ: ปีการศึกษา ระดับชั้น ชั้นปี แล้วจึงสร้างห้องเรียน</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="h-auto justify-start py-4" nativeButton={false} render={<a href="/settings/academic-years" />}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  จัดการปีการศึกษา
                </Button>
                <Button variant="outline" className="h-auto justify-start py-4" nativeButton={false} render={<a href="/settings/education-stages" />}>
                  <ListChecks className="mr-2 h-4 w-4" />
                  จัดการระดับชั้น
                </Button>
                <Button variant="outline" className="h-auto justify-start py-4" nativeButton={false} render={<a href="/settings/grade-levels" />}>
                  <Layers className="mr-2 h-4 w-4" />
                  จัดการชั้นปี
                </Button>
                <Button variant="outline" className="h-auto justify-start py-4" nativeButton={false} render={<a href="/classrooms" />}>
                  <School className="mr-2 h-4 w-4" />
                  สร้างห้องเรียน
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google-drive" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Google Drive
              </CardTitle>
              <CardDescription>ตั้งค่าสำหรับเก็บรูปโปรไฟล์และรูปหลักฐานการบันทึกคะแนน</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <Label htmlFor="google_drive_enabled">ใช้งาน Google Drive Storage</Label>
                  <p className="text-xs text-muted-foreground">เมื่อเปิดใช้งาน ระบบจะใช้ค่านี้สำหรับ feature อัปโหลดไฟล์ผ่าน Google Drive</p>
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
                  <Label htmlFor="google_drive_client_email">Service Account Email</Label>
                  <Input
                    id="google_drive_client_email"
                    value={settings.google_drive_client_email || ''}
                    onChange={(e) => setSettings({ ...settings, google_drive_client_email: e.target.value })}
                    placeholder="name@project.iam.gserviceaccount.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_drive_profile_folder_id">Profile Photos Folder ID</Label>
                  <Input
                    id="google_drive_profile_folder_id"
                    value={settings.google_drive_profile_folder_id || ''}
                    onChange={(e) => setSettings({ ...settings, google_drive_profile_folder_id: e.target.value })}
                    placeholder="Google Drive folder id"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="google_drive_evidence_folder_id">Score Evidence Folder ID</Label>
                <Input
                  id="google_drive_evidence_folder_id"
                  value={settings.google_drive_evidence_folder_id || ''}
                  onChange={(e) => setSettings({ ...settings, google_drive_evidence_folder_id: e.target.value })}
                  placeholder="Google Drive folder id"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="google_drive_private_key">Private Key</Label>
                <Textarea
                  id="google_drive_private_key"
                  value={settings.google_drive_private_key || ''}
                  onChange={(e) => setSettings({ ...settings, google_drive_private_key: e.target.value })}
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                  rows={5}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  ค่านี้เป็นความลับ ควรจำกัดสิทธิ์หน้า settings ให้เฉพาะผู้ดูแลระบบเท่านั้น
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>เครื่องมือ</CardTitle>
              <CardDescription>รวมทางลัดสำหรับจัดการข้อมูลและตั้งค่าระบบทั้งหมด</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Button variant="outline" className="justify-start" nativeButton={false} render={<a href="/students" />}>
                <Users className="mr-2 h-4 w-4" />
                จัดการนักเรียน
              </Button>
              <Button variant="outline" className="justify-start" nativeButton={false} render={<a href="/teachers" />}>
                <BookOpen className="mr-2 h-4 w-4" />
                จัดการครู
              </Button>
              <Button variant="outline" className="justify-start" nativeButton={false} render={<a href="/classrooms" />}>
                <School className="mr-2 h-4 w-4" />
                จัดการห้องเรียน
              </Button>
              <Button variant="outline" className="justify-start" nativeButton={false} render={<a href="/score/categories" />}>
                <Tags className="mr-2 h-4 w-4" />
                ประเภทคะแนน
              </Button>
              {selectedYearOpen && (
                <Button variant="outline" className="justify-start" nativeButton={false} render={<a href="/settings/import" />}>
                  <Download className="mr-2 h-4 w-4" />
                  นำเข้านักเรียนจาก CSV
                </Button>
              )}
              <Button variant="outline" className="justify-start" nativeButton={false} render={<a href="/settings/academic-years" />}>
                <CalendarDays className="mr-2 h-4 w-4" />
                จัดการปีการศึกษา
              </Button>
              <Button variant="outline" className="justify-start" nativeButton={false} render={<a href="/settings/education-stages" />}>
                <ListChecks className="mr-2 h-4 w-4" />
                จัดการระดับชั้น
              </Button>
              <Button variant="outline" className="justify-start" nativeButton={false} render={<a href="/settings/grade-levels" />}>
                <Layers className="mr-2 h-4 w-4" />
                จัดการชั้นปี
              </Button>
              <Button variant="outline" className="justify-start" nativeButton={false} render={<a href="/settings/teacher-positions" />}>
                <UserCog className="mr-2 h-4 w-4" />
                กำหนดตำแหน่งครู
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
