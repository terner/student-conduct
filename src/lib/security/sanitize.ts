/**
 * XSS Sanitization Utilities
 * 
 * OWASP Reference:
 * - https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 * - https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
 */

/**
 * HTML entity encode — for safe insertion into HTML body
 * OWASP Rule #1: Escape HTML entities
 */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return str.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Attribute encode — for safe insertion into HTML attributes
 * OWASP Rule #2: Escape attribute characters
 */
export function escapeAttribute(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#x27;',
    '<': '&lt;',
    '>': '&gt;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  return str.replace(/[&"'<>`=]/g, (char) => map[char]);
}

/**
 * JavaScript encode — for safe insertion into JS strings
 * OWASP Rule #3: Escape JavaScript
 */
export function escapeJs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/<\/script>/gi, '<\\/script>');
}

/**
 * URL encode — validate and sanitize URLs
 * OWASP Rule #5: Validate URLs, avoid javascript:
 */
export function sanitizeUrl(url: string): string | null {
  // Only allow http, https, mailto, tel
  const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
  try {
    const parsed = new URL(url);
    if (allowedProtocols.includes(parsed.protocol)) {
      return url;
    }
    return null;
  } catch {
    // Not a valid URL
    return null;
  }
}

/**
 * Strip all HTML tags — for plain text output
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize user display name (first_name, last_name)
 * - Remove HTML tags
 * - Remove control characters
 * - Limit length
 */
export function sanitizeDisplayName(name: string, maxLength = 100): string {
  return stripHtml(name)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove control chars
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize note/description text
 * - Strip HTML completely
 * - Remove script-like content
 * - Limit length
 */
export function sanitizeNote(note: string, maxLength = 500): string {
  return stripHtml(note)
    .replace(/javascript\s*:/gi, '')  // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '')       // Remove event handlers (onclick, onload, etc.)
    .replace(/data:\s*text\/html/gi, '') // Remove data:text/html
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize for CSV export — prevent CSV injection
 * OWASP: CSV Injection
 * Cells starting with =, +, -, @, %2B, %2D, %2F, %3D, %40 can execute formulas
 */
export function sanitizeCsvCell(value: string): string {
  const dangerousStart = /^[=+\-@\t\r\f]/;
  if (dangerousStart.test(value)) {
    return `'${value}`; // Prefix with single quote to prevent formula execution
  }
  // Also URL-encoded variants
  const decoded = decodeURIComponent(value);
  if (/^[=+\-@]/.test(decoded)) {
    return `'${value}`;
  }
  // Escape quotes for CSV format
  return value.replace(/"/g, '""');
}

/**
 * Validate file path / URL for evidence upload
 * Prevent path traversal
 */
export function sanitizeFilePath(path: string): string {
  // Remove any path traversal attempts
  return path
    .replace(/\.\.\//g, '')
    .replace(/\.\.\\/g, '')
    .replace(/~/g, '')
    .replace(/[<>"|?*]/g, '')
    .trim();
}

/**
 * Sanitize query search input
 */
export function sanitizeSearchQuery(query: string): string {
  return stripHtml(query)
    .replace(/[<>"';&]/g, '')
    .trim()
    .slice(0, 200);
}

/**
 * Validate student ID (10 digits)
 */
export function isValidStudentId(id: string): boolean {
  return /^\d{10}$/.test(id);
}

/**
 * Validate phone number (Thai format)
 */
export function isValidPhone(phone: string): boolean {
  return /^0[0-9]{2}-?[0-9]{3}-?[0-9]{4}$/.test(phone.trim());
}

/**
 * Sanitize notification title/body
 */
export function sanitizeNotification(text: string, maxLength = 200): string {
  return stripHtml(text)
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}
