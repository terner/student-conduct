export const THAI_PHONE_REGEX = /^0[0-9]{9}$/;

export function normalizePhoneInput(value?: string | null) {
  return String(value || '').replace(/\D/g, '').slice(0, 10);
}

export function isThaiPhone(value?: string | null) {
  return THAI_PHONE_REGEX.test(String(value || '').trim());
}

/**
 * Format a 10-digit Thai phone number for display: 085-199-3754
 */
export function formatPhoneDisplay(value?: string | null): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 10) return value || '';
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
