'use client';

import { useEffect, useState } from 'react';

export const ACADEMIC_YEAR_STORAGE_KEY = 'selected_academic_year_id';
const ACADEMIC_YEAR_EVENT = 'academic-year-change';

export function getStoredAcademicYearId() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ACADEMIC_YEAR_STORAGE_KEY) || '';
}

export function setStoredAcademicYearId(id: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACADEMIC_YEAR_STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(ACADEMIC_YEAR_EVENT, { detail: id }));
}

export function useSelectedAcademicYearId() {
  const [academicYearId, setAcademicYearId] = useState('');

  useEffect(() => {
    setAcademicYearId(getStoredAcademicYearId());

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
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(ACADEMIC_YEAR_EVENT, handleLocalEvent);
    };
  }, []);

  return academicYearId;
}
