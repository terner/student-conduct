'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScoreTransactionTable } from '@/components/features/scores/score-transaction-table';
import { getScores } from '@/lib/actions/score.action';
import type { ScoreTransactionWithDetails } from '@/lib/db/queries/score.queries';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';

export default function ScoreHistoryPage() {
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [data, setData] = useState<ScoreTransactionWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async (pageNum = 1, searchTerm = search) => {
    setLoading(true);
    const result = await getScores({
      page: pageNum,
      page_size: 20,
      search: searchTerm || undefined,
      academic_year_id: selectedAcademicYearId || undefined,
    });
    if (result.success && result.data) {
      setData(result.data.data as unknown as ScoreTransactionWithDetails[]);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, [search, selectedAcademicYearId]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchData(page));
  }, [page, fetchData]);

  const handleSearch = () => {
    setPage(1);
    fetchData(1, search);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ประวัติคะแนน</h1>
          <p className="text-muted-foreground mt-1">ดูประวัติการบันทึกคะแนนทั้งหมด</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setPage(1); setSearch(''); fetchData(1, ''); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            รีเฟรช
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหารหัสนักเรียน..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-8"
              />
            </div>
            <Button variant="secondary" onClick={handleSearch}>
              <Filter className="mr-2 h-4 w-4" />
              ค้นหา
            </Button>
          </div>

          <ScoreTransactionTable
            data={data}
            loading={loading}
            total={total}
            page={page}
            pageSize={20}
            onPageChange={setPage}
            showActions={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
