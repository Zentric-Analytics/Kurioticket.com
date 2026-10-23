import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";

import { hotelDestinations } from "@/data/hotelDestinations";
import {
  getHomeDiscoveryByRegion,
  getHomeDiscoveryContentMarketCode,
  getHomeDiscoveryImageCardsByRegion,
  getHomepageRegionalRouteCards,
  getHomeDiscoveryRouteAllowlist,
} from "@/data/homeDiscovery";
import { popularDestinationsByMarket } from "@/data/marketHomeContent";
import { resolveHotelDiscoveryIntent } from "@/lib/hotels/hotelDiscoveryIntent";
import { HOMEPAGE_REFRESH_MARKET_CODES } from "@/lib/market/resolveMarket";
import { getPrisma } from "@/lib/prisma";
import {
  CmsContentError,
  cmsPayloadSchemas,
  type CmsActor,
} from "@/services/cmsContentService";

const CONTENT_LOCALE = "en";

type SeedRow = {
  type: "HOMEPAGE_DESTINATION" | "FLIGHT_ROUTE" | "HOTEL_DESTINATION";
  key: string;
  market: string;
  sortOrder: number;
  payload: Prisma.InputJsonValue;
};

function normalizeActor(actor: CmsActor) {
  return { ...actor, email: actor.email.trim().toLowerCase() };
}

function buildSeedRows(): SeedRow[] {
  const rows: SeedRow[] = [];
  const supportedFlightPairs = new Set(
    [...getHomeDiscoveryRouteAllowlist().values()].map(
      (route) => `${route.originCode}:${route.destinationCode}`,
    ),
  );

  for (const market of HOMEPAGE_REFRESH_MARKET_CODES) {
    const destinations = popularDestinationsByMarket[market] ?? [];
    destinations.forEach((destination, index) => {
      const hotelIntent = resolveHotelDiscoveryIntent(
        `${destination.city}, ${destination.country}`,
        "home-popular-stays",
      );
      if (!hotelIntent) return;

      const payload = cmsPayloadSchemas.HOMEPAGE_DESTINATION.parse({
        city: destination.city,
        country: destination.country,
        destinationCode: destination.code,
        originCode: destination.originCode,
        image: destination.image,
        imageAlt: destination.imageAlt,
      }) as Prisma.InputJsonValue;

      rows.push({
        type: "HOMEPAGE_DESTINATION",
        key: destination.id,
        market,
        sortOrder: index,
        payload,
      });
    });
  }

  const seededFlightMarkets = new Set<string>();
  for (const market of HOMEPAGE_REFRESH_MARKET_CODES) {
    const effectiveMarket = getHomeDiscoveryContentMarketCode(market);
    if (seededFlightMarkets.has(effectiveMarket)) continue;
    seededFlightMarkets.add(effectiveMarket);

    const discoveryCards = getHomeDiscoveryImageCardsByRegion(market);
    const regionalCards = getHomepageRegionalRouteCards(market, discoveryCards);
    const orderedRoutes = [
      ...discoveryCards,
      ...regionalCards,
      ...getHomeDiscoveryByRegion(market),
    ]
      .filter((route, index, items) => items.findIndex((item) => item.id === route.id) === index)
      .filter((route) => supportedFlightPairs.has(`${route.originCode}:${route.destinationCode}`));

    orderedRoutes.forEach((route, index) => {
      const payload = cmsPayloadSchemas.FLIGHT_ROUTE.parse({
        title: route.title,
        originCity: route.originCity,
        originCode: route.originCode,
        destinationCity: route.destinationCity,
        destinationCode: route.destinationCode,
        routeNote: route.routeNote,
        image: route.image,
        imageAlt: route.imageAlt,
      }) as Prisma.InputJsonValue;

      rows.push({
        type: "FLIGHT_ROUTE",
        key: route.id,
        market: effectiveMarket,
        sortOrder: index,
        payload,
      });
    });
  }

  hotelDestinations.forEach((destination, index) => {
    const payload = cmsPayloadSchemas.HOTEL_DESTINATION.parse({
      name: destination.name,
      country: destination.country,
      countryCode: destination.countryCode,
      kind: destination.kind,
      searchValue: destination.searchValue,
      canonicalId: `hotel:${destination.id}`,
    }) as Prisma.InputJsonValue;

    rows.push({
      type: "HOTEL_DESTINATION",
      key: destination.id,
      market: "GLOBAL",
      sortOrder: index,
      payload,
    });
  });

  return rows;
}

export async function initializeHomepageCms(actorInput: CmsActor) {
  const actor = normalizeActor(actorInput);
  const db = getPrisma();
  const seedRows = buildSeedRows();

  try {
    return await db.$transaction(async (tx) => {
      const relevantTypes = ["HOMEPAGE_DESTINATION", "FLIGHT_ROUTE", "HOTEL_DESTINATION"] as const;
      const [existingItems, existingScopes] = await Promise.all([
        tx.cmsContentItem.findMany({
          where: { type: { in: [...relevantTypes] } },
          select: { id: true, type: true, key: true, market: true, locale: true },
        }),
        tx.cmsContentScope.findMany({
          where: { type: { in: [...relevantTypes] } },
          select: { type: true, market: true, locale: true },
        }),
      ]);

      if (existingItems.length > 0 || existingScopes.length > 0) {
        throw new CmsContentError(
          "CONFLICT",
          "Homepage CMS is already initialized or contains existing homepage content. Review the existing records instead of reseeding.",
        );
      }

      const now = new Date();
      const scopes = new Map<string, { type: SeedRow["type"]; market: string }>();
      for (const market of HOMEPAGE_REFRESH_MARKET_CODES) {
        scopes.set(`HOMEPAGE_DESTINATION:${market}`, {
          type: "HOMEPAGE_DESTINATION",
          market,
        });
        scopes.set(`FLIGHT_ROUTE:${market}`, {
          type: "FLIGHT_ROUTE",
          market,
        });
      }
      scopes.set("HOTEL_DESTINATION:GLOBAL", {
        type: "HOTEL_DESTINATION",
        market: "GLOBAL",
      });
      for (const row of seedRows) {
        scopes.set(`${row.type}:${row.market}`, {
          type: row.type,
          market: row.market,
        });
      }

      const seededItems = seedRows.map((row) => ({
        id: randomUUID(),
        row,
      }));

      await tx.cmsContentItem.createMany({
        data: seededItems.map(({ id, row }) => ({
          id,
          type: row.type,
          key: row.key,
          status: "PUBLISHED" as const,
          market: row.market,
          locale: CONTENT_LOCALE,
          sortOrder: row.sortOrder,
          publishedMarket: row.market,
          publishedLocale: CONTENT_LOCALE,
          publishedSortOrder: row.sortOrder,
          draftPayload: row.payload,
          publishedPayload: row.payload,
          version: 1,
          publishedVersion: 1,
          createdByAdminUserId: actor.id,
          updatedByAdminUserId: actor.id,
          publishedByAdminUserId: actor.id,
          publishedAt: now,
        })),
      });

      await tx.cmsContentRevision.createMany({
        data: seededItems.map(({ id: contentItemId, row }) => ({
          id: randomUUID(),
          contentItemId,
          version: 1,
          action: "PUBLISHED" as const,
          status: "PUBLISHED" as const,
          market: row.market,
          locale: CONTENT_LOCALE,
          sortOrder: row.sortOrder,
          publishedMarket: row.market,
          publishedLocale: CONTENT_LOCALE,
          publishedSortOrder: row.sortOrder,
          draftPayload: row.payload,
          publishedPayload: row.payload,
          actorUserId: actor.id,
          actorEmail: actor.email,
        })),
      });

      const seededCount = seededItems.length;

      await tx.cmsContentScope.createMany({
        data: [...scopes.values()].map((scope) => ({
          type: scope.type,
          market: scope.market,
          locale: CONTENT_LOCALE,
        })),
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId: actor.id,
          adminEmail: actor.email,
          action: "CMS_HOMEPAGE_INITIALIZED",
          targetType: "CmsContentScope",
          targetId: "HOMEPAGE_CONTENT",
          metadata: {
            locale: CONTENT_LOCALE,
            seededCount,
            scopeCount: scopes.size,
            homepageDestinationCount: seedRows.filter((row) => row.type === "HOMEPAGE_DESTINATION").length,
            flightRouteCount: seedRows.filter((row) => row.type === "FLIGHT_ROUTE").length,
            hotelDestinationCount: seedRows.filter((row) => row.type === "HOTEL_DESTINATION").length,
          } as Prisma.InputJsonValue,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
      });

      return {
        seededCount,
        scopeCount: scopes.size,
        homepageDestinationCount: seedRows.filter((row) => row.type === "HOMEPAGE_DESTINATION").length,
        flightRouteCount: seedRows.filter((row) => row.type === "FLIGHT_ROUTE").length,
        hotelDestinationCount: seedRows.filter((row) => row.type === "HOTEL_DESTINATION").length,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 30_000,
    });
  } catch (error) {
    if (error instanceof CmsContentError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      throw new CmsContentError(
        "CONFLICT",
        "Homepage CMS changed while initialization was running. Refresh before retrying.",
      );
    }
    throw error;
  }
}

export const homepageCmsLocale = CONTENT_LOCALE;
export const homepageCmsMarkets = HOMEPAGE_REFRESH_MARKET_CODES;
