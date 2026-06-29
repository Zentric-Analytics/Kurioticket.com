import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { getPrisma } from "@/lib/prisma";
import { signinSchema } from "@/lib/validation";
import {
  EmailVerificationCooldownError,
  getEmailVerificationRedirect,
  sendEmailVerificationCode,
  sendLoginVerificationCode,
} from "@/services/emailVerificationService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error("[request-login-code:invalid-json]", error);
    return NextResponse.json({ error: "We could not sign you in. Check your email and password, then try again." }, { status: 400 });
  }

  const parsed = signinSchema.safeParse(body);
  const callbackUrl = getSafeCallbackUrl(body);
  const email = parsed.success ? parsed.data.email : undefined;

  try {
    checkAuthRateLimit({ action: "request-login-code", email, request, limit: 5, windowMs: 15 * 60 * 1000 });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }

    throw error;
  }

  if (!parsed.success) {
    return NextResponse.json({ error: "We could not sign you in. Check your email and password, then try again." }, { status: 400 });
  }

  const user = await getPrisma().user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user?.passwordHash) {
    return NextResponse.json({ error: "We could not sign you in. Check your email and password, then try again." }, { status: 401 });
  }

  if (!(await isAuthenticatableUserStatus(user.id, user.status))) {
    return NextResponse.json({ error: "This account is not available. Please contact support." }, { status: 403 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "We could not sign you in. Check your email and password, then try again." }, { status: 401 });
  }

  const loginVerificationRedirect = `/auth/verify-login?email=${encodeURIComponent(parsed.data.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
  let cooldownRedirectTo = loginVerificationRedirect;

  try {
    if (!user.emailVerified) {
      cooldownRedirectTo = getEmailVerificationRedirect(parsed.data.email);
      const sendResult = await sendEmailVerificationCode({
        email: parsed.data.email,
        name: user.name,
        action: "login-unverified-email",
        enforceCooldown: true,
      });

      return NextResponse.json({
        redirectTo: getEmailVerificationRedirect(parsed.data.email),
        cooldownSeconds: sendResult.cooldownSeconds,
      });
    }

    const sendResult = await sendLoginVerificationCode({
      email: parsed.data.email,
      name: user.name,
    });

    return NextResponse.json({
      redirectTo: loginVerificationRedirect,
      cooldownSeconds: sendResult.cooldownSeconds,
    });
  } catch (error) {
    if (error instanceof EmailVerificationCooldownError) {
      return NextResponse.json({
        redirectTo: cooldownRedirectTo,
        cooldownSeconds: error.retryAfterSeconds,
        recentlySent: true,
      });
    }

    return NextResponse.json({ error: "Unable to send login code right now. Please try again." }, { status: 503 });
  }
}

function getSafeCallbackUrl(body: unknown) {
  if (!body || typeof body !== "object") return "/dashboard";

  const callbackUrl = String((body as Record<string, unknown>).callbackUrl || "");
  return callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/dashboard";
}

async function isAuthenticatableUserStatus(userId: string, status: string) {
  if (status === "ACTIVE") return true;
  if (status !== "PENDING_DELETION") return false;

  const request = await getPrisma().accountDeletionRequest.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "READY_FOR_REVIEW"] },
      cancelledAt: null,
      completedAt: null,
      deletionScheduledAt: { gt: new Date() },
    },
    select: { id: true },
  });

  return Boolean(request);
}
