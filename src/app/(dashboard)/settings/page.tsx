'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Download, ListChecks, Upload, Image as ImageIcon, X, CalendarDays, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [thresholds, setThresholds] = useState<Array<{ deducted: number; action: string; color: string }>>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from('settings').select('key, value');
    if (data) {
      const map: Record<string, any> = {};
      data.forEach(s => { map[s.key] = s.value; });
      setSettings(map);
      if (map.thresholds) setThresholds(map.thresholds as any[]);
    }
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    const supabase = createClient();
    const updates = [
      ['school_name', settings.school_name],
      ['school_name_en', settings.school_name_en],
      ['school_logo', settings.school_logo],
      ['base_score', settings.base_score],
      ['score_floor', settings.score_floor],
      ['thresholds', thresholds],
    ];
    for (const [key, value] of updates) {
      await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
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
        <TabsList>
          <TabsTrigger value="school">ข้อมูลโรงเรียน</TabsTrigger>
          <TabsTrigger value="scores">คะแนน</TabsTrigger>
          <TabsTrigger value="thresholds">เกณฑ์แจ้งเตือน</TabsTrigger>
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
                      <img src={settings.school_logo} alt="Logo" className="size-12 rounded-lg object-cover border" />
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground p-0.5"
                        onClick={() => setSettings({...settings, school_logo: ''})}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="size-12 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="size-5" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <Upload className="size-4" />
                      <span>เลือกรูปภาพ</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={saving}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          alert('ไฟล์ต้องมีขนาดไม่เกิน 2MB');
                          return;
                        }
                        setSaving(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const res = await fetch('/api/upload/logo', { method: 'POST', body: formData });
                          const result = await res.json();
                          if (res.ok && result.url) {
                            setSettings({...settings, school_logo: result.url});
                          } else {
                            alert(result.error || 'อัปโหลดไม่สำเร็จ');
                          }
                        } catch {
                          alert('เกิดข้อผิดพลาดในการอัปโหลด');
                        } finally {
                          setSaving(false);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">รองรับไฟล์ PNG, JPG, GIF ขนาดไม่เกิน 2MB</p>
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

        <TabsContent value="tools" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>เครื่องมือ</CardTitle>
              <CardDescription>นำเข้าและส่งออกข้อมูล</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" nativeButton={false} render={<a href="/settings/import" />}>
                <Download className="mr-2 h-4 w-4" />
                นำเข้านักเรียนจาก CSV
              </Button>
              <Button variant="outline" nativeButton={false} render={<a href="/settings/logs" />}>
                <ListChecks className="mr-2 h-4 w-4" />
                ดู Audit Log
              </Button>
              <Button variant="outline" nativeButton={false} render={<a href="/settings/academic-years" />}>
                <CalendarDays className="mr-2 h-4 w-4" />
                จัดการปีการศึกษา
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

