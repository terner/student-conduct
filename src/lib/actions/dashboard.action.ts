'use server';

import { withAuth } from '@/lib/server-action';
import { getDashboardData } from '@/lib/db';

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
