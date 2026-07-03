export function normalizeEnrollmentStatus(value: string) {
  const normalized = value.trim().toLowerCase();
  if (['active', 'promoted', 'repeated', 'transferred', 'inactive', 'graduated'].includes(normalized)) {
    return normalized;
  }
  if (['ย้าย', 'ย้ายออก'].includes(normalized)) return 'transferred';
  if (['จบ', 'จบการศึกษา'].includes(normalized)) return 'graduated';
  if (['ซ้ำชั้น'].includes(normalized)) return 'repeated';
  if (['ไม่ใช้งาน', 'พักการเรียน'].includes(normalized)) return 'inactive';
  return 'active';
}

export function studentCurrentStatusFromEnrollment(enrollmentStatus: string) {
  if (enrollmentStatus === 'transferred') return 'transferred';
  if (enrollmentStatus === 'graduated') return 'graduated';
  if (enrollmentStatus === 'inactive') return 'inactive';
  return 'active';
}
