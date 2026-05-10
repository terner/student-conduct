import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withAuth, getAuthProfile, checkPermission } from '../server-action';

// ── Mock supabase client ────────────────────────────────────────
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockPermissionEq = vi.fn();
const mockMaybeSingle = vi.fn();

const mockSupabase = {
  from: mockFrom,
};

// Helper to build a chain: .from('table').select().eq('col', val).maybeSingle()
function buildChain(result: unknown) {
  mockMaybeSingle.mockResolvedValue({ data: result, error: null });
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
}

function buildPermissionCheck(role: string | string[], permissions: string[]) {
  mockMaybeSingle.mockResolvedValue({ data: { role }, error: null });
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockIn.mockReturnValue({ eq: mockPermissionEq });
  mockPermissionEq.mockResolvedValue({
    data: permissions.map((code) => ({
      permissions: { code },
      is_granted: true,
    })),
    error: null,
  });
  mockFrom.mockImplementation((table: string) => ({
    select: table === 'role_permissions'
      ? vi.fn().mockReturnValue({ in: mockIn })
      : mockSelect,
  }));
}

// ── Mock server module ───────────────────────────────────────────
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
  getUserFromCookie: vi.fn(() => Promise.resolve({ id: 'auth-user-123', email: 'test@school.com' })),
  createAdminClient: vi.fn(() => mockSupabase),
}));

// Mock validateXSS to always pass (we test XSS separately)
vi.mock('@/lib/security/validate-input', () => ({
  validateXSS: vi.fn(() => null),
}));

describe('getAuthProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns profile when user is authenticated', async () => {
    const mockProfile = {
      id: 'profile-uuid',
      user_id: 'auth-user-123',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User',
      is_active: true,
    };
    buildChain(mockProfile);

    const result = await getAuthProfile();
    expect(result.profile).not.toBeNull();
    expect(result.profile?.id).toBe('profile-uuid');
    expect(result.profile?.role).toBe('admin');
    expect(result.error).toBeNull();
  });

  it('returns UNAUTHORIZED when no user', async () => {
    // Override getUserFromCookie to return no user
    const mod = await import('@/lib/supabase/server');
    vi.mocked(mod.getUserFromCookie).mockResolvedValueOnce(null);

    const result = await getAuthProfile();
    expect(result.profile).toBeNull();
    expect(result.error).toBe('UNAUTHORIZED');
  });

  it('returns UNAUTHORIZED when user exists but has no id (prevents user_id=eq.undefined)', async () => {
    // Simulate the edge case where setSession() returns a user object without id
    const mod = await import('@/lib/supabase/server');
    vi.mocked(mod.getUserFromCookie).mockResolvedValueOnce({ email: 'test@school.com' } as unknown as Awaited<ReturnType<typeof mod.getUserFromCookie>>); // missing id!

    const result = await getAuthProfile();
    expect(result.profile).toBeNull();
    expect(result.error).toBe('UNAUTHORIZED');
  });

  it('returns FORBIDDEN when profile not found', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await getAuthProfile();
    expect(result.profile).toBeNull();
    expect(result.error).toBe('FORBIDDEN');
  });

  it('returns FORBIDDEN when profile is inactive', async () => {
    buildChain({ id: 'profile-uuid', is_active: false });

    const result = await getAuthProfile();
    expect(result.profile).toBeNull();
    expect(result.error).toBe('FORBIDDEN');
  });
});

describe('withAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes handler when authenticated', async () => {
    buildChain({
      id: 'profile-uuid',
      user_id: 'auth-user-123',
      role: 'teacher',
      first_name: 'Teacher',
      last_name: 'Test',
      is_active: true,
    });

    const result = await withAuth(async (profile) => {
      return { success: true as const, data: { profileId: profile.id } };
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ profileId: 'profile-uuid' });
    }
  });

  it('returns UNAUTHORIZED when not authenticated', async () => {
    const mod = await import('@/lib/supabase/server');
    vi.mocked(mod.getUserFromCookie).mockResolvedValueOnce(null);

    const result = await withAuth(async () => {
      return { success: true as const, data: 'should not reach' };
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('returns FORBIDDEN when profile is inactive', async () => {
    buildChain({ id: 'profile-uuid', is_active: false });

    const result = await withAuth(async () => {
      return { success: true as const, data: 'should not reach' };
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('returns INTERNAL_ERROR when handler throws', async () => {
    buildChain({
      id: 'profile-uuid',
      user_id: 'auth-user-123',
      role: 'admin',
      is_active: true,
    });

    const result = await withAuth(async () => {
      throw new Error('Something broke');
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.message).toContain('Something broke');
    }
  });

  it('handles non-Error throws gracefully', async () => {
    buildChain({
      id: 'profile-uuid',
      user_id: 'auth-user-123',
      role: 'admin',
      is_active: true,
    });

    const result = await withAuth(async () => {
      throw 'string error';
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INTERNAL_ERROR');
    }
  });
});

describe('checkPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockMaybeSingle.mockReset();
    mockEq.mockReset();
    mockIn.mockReset();
    mockPermissionEq.mockReset();
    mockSelect.mockReset();
    mockFrom.mockReset();
  });

  it('returns true for superadmin role', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { role: 'superadmin' }, error: null });
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await checkPermission('profile-uuid', 'score.record');
    expect(result).toBe(true);
  });

  it('returns true for teacher with explicit permission', async () => {
    buildPermissionCheck('teacher', ['score.record']);

    const result = await checkPermission('profile-uuid', 'score.record');
    expect(result).toBe(true);
  });

  it('returns false for teacher without permission', async () => {
    buildPermissionCheck('teacher', ['score.record']);

    const result = await checkPermission('profile-uuid', 'admin.settings');
    expect(result).toBe(false);
  });

  it('returns false for student with admin permission', async () => {
    buildPermissionCheck('student', ['admin.settings']);

    const result = await checkPermission('profile-uuid', 'score.record');
    expect(result).toBe(false);
  });

  it('returns true for student viewing own', async () => {
    buildPermissionCheck('student', ['score.view_own']);

    const result = await checkPermission('profile-uuid', 'score.view_own');
    expect(result).toBe(true);
  });

  it('returns false when profile not found', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await checkPermission('profile-uuid', 'score.record');
    expect(result).toBe(false);
  });
});
