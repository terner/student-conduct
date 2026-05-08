'use client';

import { escapeHtml } from '@/lib/security/sanitize';

/**
 * SafeText — renders user-generated text safely
 * 
 * NEVER use dangerouslySetInnerHTML with user input.
 * This component only renders plain text.
 * 
 * Usage:
 *   <SafeText text={user.note} />
 *   <SafeText text={user.full_name} as="h2" className="text-lg" />
 */

interface SafeTextProps {
  text: string;
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'label';
  className?: string;
  maxLength?: number;
}

export function SafeText({
  text,
  as: Tag = 'span',
  className,
  maxLength,
}: SafeTextProps) {
  const safe = escapeHtml(text);
  const display = maxLength && safe.length > maxLength
    ? safe.slice(0, maxLength) + '…'
    : safe;

  return <Tag className={className}>{display}</Tag>;
}

/**
 * SafeHtml — ONLY for trusted HTML content (e.g., markdown-rendered docs)
 * NEVER pass user input directly to this component
 */
interface SafeHtmlProps {
  html: string;  // Must be pre-sanitized
  className?: string;
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
