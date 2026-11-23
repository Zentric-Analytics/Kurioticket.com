import { MobileEmailResendError } from "@/services/mobileEmailResendPolicy";
import { NextResponse } from "next/server";
import { z } from "zod";
import { emailSchema } from "@/lib/validation";
import { AuthRateLimitError } from "@/lib/auth-rate-limit";
import { EmailVerificationCooldownError } from "@/services/emailVerificationService";

export type EmailChangeMode =
  "current-request" | "current-confirm" | "request" | "confirm";
export type OwnershipContext = {
  userId: string;
  email: string;
  sessionKey: string;
};
export type EmailChangeUser = {
  id: string;
  email: string | null;
  name: string | null;
  status: string;
};
export type EmailChangeDependencies = {
  authenticate: (
    request: Request,
  ) => Promise<{ id: string; sessionKey: string } | null>;
  user: (id: string) => Promise<EmailChangeUser | null>;
  owner: (email: string) => Promise<{ id: string } | null>;
  rateLimit: (request: Request, email: string, mode: EmailChangeMode) => void;
  sendCurrentCode: (
    context: OwnershipContext,
    name: string | null,
  ) => Promise<{ cooldownSeconds: number; resendLimitReached?: boolean }>;
  verifyCurrentCode: (
    context: OwnershipContext,
    code: string,
  ) => Promise<string | null>;
  hasOwnershipProof: (
    context: OwnershipContext,
    proof: string,
  ) => Promise<boolean>;
  sendCode: (input: {
    userId: string;
    newEmail: string;
    name: string | null;
    enforceCooldown: true;
  }) => Promise<{ cooldownSeconds: number; resendLimitReached?: boolean }>;
  verifyCode: (input: {
    userId: string;
    newEmail: string;
    code: string;
  }) => Promise<"valid" | "invalid" | "expired">;
  commit: (input: {
    userId: string;
    previousEmail: string;
    sessionKey: string;
    ownershipProof: string;
    newEmail: string;
    code: string;
  }) => Promise<boolean>;
  notify: (user: EmailChangeUser, newEmail: string) => Promise<void>;
};

const proofSchema = z.string().regex(/^[a-f0-9]{64}$/);
const schemas = {
  "current-request": z.object({}),
  "current-confirm": z.object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/),
  }),
  request: z.object({ newEmail: emailSchema, ownershipProof: proofSchema }),
  confirm: z.object({
    ownershipProof: proofSchema,
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
  mode: EmailChangeMode,
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
        if (
          parsed.error.issues.some((issue) =>
            issue.path.includes("ownershipProof"),
          )
        )
          return failure(
            403,
            "OWNERSHIP_REQUIRED",
            "Verify your current email address first.",
          );
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
      if (!user.email)
        return failure(
          403,
          "OWNERSHIP_REQUIRED",
          "Contact Support to recover access to your account.",
        );
      const context = {
        userId: user.id,
        email: user.email,
        sessionKey: session.sessionKey,
      };
      dependencies.rateLimit(request, user.email, mode);
      if (mode === "current-request")
        return NextResponse.json(
          await dependencies.sendCurrentCode(context, user.name),
        );
      if (mode === "current-confirm") {
        const { code } = parsed.data as z.infer<
          (typeof schemas)["current-confirm"]
        >;
        const ownershipProof = await dependencies.verifyCurrentCode(
          context,
          code,
        );
        return ownershipProof
          ? NextResponse.json({ ownershipProof })
          : failure(
              400,
              "INVALID_CODE",
              "The verification code is invalid or expired.",
            );
      }
      const { newEmail, ownershipProof } = parsed.data as z.infer<
        typeof schemas.request
      >;
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
      if (!(await dependencies.hasOwnershipProof(context, ownershipProof)))
        return failure(
          403,
          "OWNERSHIP_REQUIRED",
          "Verify your current email address again.",
        );
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
        return NextResponse.json(result);
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
        sessionKey: session.sessionKey,
        ownershipProof,
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
      if (error instanceof MobileEmailResendError)
        return failure(
          429,
          error.maximumReached ? "MAX_RESENDS" : "RATE_LIMITED",
          error.maximumReached
            ? "Maximum resend attempts reached. Try again in one minute."
            : "Please wait before requesting another code.",
          error.retryAfterSeconds,
        );
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
