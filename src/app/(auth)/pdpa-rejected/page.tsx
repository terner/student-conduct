'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function PdpaRejectedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>ไม่สามารถเข้าใช้ระบบได้</CardTitle>
          <CardDescription>
            คุณจำเป็นต้องยอมรับนโยบายความเป็นส่วนตัวก่อนเข้าใช้ระบบ
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground text-center">
          <p>
            ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
            โรงเรียนจำเป็นต้องขอความยินยอมในการเก็บรวบรวม和使用ข้อมูลส่วนบุคคล
            หากคุณไม่ยอมรับ กรุณาติดต่อเจ้าหน้าที่โรงเรียนโดยตรง
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="outline" render={<Link href="/pdpa-consent" />}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับไปหน้ายินยอม
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
