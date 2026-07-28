export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
export function isValidEmail(value: string) { return value.length <= 254 && EMAIL_PATTERN.test(normalizeEmail(value)); }
export function sanitizeCode(value: string) { return value.replace(/\D/g, "").slice(0, 6); }
export function nextCodeAfterBackspace(value: string) { return value.slice(0, -1); }
export function formatCountdown(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
