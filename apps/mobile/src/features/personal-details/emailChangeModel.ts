export function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}
export function canRequestEmailChange(value: string, current: string) {
  const email = normalizedEmail(value);
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    email !== normalizedEmail(current)
  );
}
export function emailChangeErrorKey(status: number, code: unknown) {
  if (status === 409) return "emailInUse";
  if (status === 429) return "emailRateLimited";
  if (code === "INVALID_CODE") return "emailInvalidCode";
  if (code === "EXPIRED_CODE") return "emailExpiredCode";
  if (code === "INVALID_EMAIL" || code === "EMAIL_UNCHANGED")
    return "emailInvalidAddress";
  return "emailUnavailable";
}
