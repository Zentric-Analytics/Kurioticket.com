import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAuthRateLimit, AuthRateLimitError } from "@/lib/auth-rate-limit";
import { getPrisma } from "@/lib/prisma";
import { escapeHtml } from "@/services/emailDeliveryService";
import { sendTransactionalEmail } from "@/services/emailService";
import { deliverSecurityEvent } from "@/services/securityEventService";

export const runtime = "nodejs";

const challengeTtlMs = 5 * 60 * 1000;
const maxAttempts = 5;
const challengeType = "mobile-forgot-password";
const verifiedIdentifier = (email: string) => `mobile-verified:${email}`;
const hashCode = (userId: string, code: string) => createHash("sha256").update(`mobile-forgot-password:${userId}:${code}`).digest("hex");

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send-code"),
    email: z.string().email().transform((value) => value.toLowerCase().trim()),
    verificationToken: z.string().min(16),
  }),
  z.object({
    action: z.literal("reset"),
    email: z.string().email().transform((value) => value.toLowerCase().trim()),
    code: z.string().trim().regex(/^\d{6}$/),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  }).refine((value) => value.newPassword === value.confirmPassword, { path: ["confirmPassword"] }),
]);

function resetCodeEmail(input: { code: string; name?: string | null }) {
  const greeting = input.name ? `Hi ${escapeHtml(input.name)},` : "Hi,";
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">Reset your Kurioticket password</h1>
      <p>${greeting} enter this code in the Kurioticket app to continue resetting your password:</p>
      <p style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:7px;color:#0f766e;background:#eef4f7;border-radius:12px;padding:12px 16px">${escapeHtml(input.code)}</p>
      <p>This code expires in 5 minutes.</p>
      <p>If you did not request a password reset, you can ignore this email.</p>
    </div>
  `;
}

async function activePasswordUser(email: string) {
  return getPrisma().user.findFirst({
    where: { email, status: "ACTIVE", passwordHash: { not: null } },
    select: { id: true, email: true, name: true, passwordHash: true },
  });
}

async function verifiedUser(email: string, verificationToken: string) {
  const proof = await getPrisma().verificationToken.findUnique({ where: { token: verificationToken } });
  if (!proof || proof.identifier !== verifiedIdentifier(email) || proof.expires <= new Date()) return null;
  return activePasswordUser(email);
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the recovery details and try again." }, { status: 400 });

  try {
    checkAuthRateLimit({
      action: parsed.data.action === "send-code" ? "mobile-forgot-password-send" : "mobile-forgot-password-reset",
      email: parsed.data.email,
      request,
      limit: parsed.data.action === "send-code" ? 4 : 8,
      windowMs: 15 * 60_000,
    });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { error: "Too many password reset attempts. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    throw error;
  }

  if (parsed.data.action === "send-code") {
    const user = await verifiedUser(parsed.data.email, parsed.data.verificationToken);
    if (!user?.email || !user.passwordHash) {
      return NextResponse.json({ error: "Verify your email again before resetting your password." }, { status: 401 });
    }

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + challengeTtlMs);
    const loginToken = hashCode(user.id, code);
    await getPrisma().webAuthnChallenge.updateMany({
      where: { userId: user.id, type: challengeType, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    const challenge = await getPrisma().webAuthnChallenge.create({
      data: {
        userId: user.id,
        type: challengeType,
        challenge: randomBytes(18).toString("base64url"),
        loginToken,
        expiresAt,
        metadata: { attempts: 0 },
      },
    });
    try {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Reset your Kurioticket password",
        html: resetCodeEmail({ code, name: user.name }),
        idempotencyKey: `mobile-forgot-password-${user.id}-${challenge.id}`,
        requireConfigured: true,
        metadata: { purpose: "mobile-forgot-password" },
      });
    } catch {
      await getPrisma().webAuthnChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }).catch(() => undefined);
      return NextResponse.json({ error: "Unable to send the verification code. Try again." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, expiresInMinutes: 5 });
  }

  // Sending the recovery code required a fresh verified-email proof. Once that
  // dedicated challenge exists, the code itself is the recovery credential for
  // its advertised five-minute lifetime; it must not be shortened by expiry of
  // the earlier generic mobile-verified proof.
  const user = await activePasswordUser(parsed.data.email);
  if (!user?.email || !user.passwordHash) {
    return NextResponse.json({ error: "That verification code is incorrect or expired." }, { status: 400 });
  }

  const challenge = await getPrisma().webAuthnChallenge.findFirst({
    where: { userId: user.id, type: challengeType, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const attempts = typeof (challenge?.metadata as { attempts?: unknown } | null)?.attempts === "number"
    ? Number((challenge?.metadata as { attempts?: number }).attempts)
    : 0;
  if (!challenge || challenge.expiresAt <= new Date() || attempts >= maxAttempts) {
    return NextResponse.json({ error: "That verification code is incorrect or expired." }, { status: 400 });
  }
  if (challenge.loginToken !== hashCode(user.id, parsed.data.code)) {
    await getPrisma().webAuthnChallenge.update({
      where: { id: challenge.id },
      data: {
        consumedAt: attempts + 1 >= maxAttempts ? new Date() : null,
        metadata: { attempts: attempts + 1 },
      },
    });
    return NextResponse.json({ error: "That verification code is incorrect or expired." }, { status: 400 });
  }
  if (await bcrypt.compare(parsed.data.newPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Choose a new password that is different from your current password." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const event = await getPrisma().$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash, sessionVersion: { increment: 1 } } });
    await tx.accountSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: "password_reset" },
    });
    const securityEvent = await tx.securityEvent.create({ data: { userId: user.id, type: "PASSWORD_RESET" } });
    await tx.webAuthnChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date(), metadata: { attempts, verifiedAt: new Date().toISOString() } } });
    await tx.verificationToken.deleteMany({ where: { identifier: verifiedIdentifier(parsed.data.email) } });
    return securityEvent;
  });

  await deliverSecurityEvent({
    userId: user.id,
    email: user.email,
    securityEventId: event.id,
    title: "Password reset",
    body: "Your Kurioticket password was reset. All signed-in devices were signed out.",
  }).catch(() => undefined);

  return NextResponse.json({ success: true });
}
