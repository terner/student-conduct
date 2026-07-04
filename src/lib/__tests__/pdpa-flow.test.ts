import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock modules BEFORE importing the code under test ──

// Mock supabase server module
const mockSupabase = {
  from: vi.fn(),
};
const mockUser = { id: 'auth-user-123', email: 'test@school.com', aud: 'authenticated' };

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
  createClientWithUser: vi.fn(() => Promise.resolve({ supabase: mockSupabase, user: mockUser })),
  createAdminClient: vi.fn(() => Promise.resolve(mockSupabase)),
  getUserFromCookie: vi.fn(() => Promise.resolve(mockUser)),
}));

// Now import the code under test
const { checkPDPAConsent, acceptPDPA, getCurrentUserRole, checkMustChangePassword } = await import('@/lib/actions/dashboard.action');

describe('PDPA Consent Flow — Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Profile lookup for getAuthProfile — MUST return a valid profile
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'profile-123',
                  user_id: 'auth-user-123',
                  role: 'teacher',
                  full_name: 'Test User',
                  first_name: 'Test',
                  last_name: 'User',
                  is_active: true,
                  must_change_password: false,
                  created_at: '2026-01-01',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      // For other tables, return a passthrough
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  });

  describe('getCurrentUserRole', () => {
    it('returns the user role from the authenticated profile', async () => {
      const result = await getCurrentUserRole();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toEqual(['teacher']);
        expect(result.data.full_name).toBe('Test User');
      }
    });
  });

  describe('checkMustChangePassword', () => {
    it('returns must_change_password from profile', async () => {
      const result = await checkMustChangePassword();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.must_change_password).toBe(false);
      }
    });
  });

  describe('checkPDPAConsent', () => {
    it('returns consented=false when no consent record exists', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'profile-123', user_id: 'auth-user-123', role: 'teacher', full_name: 'Test User', first_name: 'Test', last_name: 'User', is_active: true, must_change_password: false, created_at: '2026-01-01' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'pdpa_consents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
      });

      const result = await checkPDPAConsent();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.consented).toBe(false);
      }
    });

    it('returns consented=true when consent record exists with accepted=true', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'profile-123', user_id: 'auth-user-123', role: 'teacher', full_name: 'Test User', first_name: 'Test', last_name: 'User', is_active: true, must_change_password: false, created_at: '2026-01-01' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'pdpa_consents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: { accepted: true, created_at: '2026-05-09T00:00:00Z' }, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
      });

      const result = await checkPDPAConsent();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.consented).toBe(true);
      }
    });

    it('returns consented=false when consent record exists with accepted=false', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'profile-123', user_id: 'auth-user-123', role: 'teacher', full_name: 'Test User', first_name: 'Test', last_name: 'User', is_active: true, must_change_password: false, created_at: '2026-01-01' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'pdpa_consents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: { accepted: false, created_at: '2026-05-09T00:00:00Z' }, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
      });

      const result = await checkPDPAConsent();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.consented).toBe(false);
      }
    });

    it('returns error when db query fails', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'profile-123', user_id: 'auth-user-123', role: 'teacher', full_name: 'Test User', first_name: 'Test', last_name: 'User', is_active: true, must_change_password: false, created_at: '2026-01-01' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'pdpa_consents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'Connection failed' } }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
      });

      const result = await checkPDPAConsent();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('DB_ERROR');
      }
    });
  });

  describe('acceptPDPA', () => {
    it('successfully inserts consent via admin client', async () => {
      // Mock: getAuthProfile succeeds, insert succeeds
      let insertCalledWith: Record<string, unknown> | null = null;
      const insertFn = vi.fn().mockImplementation((data) => {
        insertCalledWith = data;
        return { error: null };
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'profile-123', user_id: 'auth-user-123', role: 'teacher', full_name: 'Test User', first_name: 'Test', last_name: 'User', is_active: true, must_change_password: false, created_at: '2026-01-01' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'pdpa_consents') {
          return { insert: insertFn };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
      });

      const result = await acceptPDPA();
      expect(result.success).toBe(true);

      // Verify the insert was called with correct data
      expect(insertCalledWith).not.toBeNull();
      if (insertCalledWith === null) throw new Error('Expected PDPA consent insert payload');
      const insertedConsent = insertCalledWith as unknown as Record<string, unknown>;
      expect(insertedConsent.subject_id).toBe('profile-123');
      expect(insertedConsent.subject_type).toBe('teacher');
      expect(insertedConsent.consent_type).toBe('general');
      expect(insertedConsent.version).toBe('1.0');
      expect(insertedConsent.accepted).toBe(true);
      expect(insertedConsent.accepted_by).toBe('profile-123');
    });

    it('returns error when insert fails', async () => {
      const insertFn = vi.fn().mockReturnValue({ error: { message: 'Database constraint violation' } });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'profile-123', user_id: 'auth-user-123', role: 'teacher', full_name: 'Test User', first_name: 'Test', last_name: 'User', is_active: true, must_change_password: false, created_at: '2026-01-01' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'pdpa_consents') {
          return { insert: insertFn };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
      });

      const result = await acceptPDPA();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('DB_ERROR');
        expect(result.error.message).toBeTruthy();
        expect(result.error.message).not.toContain('constraint');
      }
    });
  });

  describe('Full PDPA Flow — Check → Accept → Re-check', () => {
    it('simulates the complete PDPA consent lifecycle', async () => {
      // Phase 1: No consent exists → check returns consented=false
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'profile-123', user_id: 'auth-user-123', role: 'admin', full_name: 'Admin User', first_name: 'Admin', last_name: 'User', is_active: true, must_change_password: false, created_at: '2026-01-01' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'pdpa_consents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({ error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
      });

      // Check - no consent
      let result = await checkPDPAConsent();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.consented).toBe(false);
      }

      // Phase 2: Accept consent
      result = await acceptPDPA();
      expect(result.success).toBe(true);

      // Phase 3: Re-check — now consent exists
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'profile-123', user_id: 'auth-user-123', role: 'admin', full_name: 'Admin User', first_name: 'Admin', last_name: 'User', is_active: true, must_change_password: false, created_at: '2026-01-01' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'pdpa_consents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: { accepted: true, created_at: '2026-05-09T00:00:00Z' }, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
      });

      result = await checkPDPAConsent();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.consented).toBe(true);
      }
    });
  });
});
