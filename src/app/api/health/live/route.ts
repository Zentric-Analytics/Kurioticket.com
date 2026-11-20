import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Render liveness check: is this Next.js process able to serve HTTP?
 *
 * Do NOT query the database here. A transient PostgreSQL interruption must
 * remain visible in /api/health (readiness) without forcing the only staging
 * web instance into a failed-health-check restart loop.
 *
 * Liveness does not assert that searches, sign-in, or other DB-backed
 * features are available. Keep /api/health as the separate, strict DB probe.
 */
export async function GET() {
  return NextResponse.json(
    { ok: true, service: "kurioticket", check: "liveness" },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
