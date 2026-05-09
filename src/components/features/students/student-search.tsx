'use client';

import { useCallback, useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAcademicYears, getClassroomsForSelect } from '@/lib/actions/student.action';

interface StudentSearchProps {
  onSearch: (params: { search?: string; classroom_id?: string; grade_level?: string; education_stage?: string; status?: string; academic_year?: string }) => void;
  classrooms?: { id: string; name: string; grade_level: number; education_stage: string; academic_year_id?: string }[];
  academicYears?: { id: string; name: string; is_current: boolean }[];
}

interface ClassroomOption {
  id: string;
  name: string;
  grade_level: number;
  education_stage: string;
}

export function StudentSearch({ onSearch, classrooms: propClassrooms }: StudentSearchProps) {
  const [search, setSearch] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [educationStage, setEducationStage] = useState('');
  const [status, setStatus] = useState('');
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; is_current: boolean }[]>([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [filteredClassrooms, setFilteredClassrooms] = useState<ClassroomOption[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);

  // Load academic years on mount
  useEffect(() => {
    getAcademicYears().then((res) => {
      if (res.success && res.data) {
        setAcademicYears(res.data);
        const current = res.data.find((y: any) => y.is_current);
        if (current) setSelectedYearId(current.id);
        else if (res.data.length > 0) setSelectedYearId(res.data[0].id);
      }
    });
  }, []);

  // Load classrooms when year changes
  useEffect(() => {
    if (!selectedYearId) return;
    setLoadingClassrooms(true);
    getClassroomsForSelect(selectedYearId).then((res) => {
      if (res.success && res.data) {
        setFilteredClassrooms(res.data);
      }
    }).finally(() => setLoadingClassrooms(false));
  }, [selectedYearId]);

  // If classrooms provided via props, use those (filtered by year)
  const displayClassrooms = (propClassrooms && propClassrooms.length > 0
    ? propClassrooms.filter(c => !selectedYearId || c.academic_year_id === selectedYearId)
    : filteredClassrooms
  ).filter(c => {
    if (gradeLevel) {
      const g = parseInt(gradeLevel);
      if (c.grade_level !== g) return false;
    }
    if (educationStage && c.education_stage !== educationStage) return false;
    return true;
  });

  const handleSearch = useCallback(() => {
    onSearch({
      search: search || undefined,
      classroom_id: classroomId || undefined,
      grade_level: gradeLevel || undefined,
      education_stage: educationStage as 'primary' | 'secondary' | undefined,
      status: status || undefined,
      academic_year: selectedYearId || undefined,
    });
  }, [search, classroomId, gradeLevel, educationStage, status, selectedYearId, onSearch]);

  const handleClear = useCallback(() => {
    setSearch('');
    setClassroomId('');
    setGradeLevel('');
    setEducationStage('');
    setStatus('');
    onSearch({});
  }, [onSearch]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหารหัสนักเรียนหรือชื่อ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="pl-9"
        />
      </div>

      {/* Academic Year */}
      <div className="w-[140px]">
        <Select value={selectedYearId} onValueChange={(v) => v !== null && setSelectedYearId(v)}
          itemToStringLabel={(value) => {
            const y = academicYears.find(y => y.id === value);
            return y ? `${y.name}${y.is_current ? ' (ปัจจุบัน)' : ''}` : String(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="ปีการศึกษา" />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((y) => (
              <SelectItem key={y.id} value={y.id} label={`${y.name}${y.is_current ? ' (ปัจจุบัน)' : ''}`}>
                {y.name}{y.is_current ? ' (ปัจจุบัน)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-[140px]">
        <Select value={educationStage} onValueChange={(v) => v !== null && (setEducationStage(v), setClassroomId(''))}

          itemToStringLabel={(value) => value === 'primary' ? 'ประถม' : value === 'secondary' ? 'มัธยม' : value === '' ? 'ทั้งหมด' : String(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="ระดับ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">ทั้งหมด</SelectItem>
            <SelectItem value="primary">ประถม</SelectItem>
            <SelectItem value="secondary">มัธยม</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-[120px]">
        <Select value={gradeLevel} onValueChange={(v) => v !== null && (setGradeLevel(v), setClassroomId(''))}
          itemToStringLabel={(value) => {
            if (!value) return 'ทั้งหมด';
            const g = parseInt(value);
            if (g >= 1 && g <= 6) return `ป.${g}`;
            if (g >= 7 && g <= 9) return `ม.${g - 6}`;
            return String(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="ชั้นปี" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">ทั้งหมด</SelectItem>
            {(!educationStage || educationStage === 'primary') && [1, 2, 3, 4, 5, 6].map((g) => (
              <SelectItem key={g} value={String(g)}>
                ป.{g}
              </SelectItem>
            ))}
            {(!educationStage || educationStage === 'secondary') && [7, 8, 9].map((g) => (
              <SelectItem key={g} value={String(g)}>
                ม.{g - 6}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {displayClassrooms && (
        <div className="w-[160px]">
          <Select
            value={classroomId}
            onValueChange={(v) => v !== null && setClassroomId(v)}
            disabled={!selectedYearId || loadingClassrooms}
            itemToStringLabel={(value) => {
              if (!value) return 'ทั้งหมด';
              const c = displayClassrooms.find(c => c.id === value);
              return c ? c.name : String(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingClassrooms ? 'โหลด...' : 'ห้องเรียน'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">ทั้งหมด</SelectItem>
              {displayClassrooms.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="w-[120px]">
        <Select value={status} onValueChange={(v) => v !== null && setStatus(v)}
          itemToStringLabel={(value) => {
            const labels: Record<string, string> = { '': 'ทั้งหมด', active: 'กำลังศึกษา', inactive: 'ไม่ active', transferred: 'ย้ายออก', graduated: 'จบการศึกษา', suspended: 'พักการเรียน' };
            return labels[value] || String(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">ทั้งหมด</SelectItem>
            <SelectItem value="active">กำลังศึกษา</SelectItem>
            <SelectItem value="inactive">ไม่ active</SelectItem>
            <SelectItem value="transferred">ย้ายออก</SelectItem>
            <SelectItem value="graduated">จบการศึกษา</SelectItem>
            <SelectItem value="suspended">พักการเรียน</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSearch}>ค้นหา</Button>
      <Button variant="ghost" size="icon" onClick={handleClear} title="ล้างการค้นหา">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
