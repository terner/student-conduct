'use client';

import Link from 'next/link';
import { FileText, Users, AlertTriangle, ChartBar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const reports = [
  {
    title: 'รายงานรายบุคคล',
    description: 'ดูประวัติคะแนนความประพฤติของนักเรียนแต่ละคน',
    icon: FileText,
    href: '/reports/individual',
    color: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900',
  },
  {
    title: 'รายงานรายห้องเรียน',
    description: 'ภาพรวมคะแนนของนักเรียนในห้องเรียน',
    icon: Users,
    href: '/reports/classroom',
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-900',
  },
  {
    title: 'รายงานนักเรียนถึงเกณฑ์',
    description: 'นักเรียนที่ถูกหักคะแนนถึงเกณฑ์ที่กำหนด',
    icon: AlertTriangle,
    href: '/reports/threshold',
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-900',
  },
  {
    title: 'สถิติภาพรวม',
    description: 'แดชบอร์ดสถิติและการกระจายคะแนน',
    icon: ChartBar,
    href: '/dashboard',
    color: 'text-purple-600',
    bg: 'bg-purple-100 dark:bg-purple-900',
  },
];

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">รายงาน</h1>
        <p className="text-muted-foreground mt-1">เลือกรายงานที่ต้องการดู</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href}>
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-start gap-4 pb-2">
                  <div className={`p-2 rounded-lg ${r.bg}`}>
                    <Icon className={`h-6 w-6 ${r.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{r.title}</CardTitle>
                    <CardDescription>{r.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

