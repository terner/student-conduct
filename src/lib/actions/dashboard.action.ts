'use server';

import { withAuth } from '@/lib/server-action';
import { getDashboardData } from '@/lib/db';
import { createClient, createAdminClient, createClientWithUser } from '@/lib/supabase/server';

/**
 * Consolidated dashboard data fetch.
 *
 * Single server action → single auth check → single call to getDashboardData()
 * which internally batches all queries efficiently.
 *
 * Previously the dashboard called THREE separate server actions in parallel,
 * each doing its own auth flow + N+1 queries. This one call replaces all.
 */
export async function getDashboard() {
  return withAuth(async () => {
    const data = await getDashboardData();
    return {
      success: true,
      data: {
        stats: data.stats,
        recentTransactions: data.recent_transactions,
        atRiskStudents: data.at_risk_students,
      },
    };
  });
}

/**
 * Check if the current user has accepted PDPA consent.
 * Returns the consent status or null if not found.
 *
 * Uses admin client (service_role_key) to bypass RLS because:
 *  - The user is already authenticated via withAuth()
 *  - In the custom cookie auth flow, supabase.setSession() may not
 *    properly propagate the JWT to the REST API, causing auth.uid()
 *    to be undefined in RLS policies (resulting in user_id=eq.undefined)
 *  - Application-level auth is sufficient here — withAuth already verified
 *    the user's identity before this function runs
 */
export async function checkPDPAConsent() {
  return withAuth(async (profile) => {
    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from('pdpa_consents')
      .select('accepted, created_at')
      .eq('subject_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }

    if (!data) {
      return { success: true, data: { consented: false } };
    }
    return { success: true, data: { consented: data.accepted } };
  });
}

/**
 * Check if the current user must change their password.
 */
export async function checkMustChangePassword() {
  return withAuth(async (profile) => {
    return {
      success: true,
      data: { must_change_password: profile.must_change_password },
    };
  });
}

/**
 * Accept PDPA consent for the current user.
 * Uses admin client to bypass RLS (user is already authenticated via withAuth).
 */
export async function acceptPDPA() {
  return withAuth(async (profile) => {
    const adminClient = await createAdminClient();
    const { error } = await adminClient.from('pdpa_consents').insert({
      subject_type: profile.role === 'student' ? 'student' : profile.role === 'teacher' ? 'teacher' : 'admin',
      subject_id: profile.id,
      consent_type: 'general',
      version: '1.0',
      accepted: true,
      accepted_by: profile.id,
    });
    if (error) {
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
    return { success: true, data: { consented: true } };
  });
}

/**
 * Get current user profile info (role, name, email)
 */
export async function getCurrentUserRole() {
  return withAuth(async (profile) => {
    const { user } = await createClientWithUser();
    return {
      success: true,
      data: {
        role: profile.role,
        full_name: profile.full_name,
        email: user?.email || null,
      },
    };
  });
}

/**
 * Update profile name (first_name + last_name → full_name)
 */
export async function changeProfileName(firstName: string, lastName: string) {
  return withAuth(async (profile) => {
    const fullName = `${firstName} ${lastName}`.trim();
    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id);

    if (error) {
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
    return { success: true, data: { full_name: fullName } };
  });
}
