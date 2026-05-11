'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface SimplePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function SimplePagination({ page, pageSize, total, onPageChange, className = '' }: SimplePaginationProps) {
  const commonT = useTranslations('common');
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  if (totalPages <= 1) return null;

  return (
    <div className={`flex flex-col gap-3 border-t p-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between ${className}`}>
      <span>
        {commonT('paginationSummary', {
          start: (currentPage - 1) * pageSize + 1,
          end: Math.min(currentPage * pageSize, total),
          total,
        })}
      </span>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft className="h-4 w-4" />{commonT('previous')}
        </Button>
        <span className="px-2">{currentPage} / {totalPages}</span>
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
          {commonT('next')}<ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
