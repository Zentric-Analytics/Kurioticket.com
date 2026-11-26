import { NextRequest, NextResponse } from "next/server";
import { automationSignal } from "@/lib/botPolicy";
import { enforceBotIngress } from "@/lib/botSecurity";
import { trustedBotEdge } from "@/lib/botEdge";

const STAGING_HOST = "staging.kurioticket.com";

export function shouldDisableStagingDocumentCache(request: NextRequest) {
  return (
    request.nextUrl.hostname.toLowerCase() === STAGING_HOST &&
    request.headers.get("sec-fetch-dest") === "document"
  );
}

function continueRequest(request: NextRequest, bot = false) {
  const pathname = request.nextUrl.pathname;
  const response = pathname === "/deals" || pathname.startsWith("/deals/")
    ? NextResponse.redirect(new URL("/packages" + pathname.slice(6) + request.nextUrl.search, request.url), 308)
    : NextResponse.next();
  if (bot) response.headers.set("Cache-Control", "private, no-store, max-age=0");
  else if (shouldDisableStagingDocumentCache(request)) response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function proxy(request: NextRequest) {
  const signal = automationSignal(request);
  const healthCheck = request.nextUrl.pathname === "/api/health" && ["GET", "HEAD"].includes(request.method);
  const direct = process.env.BOT_REQUIRE_EDGE === "true" && !healthCheck && !trustedBotEdge(request);
  const response = signal ? await enforceBotIngress(request, signal, direct ? "DIRECT_ORIGIN" : undefined) : null;
  if (response) return response;
  if (direct) {
    return NextResponse.json({ error: "Origin access denied." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  return continueRequest(request, Boolean(signal));
}
