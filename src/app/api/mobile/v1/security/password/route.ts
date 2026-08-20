import { NextResponse } from "next/server";
import { sendPasswordResetLink } from "@/services/authService";
import {
  requireMobileSecurity,
  mobileUnauthorized,
} from "@/lib/mobile-security-route";
import {
  changePassword,
  passwordChangeSchema,
} from "@/lib/security-service";
import {
  AuthRateLimitError,
  checkAuthRateLimit,
} from "@/lib/auth-rate-limit";

type SecurityAuth = {
  id: string;
  user: { id: string; email: string | null };
};

type PasswordRouteDependencies = {
  requireSecurity: (request: Request) => Promise<SecurityAuth | null>;
  rateLimit: typeof checkAuthRateLimit;
  requestPasswordReset: typeof sendPasswordResetLink;
  updatePassword: typeof changePassword;
};

const defaultDependencies: PasswordRouteDependencies = {
  requireSecurity: requireMobileSecurity,
  rateLimit: checkAuthRateLimit,
  requestPasswordReset: sendPasswordResetLink,
  updatePassword: changePassword,
};

export function createPasswordHandlers(
  dependencies: PasswordRouteDependencies = defaultDependencies,
) {
  return {
    async POST(request: Request) {
      const auth = await dependencies.requireSecurity(request);
      if (!auth) return mobileUnauthorized();

      const email = auth.user.email;
      if (!email) return mobileUnauthorized();

      try {
        dependencies.rateLimit({
          action: "mobile-forgot-password",
          email,
          request,
          limit: 5,
          windowMs: 900000,
        });
        await dependencies.requestPasswordReset(email).catch(() => undefined);
        return NextResponse.json({ ok: true });
      } catch (error) {
        if (error instanceof AuthRateLimitError) {
          return NextResponse.json(
            { error: "Too many password reset attempts. Please wait and try again." },
            { status: 429 },
          );
        }
        return NextResponse.json({ ok: true });
      }
    },

    async PATCH(request: Request) {
      const auth = await dependencies.requireSecurity(request);
      if (!auth) return mobileUnauthorized();

      const email = auth.user.email;
      if (!email) return mobileUnauthorized();

      const parsed = passwordChangeSchema.safeParse(
        await request.json().catch(() => null),
      );
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Please check the password details and try again." },
          { status: 400 },
        );
      }

      try {
        dependencies.rateLimit({
          action: "change-password",
          email,
          request,
          limit: 5,
          windowMs: 900000,
        });
        const result = await dependencies.updatePassword({
          userId: auth.user.id,
          email,
          currentSessionId: auth.id,
          ...parsed.data,
        });
        if (result === "oauth-only") {
          return NextResponse.json(
            { error: "Use password reset to create a password for this account." },
            { status: 409 },
          );
        }
        if (result === "invalid") {
          return NextResponse.json(
            { error: "Unable to update password." },
            { status: 400 },
          );
        }
        return NextResponse.json({ success: true });
      } catch (error) {
        if (error instanceof AuthRateLimitError) {
          return NextResponse.json(
            { error: "Too many attempts. Please wait and try again." },
            { status: 429 },
          );
        }
        return NextResponse.json(
          { error: "Unable to update password." },
          { status: 503 },
        );
      }
    },
  };
}

export const { POST, PATCH } = createPasswordHandlers();
