import { NextResponse } from "next/server";

const GEO_HEADER_ALLOWLIST = [
  "cf-ipcountry",
  "cf-ipcity",
  "cf-region",
  "cf-postal-code",
  "cf-iplatitude",
  "cf-iplongitude",
  "x-vercel-ip-country",
  "x-vercel-ip-city",
  "x-vercel-ip-country-region",
  "x-vercel-ip-latitude",
  "x-vercel-ip-longitude",
  "x-country",
  "x-city",
  "accept-language",
] as const;

const buildNotFound = () =>
  NextResponse.json({ error: "Not Found" }, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  if (process.env.ENABLE_REQUEST_LOCATION_DEBUG !== "true") {
    return buildNotFound();
  }

  const token = process.env.REQUEST_LOCATION_DEBUG_TOKEN;
  if (token) {
    const queryToken = new URL(request.url).searchParams.get("token");
    const headerToken = request.headers.get("x-debug-token");
    if (queryToken !== token && headerToken !== token) {
      return buildNotFound();
    }
  }

  const geoHeaders: Partial<Record<(typeof GEO_HEADER_ALLOWLIST)[number], string>> = {};

  for (const headerName of GEO_HEADER_ALLOWLIST) {
    const value = request.headers.get(headerName);
    if (value) {
      geoHeaders[headerName] = value;
    }
  }

  return NextResponse.json(
    {
      enabled: true,
      geoHeaders,
      hasCitySignal: Boolean(geoHeaders["cf-ipcity"] || geoHeaders["x-vercel-ip-city"] || geoHeaders["x-city"]),
      hasLatLngSignal: Boolean(
        (geoHeaders["cf-iplatitude"] && geoHeaders["cf-iplongitude"]) ||
          (geoHeaders["x-vercel-ip-latitude"] && geoHeaders["x-vercel-ip-longitude"]),
      ),
      hasCountrySignal: Boolean(
        geoHeaders["cf-ipcountry"] || geoHeaders["x-vercel-ip-country"] || geoHeaders["x-country"],
      ),
      note: "Temporary diagnostic route. Remove after validation.",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
