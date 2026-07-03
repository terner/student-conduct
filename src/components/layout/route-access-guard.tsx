'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { getRoles } from '@/lib/security/roles';

interface RouteAccessGuardProps {
  role?: string | string[] | null;
  children: React.ReactNode;
}

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isStudentDetailModalPath(pathname: string) {
  return pathname === '/students';
}

function defaultPath(roles: string[]) {
  if (roles.includes('superadmin')) return '/dashboard';
  if (roles.includes('admin')) return '/score/approval';
  if (roles.includes('teacher')) return '/score/record';
  return '/students/me';
}

function canAccess(pathname: string, roles: string[]) {
  if (roles.includes('superadmin')) return true;

  if (startsWithAny(pathname, ['/settings/profile'])) return true;

  if (roles.includes('admin')) {
    if (pathname === '/settings') return true;
    if (isStudentDetailModalPath(pathname)) return true;

    return startsWithAny(pathname, [
      '/dashboard',
      '/score/record',
      '/score/approval',
      '/score/history',
      '/score/categories',
      '/settings/import',
      '/settings/profile',
      '/reports',
      '/interventions',
    ]);
  }

  if (roles.includes('teacher')) {
    return startsWithAny(pathname, ['/score/record', '/reports/classroom']) || isStudentDetailModalPath(pathname);
  }

  if (roles.includes('student')) {
    return pathname === '/students/me' || pathname === '/student/dashboard' || isStudentDetailModalPath(pathname);
  }

  return false;
}

export function RouteAccessGuard({ role, children }: RouteAccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const roles = getRoles({ role });
  const allowed = canAccess(pathname, roles);

  useEffect(() => {
    if (!allowed) {
      router.replace(defaultPath(roles));
    }
  }, [allowed, router, roles]);

  if (!allowed) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return <>{children}</>;
}
