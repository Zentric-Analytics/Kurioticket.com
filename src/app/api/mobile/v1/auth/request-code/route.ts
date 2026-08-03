import { NextResponse } from "next/server";
import { checkAuthRateLimit, AuthRateLimitError } from "@/lib/auth-rate-limit";
import { emailSchema } from "@/lib/validation";
import { getPrisma } from "@/lib/prisma";
import { sendEmailVerificationCode, EmailVerificationCooldownError } from "@/services/emailVerificationService";
import { canUseStagingCredentials } from "@/lib/previewTesterAccess";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = emailSchema.safeParse(body?.email);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!(await canUseStagingCredentials(parsed.data))) return NextResponse.json({ error: "Preview access is restricted." }, { status: 403 });
  try {
    checkAuthRateLimit({ action: "mobile-request-code", email: parsed.data, request, limit: 5, windowMs: 15 * 60_000 });
    const user = await getPrisma().user.findUnique({ where: { email: parsed.data }, select: { name: true } });
    const result = await sendEmailVerificationCode({ email: parsed.data, name: user?.name, action: "mobile-auth", enforceCooldown: true });
    return NextResponse.json({ ok: true, cooldownSeconds: result.cooldownSeconds });
  } catch (error) {
    if (error instanceof AuthRateLimitError || error instanceof EmailVerificationCooldownError) {
      const retryAfter = error instanceof AuthRateLimitError ? error.retryAfterSeconds : error.retryAfterSeconds;
      return NextResponse.json({ error: "Please wait before requesting another code.", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
    }
    return NextResponse.json({ error: "Unable to send a verification code right now." }, { status: 503 });
  }
}
