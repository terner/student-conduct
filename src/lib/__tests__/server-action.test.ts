import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withAuth, getAuthProfile, checkPermission } from '../server-action';

// ── Mock supabase client ────────────────────────────────────────
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

const mockSupabase = {
  from: mockFrom,
};

// Helper to build a chain: .from('table').select().eq('col', val).single()
function buildChain(result: unknown) {
  mockSingle.mockResolvedValue({ data: result, error: null });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
}

// ── Mock server module ───────────────────────────────────────────
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
  createClientWithUser: vi.fn(() =>
    Promise.resolve({
      supabase: mockSupabase,
      user: { id: 'auth-user-123', email: 'test@school.com', aud: 'authenticated' },
    })
  ),
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
    // Override createClientWithUser to return no user
    const mod = await import('@/lib/supabase/server');
    vi.mocked(mod.createClientWithUser).mockResolvedValueOnce({
      supabase: mockSupabase,
      user: null,
    });

    const result = await getAuthProfile();
    expect(result.profile).toBeNull();
    expect(result.error).toBe('UNAUTHORIZED');
  });

  it('returns FORBIDDEN when profile not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue({ single: mockSingle });
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
    vi.mocked(mod.createClientWithUser).mockResolvedValueOnce({
      supabase: mockSupabase,
      user: null,
    });

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

  it('returns true for admin role', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'admin' }, error: null });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await checkPermission('profile-uuid', 'score.record');
    expect(result).toBe(true);
  });

  it('returns true for teacher with explicit permission', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'teacher' }, error: null });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await checkPermission('profile-uuid', 'score.record');
    expect(result).toBe(true);
  });

  it('returns false for teacher without permission', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'teacher' }, error: null });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await checkPermission('profile-uuid', 'admin.settings');
    expect(result).toBe(false);
  });

  it('returns false for student with admin permission', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'student' }, error: null });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await checkPermission('profile-uuid', 'score.record');
    expect(result).toBe(false);
  });

  it('returns true for student viewing own', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'student' }, error: null });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await checkPermission('profile-uuid', 'score.view_own');
    expect(result).toBe(true);
  });

  it('returns false when profile not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await checkPermission('profile-uuid', 'score.record');
    expect(result).toBe(false);
  });
});
