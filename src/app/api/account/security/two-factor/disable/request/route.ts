import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { sendTwoFactorCode, TwoFactorCooldownError } from "@/services/twoFactorService";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try { checkAuthRateLimit({ action: "two-factor-disable-request", email: session.user.email || undefined, request, limit: 5, windowMs: 15 * 60 * 1000 }); }
  catch (error) { if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many requests. Please wait and try again." }, { status: 429 }); throw error; }
  const user = await getPrisma().user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, name: true } });
  if (!user?.email) return NextResponse.json({ error: "A verified account email is required." }, { status: 400 });
  try { const result = await sendTwoFactorCode({ userId: user.id, email: user.email, name: user.name, purpose: "disable" }); return NextResponse.json({ ok: true, cooldownSeconds: result.cooldownSeconds }); }
  catch (error) { if (error instanceof TwoFactorCooldownError) return NextResponse.json({ ok: true, recentlySent: true, cooldownSeconds: error.retryAfterSeconds }); return NextResponse.json({ error: "Unable to send verification code right now." }, { status: 503 }); }
}
