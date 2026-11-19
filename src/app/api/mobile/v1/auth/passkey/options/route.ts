import { NextResponse } from "next/server";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { createMobilePasskeyOptions } from "@/services/mobilePasskeyAuthentication";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkAuthRateLimit({ action: "mobile-passkey-options", request, limit: 12, windowMs: 15 * 60_000 });
    return NextResponse.json({ options: await createMobilePasskeyOptions() });
  } catch (error) {
    if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many passkey attempts. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } });
    return NextResponse.json({ error: "Passkey sign-in is temporarily unavailable." }, { status: 503 });
  }
}
