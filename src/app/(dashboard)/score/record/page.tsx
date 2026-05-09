'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreRecordForm } from '@/components/features/scores/score-record-form';
import { ScoreTransactionTable } from '@/components/features/scores/score-transaction-table';
import { getScores, recordScore, voidScore, approveScore, getCategories } from '@/lib/actions/score.action';
import { getStudentListForSelect } from '@/lib/actions/student.action';
import type { ScoreRecordInput } from '@/lib/validation/schemas';
import type { ScoreCategory } from '@/types';
import type { ScoreTransactionWithDetails } from '@/lib/db/queries/score.queries';

export default function ScoreRecordPage() {
  const [students, setStudents] = useState<{ id: string; full_name: string; student_id_number: string; classroom_name: string }[]>([]);
  const [categories, setCategories] = useState<ScoreCategory[]>([]);
  const [transactions, setTransactions] = useState<ScoreTransactionWithDetails[]>([]);
  const [transTotal, setTransTotal] = useState(0);
  const [transPage, setTransPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);

  const fetchTransactions = useCallback(async (pageNum = 1) => {
    const result = await getScores({ page: pageNum, page_size: 20 });
    if (result.success && result.data) {
      setTransactions(result.data.data as unknown as ScoreTransactionWithDetails[]);
      setTransTotal(result.data.total);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const [studentRes, catRes] = await Promise.all([
        getStudentListForSelect(),
        getCategories(),
      ]);
      if (studentRes.success && studentRes.data) setStudents(studentRes.data);
      if (catRes.success && catRes.data) setCategories(catRes.data);
      await fetchTransactions(1);
      setLoading(false);
    }
    init();
  }, [fetchTransactions]);

  const handleRecordScore = async (data: ScoreRecordInput, evidenceFiles?: File[]) => {
    setRecording(true);
    try {
      const result = await recordScore(data);
      if (!result.success) throw new Error(result.error?.message);

      // Upload evidence if any
      if (evidenceFiles && evidenceFiles.length > 0 && result.data?.id) {
        const formData = new FormData();
        for (const file of evidenceFiles) {
          formData.append('files', file);
        }
        formData.append('transaction_id', result.data.id);
        await fetch('/api/upload/evidence', { method: 'POST', body: formData }).catch(() => {});
      }

      await fetchTransactions(1);
    } finally {
      setRecording(false);
    }
  };

  const handleVoid = async (transactionId: string, reason: string) => {
    await voidScore(transactionId, reason);
    await fetchTransactions(transPage);
  };

  const handleApprove = async (transactionId: string) => {
    await approveScore(transactionId);
    await fetchTransactions(transPage);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">บันทึกคะแนน</h1>
        <p className="text-muted-foreground mt-1">บันทึกและจัดการคะแนนความประพฤตินักเรียน</p>
      </div>

      <Tabs defaultValue="record">
        <TabsList>
          <TabsTrigger value="record">บันทึกคะแนน</TabsTrigger>
          <TabsTrigger value="history">ประวัติการบันทึก</TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">บันทึกคะแนนใหม่</CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreRecordForm
                  students={students}
                  categories={categories}
                  onSubmit={handleRecordScore}
                  loading={recording}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">หมวดหมู่คะแนน</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-destructive mb-2">หักคะแนน</h4>
                    <div className="space-y-1">
                      {categories.filter(c => c.type === 'deduct').map(c => (
                        <div key={c.id} className="flex justify-between text-sm py-1 px-2 rounded hover:bg-accent">
                          <span>{c.name}</span>
                          <span className="text-destructive font-mono">{c.default_points}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-green-600 mb-2">เพิ่มคะแนน</h4>
                    <div className="space-y-1">
                      {categories.filter(c => c.type === 'add').map(c => (
                        <div key={c.id} className="flex justify-between text-sm py-1 px-2 rounded hover:bg-accent">
                          <span>{c.name}</span>
                          <span className="text-green-600 font-mono">+{Math.abs(c.default_points)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ประวัติการบันทึกคะแนน</CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreTransactionTable
                data={transactions}
                total={transTotal}
                page={transPage}
                onPageChange={(p) => { setTransPage(p); fetchTransactions(p); }}
                onVoid={handleVoid}
                onApprove={handleApprove}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
