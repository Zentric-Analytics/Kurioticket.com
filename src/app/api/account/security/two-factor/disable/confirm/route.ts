import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { disableTwoFactor, getTwoFactorStatus, verifyTwoFactorCode } from "@/services/twoFactorService";

export const runtime = "nodejs";
const schema = z.object({ code: z.string().regex(/^\d{6}$/).optional(), password: z.string().min(1).optional() });
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try { checkAuthRateLimit({ action: "two-factor-disable-confirm", email: session.user.email || undefined, request, limit: 10, windowMs: 15 * 60 * 1000 }); }
  catch (error) { if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 }); throw error; }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter your password or verification code." }, { status: 400 });
  let verified = false;
  if (parsed.data.code) verified = await verifyTwoFactorCode({ userId: session.user.id, purpose: "disable", code: parsed.data.code });
  if (!verified && parsed.data.password) {
    const user = await getPrisma().user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
    verified = Boolean(user?.passwordHash && await bcrypt.compare(parsed.data.password, user.passwordHash));
  }
  if (!verified) return NextResponse.json({ error: "Unable to verify that request." }, { status: 400 });
  await disableTwoFactor(session.user.id);
  return NextResponse.json({ ok: true, twoFactor: await getTwoFactorStatus(session.user.id) });
}
