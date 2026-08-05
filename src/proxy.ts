import { NextRequest, NextResponse } from "next/server";

const STAGING_HOST = "staging.kurioticket.com";

export function shouldDisableStagingDocumentCache(request: NextRequest) {
  return (
    request.nextUrl.hostname.toLowerCase() === STAGING_HOST &&
    request.headers.get("sec-fetch-dest") === "document"
  );
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (shouldDisableStagingDocumentCache(request)) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
