'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAcademicYears } from '@/lib/actions/student.action';
import {
  getStoredAcademicYearId,
  setStoredAcademicYearId,
  useSelectedAcademicYearId,
} from '@/lib/academic-year-selection';

interface AcademicYear {
  id: string;
  name: string;
  is_current: boolean;
}

export function AcademicYearSwitcher() {
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [years, setYears] = useState<AcademicYear[]>([]);

  useEffect(() => {
    async function loadYears() {
      const result = await getAcademicYears();
      if (!result.success || !result.data) return;

      const academicYears = result.data as AcademicYear[];
      setYears(academicYears);

      // เลือกปีปัจจุบันเสมอ (is_current = true) ไม่สนใจค่าเก่า
      const current = academicYears.find((year) => year.is_current) || academicYears[0];
      if (current) setStoredAcademicYearId(current.id);
    }
    loadYears();
  }, []);

  const selectedYear = useMemo(
    () => years.find((year) => year.id === selectedAcademicYearId),
    [selectedAcademicYearId, years],
  );

  if (years.length === 0) return null;

  return (
    <Select
      value={selectedYear?.id || selectedAcademicYearId}
      onValueChange={(value) => value && setStoredAcademicYearId(value)}
      itemToStringLabel={(value) => {
        const year = years.find((item) => item.id === value);
        return year ? year.name : String(value);
      }}
    >
      <SelectTrigger className="w-[150px]">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="ปีการศึกษา" />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year.id} value={year.id} label={year.name}>
            {year.name}{year.is_current ? ' (ปัจจุบัน)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
