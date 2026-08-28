import bcrypt from "bcryptjs";
import { createHash, randomInt } from "node:crypto";
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
const identifierFor = (userId: string) => `mobile-password-reset:${userId}`;
const hashCode = (userId: string, code: string) => createHash("sha256").update(`mobile-password-reset:${userId}:${code}`).digest("hex");

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send-code") }),
  z.object({
    action: z.literal("reset"),
    code: z.string().trim().regex(/^\d{6}$/),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  }).refine((value) => value.newPassword === value.confirmPassword, { path: ["confirmPassword"] }),
]);

function passwordResetCodeEmail(input: { code: string; name?: string | null; expiresInMinutes: number }) {
  const greeting = input.name ? `Hi ${escapeHtml(input.name)},` : "Hi,";
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">Reset your Kurioticket password</h1>
      <p>${greeting} enter this code in the Kurioticket app to continue resetting your password:</p>
      <p style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:7px;color:#0f766e;background:#eef4f7;border-radius:12px;padding:12px 16px">${escapeHtml(input.code)}</p>
      <p>This code expires in ${escapeHtml(input.expiresInMinutes)} minutes.</p>
      <p>Return to the Kurioticket app and enter the code in Security → Password.</p>
      <p>If you did not request a Kurioticket password reset, you can ignore this email.</p>
    </div>
  `;
}

export async function POST(request: Request) {
  const auth = await requireMobileSecurity(request);
  if (!auth?.user?.id || !auth.user.email) return mobileUnauthorized();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the verification code and password details and try again." }, { status: 400 });
  }

  const user = await getPrisma().user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, email: true, emailVerified: true, name: true, status: true, passwordHash: true },
  });
  if (!user?.email || user.status !== "ACTIVE") return mobileUnauthorized();
  if (!user.emailVerified) {
    return NextResponse.json({ error: "Verify your email before resetting your password." }, { status: 403 });
  }

  try {
    checkAuthRateLimit({
      action: parsed.data.action === "send-code" ? "mobile-password-reset-send-code" : "mobile-password-reset-confirm",
      email: user.email,
      request,
      limit: parsed.data.action === "send-code" ? 4 : 8,
      windowMs: 15 * 60 * 1000,
    });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    throw error;
  }

  const identifier = identifierFor(user.id);

  if (parsed.data.action === "send-code") {
    const code = randomInt(100000, 1000000).toString();
    const token = hashCode(user.id, code);
    const expires = new Date(Date.now() + codeTtlMs);
    await getPrisma().verificationToken.deleteMany({ where: { identifier } });
    await getPrisma().verificationToken.create({
      data: { identifier, token, expires },
    });
    try {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Confirm your Kurioticket password reset",
        html: passwordResetCodeEmail({ code, name: user.name, expiresInMinutes: 5 }),
        idempotencyKey: `mobile-password-reset-${user.id}-${expires.getTime()}`,
        requireConfigured: true,
        metadata: { purpose: "mobile-password-reset" },
      });
    } catch {
      await getPrisma().verificationToken.deleteMany({ where: { token } });
      return NextResponse.json({ error: "Unable to send the verification code. Try again." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, expiresInMinutes: 5 });
  }

  const token = hashCode(user.id, parsed.data.code);
  const challenge = await getPrisma().verificationToken.findUnique({ where: { token } });
  if (!challenge || challenge.identifier !== identifier || challenge.expires <= new Date()) {
    if (challenge) await getPrisma().verificationToken.deleteMany({ where: { token } });
    return NextResponse.json({ error: "That verification code is incorrect or expired." }, { status: 400 });
  }

  if (user.passwordHash && await bcrypt.compare(parsed.data.newPassword, user.passwordHash)) {
    return NextResponse.json(
      { error: "Choose a new password that is different from your current password." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const event = await getPrisma().$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.accountSession.updateMany({
      where: { userId: user.id, id: { not: auth.id }, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: "password_reset_other_device" },
    });
    const securityEvent = await tx.securityEvent.create({
      data: { userId: user.id, accountSessionId: auth.id, type: "PASSWORD_RESET" },
    });
    await tx.verificationToken.delete({ where: { token } });
    return securityEvent;
  });

  await deliverSecurityEvent({
    userId: user.id,
    email: user.email,
    securityEventId: event.id,
    title: "Password reset",
    body: "Your Kurioticket password was reset. Other signed-in devices were signed out.",
  }).catch(() => undefined);

  return NextResponse.json({ success: true });
}
