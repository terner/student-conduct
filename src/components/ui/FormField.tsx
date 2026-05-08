'use client';

import { type ReactNode } from 'react';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  helpText?: string;
}

export function FormField({
  label,
  error,
  required,
  children,
  className = '',
  helpText,
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {helpText && !error && (
        <p className="text-sm text-muted-foreground">{helpText}</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
