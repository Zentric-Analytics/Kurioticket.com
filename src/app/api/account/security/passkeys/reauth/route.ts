import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getBaseUrl } from "@/lib/env";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { getPrisma } from "@/lib/prisma";
import { sendTransactionalEmail, verificationCodeEmail } from "@/services/emailService";
import { verifySecondFactor } from "@/services/twoFactorService";

export const runtime = "nodejs";

const schema = z.object({ action: z.enum(["send-email-code", "verify"]).optional(), code: z.string().trim().optional(), password: z.string().optional() });
const ttlMs = 10 * 60 * 1000;
const emailCodeTtlMs = 5 * 60 * 1000;
const emailIdentifier = (userId: string) => `passkey-email-reauth:${userId}`;
function hashToken(token: string) { return createHash("sha256").update(`passkey-reauth:${token}`).digest("hex"); }
function hashEmailCode(userId: string, code: string) { return createHash("sha256").update(`passkey-email-reauth:${userId}:${code}`).digest("hex"); }

async function mintReauthToken(userId: string, method: string) {
  const token = randomBytes(32).toString("base64url");
  await getPrisma().verificationToken.create({ data: { identifier: `passkey-reauth:${userId}`, token: hashToken(token), expires: new Date(Date.now() + ttlMs) } });
  return NextResponse.json({ reauthToken: token, expiresAt: new Date(Date.now() + ttlMs).toISOString(), method });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try { checkAuthRateLimit({ action: "passkey-reauth", email: session.user.email || undefined, request, limit: 8, windowMs: 15 * 60 * 1000 }); }
  catch (error) { if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 }); throw error; }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter your authenticator code, recovery code, email code, or password." }, { status: 400 });

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true, name: true, passwordHash: true, status: true, securitySettings: { select: { twoFactorEnabled: true } } },
  });
  if (!user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Reactivate your account before managing passkeys." }, { status: 403 });

  if (parsed.data.action === "send-email-code") {
    if (user.securitySettings?.twoFactorEnabled) return NextResponse.json({ ok: true, method: "totp" });
    if (!user.emailVerified) return NextResponse.json({ error: "Verify your email before using email confirmation." }, { status: 403 });
    const code = randomInt(100000, 1000000).toString();
    const identifier = emailIdentifier(session.user.id);
    const token = hashEmailCode(session.user.id, code);
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    await prisma.verificationToken.create({ data: { identifier, token, expires: new Date(Date.now() + emailCodeTtlMs) } });
    await sendTransactionalEmail({
      to: user.email,
      subject: "Confirm passkey setup for Kurioticket",
      html: verificationCodeEmail({ code, name: user.name, expiresInMinutes: 5, verifyUrl: `${getBaseUrl()}/dashboard/security` }),
      idempotencyKey: `passkey-reauth-${session.user.id}-${token.slice(0, 16)}`,
      requireConfigured: true,
    });
    return NextResponse.json({ ok: true, method: "email", expiresInMinutes: 5 });
  }

  const code = parsed.data.code || "";
  if (user.securitySettings?.twoFactorEnabled && code && await verifySecondFactor({ userId: session.user.id, code, consumeRecoveryCode: true })) return mintReauthToken(session.user.id, "totp");
  if (!user.securitySettings?.twoFactorEnabled && code) {
    const stored = await prisma.verificationToken.findUnique({ where: { identifier_token: { identifier: emailIdentifier(session.user.id), token: hashEmailCode(session.user.id, code) } } });
    if (stored && stored.expires > new Date()) {
      await prisma.verificationToken.deleteMany({ where: { identifier: emailIdentifier(session.user.id) } });
      return mintReauthToken(session.user.id, "email");
    }
  }
  if (!user.securitySettings?.twoFactorEnabled && user.passwordHash && parsed.data.password && await bcrypt.compare(parsed.data.password, user.passwordHash)) return mintReauthToken(session.user.id, "password");

  return NextResponse.json({ error: "Unable to verify that request." }, { status: 400 });
}
