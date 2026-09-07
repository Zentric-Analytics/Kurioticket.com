import { NextResponse } from "next/server";
import { z } from "zod";
import { emailSchema } from "@/lib/validation";
import { AuthRateLimitError } from "@/lib/auth-rate-limit";
import { EmailVerificationCooldownError } from "@/services/emailVerificationService";

export type EmailChangeUser = {
  id: string;
  email: string | null;
  name: string | null;
  status: string;
};
export type EmailChangeDependencies = {
  authenticate: (request: Request) => Promise<{ id: string } | null>;
  user: (id: string) => Promise<EmailChangeUser | null>;
  owner: (email: string) => Promise<{ id: string } | null>;
  rateLimit: (
    request: Request,
    email: string,
    mode: "request" | "confirm",
  ) => void;
  sendCode: (input: {
    userId: string;
    newEmail: string;
    name: string | null;
    enforceCooldown: true;
  }) => Promise<{ cooldownSeconds: number }>;
  verifyCode: (input: {
    userId: string;
    newEmail: string;
    code: string;
  }) => Promise<"valid" | "invalid" | "expired">;
  commit: (input: {
    userId: string;
    previousEmail: string | null;
    newEmail: string;
    code: string;
  }) => Promise<boolean>;
  notify: (user: EmailChangeUser, newEmail: string) => Promise<void>;
};

const schemas = {
  request: z.object({ newEmail: emailSchema }),
  confirm: z.object({
    newEmail: emailSchema,
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/),
  }),
};

function failure(
  status: number,
  code: string,
  error: string,
  retryAfterSeconds?: number,
) {
  return NextResponse.json(
    { error, code, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) },
    {
      status,
      headers: retryAfterSeconds
        ? { "Retry-After": String(retryAfterSeconds) }
        : undefined,
    },
  );
}

export function createMobileEmailChangeHandler(
  mode: "request" | "confirm",
  dependencies: EmailChangeDependencies,
) {
  return async (request: Request) => {
    try {
      const session = await dependencies.authenticate(request);
      if (!session)
        return failure(401, "SESSION_EXPIRED", "Authentication required.");
      const parsed = schemas[mode].safeParse(
        await request.json().catch(() => null),
      );
      if (!parsed.success) {
        const codeInvalid = parsed.error.issues.some((issue) =>
          issue.path.includes("code"),
        );
        return failure(
          400,
          codeInvalid ? "INVALID_CODE" : "INVALID_EMAIL",
          codeInvalid
            ? "Enter the six-digit verification code."
            : "Enter a valid email address.",
        );
      }
      const user = await dependencies.user(session.id);
      if (!user || user.status !== "ACTIVE")
        return failure(401, "SESSION_EXPIRED", "Authentication required.");
      const { newEmail } = parsed.data;
      dependencies.rateLimit(request, user.email || newEmail, mode);
      if (user.email?.toLowerCase().trim() === newEmail) {
        // A response can be lost after a successful confirmation. Retrying the
        // authenticated user's current address requires no second mutation.
        if (mode === "confirm")
          return NextResponse.json({ email: newEmail, userId: user.id });
        return failure(
          400,
          "EMAIL_UNCHANGED",
          "Enter a different email address.",
        );
      }
      const owner = await dependencies.owner(newEmail);
      if (owner && owner.id !== user.id)
        return failure(
          409,
          "EMAIL_IN_USE",
          "This email address is already in use.",
        );
      if (mode === "request") {
        const result = await dependencies.sendCode({
          userId: user.id,
          newEmail,
          name: user.name,
          enforceCooldown: true,
        });
        return NextResponse.json({ cooldownSeconds: result.cooldownSeconds });
      }
      const code = (parsed.data as z.infer<typeof schemas.confirm>).code;
      const verification = await dependencies.verifyCode({
        userId: user.id,
        newEmail,
        code,
      });
      if (verification !== "valid")
        return failure(
          400,
          verification === "expired" ? "EXPIRED_CODE" : "INVALID_CODE",
          "The verification code is invalid or expired.",
        );
      const committed = await dependencies.commit({
        userId: user.id,
        previousEmail: user.email,
        newEmail,
        code,
      });
      if (!committed)
        return failure(400, "EXPIRED_CODE", "Request a new verification code.");
      // Delivery failures must not turn a completed change into a failed save.
      await dependencies
        .notify(user, newEmail)
        .catch(() =>
          console.error("[mobile-email-change] notification delivery failed"),
        );
      return NextResponse.json({ email: newEmail, userId: user.id });
    } catch (error) {
      if (
        error instanceof AuthRateLimitError ||
        error instanceof EmailVerificationCooldownError
      ) {
        return failure(
          429,
          "RATE_LIMITED",
          "Please wait before trying again.",
          error.retryAfterSeconds,
        );
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        return failure(
          409,
          "EMAIL_IN_USE",
          "This email address is already in use.",
        );
      }
      // Session/database failures are service errors, not proof of logout.
      console.error("[mobile-email-change] request unavailable", { mode });
      return failure(
        503,
        "UNAVAILABLE",
        "Unable to change your email right now.",
      );
    }
  };
}
