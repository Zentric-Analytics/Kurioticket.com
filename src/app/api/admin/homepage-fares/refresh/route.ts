import { NextResponse } from "next/server";

import { getDefaultHomeDiscoveryPriceRoutes } from "@/data/homeDiscovery";
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

type RefreshScope = "popular" | "discover-first-6" | "all-phase-3a";

type HomepageRefreshRoute = {
  origin: string;
  destination: string;
};

const DEFAULT_REFRESH_SCOPE: RefreshScope = "all-phase-3a";
const AUDIT_TARGET_TYPE = "HomepageFareSnapshot";
const PROVIDER_NAME = "Duffel";

export async function POST(request: Request) {
  const auth = await requireAdminApiSession();
  if ("response" in auth) return auth.response;

  const scope = await readRefreshScope(request);
  const counts: RefreshCounts = {
    refreshed: 0,
    unavailable: 0,
    failed: 0,
    skipped: 0,
  };
  const dateStrategy = getHomepageFareDateStrategy();
  const routes = getRefreshRoutes(scope);

  for (const route of routes) {
    await refreshHomepageFareRoute({
      route,
      departureDate: dateStrategy.departureDate,
      counts,
    });
  }

  await writeAdminAuditLog({
    adminUserId: auth.session.user.id,
    adminEmail: auth.session.user.email,
    action: "HOMEPAGE_FARES_REFRESHED",
    targetType: AUDIT_TARGET_TYPE,
    targetId: scope,
    metadata: {
      scope,
      counts,
      departureDate: dateStrategy.departureDate,
    },
    request,
  });

  return NextResponse.json(counts);
}

async function refreshHomepageFareRoute({
  route,
  departureDate,
  counts,
}: {
  route: HomepageRefreshRoute;
  departureDate: string;
  counts: RefreshCounts;
}) {
  const { origin, destination } = route;

  if (isSameHomepageFareRoute(origin, destination)) {
    counts.skipped += 1;
    return;
  }

  try {
    const search = buildHomepageFareSearch({
      origin,
      destination,
      departureDate,
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
        provider: providerResult.provider || PROVIDER_NAME,
        result,
      });
      counts.refreshed += 1;
      return;
    }

    if (providerResult.status === "failed") {
      await upsertFailedHomepageFareSnapshot({
        origin,
        destination,
        departureDate: search.departureDate,
        currency: search.currency,
        provider: providerResult.provider || PROVIDER_NAME,
        reason: "provider_failed",
      });
      counts.failed += 1;
      return;
    }

    await upsertUnavailableHomepageFareSnapshot({
      origin,
      destination,
      departureDate: search.departureDate,
      currency: search.currency,
      provider: providerResult.provider || PROVIDER_NAME,
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
        departureDate,
        currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
        provider: PROVIDER_NAME,
        reason: "refresh_error",
      });
    } catch {
      // Avoid returning provider or credential details from the manual refresh endpoint.
    }

    counts.failed += 1;
  }
}

function getRefreshRoutes(scope: RefreshScope): HomepageRefreshRoute[] {
  const routes: HomepageRefreshRoute[] = [];

  if (scope === "popular" || scope === "all-phase-3a") {
    routes.push(
      ...PHASE_3A_POPULAR_HOMEPAGE_FARE_ROUTES.map((route) => ({
        origin: HOMEPAGE_FARE_DEFAULT_ORIGIN,
        destination: route.destination,
      })),
    );
  }

  if (scope === "discover-first-6" || scope === "all-phase-3a") {
    routes.push(
      ...getDefaultHomeDiscoveryPriceRoutes().map((route) => ({
        origin: route.originCode,
        destination: route.destinationCode,
      })),
    );
  }

  return dedupeRefreshRoutes(routes);
}

function dedupeRefreshRoutes(routes: HomepageRefreshRoute[]) {
  const seen = new Set<string>();
  const deduped: HomepageRefreshRoute[] = [];

  for (const route of routes) {
    const key = `${route.origin}:${route.destination}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(route);
  }

  return deduped;
}

async function readRefreshScope(request: Request): Promise<RefreshScope> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return DEFAULT_REFRESH_SCOPE;
  }

  if (!payload || typeof payload !== "object") return DEFAULT_REFRESH_SCOPE;

  const scope = (payload as { scope?: unknown }).scope;

  return scope === "popular" ||
    scope === "discover-first-6" ||
    scope === "all-phase-3a"
    ? scope
    : DEFAULT_REFRESH_SCOPE;
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
