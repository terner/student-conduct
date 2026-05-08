'use client';

import { useCallback, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StudentSearchProps {
  onSearch: (params: { search?: string; classroom_id?: string; grade_level?: string; education_stage?: string; status?: string }) => void;
  classrooms?: { id: string; name: string; grade_level: number; education_stage: string }[];
}

export function StudentSearch({ onSearch, classrooms }: StudentSearchProps) {
  const [search, setSearch] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [educationStage, setEducationStage] = useState('');
  const [status, setStatus] = useState('');

  const handleSearch = useCallback(() => {
    onSearch({
      search: search || undefined,
      classroom_id: classroomId || undefined,
      grade_level: gradeLevel || undefined,
      education_stage: educationStage as 'primary' | 'secondary' | undefined,
      status: status || undefined,
    });
  }, [search, classroomId, gradeLevel, educationStage, status, onSearch]);

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

      <div className="w-[140px]">
        <Select value={educationStage} onValueChange={(v) => v !== null && setEducationStage(v)}>
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
        <Select value={gradeLevel} onValueChange={(v) => v !== null && setGradeLevel(v)}>
          <SelectTrigger>
            <SelectValue placeholder="ชั้นปี" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">ทั้งหมด</SelectItem>
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <SelectItem key={g} value={String(g)}>
                ป.{g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {classrooms && (
        <div className="w-[160px]">
          <Select value={classroomId} onValueChange={(v) => v !== null && setClassroomId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="ห้องเรียน" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">ทั้งหมด</SelectItem>
              {classrooms.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="w-[120px]">
        <Select value={status} onValueChange={(v) => v !== null && setStatus(v)}>
          <SelectTrigger>
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">ทั้งหมด</SelectItem>
            <SelectItem value="active">กำลังศึกษา</SelectItem>
            <SelectItem value="inactive">ไม่ active</SelectItem>
            <SelectItem value="transferred">ย้ายออก</SelectItem>
            <SelectItem value="graduated">จบการศึกษา</SelectItem>
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
