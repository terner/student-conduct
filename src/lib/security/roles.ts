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

/**
 * Display-friendly role name (handles both single and multi-role)
 */
export function displayRole(role: string | string[] | null | undefined): string {
  if (!role) return 'นักเรียน';
  const roles = Array.isArray(role) ? role : [role];
  const labels: Record<string, string> = {
    admin: 'ผู้ดูแลระบบ',
    teacher: 'ครู',
    student: 'นักเรียน',
  };
  return roles.map(r => labels[r] || r).join(', ');
}
