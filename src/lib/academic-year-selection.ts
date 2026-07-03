'use client';

import { useEffect, useState } from 'react';
import { getAcademicYears } from '@/lib/actions/student.action';

export const ACADEMIC_YEAR_STORAGE_KEY = 'selected_academic_year_id';
const ACADEMIC_YEAR_EVENT = 'academic-year-change';

interface AcademicYearOption {
  id: string;
  name: string;
  is_current: boolean;
}

let resolveAcademicYearPromise: Promise<string> | null = null;

export function getStoredAcademicYearId() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ACADEMIC_YEAR_STORAGE_KEY) || '';
}

export function setStoredAcademicYearId(id: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACADEMIC_YEAR_STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(ACADEMIC_YEAR_EVENT, { detail: id }));
}

async function resolveAcademicYearIdFromServer() {
  const storedId = getStoredAcademicYearId();
  const result = await getAcademicYears();
  if (!result.success || !result.data || result.data.length === 0) return storedId;

  const years = result.data as AcademicYearOption[];
  const resolvedId = years.some((year) => year.id === storedId)
    ? storedId
    : (years.find((year) => year.is_current) || years[0])?.id || '';

  if (resolvedId && resolvedId !== storedId) {
    setStoredAcademicYearId(resolvedId);
  }

  return resolvedId;
}

function getResolvedAcademicYearId() {
  if (!resolveAcademicYearPromise) {
    resolveAcademicYearPromise = resolveAcademicYearIdFromServer().finally(() => {
      resolveAcademicYearPromise = null;
    });
  }

  return resolveAcademicYearPromise;
}

export function useSelectedAcademicYearId() {
  const [academicYearId, setAcademicYearId] = useState('');

  useEffect(() => {
    let cancelled = false;

    void getResolvedAcademicYearId().then((resolvedId) => {
      if (!cancelled && resolvedId) {
        setAcademicYearId(resolvedId);
      }
    });

    function handleStorage(event: StorageEvent) {
      if (event.key === ACADEMIC_YEAR_STORAGE_KEY) {
        setAcademicYearId(event.newValue || '');
      }
    }

    function handleLocalEvent(event: Event) {
      setAcademicYearId((event as CustomEvent<string>).detail || '');
    }

    window.addEventListener('storage', handleStorage);
    window.addEventListener(ACADEMIC_YEAR_EVENT, handleLocalEvent);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(ACADEMIC_YEAR_EVENT, handleLocalEvent);
    };
  }, []);

  return academicYearId;
}
