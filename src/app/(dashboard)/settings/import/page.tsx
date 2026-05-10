'use client';

import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseCsvFile } from '@/lib/utils/csv';
import { importStudentsCsv } from '@/lib/actions/student.action';

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
      const res = await importStudentsCsv(parsed.data);
      if (res.success) {
        setResult({
          success: res.data.imported,
          errors: [...parsed.errors, ...res.data.errors],
        });
      } else {
        setResult({ success: 0, errors: [{ row: 0, message: res.error?.message || 'เกิดข้อผิดพลาด' }] });
      }
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
              รองรับไฟล์ CSV ที่มีคอลัมน์: รหัสนักเรียน, คำนำหน้า, ชื่อ, นามสกุล, ชั้นปี, ห้อง, เลขที่ในห้อง, ระดับ, ชื่อผู้ปกครอง, ความสัมพันธ์, เบอร์โทรผู้ปกครอง
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
                <TableHead>คำนำหน้า</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>นามสกุล</TableHead>
                <TableHead>ชั้นปี</TableHead>
                <TableHead>ห้อง</TableHead>
                <TableHead>เลขที่ในห้อง</TableHead>
                <TableHead>ระดับ</TableHead>
                <TableHead>ชื่อผู้ปกครอง</TableHead>
                <TableHead>ความสัมพันธ์</TableHead>
                <TableHead>เบอร์โทรผู้ปกครอง</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-xs">1234567890</TableCell>
                <TableCell>เด็กชาย</TableCell>
                <TableCell>สมชาย</TableCell>
                <TableCell>ใจดี</TableCell>
                <TableCell>1</TableCell>
                <TableCell>ป.1/1</TableCell>
                <TableCell>15</TableCell>
                <TableCell>primary</TableCell>
                <TableCell>สมปอง ใจดี</TableCell>
                <TableCell>บิดา</TableCell>
                <TableCell>081-234-5678</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-xs">1234567891</TableCell>
                <TableCell>เด็กหญิง</TableCell>
                <TableCell>สมหญิง</TableCell>
                <TableCell>รักเรียน</TableCell>
                <TableCell>1</TableCell>
                <TableCell>ป.1/1</TableCell>
                <TableCell>16</TableCell>
                <TableCell>primary</TableCell>
                <TableCell>สมพร รักเรียน</TableCell>
                <TableCell>มารดา</TableCell>
                <TableCell>082-345-6789</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              const blob = new Blob([
                'รหัสนักเรียน,คำนำหน้า,ชื่อ,นามสกุล,ชั้นปี,ห้อง,เลขที่ในห้อง,ระดับ,ชื่อผู้ปกครอง,ความสัมพันธ์,เบอร์โทรผู้ปกครอง\n' +
                '1234567890,เด็กชาย,สมชาย,ใจดี,1,ป.1/1,15,primary,สมปอง ใจดี,บิดา,081-234-5678\n' +
                '1234567891,เด็กหญิง,สมหญิง,รักเรียน,1,ป.1/1,16,primary,สมพร รักเรียน,มารดา,082-345-6789\n'
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
