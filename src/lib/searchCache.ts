import type {
  FlightSearchParams,
  NormalizedFlightResult,
  NormalizedHotelResult,
  PublicFlightResult,
  PublicHotelResult,
} from "@/lib/types";
import type { FlightDetailsOffer } from "@/lib/flights/flightDetailsContract";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getSearchLegs } from "@/lib/flights/flightSearchJourney";
import { buildFlightItineraryKey } from "@/services/travel/flightOfferInventory";

type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

export type SharedFlightCacheRecord = {
  publicResultId: string;
  normalizedResult: NormalizedFlightResult;
  searchContext: FlightSearchParams | null;
  searchKey: string | null;
  itineraryKey: string;
  expiresAt: number;
};

export interface SharedFlightCacheBackend {
  write(records: SharedFlightCacheRecord[]): Promise<void>;
  find(publicResultId: string, now: number): Promise<SharedFlightCacheRecord | null>;
  findCompatible(searchKey: string, itineraryKey: string, now: number): Promise<SharedFlightCacheRecord[]>;
  cleanupExpired(now: number, limit: number): Promise<number>;
}

export const FLIGHT_CACHE_TTL_MS = 1000 * 60 * 30;
const CLEANUP_LIMIT = 200;
const CLEANUP_INTERVAL_MS = 60_000;
const hotelCache = new Map<string, CacheRecord<NormalizedHotelResult>>();

const clone = <T>(value: T): T => structuredClone(value);
const jsonClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function itineraryIdentity(result: NormalizedFlightResult) {
  return (result.legs ?? []).map(buildFlightItineraryKey).join("|");
}

function searchCompatibilityIdentity(search: FlightSearchParams) {
  return JSON.stringify([
    "flight-search-compatibility-v1",
    search.tripType,
    getSearchLegs(search),
    search.adults,
    search.children,
    search.infants,
    search.cabinClass,
  ]);
}

function withoutUnusedRawProviderReference(result: NormalizedFlightResult) {
  const persisted = jsonClone(result);
  delete persisted.rawProviderReference;
  return persisted;
}

function purgeExpired<T>(cache: Map<string, CacheRecord<T>>, now = Date.now()) {
  for (const [key, record] of cache.entries()) {
    if (record.expiresAt <= now) cache.delete(key);
  }
}

type PrismaFlightCacheRow = {
  publicResultId: string;
  normalizedResult: unknown;
  searchContext: unknown;
  searchKey: string | null;
  itineraryKey: string;
  expiresAt: Date;
};

function fromPrismaRow(row: PrismaFlightCacheRow): SharedFlightCacheRecord {
  return {
    publicResultId: row.publicResultId,
    normalizedResult: clone(row.normalizedResult as NormalizedFlightResult),
    searchContext: row.searchContext
      ? clone(row.searchContext as FlightSearchParams)
      : null,
    searchKey: row.searchKey,
    itineraryKey: row.itineraryKey,
    expiresAt: row.expiresAt.getTime(),
  };
}

export function createPrismaFlightCacheBackend(): SharedFlightCacheBackend {
  return {
    async write(records) {
      if (!records.length) return;
      const db = getPrisma();
      await db.$transaction(
        records.map((record) =>
          db.flightResultCache.upsert({
            where: { publicResultId: record.publicResultId },
            create: {
              publicResultId: record.publicResultId,
              normalizedResult: record.normalizedResult as never,
              searchContext: record.searchContext === null
                ? Prisma.DbNull
                : record.searchContext as never,
              searchKey: record.searchKey,
              itineraryKey: record.itineraryKey,
              expiresAt: new Date(record.expiresAt),
            },
            update: {
              normalizedResult: record.normalizedResult as never,
              searchContext: record.searchContext === null
                ? Prisma.DbNull
                : record.searchContext as never,
              searchKey: record.searchKey,
              itineraryKey: record.itineraryKey,
              expiresAt: new Date(record.expiresAt),
            },
          }),
        ),
      );
    },
    async find(publicResultId, now) {
      const row = await getPrisma().flightResultCache.findFirst({
        where: { publicResultId, expiresAt: { gt: new Date(now) } },
      });
      return row ? fromPrismaRow(row) : null;
    },
    async findCompatible(searchKey, itineraryKey, now) {
      const rows = await getPrisma().flightResultCache.findMany({
        where: { searchKey, itineraryKey, expiresAt: { gt: new Date(now) } },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(fromPrismaRow);
    },
    async cleanupExpired(now, limit) {
      return getPrisma().$executeRaw`
        DELETE FROM "FlightResultCache"
        WHERE "publicResultId" IN (
          SELECT "publicResultId"
          FROM "FlightResultCache"
          WHERE "expiresAt" <= ${new Date(now)}
          ORDER BY "expiresAt" ASC
          LIMIT ${limit}
        )
      `;
    },
  };
}

export function createMemoryFlightCacheBackend(): SharedFlightCacheBackend {
  const rows = new Map<string, SharedFlightCacheRecord>();
  return {
    async write(records) {
      for (const record of records) rows.set(record.publicResultId, clone(record));
    },
    async find(publicResultId, now) {
      const row = rows.get(publicResultId);
      return row && row.expiresAt > now ? clone(row) : null;
    },
    async findCompatible(searchKey, itineraryKey, now) {
      return [...rows.values()]
        .filter((row) => row.searchKey === searchKey && row.itineraryKey === itineraryKey && row.expiresAt > now)
        .map(clone);
    },
    async cleanupExpired(now, limit) {
      let deleted = 0;
      for (const [id, row] of rows) {
        if (deleted >= limit) break;
        if (row.expiresAt <= now) {
          rows.delete(id);
          deleted += 1;
        }
      }
      return deleted;
    },
  };
}

export function createFlightResultCache(backend: SharedFlightCacheBackend) {
  let lastCleanupAt = 0;
  const cleanup = async (now: number) => {
    if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
    lastCleanupAt = now;
    try {
      const deleted = await backend.cleanupExpired(now, CLEANUP_LIMIT);
      if (deleted) console.info("[flight-result-cache]", { event: "cleanup", deleted });
    } catch {
      console.error("[flight-result-cache]", { event: "cleanup_error" });
    }
  };

  return {
    async remember(
      results: NormalizedFlightResult[],
      now = Date.now(),
      search?: FlightSearchParams,
    ) {
      const records = results.flatMap((result) => {
        const expiresAt = Math.min(
          now + FLIGHT_CACHE_TTL_MS,
          result.providerExpiresAt ?? Number.POSITIVE_INFINITY,
        );
        if (expiresAt <= now) return [];
        return [{
          publicResultId: result.id,
          normalizedResult: withoutUnusedRawProviderReference(result),
          searchContext: search ? jsonClone(search) : null,
          searchKey: search ? searchCompatibilityIdentity(search) : null,
          itineraryKey: itineraryIdentity(result),
          expiresAt,
        }];
      });
      if (!records.length) return true;
      try {
        await backend.write(records);
        console.info("[flight-result-cache]", { event: "write", count: records.length });
        await cleanup(now);
        return true;
      } catch {
        console.error("[flight-result-cache]", { event: "write_error", count: records.length });
        return false;
      }
    },
    async get(publicResultId: string, now = Date.now()) {
      try {
        const record = await backend.find(publicResultId, now);
        console.info("[flight-result-cache]", { event: record ? "hit" : "miss" });
        await cleanup(now);
        return record?.normalizedResult ?? null;
      } catch {
        console.error("[flight-result-cache]", { event: "read_error" });
        return null;
      }
    },
    async getSearch(publicResultId: string, now = Date.now()) {
      try {
        const record = await backend.find(publicResultId, now);
        return record?.searchContext ? clone(record.searchContext) : null;
      } catch {
        console.error("[flight-result-cache]", { event: "search_read_error" });
        return null;
      }
    },
    async getCompatible(publicResultId: string, now = Date.now()) {
      try {
        const selected = await backend.find(publicResultId, now);
        if (!selected) return [];
        if (!selected.itineraryKey || !selected.searchKey) return [selected.normalizedResult];
        const records = await backend.findCompatible(selected.searchKey, selected.itineraryKey, now);
        return records.map(({ normalizedResult }) => normalizedResult);
      } catch {
        console.error("[flight-result-cache]", { event: "compatible_read_error" });
        return [];
      }
    },
    async getDetailsContext(publicResultId: string, now = Date.now()) {
      try {
        const selected = await backend.find(publicResultId, now);
        if (!selected) return null;
        const compatible = selected.itineraryKey && selected.searchKey
          ? await backend.findCompatible(selected.searchKey, selected.itineraryKey, now)
          : [selected];
        return {
          flight: selected.normalizedResult,
          search: selected.searchContext ? clone(selected.searchContext) : null,
          compatibleFlights: compatible.map(({ normalizedResult }) => normalizedResult),
        };
      } catch {
        console.error("[flight-result-cache]", { event: "details_context_read_error" });
        return null;
      }
    },
  };
}

let flightResultCache = createFlightResultCache(createPrismaFlightCacheBackend());

/** Test-only dependency seam; production always uses the Prisma backend. */
export function setFlightResultCacheBackendForTests(backend: SharedFlightCacheBackend) {
  flightResultCache = createFlightResultCache(backend);
}

export async function rememberFlights(
  results: NormalizedFlightResult[],
  now = Date.now(),
  search?: FlightSearchParams,
) {
  return flightResultCache.remember(results, now, search);
}

export async function getFlightFromCache(id: string, now = Date.now()) {
  return flightResultCache.get(id, now);
}

/** Returns the server-owned search composition that produced this exact result. */
export async function getFlightSearchFromCache(id: string, now = Date.now()) {
  return flightResultCache.getSearch(id, now);
}

export async function getCompatibleFlightsFromCache(id: string, now = Date.now()) {
  return flightResultCache.getCompatible(id, now);
}

/** Resolves Flight Details in two bounded queries: exact row plus itinerary peers. */
export async function getFlightDetailsCacheContext(id: string, now = Date.now()) {
  return flightResultCache.getDetailsContext(id, now);
}

export function rememberHotels(results: NormalizedHotelResult[]) {
  purgeExpired(hotelCache);
  for (const result of results) {
    hotelCache.set(result.id, { value: result, expiresAt: Date.now() + FLIGHT_CACHE_TTL_MS });
  }
}

export function getHotelFromCache(id: string) {
  purgeExpired(hotelCache);
  return hotelCache.get(id)?.value ?? null;
}

export function toPublicFlight(result: NormalizedFlightResult): PublicFlightResult {
  const publicResult = { ...result };
  delete publicResult.rawProviderReference;
  delete publicResult.providerOfferId;
  delete publicResult.providerExpiresAt;
  return publicResult;
}

export function toFlightDetailsOffer(result: NormalizedFlightResult): FlightDetailsOffer {
  const offer = { ...toPublicFlight(result) } as Partial<PublicFlightResult>;
  delete offer.bookingUrl;
  delete offer.partnerRedirectUrl;
  return offer as FlightDetailsOffer;
}

export function toPublicHotel(result: NormalizedHotelResult): PublicHotelResult {
  const publicResult = { ...result };
  delete publicResult.rawProviderReference;
  return publicResult;
}
