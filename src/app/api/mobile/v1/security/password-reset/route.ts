import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { requireMobileSecurity, mobileUnauthorized } from "@/lib/mobile-security-route";
import { getPrisma } from "@/lib/prisma";
import { escapeHtml } from "@/services/emailDeliveryService";
import { sendTransactionalEmail } from "@/services/emailService";
import { deliverSecurityEvent } from "@/services/securityEventService";

export const runtime = "nodejs";

const codeTtlMs = 5 * 60 * 1000;
const recoveryGrantTtlMs = 5 * 60 * 1000;
const resendCooldownMs = 30 * 1000;
const codeIdentifierFor = (userId: string, sessionId: string) => `mobile-password-reset:${userId}:${sessionId}`;
const legacyCodeIdentifierFor = (userId: string) => `mobile-password-reset:${userId}`;
const grantIdentifierFor = (userId: string, sessionId: string) => `mobile-password-reset-grant:${userId}:${sessionId}`;

function passwordResetHmacKey() {
  const configured = process.env.ACCOUNT_SECURITY_ENCRYPTION_KEY?.trim() || process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("Account security verification key is unavailable.");
  return "development-mobile-password-reset-hmac-key";
}

function keyedDigest(purpose: "code" | "grant", value: string) {
  return createHmac("sha256", passwordResetHmacKey()).update(`mobile-password-reset:${purpose}:v1:${value}`).digest("hex");
}

const hashCode = (userId: string, sessionId: string, code: string) => keyedDigest("code", `${userId}:${sessionId}:${code}`);
const hashLegacyCode = (userId: string, code: string) => createHash("sha256").update(`mobile-password-reset:${userId}:${code}`).digest("hex");
const hashGrant = (userId: string, sessionId: string, token: string) => keyedDigest("grant", `${userId}:${sessionId}:${token}`);

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  if (!local || !domain) return "your verified email";
  return `${local.slice(0, 1)}${"•".repeat(Math.max(3, Math.min(6, local.length - 1)))}@${domain}`;
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send-code") }),
  z.object({ action: z.literal("verify-code"), code: z.string().trim().regex(/^\d{6}$/) }),
  z.object({
    action: z.literal("reset"),
    code: z.string().trim().regex(/^\d{6}$/).optional(),
    recoveryToken: z.string().min(20).max(256).optional(),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
    .refine((value) => Boolean(value.code || value.recoveryToken), { message: "A verification code or recovery token is required." })
    .refine((value) => value.newPassword === value.confirmPassword, { path: ["confirmPassword"] }),
]);

function passwordResetCodeEmail(input: { code: string; name?: string | null; expiresInMinutes: number }) {
  const greeting = input.name ? `Hi ${escapeHtml(input.name)},` : "Hi,";
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">Reset your Kurioticket password</h1>
      <p>${greeting} enter this code in the Kurioticket app to verify that it is you:</p>
      <p style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:7px;color:#0f766e;background:#eef4f7;border-radius:12px;padding:12px 16px">${escapeHtml(input.code)}</p>
      <p>This code expires in ${escapeHtml(input.expiresInMinutes)} minutes.</p>
      <p>If you did not request this password reset, do not share this code.</p>
    </div>
  `;
}

export async function POST(request: Request) {
  const auth = await requireMobileSecurity(request);
  if (!auth?.user?.id || !auth.user.email) return mobileUnauthorized();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the verification details and try again." }, { status: 400 });
  }

  const user = await getPrisma().user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, email: true, emailVerified: true, name: true, status: true, passwordHash: true },
  });
  if (!user?.email || user.status !== "ACTIVE") return mobileUnauthorized();
  if (!user.emailVerified) return NextResponse.json({ error: "Verify your email before resetting your password." }, { status: 403 });

  try {
    checkAuthRateLimit({
      action: `mobile-password-reset-${parsed.data.action}`,
      email: user.email,
      request,
      limit: parsed.data.action === "send-code" ? 4 : parsed.data.action === "verify-code" ? 8 : 5,
      windowMs: 15 * 60 * 1000,
    });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    }
    throw error;
  }

  const codeIdentifier = codeIdentifierFor(user.id, auth.id);
  const grantIdentifier = grantIdentifierFor(user.id, auth.id);

  if (parsed.data.action === "send-code") {
    const now = Date.now();
    const active = await getPrisma().verificationToken.findFirst({
      where: { identifier: codeIdentifier, expires: { gt: new Date(now) } },
      orderBy: { expires: "desc" },
    });
    if (active) {
      const sentAt = active.expires.getTime() - codeTtlMs;
      const remainingMs = sentAt + resendCooldownMs - now;
      if (remainingMs > 0) {
        return NextResponse.json({ error: "Please wait before requesting another code." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(remainingMs / 1000))) } });
      }
    }

    const code = randomInt(100000, 1000000).toString();
    const token = hashCode(user.id, auth.id, code);
    const expires = new Date(now + codeTtlMs);
    await getPrisma().verificationToken.deleteMany({ where: { identifier: codeIdentifier } });
    await getPrisma().verificationToken.deleteMany({ where: { identifier: grantIdentifier } });
    await getPrisma().verificationToken.create({ data: { identifier: codeIdentifier, token, expires } });
    try {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Confirm your Kurioticket password reset",
        html: passwordResetCodeEmail({ code, name: user.name, expiresInMinutes: 5 }),
        idempotencyKey: `mobile-password-reset-${user.id}-${auth.id}-${expires.getTime()}`,
        requireConfigured: true,
        metadata: { purpose: "mobile-password-reset" },
      });
    } catch {
      await getPrisma().verificationToken.deleteMany({ where: { token } });
      return NextResponse.json({ error: "Unable to send the verification code. Try again." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, expiresInMinutes: 5, maskedEmail: maskEmail(user.email), expiresInSeconds: 300, resendAfterSeconds: 30 });
  }

  if (parsed.data.action === "verify-code") {
    const token = hashCode(user.id, auth.id, parsed.data.code);
    const challenge = await getPrisma().verificationToken.findUnique({ where: { token } });
    if (!challenge || challenge.identifier !== codeIdentifier || challenge.expires <= new Date()) {
      if (challenge?.expires && challenge.expires <= new Date()) await getPrisma().verificationToken.deleteMany({ where: { token } });
      return NextResponse.json({ error: "That verification code is incorrect or expired.", field: "verificationCode" }, { status: 400 });
    }

    const recoveryToken = randomBytes(32).toString("base64url");
    const grantHash = hashGrant(user.id, auth.id, recoveryToken);
    const grantExpires = new Date(Date.now() + recoveryGrantTtlMs);
    await getPrisma().$transaction(async (tx) => {
      await tx.verificationToken.delete({ where: { token } });
      await tx.verificationToken.deleteMany({ where: { identifier: grantIdentifier } });
      await tx.verificationToken.create({ data: { identifier: grantIdentifier, token: grantHash, expires: grantExpires } });
    });
    return NextResponse.json({ ok: true, recoveryToken, expiresInSeconds: 300 });
  }

  let credentialToken = "";
  if (parsed.data.recoveryToken) {
    const grantHash = hashGrant(user.id, auth.id, parsed.data.recoveryToken);
    const grant = await getPrisma().verificationToken.findUnique({ where: { token: grantHash } });
    if (!grant || grant.identifier !== grantIdentifier || grant.expires <= new Date()) {
      if (grant?.expires && grant.expires <= new Date()) await getPrisma().verificationToken.deleteMany({ where: { token: grantHash } });
      return NextResponse.json({ error: "Your verification session expired. Verify your account again." }, { status: 410 });
    }
    credentialToken = grantHash;
  } else if (parsed.data.code) {
    const currentToken = hashCode(user.id, auth.id, parsed.data.code);
    const legacyToken = hashLegacyCode(user.id, parsed.data.code);
    const currentChallenge = await getPrisma().verificationToken.findUnique({ where: { token: currentToken } });
    const legacyChallenge = currentChallenge ? null : await getPrisma().verificationToken.findUnique({ where: { token: legacyToken } });
    const challenge = currentChallenge || legacyChallenge;
    const expectedIdentifier = currentChallenge ? codeIdentifier : legacyCodeIdentifierFor(user.id);
    if (!challenge || challenge.identifier !== expectedIdentifier || challenge.expires <= new Date()) {
      if (challenge?.expires && challenge.expires <= new Date()) await getPrisma().verificationToken.deleteMany({ where: { token: challenge.token } });
      return NextResponse.json({ error: "That verification code is incorrect or expired." }, { status: 400 });
    }
    credentialToken = challenge.token;
  }

  if (user.passwordHash && await bcrypt.compare(parsed.data.newPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Choose a new password that is different from your current password.", field: "newPassword" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const now = new Date();
  let event;
  try {
    event = await getPrisma().$transaction(async (tx) => {
      await tx.verificationToken.delete({ where: { token: credentialToken } });
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.accountSession.updateMany({
        where: { userId: user.id, id: { not: auth.id }, revokedAt: null },
        data: { revokedAt: now, revokeReason: "password_reset_other_device" },
      });
      await tx.accountSession.updateMany({
        where: { id: auth.id, userId: user.id, revokedAt: null },
        data: { reauthenticatedAt: now },
      });
      return tx.securityEvent.create({ data: { userId: user.id, accountSessionId: auth.id, type: "PASSWORD_RESET" } });
    });
  } catch {
    return NextResponse.json({ error: "Unable to reset password. Verify your account again." }, { status: 409 });
  }

  await deliverSecurityEvent({
    userId: user.id,
    email: user.email,
    securityEventId: event.id,
    title: "Password reset",
    body: "Your Kurioticket password was reset. Other signed-in devices were signed out.",
  }).catch(() => undefined);

  return NextResponse.json({ success: true });
}
