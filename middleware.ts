import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { REGION_COOKIE_KEY } from "@/config/regionConfig";
import { countryToRegion, normalizeRegion } from "@/lib/region/detectRegion";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const cookieRegion = normalizeRegion(request.cookies.get(REGION_COOKIE_KEY)?.value);

  if (cookieRegion) {
    response.headers.set("x-curioticket-region", cookieRegion);
    return response;
  }

  const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry");
  const detectedRegion = countryToRegion(country);

  response.cookies.set(REGION_COOKIE_KEY, detectedRegion, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  response.headers.set("x-curioticket-region", detectedRegion);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
