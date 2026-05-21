import { NextResponse } from "next/server";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { forgotPasswordSchema } from "@/lib/validation";
import { sendPasswordResetCode } from "@/services/authService";

export const runtime = "nodejs";

const genericResponse = {
  ok: true,
  message: "If an account exists for that email, a password reset code has been sent.",
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error("[forgot-password:invalid-json]", error);
    return NextResponse.json(genericResponse);
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  const email = parsed.success ? parsed.data.email : undefined;

  try {
    checkAuthRateLimit({ action: "forgot-password", email, request, limit: 5, windowMs: 15 * 60 * 1000 });
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
    return NextResponse.json(genericResponse);
  }

  try {
    await sendPasswordResetCode(parsed.data.email);
  } catch {
    return NextResponse.json(genericResponse);
  }

  return NextResponse.json(genericResponse);
}
