import { NextResponse } from "next/server";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { resetPasswordSchema } from "@/lib/validation";
import { resetPasswordWithToken } from "@/services/authService";

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
  const token = parsed.success ? parsed.data.token : undefined;

  try {
    checkAuthRateLimit({ action: "reset-password", email: token, request, limit: 8, windowMs: 15 * 60 * 1000 });
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
    return NextResponse.json({ error: "Enter a valid reset link and password." }, { status: 400 });
  }

  const reset = await resetPasswordWithToken(parsed.data);
  if (!reset) {
    return NextResponse.json({ error: "This reset link is invalid or expired. Please request a new password reset email." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
