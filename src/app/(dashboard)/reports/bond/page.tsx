'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Printer, Download } from 'lucide-react';
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

export default function BondDocumentsPage() {
  const router = useRouter();
  const [bonds, setBonds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBonds(); }, []);

  async function loadBonds() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('bond_documents')
      .select('*, students(student_id_number, profiles!inner(full_name, prefix)), academic_years(name)')
      .order('created_at', { ascending: false });
    if (data) setBonds(data);
    setLoading(false);
  }

  const statusColor: Record<string, string> = {
    draft: 'bg-gray-500', generated: 'bg-blue-500', signed: 'bg-green-500', cancelled: 'bg-red-500',
  };
  const statusLabel: Record<string, string> = {
    draft: 'ร่าง', generated: 'ออกแล้ว', signed: 'ลงนามแล้ว', cancelled: 'ยกเลิก',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">หนังสือทัณฑ์บน</h1>
          <p className="text-muted-foreground mt-1">จัดการเอกสารทัณฑ์บนนักเรียน</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="size-8" /></div>
      ) : bonds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2" />
            ยังไม่มีเอกสารทัณฑ์บน
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่เอกสาร</TableHead>
                  <TableHead>นักเรียน</TableHead>
                  <TableHead>ปีการศึกษา</TableHead>
                  <TableHead>คะแนนที่ถูกตัด</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>วันที่สร้าง</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonds.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.document_no}</TableCell>
                    <TableCell>{formatProfileFullName(b.students?.profiles) || '-'}</TableCell>
                    <TableCell>{b.academic_years?.name || '-'}</TableCell>
                    <TableCell>{b.threshold_deducted}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColor[b.status] || 'bg-gray-500'} text-white`}>
                        {statusLabel[b.status] || b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(b.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
