'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FileText, Users, AlertTriangle, ChartBar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const reports = [
  {
    titleKey: 'individualRanking',
    descriptionKey: 'individualRankingDescription',
    icon: FileText,
    href: '/reports/individual',
    color: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900',
  },
  {
    titleKey: 'classroomFull',
    descriptionKey: 'classroomDescription',
    icon: Users,
    href: '/reports/classroom',
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-900',
  },
  {
    titleKey: 'threshold',
    descriptionKey: 'thresholdDescription',
    icon: AlertTriangle,
    href: '/reports/threshold',
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-900',
  },
  {
    titleKey: 'statistics',
    descriptionKey: 'statisticsDescription',
    icon: ChartBar,
    href: '/reports/statistics',
    color: 'text-cyan-700',
    bg: 'bg-cyan-100 dark:bg-cyan-950',
  },
];

export default function ReportsPage() {
  const t = useTranslations('report');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
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
                    <CardTitle className="text-lg">{t(r.titleKey)}</CardTitle>
                    <CardDescription>{t(r.descriptionKey)}</CardDescription>
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
