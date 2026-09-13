import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import type { FlightSearchParams, HotelSearchParams, PublicFlightResult, PublicHotelResult, ProviderResult } from "@/lib/types";
import { getLocationFieldDisplay } from "@/lib/search/locationFieldDisplay";
import { kayakCarCardModel, kayakFlightCardModel, kayakHotelCardModel } from "@/components/results/kayakCardModels";
import { isKayakSandboxEnabled, KayakError, KayakSandboxClient, type KayakVertical } from "./kayakSandbox";
import { resolveRegularKayakSearch } from "./kayakRegularSearch";

export type KayakRequestContext = { clientIp: string; userAgent?: string; trackId?: string; signal?: AbortSignal };

async function search<T>(vertical: KayakVertical, criteria: Record<string, string>, context?: KayakRequestContext, map?: (offer: Parameters<typeof kayakFlightCardModel>[0]) => T | null): Promise<ProviderResult<T>> {
  const startedAt = Date.now();
  if (!isKayakSandboxEnabled() || !context?.clientIp) return { provider: "KAYAK sandbox", results: [], status: "skipped", latencyMs: Date.now() - startedAt };
  const client = new KayakSandboxClient(process.env.KAYAK_SANDBOX_API_KEY!, undefined, undefined, context.userAgent || "kurioticket-server", context.clientIp);
  try {
    const trackId = context.trackId || crypto.randomUUID();
    const resolved = await resolveRegularKayakSearch(vertical, criteria, (term, requested = "hotels") => client.places(requested, term, trackId, context.signal));
    if (!resolved.supported) return { provider: "KAYAK sandbox", results: [], status: "skipped", latencyMs: Date.now() - startedAt, error: resolved.reason, errorCategory: "skipped", errorReason: "provider_skipped" };
    const offers = await client.search(resolved.search, trackId, context.signal);
    return { provider: "KAYAK sandbox", results: offers.flatMap(offer => { const value = map?.(offer); return value ? [value] : []; }), status: "success", latencyMs: Date.now() - startedAt };
  } catch (error) {
    const reason = error instanceof KayakError ? error.code : "unavailable";
    const errorCategory = reason === "timeout" ? "timeout" : reason === "unauthorized" ? "auth" : reason === "invalid_response" ? "invalid_response" : reason === "unavailable" ? "network" : "server";
    const errorReason = reason === "timeout" ? "provider_timeout" : reason === "unauthorized" ? "provider_auth_error" : reason === "invalid_response" ? "provider_invalid_response" : reason === "unavailable" ? "provider_network_error" : "provider_server_error";
    return { provider: "KAYAK sandbox", results: [], status: "failed", latencyMs: Date.now() - startedAt, error: reason, errorCategory, errorReason };
  }
}

const strings = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).flatMap(([key, item]) => item === undefined ? [] : [[key, String(item)]]));
export const searchKayakFlights = (criteria: FlightSearchParams, context?: KayakRequestContext) => search<PublicFlightResult>("flights", strings(criteria as unknown as Record<string, unknown>), context, offer => kayakFlightCardModel(offer, strings(criteria as unknown as Record<string, unknown>)));
export const searchKayakHotels = (criteria: HotelSearchParams, context?: KayakRequestContext) => {
  const nights = Math.max(1, Math.round((Date.parse(criteria.checkOut) - Date.parse(criteria.checkIn)) / 86_400_000));
  return search<PublicHotelResult>("hotels", strings(criteria as unknown as Record<string, unknown>), context, offer => kayakHotelCardModel(offer, nights));
};
export const searchKayakCars = (criteria: CarSearchParams, context?: KayakRequestContext) => {
  const days = Math.max(1, Math.ceil((Date.parse(`${criteria.dropoffDate}T${criteria.dropoffTime}:00`) - Date.parse(`${criteria.pickupDate}T${criteria.pickupTime}:00`)) / 86_400_000));
  const pickup = getLocationFieldDisplay(criteria.pickupLocation).primary || criteria.pickupLocation;
  return search<NormalizedCarResult>("cars", strings(criteria as unknown as Record<string, unknown>), context, offer => kayakCarCardModel(offer, days, pickup));
};
