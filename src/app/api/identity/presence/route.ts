import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashVisitorToken, isNativeVisitorRequest, isSameOriginRequest, readVisitorToken, visitorTrackingDenied } from "@/lib/visitor-identity";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import { recordWebsitePresenceHeartbeat } from "@/services/websitePresenceService";

export const runtime = "nodejs";

/** Browser-only, consent-checked POST. Never accepts client-supplied user IDs. */
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie, Origin" };
  // A browser fetch sends Origin on POST. Missing/cross-origin headers and
  // native auth requests are not permitted to create web presence.
  if (!request.headers.get("origin") || !isSameOriginRequest(request) || isNativeVisitorRequest(request)) {
    return NextResponse.json({ error: "Invalid website request." }, { status: 403, headers });
  }
  if (visitorTrackingDenied(request, "web")) {
    return NextResponse.json({ error: "Analytics consent declined." }, { status: 403, headers });
  }
  const token = readVisitorToken(request, "web");
  if (!token) {
    return NextResponse.json({ error: "Consented visitor identity unavailable." }, { status: 403, headers });
  }
  // Bound per opaque, one-way-hashed credential, rather than a shared NAT IP.
  const rate = checkRateLimit("web-presence:" + hashVisitorToken(token), 8, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { ...headers, "Retry-After": "30" } });
  }
  try {
    const session = await resolveOptionalWebApiSession();
    const result = await recordWebsitePresenceHeartbeat(token, session?.userId ?? null);
    if (result === "recorded") return new NextResponse(null, { status: 204, headers });
    return NextResponse.json(
      { error: result === "unavailable" ? "Presence temporarily unavailable." : "Visitor not eligible for presence tracking." },
      { status: result === "unavailable" ? 503 : 403, headers },
    );
  } catch {
    return NextResponse.json({ error: "Presence temporarily unavailable." }, { status: 503, headers });
  }
}
