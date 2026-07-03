'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowDownUp, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableHead } from '@/components/ui/table';

export type SortDirection = 'asc' | 'desc';

interface SortableTableHeadProps<TField extends string> {
  children: ReactNode;
  field: TField;
  activeField: TField | null;
  direction: SortDirection;
  onSort: (field: TField) => void;
  className?: string;
}

export function SortableTableHead<TField extends string>({
  children,
  field,
  activeField,
  direction,
  onSort,
  className,
}: SortableTableHeadProps<TField>) {
  const active = activeField === field;
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowDownUp;

  return (
    <TableHead
      className={className}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 px-2 text-xs font-semibold"
        onClick={() => onSort(field)}
      >
        <span>{children}</span>
        <Icon className={`ml-1 h-3.5 w-3.5 ${active ? 'text-foreground' : 'text-muted-foreground'}`} />
      </Button>
    </TableHead>
  );
}
