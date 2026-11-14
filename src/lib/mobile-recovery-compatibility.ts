import { NextResponse } from "next/server";

// A protocol capability is a UI compatibility hint, never authentication proof.
export class MobileRecoveryClientRequiredError extends Error {
  constructor() { super("MobileRecoveryClientRequired"); }
}
export function mobileRecoveryFallback(error: unknown) {
  if (!(error instanceof MobileRecoveryClientRequiredError)) return null;
  // Never derive a recovery destination from request Host/forwarded headers.
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  const origin = configured && /^https:\/\/staging\.kurioticket\.com\/?$/.test(configured)
    ? "https://staging.kurioticket.com" : "https://kurioticket.com";
  const webRecoveryUrl = `${origin}/auth/signin?callbackUrl=%2Faccount%2Fpending-deletion`;
  return NextResponse.json({
    code: "RECOVERY_CLIENT_UPDATE_REQUIRED",
    error: `Update Kurioticket to recover in the app, or sign in securely in your browser: ${webRecoveryUrl}. Complete all verification steps there.`,
    webRecoveryUrl,
  }, { status: 409, headers: { "Cache-Control": "no-store" } });
}
