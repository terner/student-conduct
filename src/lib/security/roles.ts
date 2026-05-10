/**
 * Role/permission utility functions
 * Pure functions — no server actions, usable in both client and server code
 */

/**
 * Get the set of roles for a profile
 * Handles both string (legacy) and string[] (new multi-role) formats
 */
export function getRoles(profile: { role?: string | string[] | null }): string[] {
  if (!profile.role) return ['student'];
  return Array.isArray(profile.role) ? profile.role : [profile.role];
}

/**
 * Check if a profile has a specific role
 */
export function hasRole(
  profile: { role?: string | string[] | null },
  role: string
): boolean {
  return getRoles(profile).includes(role);
}

export function hasAnyRole(
  profile: { role?: string | string[] | null },
  roles: string[]
): boolean {
  const currentRoles = getRoles(profile);
  return roles.some((role) => currentRoles.includes(role));
}

export function isSuperAdmin(profile: { role?: string | string[] | null }): boolean {
  return hasRole(profile, 'superadmin');
}

export function canManageSettings(profile: { role?: string | string[] | null }): boolean {
  return isSuperAdmin(profile);
}

export function canManageSchoolData(profile: { role?: string | string[] | null }): boolean {
  return isSuperAdmin(profile);
}

export function canApproveScores(profile: { role?: string | string[] | null }): boolean {
  return hasAnyRole(profile, ['superadmin', 'admin']);
}

export function canImportData(profile: { role?: string | string[] | null }): boolean {
  return hasAnyRole(profile, ['superadmin', 'admin']);
}

export function canRecordScores(profile: { role?: string | string[] | null }): boolean {
  return hasAnyRole(profile, ['superadmin', 'admin', 'teacher']);
}

/**
 * Display-friendly role name (handles both single and multi-role)
 */
export function displayRole(role: string | string[] | null | undefined): string {
  if (!role) return 'นักเรียน';
  const roles = Array.isArray(role) ? role : [role];
  const labels: Record<string, string> = {
    superadmin: 'ผู้ดูแลสูงสุด',
    admin: 'ผู้ดูแลระบบ',
    teacher: 'ครู',
    student: 'นักเรียน',
  };
  return roles.map(r => labels[r] || r).join(', ');
}
