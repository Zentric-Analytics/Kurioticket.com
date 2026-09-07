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
// The automatic first send is not a resend. The third resend starts a one-minute lock.
export function reserveMobileEmailSend(
  previous: ResendState | null,
  now: number,
): ResendState {
  if (previous?.lockedUntil && previous.lockedUntil > now)
    throw new MobileEmailResendError(
      Math.ceil((previous.lockedUntil - now) / 1000),
      true,
    );
  if (previous && previous.nextAt > now)
    throw new MobileEmailResendError(
      Math.ceil((previous.nextAt - now) / 1000),
      false,
    );
  const resends = previous
    ? previous.lockedUntil
      ? 1
      : previous.resends + 1
    : 0;
  const lockedUntil = resends >= 3 ? now + 60_000 : 0;
  return { resends, nextAt: lockedUntil || now + 30_000, lockedUntil };
}
