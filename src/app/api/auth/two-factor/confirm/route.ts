import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { verifySecondFactor } from "@/services/twoFactorService";
import { getPrisma } from "@/lib/prisma";
export const runtime = "nodejs";
const schema = z.object({ code: z.string().min(6).max(32) });
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try { checkAuthRateLimit({ action: "two-factor-login", email: session.user.email || undefined, request, limit: 10, windowMs: 15 * 60 * 1000 }); }
  catch (error) { if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 }); throw error; }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter an authenticator code or recovery code." }, { status: 400 });
  const verified = await verifySecondFactor({ userId: session.user.id, code: parsed.data.code });
  if (!verified) return NextResponse.json({ error: "The code is invalid or already used." }, { status: 400 });
  if (!session.user.accountSessionId) return NextResponse.json({ error: "Sign in again to complete verification." }, { status: 401 });
  const updated = await getPrisma().accountSession.updateMany({ where: { id: session.user.accountSessionId, userId: session.user.id, revokedAt: null, expiresAt: { gt: new Date() } }, data: { assuranceLevel: "MFA", twoFactorVerifiedAt: new Date(), reauthenticatedAt: new Date() } });
  if (!updated.count) return NextResponse.json({ error: "Sign in again to complete verification." }, { status: 401 });
  return NextResponse.json({ ok: true });
}
