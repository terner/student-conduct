export const THAI_PHONE_REGEX = /^0[0-9]{9}$/;

export function normalizePhoneInput(value?: string | null) {
  return String(value || '').replace(/\D/g, '').slice(0, 10);
}

export function isThaiPhone(value?: string | null) {
  return THAI_PHONE_REGEX.test(String(value || '').trim());
}
