import { NextResponse } from "next/server";

import {
  getPublishedFlightRoutes,
  getPublishedHomepageDestinations,
} from "@/services/publicCmsContentService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const market = url.searchParams.get("market") || "US";

  try {
    const [destinations, flightRoutes] = await Promise.all([
      getPublishedHomepageDestinations(market),
      getPublishedFlightRoutes(market),
    ]);

    return NextResponse.json(
      {
        destinations,
        flightRoutes,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[public-cms:homepage]", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      { error: "Homepage content is unavailable." },
      { status: 503 },
    );
  }
}
