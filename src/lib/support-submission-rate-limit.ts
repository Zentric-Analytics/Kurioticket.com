import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";

export const SUPPORT_SUBMISSION_LIMIT = 5;
export const SUPPORT_SUBMISSION_WINDOW_MS = 15 * 60 * 1000;

export type SupportSubmissionIdentity = { userId?: string; email: string };
export type SupportLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkSupportSubmissionRateLimit(
  request: Request,
  identity: SupportSubmissionIdentity,
): SupportLimitResult {
  try {
    checkAuthRateLimit({
      action: "support-submission",
      email: identity.userId ? `user:${identity.userId}` : identity.email.trim().toLowerCase(),
      limit: SUPPORT_SUBMISSION_LIMIT,
      windowMs: SUPPORT_SUBMISSION_WINDOW_MS,
      request,
    });
    return { allowed: true };
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return { allowed: false, retryAfterSeconds: error.retryAfterSeconds };
    }
    throw error;
  }
}
