import { mobileRecoveryFallback } from "@/lib/mobile-recovery-compatibility";
import { NextResponse } from "next/server";
import { completeMobileTwoFactorChallenge } from "@/lib/mobile-two-factor";
import { mobileSessionMetadata } from "@/lib/mobile-auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.challengeToken === "string" ? body.challengeToken : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  try {
    const result = await completeMobileTwoFactorChallenge(token, code, mobileSessionMetadata(request));
    if ("session" in result) return NextResponse.json(result);
    const status = result.error === "ATTEMPTS" ? 429 : result.error === "EXPIRED" ? 410 : 401;
    return NextResponse.json({ error: result.error === "EXPIRED" ? "This challenge has expired. Sign in again." : result.error === "ATTEMPTS" ? "Too many attempts. Sign in again." : "That code was not accepted." }, { status });
  } catch (error) {
    const fallback = mobileRecoveryFallback(error);
    if (fallback) return fallback;
    throw error;
  }
}
