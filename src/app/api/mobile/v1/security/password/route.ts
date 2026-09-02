import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPasswordResetLink } from "@/services/authService";
import { requireMobileSecurity, mobileUnauthorized } from "@/lib/mobile-security-route";
import {
  confirmMobilePasswordChange,
  mobilePasswordChangeStatus,
  resendMobilePasswordChangeCode,
  startMobilePasswordChange,
} from "@/lib/mobile-password-change";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";

type SecurityAuth = { id: string; user: { id: string; email: string | null } };

const startSchema = z.object({
  action: z.literal("start"),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((value) => value.newPassword === value.confirmPassword, { path: ["confirmPassword"] })
  .refine((value) => value.currentPassword !== value.newPassword, { path: ["newPassword"] });

const resendSchema = z.object({
  action: z.literal("resend"),
  challengeId: z.string().min(16).max(128),
  newPassword: z.string().min(8),
});

const confirmSchema = z.object({
  action: z.literal("confirm"),
  challengeId: z.string().min(16).max(128),
  code: z.string().trim().regex(/^\d{6}$/),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((value) => value.newPassword === value.confirmPassword, { path: ["confirmPassword"] });

type PasswordRouteDependencies = {
  requireSecurity: (request: Request) => Promise<SecurityAuth | null>;
  rateLimit: typeof checkAuthRateLimit;
  requestPasswordReset: typeof sendPasswordResetLink;
  status: typeof mobilePasswordChangeStatus;
  start: typeof startMobilePasswordChange;
  resend: typeof resendMobilePasswordChangeCode;
  confirm: typeof confirmMobilePasswordChange;
};

const defaultDependencies: PasswordRouteDependencies = {
  requireSecurity: requireMobileSecurity,
  rateLimit: checkAuthRateLimit,
  requestPasswordReset: sendPasswordResetLink,
  status: mobilePasswordChangeStatus,
  start: startMobilePasswordChange,
  resend: resendMobilePasswordChangeCode,
  confirm: confirmMobilePasswordChange,
};

function rateLimitResponse(error: AuthRateLimitError) {
  return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
}

export function createPasswordHandlers(dependencies: PasswordRouteDependencies = defaultDependencies) {
  return {
    async GET(request: Request) {
      const auth = await dependencies.requireSecurity(request);
      if (!auth) return mobileUnauthorized();
      return NextResponse.json(await dependencies.status(auth.user.id));
    },

    async POST(request: Request) {
      const auth = await dependencies.requireSecurity(request);
      if (!auth) return mobileUnauthorized();
      const email = auth.user.email;
      if (!email) return mobileUnauthorized();
      try {
        dependencies.rateLimit({ action: "mobile-forgot-password", email, request, limit: 5, windowMs: 900000 });
        await dependencies.requestPasswordReset(email).catch(() => undefined);
        return NextResponse.json({ ok: true });
      } catch (error) {
        if (error instanceof AuthRateLimitError) return rateLimitResponse(error);
        return NextResponse.json({ ok: true });
      }
    },

    async PATCH(request: Request) {
      const auth = await dependencies.requireSecurity(request);
      if (!auth) return mobileUnauthorized();
      const email = auth.user.email;
      if (!email) return mobileUnauthorized();

      const body = await request.json().catch(() => null) as { action?: unknown } | null;
      const parsed = body?.action === "start"
        ? startSchema.safeParse(body)
        : body?.action === "resend"
          ? resendSchema.safeParse(body)
          : body?.action === "confirm"
            ? confirmSchema.safeParse(body)
            : { success: false as const };
      if (!parsed.success) return NextResponse.json({ error: "Please check the password details and try again." }, { status: 400 });

      try {
        dependencies.rateLimit({ action: `mobile-password-change-${parsed.data.action}`, email, request, limit: parsed.data.action === "confirm" ? 8 : 6, windowMs: 15 * 60 * 1000 });

        if (parsed.data.action === "start") {
          const result = await dependencies.start({ userId: auth.user.id, sessionId: auth.id, email, currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword });
          if (result.kind === "invalid-current") return NextResponse.json({ error: "Current password is incorrect.", field: "currentPassword", failureCount: result.failureCount, recoveryAvailable: result.recoveryAvailable }, { status: 400 });
          if (result.kind === "oauth-only") return NextResponse.json({ error: "Use password reset to create a password for this account." }, { status: 409 });
          if (result.kind === "same-password") return NextResponse.json({ error: "Choose a new password that is different from your current password.", field: "newPassword" }, { status: 400 });
          if (result.kind === "email-unverified") return NextResponse.json({ error: "Verify your account email before changing your password." }, { status: 403 });
          if (result.kind === "send-failed") return NextResponse.json({ error: "Unable to send the verification code. Try again." }, { status: 503 });
          if (result.kind !== "issued") return NextResponse.json({ error: "Unable to change password." }, { status: 400 });
          return NextResponse.json(result);
        }

        if (parsed.data.action === "resend") {
          const result = await dependencies.resend({ userId: auth.user.id, sessionId: auth.id, email, challengeId: parsed.data.challengeId, newPassword: parsed.data.newPassword });
          if (result.kind === "cooldown") return NextResponse.json({ error: "Please wait before requesting another code." }, { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } });
          if (result.kind === "expired") return NextResponse.json({ error: "Your verification session expired. Start again." }, { status: 410 });
          if (result.kind === "send-failed") return NextResponse.json({ error: "Unable to send the verification code. Try again." }, { status: 503 });
          if (result.kind !== "issued") return NextResponse.json({ error: "Unable to request a new code." }, { status: 400 });
          return NextResponse.json(result);
        }

        const result = await dependencies.confirm({ userId: auth.user.id, sessionId: auth.id, email, challengeId: parsed.data.challengeId, code: parsed.data.code, newPassword: parsed.data.newPassword });
        if (result.kind === "invalid-code") return NextResponse.json({ error: "That verification code is incorrect or expired.", field: "verificationCode" }, { status: 400 });
        if (result.kind === "same-password") return NextResponse.json({ error: "Choose a new password that is different from your current password.", field: "newPassword" }, { status: 400 });
        if (result.kind !== "changed") return NextResponse.json({ error: "Unable to change password." }, { status: 400 });
        return NextResponse.json({ success: true });
      } catch (error) {
        if (error instanceof AuthRateLimitError) return rateLimitResponse(error);
        return NextResponse.json({ error: "Unable to change password." }, { status: 503 });
      }
    },
  };
}

export const { GET, POST, PATCH } = createPasswordHandlers();
