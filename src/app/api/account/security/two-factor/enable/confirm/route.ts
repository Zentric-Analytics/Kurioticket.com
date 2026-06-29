import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { enableTwoFactor, getTwoFactorStatus, verifyTwoFactorCode } from "@/services/twoFactorService";

export const runtime = "nodejs";
const schema = z.object({ code: z.string().regex(/^\d{6}$/) });
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try { checkAuthRateLimit({ action: "two-factor-enable-confirm", email: session.user.email || undefined, request, limit: 10, windowMs: 15 * 60 * 1000 }); }
  catch (error) { if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 }); throw error; }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success || !(await verifyTwoFactorCode({ userId: session.user.id, purpose: "enable", code: parsed.data.code }))) return NextResponse.json({ error: "The verification code is invalid or expired." }, { status: 400 });
  await enableTwoFactor(session.user.id);
  return NextResponse.json({ ok: true, twoFactor: await getTwoFactorStatus(session.user.id) });
}
