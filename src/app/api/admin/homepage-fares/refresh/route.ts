import { NextResponse } from "next/server";

import { requireAdminApiSession, writeAdminAuditLog } from "@/lib/admin";
import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
import {
  buildHomepageFareSearch,
  getHomepageFareDateStrategy,
  HOMEPAGE_FARE_DEFAULT_CURRENCY,
  HOMEPAGE_FARE_DEFAULT_ORIGIN,
  isSameHomepageFareRoute,
  PHASE_3A_POPULAR_HOMEPAGE_FARE_ROUTES,
  upsertActiveHomepageFareSnapshot,
  upsertFailedHomepageFareSnapshot,
  upsertUnavailableHomepageFareSnapshot,
} from "@/services/homepageFareSnapshotService";
import { searchDuffelFlights } from "@/services/travel/providers/duffelProvider";

export const runtime = "nodejs";

type RefreshCounts = {
  refreshed: number;
  unavailable: number;
  failed: number;
  skipped: number;
};

const REFRESH_SCOPE = "phase-3a-popular-destinations";

export async function POST(request: Request) {
  const auth = await requireAdminApiSession();
  if ("response" in auth) return auth.response;

  const counts: RefreshCounts = {
    refreshed: 0,
    unavailable: 0,
    failed: 0,
    skipped: 0,
  };
  const dateStrategy = getHomepageFareDateStrategy();

  for (const route of PHASE_3A_POPULAR_HOMEPAGE_FARE_ROUTES) {
    const origin = HOMEPAGE_FARE_DEFAULT_ORIGIN;
    const destination = route.destination;

    if (isSameHomepageFareRoute(origin, destination)) {
      counts.skipped += 1;
      continue;
    }

    try {
      const search = buildHomepageFareSearch({
        origin,
        destination,
        departureDate: dateStrategy.departureDate,
        currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
      });
      const providerSearch: FlightSearchParams = {
        ...search,
        sort: "cheapest",
      };
      const providerResult = await searchDuffelFlights(providerSearch);
      const result = selectProviderFare(providerResult.results, search.currency);

      if (
        providerResult.status === "success" &&
        !providerResult.error &&
        result
      ) {
        await upsertActiveHomepageFareSnapshot({
          origin,
          destination,
          departureDate: search.departureDate,
          currency: search.currency,
          provider: providerResult.provider,
          result,
        });
        counts.refreshed += 1;
        continue;
      }

      if (providerResult.status === "failed") {
        await upsertFailedHomepageFareSnapshot({
          origin,
          destination,
          departureDate: search.departureDate,
          currency: search.currency,
          provider: providerResult.provider || "Duffel",
          reason: "provider_failed",
        });
        counts.failed += 1;
        continue;
      }

      await upsertUnavailableHomepageFareSnapshot({
        origin,
        destination,
        departureDate: search.departureDate,
        currency: search.currency,
        provider: providerResult.provider || "Duffel",
        reason:
          providerResult.status === "skipped"
            ? "provider_skipped"
            : "no_fare_returned",
      });
      counts.unavailable += 1;
    } catch {
      try {
        await upsertFailedHomepageFareSnapshot({
          origin,
          destination,
          departureDate: dateStrategy.departureDate,
          currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
          provider: "Duffel",
          reason: "refresh_error",
        });
      } catch {
        // Avoid returning provider or credential details from the manual refresh endpoint.
      }

      counts.failed += 1;
    }
  }

  await writeAdminAuditLog({
    adminUserId: auth.session.user.id,
    adminEmail: auth.session.user.email,
    action: "HOMEPAGE_FARES_REFRESHED",
    targetType: "HomepageFareSnapshot",
    targetId: REFRESH_SCOPE,
    metadata: {
      scope: REFRESH_SCOPE,
      counts,
      origin: HOMEPAGE_FARE_DEFAULT_ORIGIN,
      departureDate: dateStrategy.departureDate,
    },
    request,
  });

  return NextResponse.json(counts);
}

function selectProviderFare(
  results: NormalizedFlightResult[],
  currency: string,
): NormalizedFlightResult | undefined {
  return results
    .filter(
      (result) =>
        result.currency?.toUpperCase() === currency &&
        Number.isFinite(result.price) &&
        result.price > 0,
    )
    .sort((first, second) => first.price - second.price)[0];
}
