'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getScores, approveScore, voidScore } from '@/lib/actions/score.action';
import { ScoreTransactionTable } from '@/components/features/scores/score-transaction-table';
import type { ScoreTransactionWithDetails } from '@/lib/db/queries/score.queries';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';
import { createClient } from '@/lib/supabase/client';

export default function ApprovalPage() {
  const t = useTranslations('score');
  const commonT = useTranslations('common');
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [data, setData] = useState<ScoreTransactionWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const realtimeRefreshRef = useRef<number | null>(null);

  const fetchData = useCallback(async (pageNum = 1) => {
    setLoading(true);
    const result = await getScores({
      status: 'pending',
      page: pageNum,
      page_size: 20,
      academic_year_id: selectedAcademicYearId || undefined,
    });
    if (result.success && result.data) {
      setData(result.data.data as unknown as ScoreTransactionWithDetails[]);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, [selectedAcademicYearId]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchData(page));
  }, [page, fetchData]);

  // Fetch pending count for summary
  useEffect(() => {
    getScores({
      status: 'pending',
      page_size: 1,
      academic_year_id: selectedAcademicYearId || undefined,
    }).then((res) => {
      if (res.success && res.data) {
        setPendingCount(res.data.total);
      }
    });
  }, [selectedAcademicYearId]);

  useEffect(() => {
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (realtimeRefreshRef.current) window.clearTimeout(realtimeRefreshRef.current);
      realtimeRefreshRef.current = window.setTimeout(() => {
        void fetchData(page);
        getScores({
          status: 'pending',
          page_size: 1,
          academic_year_id: selectedAcademicYearId || undefined,
        }).then((res) => {
          if (res.success && res.data) setPendingCount(res.data.total);
        });
      }, 750);
    };
    const channel = supabase
      .channel(`score-approval:${selectedAcademicYearId || 'current'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'score_transactions' },
        (payload) => {
          const newRow = payload.new as { academic_year_id?: string; status?: string } | null;
          const oldRow = payload.old as { academic_year_id?: string; status?: string } | null;
          const row = newRow || oldRow;
          const affectsPendingQueue = newRow?.status === 'pending' || oldRow?.status === 'pending';
          if (affectsPendingQueue && (!selectedAcademicYearId || !row?.academic_year_id || row.academic_year_id === selectedAcademicYearId)) {
            scheduleRefresh();
          }
        },
      )
      .subscribe();

    return () => {
      if (realtimeRefreshRef.current) window.clearTimeout(realtimeRefreshRef.current);
      void supabase.removeChannel(channel);
    };
  }, [fetchData, page, selectedAcademicYearId]);

  const handleApprove = async (transactionId: string) => {
    try {
      const res = await approveScore(transactionId);
      if (res.success) {
        toast(t('approveSuccess'));
        fetchData(page);
        setPendingCount((prev) => Math.max(0, prev - 1));
      } else {
        toast(commonT('error'), { description: res.error?.message });
      }
    } catch {
      toast(commonT('error'), { description: t('approveFailed') });
    }
  };

  const handleVoid = async (transactionId: string, reason: string) => {
    try {
      const res = await voidScore(transactionId, reason);
      if (res.success) {
        toast(t('voidSuccess'));
        fetchData(page);
      } else {
        toast(commonT('error'), { description: res.error?.message });
      }
    } catch {
      toast(commonT('error'), { description: t('voidFailed') });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('approvalTitle')}</h1>
          <p className="text-muted-foreground mt-1">{t('approvalDesc')}</p>
        </div>
        <Button variant="outline" onClick={() => { setPage(1); fetchData(1); }}>
          <Clock className="mr-2 h-4 w-4" />
          {t('refresh')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('pendingCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{pendingCount}</span>
              <span className="text-sm text-muted-foreground">{t('items')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ScoreTransactionTable
            data={data}
            loading={loading}
            total={total}
            page={page}
            pageSize={20}
            onPageChange={setPage}
            onApprove={handleApprove}
            onVoid={handleVoid}
            showActions={true}
            showStudentProfileLink={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
