import { NextResponse } from "next/server";

import { extractVisitorIp, resolveIpinfoLiteCountryContext } from "@/lib/geo/ipinfo";

type LocationResponse = {
  source: "ipinfo-lite" | "fallback";
  countryCode: string | null;
  country: string | null;
  continentCode: string | null;
  continent: string | null;
  ipDetected: boolean;
};

export const dynamic = "force-dynamic";

const fallbackLocation = (ipDetected: boolean): LocationResponse => ({
  source: "fallback",
  countryCode: null,
  country: null,
  continentCode: null,
  continent: null,
  ipDetected,
});

export async function GET(request: Request) {
  const visitorIp = extractVisitorIp(request.headers);
  const location = await resolveIpinfoLiteCountryContext(visitorIp);

  if (!location) {
    return NextResponse.json(fallbackLocation(Boolean(visitorIp)));
  }

  return NextResponse.json({
    source: location.source,
    countryCode: location.countryCode,
    country: location.country,
    continentCode: location.continentCode ?? null,
    continent: location.continent ?? null,
    ipDetected: true,
  } satisfies LocationResponse);
}
