import type {
  NormalizedFlightResult,
  NormalizedHotelResult,
  PublicFlightResult,
  PublicHotelResult,
} from "@/lib/types";

type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

const ttlMs = 1000 * 60 * 30;

const flightCache = new Map<string, CacheRecord<NormalizedFlightResult>>();
const hotelCache = new Map<string, CacheRecord<NormalizedHotelResult>>();

function purgeExpired<T>(cache: Map<string, CacheRecord<T>>) {
  const now = Date.now();
  for (const [key, record] of cache.entries()) {
    if (record.expiresAt <= now) cache.delete(key);
  }
}

export function rememberFlights(results: NormalizedFlightResult[]) {
  purgeExpired(flightCache);
  for (const result of results) {
    flightCache.set(result.id, { value: result, expiresAt: Date.now() + ttlMs });
  }
}

export function rememberHotels(results: NormalizedHotelResult[]) {
  purgeExpired(hotelCache);
  for (const result of results) {
    hotelCache.set(result.id, { value: result, expiresAt: Date.now() + ttlMs });
  }
}

export function getFlightFromCache(id: string) {
  purgeExpired(flightCache);
  return flightCache.get(id)?.value ?? null;
}

export function getHotelFromCache(id: string) {
  purgeExpired(hotelCache);
  return hotelCache.get(id)?.value ?? null;
}

export function toPublicFlight(result: NormalizedFlightResult): PublicFlightResult {
  const publicResult = { ...result };
  delete publicResult.rawProviderReference;
  return publicResult;
}

export function toPublicHotel(result: NormalizedHotelResult): PublicHotelResult {
  const publicResult = { ...result };
  delete publicResult.rawProviderReference;
  return publicResult;
}
