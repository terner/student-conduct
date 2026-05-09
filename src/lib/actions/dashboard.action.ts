'use server';

import { withAuth } from '@/lib/server-action';
import { getDashboardData } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

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
 */
export async function checkPDPAConsent() {
  return withAuth(async (profile) => {
    const supabase = await createClient();
    const { data } = await supabase
      .from('pdpa_consents')
      .select('accepted, created_at')
      .eq('subject_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

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
 */
export async function acceptPDPA() {
  return withAuth(async (profile) => {
    const supabase = await createClient();
    const { error } = await supabase.from('pdpa_consents').insert({
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
 * Get current user profile info (role)
 */
export async function getCurrentUserRole() {
  return withAuth(async (profile) => {
    return {
      success: true,
      data: { role: profile.role, full_name: profile.full_name },
    };
  });
}
