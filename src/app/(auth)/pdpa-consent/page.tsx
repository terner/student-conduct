'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { acceptPDPA, getCurrentUserRole } from '@/lib/actions/dashboard.action';

export default function PdpaConsentPage() {
  const t = useTranslations('authPages.pdpa');
  const commonT = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [userRole, setUserRole] = useState<string | string[] | null>(null);

  useEffect(() => {
    getCurrentUserRole().then((res) => {
      if (res.success && res.data) {
        setUserRole(res.data.role);
      } else {
        setError(t('userCheckFailed'));
      }
    });
  }, [t]);

  async function handleAccept() {
    setLoading(true);
    setError('');
    try {
      const res = await acceptPDPA();
      if (res.success) {
        // Redirect based on role (role is string[] from DB)
        const roles = Array.isArray(userRole) ? userRole : userRole ? [userRole] : []
        if (roles.includes('student') && !roles.includes('admin') && !roles.includes('teacher') && !roles.includes('superadmin')) {
          window.location.href = '/student/dashboard'
        } else if (roles.includes('teacher') && !roles.includes('admin') && !roles.includes('superadmin')) {
          window.location.href = '/score/record'
        } else {
          window.location.href = '/dashboard'
        }
      } else {
        setError(res.error?.message || t('saveFailed'));
      }
    } catch (err) {
      setError(t('genericError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <p>
            {t('body')}
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('itemIdentity')}</li>
            <li>{t('itemConduct')}</li>
            <li>{t('itemContact')}</li>
            <li>{t('itemGuardian')}</li>
          </ul>
          <p>
            {t('withdrawal')}
          </p>

          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1"
            />
            <span>
              {t('consentLabel')}
            </span>
          </label>
        </CardContent>
        <CardFooter className="flex gap-2 justify-end">
          <Button variant="outline" nativeButton={false} disabled={loading} render={<a href="/pdpa-rejected" />}>
            <X className="mr-2 h-4 w-4" />
            {t('decline')}
          </Button>
          <Button onClick={handleAccept} disabled={!accepted || loading}>
            <Check className="mr-2 h-4 w-4" />
            {loading ? commonT('saving') : t('accept')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
