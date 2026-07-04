'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TablePaginationToolbarProps {
  page: number;
  pageSize: number;
  total: number;
  summary: string;
  onPageChange: (page: number) => void;
  rowsPerPageLabel: string;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export function TablePaginationToolbar({
  page,
  pageSize,
  total,
  summary,
  onPageChange,
  rowsPerPageLabel,
  pageSizeOptions,
  onPageSizeChange,
  className = '',
}: TablePaginationToolbarProps) {
  const commonT = useTranslations('common');
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  if (total <= 0) return null;

  return (
    <div className={`flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${className}`}>
      <span className="text-sm text-muted-foreground">{summary}</span>
      <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:justify-end">
        {pageSizeOptions && onPageSizeChange ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">{rowsPerPageLabel}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                const nextPageSize = Number(value);
                if (!pageSizeOptions.includes(nextPageSize)) return;
                onPageSizeChange(nextPageSize);
              }}
              itemToStringLabel={(value) => {
                const option = pageSizeOptions.find((item) => String(item) === value);
                return option ? String(option) : '';
              }}
            >
              <SelectTrigger className="!h-8 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="!min-w-[72px]">
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)} label={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="default"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            {commonT('previous')}
          </Button>
          <span className="flex h-8 min-w-14 items-center justify-center text-center text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="default"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            {commonT('next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
