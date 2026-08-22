import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { getPrisma } from "@/lib/prisma";
import { hasRecentReauthentication } from "@/lib/account-session";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { getTwoFactorStatus, verifySecondFactor } from "@/services/twoFactorService";
import { deliverSecurityEvent } from "@/services/securityEventService";
export const runtime = "nodejs";
const schema = z.object({ code: z.string().min(6).optional(), password: z.string().min(1).optional() });
export async function POST(request: Request) {
  const auth = await requireWebApiSession();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try { checkAuthRateLimit({ action: "two-factor-disable", email: auth.session.user.email || undefined, request, limit: 10, windowMs: 15 * 60 * 1000 }); }
  catch (error) { if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 }); throw error; }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Verify this security change." }, { status: 400 });
  let verified = hasRecentReauthentication(auth.accountSession);
  if (!verified && parsed.data.code) verified = await verifySecondFactor({ userId: auth.userId, code: parsed.data.code });
  if (!verified && parsed.data.password) {
    const user = await getPrisma().user.findUnique({ where: { id: auth.userId }, select: { passwordHash: true } });
    verified = Boolean(user?.passwordHash && await bcrypt.compare(parsed.data.password, user.passwordHash));
  }
  if (!verified) return NextResponse.json({ error: "Unable to verify that request." }, { status: 403 });
  const now = new Date();
  const event = await getPrisma().$transaction(async tx => {
    await tx.userSecuritySettings.update({ where: { userId: auth.userId }, data: { twoFactorEnabled: false, twoFactorMethod: null, twoFactorSecretEncrypted: null, twoFactorLastUsedStep: null, recoveryCodesHash: null, twoFactorDisabledAt: now } });
    await tx.accountSession.update({ where: { id: auth.accountSession.id }, data: { reauthenticatedAt: now } });
    await tx.accountSession.updateMany({ where: { userId: auth.userId, id: { not: auth.accountSession.id }, revokedAt: null }, data: { revokedAt: now, revokeReason: "two_factor_disabled_other_device" } });
    return tx.securityEvent.create({ data: { userId: auth.userId, accountSessionId: auth.accountSession.id, type: "TWO_FACTOR_DISABLED", assuranceLevel: auth.accountSession.assuranceLevel } });
  });
  await deliverSecurityEvent({ userId: auth.userId, email: auth.session.user.email, securityEventId: event.id, title: "Two-factor authentication disabled", body: "Two-factor authentication was disabled for your Kurioticket account. If this wasn’t you, reset your password and contact Support immediately." });
  return NextResponse.json({ ok: true, twoFactor: await getTwoFactorStatus(auth.userId) });
}
