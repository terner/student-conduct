export interface PromotionSourceEnrollment {
  id: string;
  student_id: string | null;
  classroom_id: string | null;
  class_number?: number | null;
}

export function buildPromotionEnrollmentRows(
  sourceEnrollments: PromotionSourceEnrollment[],
  sourceToTargetClassroomId: Map<string, string>,
  targetYearId: string,
  existingTargetStudentIds: Set<string>,
  existingTargetClassNumbers: Set<string> = new Set(),
) {
  return sourceEnrollments
    .map((enrollment) => {
      const classroomId = enrollment.classroom_id ? sourceToTargetClassroomId.get(enrollment.classroom_id) : undefined;
      const classNumberKey = classroomId && enrollment.class_number
        ? `${classroomId}|${enrollment.class_number}`
        : '';

      return {
        student_id: enrollment.student_id,
        classroom_id: classroomId,
        academic_year_id: targetYearId,
        class_number: classNumberKey && existingTargetClassNumbers.has(classNumberKey)
          ? null
          : enrollment.class_number,
        enrollment_status: 'active',
        source: 'promotion_helper',
        previous_enrollment_id: enrollment.id,
      };
    })
    .filter((enrollment) => (
      enrollment.student_id &&
      enrollment.classroom_id &&
      !existingTargetStudentIds.has(enrollment.student_id)
    ));
}
