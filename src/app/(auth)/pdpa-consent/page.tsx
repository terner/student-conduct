'use client';

import { useState } from 'react';
import { Shield, AlertCircle, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { acceptPDPA, getCurrentUserRole } from '@/lib/actions/dashboard.action';

export default function PdpaConsentPage() {
  const t = useTranslations('authPages.pdpa');
  const commonT = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await acceptPDPA();

      if (res.success) {
        const roleRes = await getCurrentUserRole();

        if (roleRes.success && roleRes.data) {
          const roles = Array.isArray(roleRes.data.role) ? roleRes.data.role : roleRes.data.role ? [roleRes.data.role] : [];

          let redirectUrl = '/dashboard';
          if (roles.includes('student') && !roles.includes('admin') && !roles.includes('teacher') && !roles.includes('superadmin')) {
            redirectUrl = '/student/dashboard';
          } else if (roles.includes('teacher') && !roles.includes('admin') && !roles.includes('superadmin')) {
            redirectUrl = '/score/record';
          }

          window.location.href = redirectUrl;
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(res.error?.message || t('saveFailed'));
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ Exception:', err);
      setError(t('genericError'));
      setLoading(false);
    }
  }

  const isButtonDisabled = !accepted || loading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {t('description')}
          </p>
        </div>

        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p>{t('body')}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('itemIdentity')}</li>
            <li>{t('itemConduct')}</li>
            <li>{t('itemContact')}</li>
            <li>{t('itemGuardian')}</li>
          </ul>
          <p>{t('withdrawal')}</p>

          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>{t('consentLabel')}</span>
          </label>
        </div>

        <form onSubmit={handleAccept} className="flex gap-2 justify-end">
          <a
            href="/pdpa-rejected"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            {t('decline')}
          </a>
          <button
            type="submit"
            disabled={isButtonDisabled}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
              isButtonDisabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? commonT('saving') : (
              <>
                <Check className="h-4 w-4" />
                {t('accept')}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
