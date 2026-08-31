import { NextResponse } from "next/server";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { BoundedJsonBodyError, MAX_PASSKEY_ASSERTION_BODY_BYTES, readBoundedJsonBody } from "@/lib/bounded-json-body";
import { MOBILE_PASSKEY_GENERIC_ERROR, MobilePasskeyAuthenticationError, verifyMobilePasskeyAssertion } from "@/services/mobilePasskeyAuthentication";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    checkAuthRateLimit({ action: "mobile-passkey-verify", request, limit: 12, windowMs: 15 * 60_000 });
    const body = await readBoundedJsonBody(request, MAX_PASSKEY_ASSERTION_BODY_BYTES);
    return NextResponse.json(await verifyMobilePasskeyAssertion(body));
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { error: "Too many passkey attempts. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    if (error instanceof BoundedJsonBodyError) {
      return NextResponse.json({ error: MOBILE_PASSKEY_GENERIC_ERROR }, { status: 400 });
    }
    if (error instanceof MobilePasskeyAuthenticationError) {
      return NextResponse.json(
        { error: MOBILE_PASSKEY_GENERIC_ERROR, code: error.code },
        { status: error.code === "CHALLENGE_EXPIRED" ? 400 : 401 },
      );
    }
    return NextResponse.json({ error: "Passkey sign-in is temporarily unavailable." }, { status: 503 });
  }
}
