'use client';

import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { parseCsvFile, mapCsvRowToStudent } from '@/lib/utils/csv';

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: { row: number; message: string }[] } | null>(null);

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const parsed = await parseCsvFile(file);
      const importErrors: { row: number; message: string }[] = [];
      let imported = 0;

      const supabase = createClient();

      // Get current academic year
      const { data: acYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      for (let i = 0; i < parsed.data.length; i++) {
        try {
          const row = parsed.data[i];
          const mapped = mapCsvRowToStudent(row);

          // Find or create classroom
          const { data: classroom } = await supabase
            .from('classrooms')
            .select('id')
            .eq('name', mapped.classroom)
            .eq('grade_level', mapped.grade_level)
            .single();

          if (!classroom) {
            importErrors.push({ row: i + 1, message: `ไม่พบห้องเรียน ${mapped.classroom}` });
            continue;
          }

          // Create auth user
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: `${mapped.student_id}@student.school.com`,
            password: 'Student@123',
            email_confirm: true,
            user_metadata: { full_name: `${mapped.first_name} ${mapped.last_name}`, role: 'student' },
          });

          if (authError || !authUser?.user) {
            importErrors.push({ row: i + 1, message: 'สร้างบัญชีผู้ใช้ไม่สำเร็จ' });
            continue;
          }

          // Create profile
          const { data: profile } = await supabase
            .from('profiles')
            .insert({
              user_id: authUser.user.id,
              role: 'student',
              full_name: `${mapped.first_name} ${mapped.last_name}`,
              is_active: true,
            })
            .select('id')
            .single();

          if (!profile) {
            await supabase.auth.admin.deleteUser(authUser.user.id);
            importErrors.push({ row: i + 1, message: 'สร้างโปรไฟล์ไม่สำเร็จ' });
            continue;
          }

          // Create student
          const { error: studentError } = await supabase
            .from('students')
            .insert({
              profile_id: profile.id,
              student_id_number: mapped.student_id,
              classroom_id: classroom.id,
              current_status: mapped.status === 'active' ? 'active' : 'inactive',
            });

          if (studentError) {
            await supabase.auth.admin.deleteUser(authUser.user.id);
            importErrors.push({ row: i + 1, message: studentError.message });
            continue;
          }

          // Create enrollment
          await supabase.from('student_enrollments').insert({
            student_id: mapped.student_id,
            classroom_id: classroom.id,
            class_number: mapped.class_number,
            enrollment_status: 'active',
            source: 'annual_import',
          });

          imported++;
        } catch (err) {
          importErrors.push({ row: i + 1, message: err instanceof Error ? err.message : 'ข้อผิดพลาดไม่ทราบสาเหตุ' });
        }
      }

      setResult({
        success: imported,
        errors: [...parsed.errors, ...importErrors],
      });
    } catch (err) {
      setResult({ success: 0, errors: [{ row: 0, message: err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ CSV ได้' }] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">นำเข้าข้อมูล</h1>
        <p className="text-muted-foreground mt-1">นำเข้านักเรียนจากไฟล์ CSV</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>อัปโหลดไฟล์ CSV</CardTitle>
            <CardDescription>
              รองรับไฟล์ CSV ที่มีคอลัมน์: รหัสนักเรียน, ชื่อ, นามสกุล, ชั้นปี, ห้อง, เลขที่
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {file ? file.name : 'คลิกเพื่อเลือกไฟล์ CSV'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'รองรับไฟล์ .csv สูงสุด 5MB'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleImport}
              disabled={!file || loading}
            >
              {loading ? (
                'กำลังนำเข้า...'
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  นำเข้าข้อมูล
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>ผลการนำเข้า</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium">นำเข้าสำเร็จ {result.success} รายการ</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">ข้อผิดพลาด {result.errors.length} รายการ</span>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-destructive">
                        แถวที่ {e.row}: {e.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ตัวอย่างรูปแบบ CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัสนักเรียน</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>นามสกุล</TableHead>
                <TableHead>ชั้นปี</TableHead>
                <TableHead>ห้อง</TableHead>
                <TableHead>เลขที่</TableHead>
                <TableHead>ระดับ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-xs">1234567890</TableCell>
                <TableCell>สมชาย</TableCell>
                <TableCell>ใจดี</TableCell>
                <TableCell>1</TableCell>
                <TableCell>ป.1/1</TableCell>
                <TableCell>1</TableCell>
                <TableCell>primary</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-xs">1234567891</TableCell>
                <TableCell>สมหญิง</TableCell>
                <TableCell>รักเรียน</TableCell>
                <TableCell>1</TableCell>
                <TableCell>ป.1/1</TableCell>
                <TableCell>2</TableCell>
                <TableCell>primary</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              const blob = new Blob([
                'รหัสนักเรียน,ชื่อ,นามสกุล,ชั้นปี,ห้อง,เลขที่,ระดับ\n' +
                '1234567890,สมชาย,ใจดี,1,ป.1/1,1,primary\n' +
                '1234567891,สมหญิง,รักเรียน,1,ป.1/1,2,primary\n'
              ], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'template_import.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="mr-2 h-4 w-4" />ดาวน์โหลดตัวอย่าง
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

