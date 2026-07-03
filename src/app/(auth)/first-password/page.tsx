'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Save, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { forceChangePasswordSchema } from '@/lib/validation/schemas';
import { changePassword } from '@/lib/actions/dashboard.action';

type FirstPasswordForm = {
  new_password: string;
  confirm_password: string;
};

export default function FirstPasswordPage() {
  const router = useRouter();
  const t = useTranslations('authPages.firstPassword');
  const commonT = useTranslations('common');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FirstPasswordForm>({
    resolver: zodResolver(forceChangePasswordSchema),
  });

  async function onSubmit(data: FirstPasswordForm) {
    setError('');
    setLoading(true);

    try {
      const result = await changePassword(data.new_password);

      if (!result.success) {
        setError(result.error?.message ?? '');
        setLoading(false);
        return;
      }

      router.replace('/pdpa-consent');
    } catch (error) {
      setError(error instanceof Error ? error.message : '');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t('description')}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="new_password" className="text-sm font-medium">
              {t('newPassword')}
            </label>
            <div className="relative">
              <input
                id="new_password"
                type={showNewPassword ? 'text' : 'password'}
                {...register('new_password')}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.new_password && (
              <p className="text-xs text-red-500">{errors.new_password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm_password" className="text-sm font-medium">
              {t('confirmPassword')}
            </label>
            <div className="relative">
              <input
                id="confirm_password"
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirm_password')}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="text-xs text-red-500">{errors.confirm_password.message}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {t('passwordHelp')}
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? commonT('saving') : t('submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
