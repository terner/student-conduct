export const STUDENT_PREFIXES = ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว', 'นาง'] as const;
export const GUARDIAN_PREFIXES = ['นาย', 'นางสาว', 'นาง', 'คุณ'] as const;
export const TEACHER_PREFIXES = ['นาย', 'นาง', 'นางสาว'] as const;

export const DEFAULT_STUDENT_PREFIX = STUDENT_PREFIXES[0];
export const DEFAULT_TEACHER_PREFIX = TEACHER_PREFIXES[0];
export const DEFAULT_TEACHER_POSITION = 'ครู';
export const LEGACY_TEACHER_PREFIX = 'ครู';
export const DEFAULT_GUARDIAN_RELATION = 'guardian';
export const DEFAULT_TEACHER_SYSTEM_ROLE = 'teacher';
