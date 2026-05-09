'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getScores, approveScore, voidScore } from '@/lib/actions/score.action';
import { ScoreTransactionTable } from '@/components/features/scores/score-transaction-table';
import type { ScoreTransactionWithDetails } from '@/lib/db/queries/score.queries';

export default function ApprovalPage() {
  const [data, setData] = useState<ScoreTransactionWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchData = useCallback(async (pageNum = 1) => {
    setLoading(true);
    const result = await getScores({ status: 'pending', page: pageNum, page_size: 20 });
    if (result.success && result.data) {
      setData(result.data.data as unknown as ScoreTransactionWithDetails[]);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  // Fetch pending count for summary
  useEffect(() => {
    getScores({ status: 'pending', page_size: 1 }).then((res) => {
      if (res.success && res.data) {
        setPendingCount(res.data.total);
      }
    });
  }, []);

  const handleApprove = async (transactionId: string) => {
    try {
      const res = await approveScore(transactionId);
      if (res.success) {
        toast('อนุมัติคะแนนสำเร็จ');
        fetchData(page);
        setPendingCount((prev) => Math.max(0, prev - 1));
      } else {
        toast('เกิดข้อผิดพลาด', { description: res.error?.message });
      }
    } catch {
      toast('เกิดข้อผิดพลาด', { description: 'ไม่สามารถอนุมัติได้' });
    }
  };

  const handleVoid = async (transactionId: string, reason: string) => {
    try {
      const res = await voidScore(transactionId, reason);
      if (res.success) {
        toast('ยกเลิกรายการสำเร็จ');
        fetchData(page);
      } else {
        toast('เกิดข้อผิดพลาด', { description: res.error?.message });
      }
    } catch {
      toast('เกิดข้อผิดพลาด', { description: 'ไม่สามารถยกเลิกได้' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">รออนุมัติ</h1>
          <p className="text-muted-foreground mt-1">รายการคะแนนที่รอการอนุมัติ</p>
        </div>
        <Button variant="outline" onClick={() => { setPage(1); fetchData(1); }}>
          <Clock className="mr-2 h-4 w-4" />
          รีเฟรช
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              รอการอนุมัติ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{pendingCount}</span>
              <span className="text-sm text-muted-foreground">รายการ</span>
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
