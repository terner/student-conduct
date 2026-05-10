'use client';

import { useState, useEffect } from 'react';
import { Phone, Plus, MessageSquare, Home, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

function formatProfileFullName(profile: any) {
  const prefix = (profile?.prefix || '').trim();
  const fullName = (profile?.full_name || '').trim();
  if (!prefix) return fullName;
  return fullName.startsWith(prefix) ? fullName : `${prefix}${fullName}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

const typeIcon: Record<string, any> = {
  phone_call: Phone, parent_meeting: MessageSquare, warning: AlertTriangle,
  home_visit: Home, counseling: MessageSquare, bond: FileText,
};

const typeLabel: Record<string, string> = {
  phone_call: 'โทรศัพท์', parent_meeting: 'ประชุมผู้ปกครอง', warning: 'ตักเตือน',
  bond: 'ทัณฑ์บน', home_visit: 'เยี่ยมบ้าน', counseling: 'ให้คำปรึกษา', other: 'อื่นๆ',
};

import { FileText } from 'lucide-react';

export default function InterventionsPage() {
  const [interventions, setInterventions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('intervention_logs')
      .select('*, students(student_id_number, profiles!inner(full_name, prefix))')
      .order('occurred_at', { ascending: false })
      .limit(50);
    if (data) setInterventions(data);
    setLoading(false);
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner className="size-8" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">บันทึกการติดตาม</h1>
        <p className="text-muted-foreground mt-1">ประวัติการติดต่อและติดตามนักเรียน</p>
      </div>

      {interventions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Phone className="h-8 w-8 mx-auto mb-2" />
            ยังไม่มีการบันทึกการติดตาม
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>นักเรียน</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>สรุป</TableHead>
                  <TableHead>ผลลัพธ์</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interventions.map((iv: any) => {
                  const Icon = typeIcon[iv.intervention_type] || FileText;
                  return (
                    <TableRow key={iv.id}>
                      <TableCell className="text-xs">{formatDateTime(iv.occurred_at)}</TableCell>
                      <TableCell className="font-medium">{formatProfileFullName(iv.students?.profiles) || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Icon className="h-3 w-3" /> {typeLabel[iv.intervention_type] || iv.intervention_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate">{iv.summary}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{iv.outcome || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
