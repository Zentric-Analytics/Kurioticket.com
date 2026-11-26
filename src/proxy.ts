import { proxy as botProxy } from "@/lib/requestIngress";
import { automationSignal } from "@/lib/botPolicy";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { REGION_COOKIE_KEY, REGION_OVERRIDE_COOKIE_KEY } from "@/config/regionConfig";
import { countryToRegion, normalizeRegion } from "@/lib/region/detectRegion";
import { resolveAuthSecret } from "@/lib/authSecret";

export async function proxy(request: NextRequest) {
  const response = await botProxy(request);
  const pathname = request.nextUrl.pathname;
  if (!(response instanceof NextResponse) || !response.headers.has("x-middleware-next") || automationSignal(request) ||
    pathname.startsWith("/_next/static") || pathname.startsWith("/_next/image") || pathname.startsWith("/favicon.ico")) {
    return response;
  }
  const secret = resolveAuthSecret(process.env);
  const token = secret ? await getToken({ req: request, secret }) : null;

  if (token?.twoFactorEnabled && !token.twoFactorVerified && pathname !== "/auth/two-factor" && !pathname.startsWith("/api/auth/two-factor") && !pathname.startsWith("/api/auth/signout")) {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/account") || pathname.startsWith("/api/account")) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Two-factor verification required." }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      const callbackUrl = `${pathname}${request.nextUrl.search}`;
      url.pathname = "/auth/two-factor";
      url.search = `?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      return NextResponse.redirect(url);
    }
  }

  const selectedRegion = normalizeRegion(request.cookies.get(REGION_OVERRIDE_COOKIE_KEY)?.value);

  if (selectedRegion) {
    response.headers.set("x-kurioticket-region", selectedRegion);
    return response;
  }

  const country =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-country");
  const detectedRegion = countryToRegion(country);
  const fallbackRegion = normalizeRegion(request.cookies.get(REGION_COOKIE_KEY)?.value);
  const region = detectedRegion || fallbackRegion;

  if (!region) {
    return response;
  }

  response.cookies.set(REGION_COOKIE_KEY, region, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  if (detectedRegion) {
    response.headers.set("x-kurioticket-detected-region", detectedRegion);
  }
  response.headers.set("x-kurioticket-region", region);

  return response;
}

export const config = { matcher: "/:path*" };
