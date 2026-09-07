export const MOBILE_EMAIL_CODE_TTL_MS = 5 * 60_000;
export type ResendState = {
  resends: number;
  nextAt: number;
  lockedUntil: number;
};
export class MobileEmailResendError extends Error {
  constructor(
    public retryAfterSeconds: number,
    public maximumReached: boolean,
  ) {
    super("Email resend is temporarily unavailable.");
  }
}
// Every send uses the same cooldown; resend count does not trigger a lockout.
export function reserveMobileEmailSend(
  previous: ResendState | null,
  now: number,
): ResendState {
  // Older reservations stored a 60-second third-resend lock. Honor only
  // the ordinary 30-second cooldown when reading those reservations.
  const nextAt = previous?.lockedUntil
    ? previous.lockedUntil - 30_000
    : previous?.nextAt ?? 0;
  if (nextAt > now)
    throw new MobileEmailResendError(
      Math.ceil((nextAt - now) / 1000),
      false,
    );
  return { resends: (previous?.resends ?? -1) + 1, nextAt: now + 30_000, lockedUntil: 0 };
}
