import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validation";
import { checkAuthRateLimit, AuthRateLimitError } from "@/lib/auth-rate-limit";
import { sendPasswordResetLink } from "@/services/authService";

const generic = { ok: true, message: "If an account exists, we sent password reset instructions." };
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  try {
    checkAuthRateLimit({ action: "mobile-forgot-password", email: parsed.success ? parsed.data.email : undefined, request, limit: 5, windowMs: 15 * 60_000 });
    if (parsed.success) await sendPasswordResetLink(parsed.data.email).catch(() => undefined);
    return NextResponse.json(generic);
  } catch (error) {
    if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many password reset attempts. Please wait and try again." }, { status: 429 });
    return NextResponse.json(generic);
  }
}
