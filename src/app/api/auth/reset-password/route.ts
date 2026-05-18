import { NextResponse } from "next/server";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { resetPasswordSchema } from "@/lib/validation";
import { resetPasswordWithCode } from "@/services/authService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error("[reset-password:invalid-json]", error);
    return NextResponse.json({ error: "Unable to reset password right now." }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  const email = parsed.success ? parsed.data.email : undefined;

  try {
    checkAuthRateLimit({ action: "reset-password", email, request, limit: 8, windowMs: 15 * 60 * 1000 });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { error: "Too many password reset attempts. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }

    throw error;
  }

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email, 6-digit code, and password." }, { status: 400 });
  }

  const reset = await resetPasswordWithCode(parsed.data);
  if (!reset) {
    return NextResponse.json({ error: "The reset code is invalid or expired." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
