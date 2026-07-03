import { describe, expect, it } from 'vitest';
import { buildPromotionEnrollmentRows } from '@/lib/academic-year/rollover';
import {
  normalizeEnrollmentStatus,
  studentCurrentStatusFromEnrollment,
} from '@/lib/students/import-status';

describe('Phase 1 annual rollover helpers', () => {
  it('builds active enrollments for students that do not already exist in the target year', () => {
    const rows = buildPromotionEnrollmentRows(
      [
        { id: 'enroll-1', student_id: 'student-1', classroom_id: 'class-old-1', class_number: 7 },
        { id: 'enroll-2', student_id: 'student-2', classroom_id: 'class-old-2', class_number: 8 },
        { id: 'enroll-3', student_id: 'student-3', classroom_id: 'missing-class', class_number: 9 },
        { id: 'enroll-4', student_id: null, classroom_id: 'class-old-1', class_number: 10 },
        { id: 'enroll-5', student_id: 'student-5', classroom_id: 'class-old-2', class_number: 12 },
      ],
      new Map([
        ['class-old-1', 'class-new-1'],
        ['class-old-2', 'class-new-2'],
      ]),
      'year-new',
      new Set(['student-2']),
      new Set(['class-new-2|12']),
    );

    expect(rows).toEqual([
      {
        student_id: 'student-1',
        classroom_id: 'class-new-1',
        academic_year_id: 'year-new',
        class_number: 7,
        enrollment_status: 'active',
        source: 'promotion_helper',
        previous_enrollment_id: 'enroll-1',
      },
      {
        student_id: 'student-5',
        classroom_id: 'class-new-2',
        academic_year_id: 'year-new',
        class_number: null,
        enrollment_status: 'active',
        source: 'promotion_helper',
        previous_enrollment_id: 'enroll-5',
      },
    ]);
  });
});

describe('Phase 1 annual import helpers', () => {
  it('normalizes supported English and Thai enrollment statuses', () => {
    expect(normalizeEnrollmentStatus('active')).toBe('active');
    expect(normalizeEnrollmentStatus('graduated')).toBe('graduated');
    expect(normalizeEnrollmentStatus('จบการศึกษา')).toBe('graduated');
    expect(normalizeEnrollmentStatus('ย้ายออก')).toBe('transferred');
    expect(normalizeEnrollmentStatus('ซ้ำชั้น')).toBe('repeated');
    expect(normalizeEnrollmentStatus('unknown')).toBe('active');
  });

  it('maps enrollment status to the current student status safely', () => {
    expect(studentCurrentStatusFromEnrollment('active')).toBe('active');
    expect(studentCurrentStatusFromEnrollment('repeated')).toBe('active');
    expect(studentCurrentStatusFromEnrollment('transferred')).toBe('transferred');
    expect(studentCurrentStatusFromEnrollment('graduated')).toBe('graduated');
    expect(studentCurrentStatusFromEnrollment('inactive')).toBe('inactive');
  });
});
