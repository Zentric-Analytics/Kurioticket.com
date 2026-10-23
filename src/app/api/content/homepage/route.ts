import { NextResponse } from "next/server";

import { resolveHotelDiscoveryIntent } from "@/lib/hotels/hotelDiscoveryIntent";
import {
  getPublishedFlightRoutes,
  getPublishedHomepageDestinations,
  getPublishedHotelDestinations,
} from "@/services/publicCmsContentService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const market = url.searchParams.get("market") || "US";

  try {
    const [destinations, flightRoutes, hotelDestinations] = await Promise.all([
      getPublishedHomepageDestinations(market),
      getPublishedFlightRoutes(market),
      getPublishedHotelDestinations(),
    ]);

    const publishedHotels = new Map(
      hotelDestinations.items.map((destination) => [
        destination.canonicalId,
        destination,
      ]),
    );
    const homepageDestinations = destinations.items.flatMap((destination) => {
      const intent = resolveHotelDiscoveryIntent(
        `${destination.city}, ${destination.country}`,
        "home-popular-stays",
      );
      if (!intent) return [];

      const canonicalId = `hotel:${intent.canonicalDestinationId}`;
      const hotelDestination = publishedHotels.get(canonicalId);
      if (!hotelDestination) return [];

      return [{
        ...destination,
        canonicalDestinationId: intent.canonicalDestinationId,
        destinationSearchValue: hotelDestination.searchValue,
      }];
    });

    return NextResponse.json(
      {
        destinations: {
          source: destinations.source,
          items: homepageDestinations,
        },
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
