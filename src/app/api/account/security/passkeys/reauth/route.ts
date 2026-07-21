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

const schema = z.object({
  action: z.enum(["send-email-code", "verify"]).optional(),
  purpose: z.enum(["setup", "removal"]).default("setup"),
  code: z.string().trim().optional(),
  password: z.string().optional(),
});
const reauthTtlMs = 5 * 60 * 1000;
const emailCodeTtlMs = 5 * 60 * 1000;
const maxEmailCodeAttempts = 5;
const emailChallengeType = (purpose: string) => `passkey-email-reauth:${purpose}`;
const reauthIdentifier = (userId: string, purpose: string) => `passkey-reauth:${purpose}:${userId}`;
function hashToken(token: string) { return createHash("sha256").update(`passkey-reauth:${token}`).digest("hex"); }
function hashEmailCode(userId: string, purpose: string, code: string) { return createHash("sha256").update(`passkey-email-reauth:${purpose}:${userId}:${code}`).digest("hex"); }

async function mintReauthToken(userId: string, purpose: string, method: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + reauthTtlMs);
  await getPrisma().verificationToken.create({ data: { identifier: reauthIdentifier(userId, purpose), token: hashToken(token), expires: expiresAt } });
  return NextResponse.json({ reauthToken: token, expiresAt: expiresAt.toISOString(), method, purpose });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter your authenticator code, recovery code, email code, or password." }, { status: 400 });
  const { action = "verify", purpose } = parsed.data;

  try { checkAuthRateLimit({ action: `passkey-reauth:${action}`, email: session.user.email || undefined, request, limit: action === "send-email-code" ? 4 : 8, windowMs: 15 * 60 * 1000 }); }
  catch (error) { if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 }); throw error; }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true, name: true, passwordHash: true, status: true, securitySettings: { select: { twoFactorEnabled: true } } },
  });
  if (!user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Reactivate your account before managing passkeys." }, { status: 403 });

  if (action === "send-email-code") {
    if (user.securitySettings?.twoFactorEnabled) return NextResponse.json({ ok: true, method: "totp", purpose });
    if (!user.emailVerified) return NextResponse.json({ error: "Verify your email before using email confirmation." }, { status: 403 });
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + emailCodeTtlMs);
    await prisma.webAuthnChallenge.updateMany({ where: { userId: session.user.id, type: emailChallengeType(purpose), consumedAt: null }, data: { consumedAt: new Date() } });
    await prisma.webAuthnChallenge.create({ data: { userId: session.user.id, type: emailChallengeType(purpose), challenge: randomBytes(18).toString("base64url"), loginToken: hashEmailCode(session.user.id, purpose, code), expiresAt, metadata: { attempts: 0, purpose } } });
    await sendTransactionalEmail({
      to: user.email,
      subject: purpose === "removal" ? "Confirm passkey removal for Kurioticket" : "Confirm passkey setup for Kurioticket",
      html: verificationCodeEmail({ code, name: user.name, expiresInMinutes: 5, verifyUrl: `${getBaseUrl()}/dashboard/security` }),
      idempotencyKey: `passkey-reauth-${purpose}-${session.user.id}-${randomBytes(8).toString("hex")}`,
      requireConfigured: true,
      metadata: { purpose: `passkey-${purpose}` },
    });
    return NextResponse.json({ ok: true, method: "email", expiresInMinutes: 5, purpose });
  }

  const code = parsed.data.code || "";
  if (!code) return NextResponse.json({ error: "Enter a verification code." }, { status: 400 });
  if (user.securitySettings?.twoFactorEnabled && await verifySecondFactor({ userId: session.user.id, code, consumeRecoveryCode: true })) return mintReauthToken(session.user.id, purpose, "totp");
  if (!user.securitySettings?.twoFactorEnabled && /^\d{6}$/.test(code)) {
    const challenge = await prisma.webAuthnChallenge.findFirst({ where: { userId: session.user.id, type: emailChallengeType(purpose), consumedAt: null }, orderBy: { createdAt: "desc" } });
    const attempts = typeof (challenge?.metadata as { attempts?: unknown } | null)?.attempts === "number" ? Number((challenge?.metadata as { attempts?: number }).attempts) : 0;
    if (!challenge || challenge.expiresAt <= new Date() || attempts >= maxEmailCodeAttempts) return NextResponse.json({ error: "That code is incorrect or expired. Try again." }, { status: 400 });
    if (challenge.loginToken === hashEmailCode(session.user.id, purpose, code)) {
      await prisma.webAuthnChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date(), metadata: { attempts, purpose, verifiedAt: new Date().toISOString() } } });
      return mintReauthToken(session.user.id, purpose, "email");
    }
    await prisma.webAuthnChallenge.update({ where: { id: challenge.id }, data: { consumedAt: attempts + 1 >= maxEmailCodeAttempts ? new Date() : null, metadata: { attempts: attempts + 1, purpose } } });
    return NextResponse.json({ error: "That code is incorrect or expired. Try again." }, { status: 400 });
  }
  if (!user.securitySettings?.twoFactorEnabled && user.passwordHash && parsed.data.password && await bcrypt.compare(parsed.data.password, user.passwordHash)) return mintReauthToken(session.user.id, purpose, "password");

  return NextResponse.json({ error: "That code is incorrect or expired. Try again." }, { status: 400 });
}
