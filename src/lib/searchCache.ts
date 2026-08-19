import type {
  NormalizedFlightResult,
  NormalizedHotelResult,
  PublicFlightResult,
  PublicHotelResult,
} from "@/lib/types";
import type { FlightDetailsOffer } from "@/lib/flights/flightDetailsContract";
import { buildFlightItineraryKey } from "@/services/travel/flightOfferInventory";

type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

const ttlMs = 1000 * 60 * 30;

const flightCache = new Map<string, CacheRecord<NormalizedFlightResult>>();
const hotelCache = new Map<string, CacheRecord<NormalizedHotelResult>>();

function purgeExpired<T>(cache: Map<string, CacheRecord<T>>, now = Date.now()) {
  for (const [key, record] of cache.entries()) {
    if (record.expiresAt <= now) cache.delete(key);
  }
}

export function rememberFlights(
  results: NormalizedFlightResult[],
  now = Date.now(),
) {
  purgeExpired(flightCache, now);
  for (const result of results) {
    const expiresAt = Math.min(
      now + ttlMs,
      result.providerExpiresAt ?? Number.POSITIVE_INFINITY,
    );
    if (expiresAt <= now) continue;
    flightCache.set(result.id, { value: result, expiresAt });
  }
}

export function rememberHotels(results: NormalizedHotelResult[]) {
  purgeExpired(hotelCache);
  for (const result of results) {
    hotelCache.set(result.id, { value: result, expiresAt: Date.now() + ttlMs });
  }
}

export function getFlightFromCache(id: string, now = Date.now()) {
  purgeExpired(flightCache, now);
  return flightCache.get(id)?.value ?? null;
}

export function getCompatibleFlightsFromCache(id: string, now = Date.now()) {
  purgeExpired(flightCache, now);
  const selected = flightCache.get(id)?.value;
  if (!selected) return [];

  const selectedLegs = selected.legs?.length
    ? selected.legs
    : [];
  if (!selectedLegs.length) return [selected];
  const selectedKey = selectedLegs.map(buildFlightItineraryKey).join("|");

  return [...flightCache.values()]
    .map(({ value }) => value)
    .filter((candidate) => {
      if (!candidate.legs?.length) return candidate.id === selected.id;
      return candidate.legs.map(buildFlightItineraryKey).join("|") === selectedKey;
    });
}

export function getHotelFromCache(id: string) {
  purgeExpired(hotelCache);
  return hotelCache.get(id)?.value ?? null;
}

export function toPublicFlight(
  result: NormalizedFlightResult,
): PublicFlightResult {
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

export function toPublicHotel(
  result: NormalizedHotelResult,
): PublicHotelResult {
  const publicResult = { ...result };
  delete publicResult.rawProviderReference;
  return publicResult;
}
