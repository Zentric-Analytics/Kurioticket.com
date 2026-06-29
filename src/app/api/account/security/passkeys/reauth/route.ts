import bcrypt from "bcryptjs";
import { randomBytes, createHash, randomInt } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { getPrisma } from "@/lib/prisma";
import { loginVerificationCodeEmail, sendTransactionalEmail } from "@/services/emailService";
import { verifySecondFactor } from "@/services/twoFactorService";

export const runtime = "nodejs";

const schema = z.object({ action: z.enum(["send-email-code", "verify"]).optional(), code: z.string().trim().optional(), password: z.string().optional() });
const ttlMs = 10 * 60 * 1000;

function hashToken(token: string) { return createHash("sha256").update(`passkey-reauth:${token}`).digest("hex"); }
function hashEmailCode(userId: string, code: string) { return createHash("sha256").update(`passkey-email:${userId}:${code}`).digest("hex"); }

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try { checkAuthRateLimit({ action: "passkey-reauth", email: session.user.email || undefined, request, limit: 8, windowMs: 15 * 60 * 1000 }); }
  catch (error) { if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 }); throw error; }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter your authenticator code, recovery code, or password." }, { status: 400 });

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, passwordHash: true, accounts: { select: { provider: true }, take: 1 }, securitySettings: { select: { twoFactorEnabled: true } } },
  });
  if (!user?.email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const emailIdentifier = `passkey-email-confirm:${session.user.id}`;
  if (parsed.data.action === "send-email-code") {
    const code = randomInt(100000, 1000000).toString();
    await prisma.verificationToken.deleteMany({ where: { identifier: emailIdentifier } });
    await prisma.verificationToken.create({ data: { identifier: emailIdentifier, token: hashEmailCode(session.user.id, code), expires: new Date(Date.now() + ttlMs) } });
    await sendTransactionalEmail({
      to: user.email,
      subject: "Kurioticket passkey setup code",
      html: loginVerificationCodeEmail({ code, name: user.name, expiresInMinutes: 10 }),
      idempotencyKey: `passkey-email-confirm-${session.user.id}-${Date.now()}`,
      requireConfigured: true,
    });
    return NextResponse.json({ ok: true, cooldownSeconds: 60 });
  }

  let verified = false;
  let method = "email";
  if (user.securitySettings?.twoFactorEnabled && parsed.data.code && await verifySecondFactor({ userId: session.user.id, code: parsed.data.code, consumeRecoveryCode: false })) {
    verified = true;
    method = "totp";
  } else if (parsed.data.code && /^\d{6}$/.test(parsed.data.code)) {
    const stored = await prisma.verificationToken.findUnique({ where: { identifier_token: { identifier: emailIdentifier, token: hashEmailCode(session.user.id, parsed.data.code) } } });
    if (stored && stored.expires > new Date()) {
      verified = true;
      await prisma.verificationToken.deleteMany({ where: { identifier: emailIdentifier } });
    } else if (stored) {
      await prisma.verificationToken.deleteMany({ where: { identifier: emailIdentifier } });
    }
  } else if (!user.securitySettings?.twoFactorEnabled && user.passwordHash) {
    verified = Boolean(parsed.data.password && await bcrypt.compare(parsed.data.password, user.passwordHash));
    method = "password";
  }

  if (!verified) return NextResponse.json({ error: "Unable to verify that request." }, { status: 400 });

  const token = randomBytes(32).toString("base64url");
  await prisma.verificationToken.create({ data: { identifier: `passkey-reauth:${session.user.id}`, token: hashToken(token), expires: new Date(Date.now() + ttlMs) } });
  return NextResponse.json({ reauthToken: token, expiresAt: new Date(Date.now() + ttlMs).toISOString(), method });
}
