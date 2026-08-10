import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { confirmTotpSetup, getTwoFactorStatus } from "@/services/twoFactorService";
import { deliverSecurityEvent } from "@/services/securityEventService";
export const runtime = "nodejs";
const schema = z.object({ code: z.string().regex(/^\d{6}$/) });
export async function POST(request: Request) {
  const auth = await requireWebApiSession();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try { checkAuthRateLimit({ action: "two-factor-confirm", email: auth.session.user.email || undefined, request, limit: 10, windowMs: 15 * 60 * 1000 }); }
  catch (error) { if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 }); throw error; }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit authenticator code." }, { status: 400 });
  const result = await confirmTotpSetup({ userId: auth.userId, accountSessionId: auth.accountSession.id, code: parsed.data.code });
  if (!result) return NextResponse.json({ error: "The authenticator code is invalid or setup expired." }, { status: 400 });
  await deliverSecurityEvent({ userId: auth.userId, email: auth.session.user.email, securityEventId: result.securityEvent.id, title: "Two-factor authentication enabled", body: "Two-factor authentication was enabled for your Kurioticket account. If this wasn’t you, secure your account and contact Support immediately." });
  return NextResponse.json({ ok: true, twoFactor: await getTwoFactorStatus(auth.userId), recoveryCodes: result.recoveryCodes });
}
