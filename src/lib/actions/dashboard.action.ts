'use server';

import { withAuth } from '@/lib/server-action';
import { hasRole, getRoles } from '@/lib/security/roles';
import { getDashboardData } from '@/lib/db';
import { createClient, createAdminClient, getUserFromCookie } from '@/lib/supabase/server';

/**
 * Consolidated dashboard data fetch.
 *
 * Single server action → single auth check → single call to getDashboardData()
 * which internally batches all queries efficiently.
 *
 * Previously the dashboard called THREE separate server actions in parallel,
 * each doing its own auth flow + N+1 queries. This one call replaces all.
 */
export async function getDashboard(params: { academic_year_id?: string } = {}) {
  return withAuth(async (profile) => {
    const data = await getDashboardData(params);

    // If academic year is ending soon, create notification for admin/superadmin
    if (data.academic_year_ending && (hasRole(profile, 'admin') || hasRole(profile, 'superadmin'))) {
      try {
        const supabase = await createAdminClient();
        const notificationType = `academic_year_ending_${data.academic_year_ending.name}`;

        // Check if this notification already exists for this profile
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('recipient_id', profile.id)
          .eq('type', notificationType)
          .maybeSingle();

        if (!existing) {
          await supabase.from('notifications').insert({
            recipient_id: profile.id,
            type: notificationType,
            title: `ปีการศึกษา ${data.academic_year_ending.name} กำลังจะสิ้นสุด`,
            body: data.academic_year_ending.days_remaining === 0
              ? 'วันนี้เป็นวันสุดท้ายของปีการศึกษา กรุณาตั้งปีการศึกษาใหม่'
              : `เหลืออีก ${data.academic_year_ending.days_remaining} วัน (${data.academic_year_ending.end_date})`,
          });
        }
      } catch {
        // Silent — notification failure shouldn't break dashboard
      }
    }

    return {
      success: true,
      data: {
        stats: data.stats,
        academicYears: data.academic_years,
        recentTransactions: data.recent_transactions,
        atRiskStudents: data.at_risk_students,
        academicYearEnding: data.academic_year_ending,
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
      subject_type: hasRole(profile, 'student') ? 'student' : hasRole(profile, 'teacher') ? 'teacher' : 'admin',
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
    const user = await getUserFromCookie();
    return {
      success: true,
      data: {
        role: getRoles(profile),
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

/**
 * Change password (for forced password change flow)
 *
 * Uses admin client to update password in auth.users
 * and clears must_change_password flag.
 */
export async function changePassword(newPassword: string) {
  return withAuth(async (profile) => {
    const adminClient = await createAdminClient();

    // Update password via admin API
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      profile.user_id,
      { password: newPassword }
    );

    if (authError) {
      return {
        success: false,
        error: { code: 'AUTH_ERROR', message: authError.message },
      };
    }

    // Clear must_change_password flag
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ must_change_password: false })
      .eq('user_id', profile.user_id);

    if (profileError) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: profileError.message },
      };
    }

    return { success: true, data: { message: 'เปลี่ยนรหัสผ่านสำเร็จ' } };
  });
}

/**
 * Change password with old password verification (normal password change flow)
 *
 * Verifies old password before updating, does not clear must_change_password flag.
 */
export async function changePasswordWithOld(oldPassword: string, newPassword: string) {
  return withAuth(async (profile) => {
    const supabase = await createClient();
    const user = await getUserFromCookie();

    if (!user?.email) {
      return {
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'ไม่พบผู้ใช้' },
      };
    }

    // Verify old password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (signInError) {
      return {
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'รหัสผ่านเดิมไม่ถูกต้อง' },
      };
    }

    // Old password verified, update to new password
    const adminClient = await createAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      profile.user_id,
      { password: newPassword }
    );

    if (updateError) {
      return {
        success: false,
        error: { code: 'AUTH_ERROR', message: updateError.message },
      };
    }

    return { success: true, data: { message: 'เปลี่ยนรหัสผ่านสำเร็จ' } };
  });
}
