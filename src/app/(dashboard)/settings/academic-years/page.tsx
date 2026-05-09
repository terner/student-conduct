'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

export default function AcademicYearsPage() {
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from('academic_years').select('*').order('name', { ascending: false });
    if (data) setYears(data);
    setLoading(false);
  }

  async function addYear() {
    if (!newName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from('academic_years').insert({ name: newName.trim() });
    setNewName('');
    await load();
    setSaving(false);
  }

  async function setCurrent(id: string) {
    const supabase = createClient();
    await supabase.from('academic_years').update({ is_current: false }).neq('id', '');
    await supabase.from('academic_years').update({ is_current: true }).eq('id', id);
    await load();
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner className="size-8" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">จัดการปีการศึกษา</h1>
        <p className="text-muted-foreground mt-1">เพิ่ม แก้ไข และเปลี่ยนปีการศึกษาปัจจุบัน</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">เพิ่มปีการศึกษาใหม่</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="ปีการศึกษา (เช่น 2569)" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Button onClick={addYear} disabled={!newName.trim() || saving}>
              <Plus className="h-4 w-4 mr-1" /> เพิ่ม
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ปีการศึกษา</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>คะแนนตั้งต้น</TableHead>
                <TableHead>วันที่เริ่ม</TableHead>
                <TableHead>วันที่สิ้นสุด</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">ยังไม่มีปีการศึกษา</TableCell></TableRow>
              ) : years.map((y: any) => (
                <TableRow key={y.id}>
                  <TableCell className="font-medium">{y.name}</TableCell>
                  <TableCell>
                    {y.is_current ? (
                      <Badge className="bg-green-500 text-white">ปัจจุบัน</Badge>
                    ) : (
                      <Badge variant="outline">ไม่ active</Badge>
                    )}
                  </TableCell>
                  <TableCell>{y.base_score || 100}</TableCell>
                  <TableCell className="text-xs">{y.start_date ? new Date(y.start_date).toLocaleDateString('th-TH') : '-'}</TableCell>
                  <TableCell className="text-xs">{y.end_date ? new Date(y.end_date).toLocaleDateString('th-TH') : '-'}</TableCell>
                  <TableCell>
                    {!y.is_current && (
                      <Button size="sm" variant="outline" onClick={() => setCurrent(y.id)}>
                        <Check className="h-3 w-3 mr-1" /> ตั้งเป็นปัจจุบัน
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
