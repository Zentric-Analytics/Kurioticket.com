import { currentSandboxGrant, productionSandboxHost } from "@/lib/productionSandboxPolicy";
import { displayOnlyInventory } from "@/shared/presentation/sandboxInventory";

import type { LocationBoundCarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import type { FlightSearchParams, HotelSearchParams, NormalizedFlightResult, PublicHotelResult, ProviderResult } from "@/lib/types";
import { getLocationFieldDisplay } from "@/lib/search/locationFieldDisplay";
import { kayakCarCardModel, kayakFlightCardModel, kayakHotelCardModel } from "@/components/results/kayakCardModels";
import { groupKayakCarResults } from "@/lib/cars/carResults";
import { isKayakSandboxEnabled, KayakError, KayakPartialSearchError, KayakSandboxClient, type KayakVertical } from "./kayakSandbox";
import { resolveRegularKayakSearch } from "./kayakRegularSearch";
import { kayakAgentKind, kayakCorrelation } from "./kayakRequestDiagnostics";

function reportProviderRows(requestId: string | undefined, vertical: KayakVertical, status: "success" | "failed", rawRows: number, normalizedRows: number) {
  try { console.info("[kayak-search:provider-outcome]", JSON.stringify({ ...kayakCorrelation(requestId), vertical, status, rawRows, normalizedRows })); }
  catch { /* An operational log sink cannot discard valid inventory. */ }
}

export type KayakRequestContext = { clientIp: string; userAgent?: string; trackId?: string; requestId?: string; signal?: AbortSignal };

/** Provider row IDs can be positions reused by later searches. Cache and route
 * identities must belong to one result snapshot, never to a global row number. */
export function scopeKayakOfferIds<T extends { id: string; hotelPropertyKey?: string; carGroupKey?: string }>(offers: T[], snapshotId: string): T[] {
  return offers.map((offer) => ({ ...offer, id: `${snapshotId}:${offer.id}`,
    ...(offer.hotelPropertyKey !== undefined ? { hotelPropertyKey: `${snapshotId}:${offer.hotelPropertyKey}` } : {}),
    ...(offer.carGroupKey !== undefined ? { carGroupKey: `${snapshotId}:${offer.carGroupKey}` } : {}),
  }));
}

/** Supplier-facing identity only; the incoming native identity remains in context
 * and diagnostics. Owner-confirmed supplier authorization covers Android flight/
 * car sandbox searches on staging, not production. No response-driven fallback.
 * Hotels retain their historical bare OkHttp/Dalvik compatibility behavior. */
export function kayakProviderUserAgent(vertical: KayakVertical, incoming?: string, env: Record<string, string | undefined> = process.env): string | undefined {
  const agent = incoming?.trim();
  if (!agent) return undefined;
  if (vertical === "hotels") return /^(?:okhttp|dalvik)\//i.test(agent) ? undefined : agent;
  const kind = kayakAgentKind(agent);
  if ((kind === "android_transport" || kind === "android_application") &&
      env.TRAVEL_PROVIDER_MODE?.trim().toLowerCase() === "staging" && isKayakSandboxEnabled(env)) {
    try {
      const url = new URL(env.NEXT_PUBLIC_APP_URL || "");
      if (url.origin === "https://staging.kurioticket.com" && !url.username && !url.password) return undefined;
    } catch { /* Unknown environments retain their existing identity. */ }
  }
  return agent;
}

async function search<T>(vertical: KayakVertical, criteria: Record<string, string>, context?: KayakRequestContext, map?: (offer: Parameters<typeof kayakFlightCardModel>[0]) => T | null): Promise<ProviderResult<T>> {
  const startedAt = Date.now();
  if (!isKayakSandboxEnabled() || !context?.clientIp) return { provider: "KAYAK sandbox", results: [], status: "skipped", latencyMs: Date.now() - startedAt };
  const production = productionSandboxHost();
  const grant = production ? await currentSandboxGrant() : null;
  if (production && (!grant || !context?.userAgent?.trim())) return {provider:"KAYAK sandbox",results:[],status:"skipped",latencyMs:0};
  const protect = async (results: T[]) => {
    if (!production) return results;
    const fresh=await currentSandboxGrant();
    return fresh && fresh.revision === grant?.revision ? results.map(result=>displayOnlyInventory(result,fresh.revision)) : [];
  };
  const correlation = kayakCorrelation(context.requestId);
  const client = new KayakSandboxClient(process.env.KAYAK_SANDBOX_API_KEY!, undefined, undefined, production ? context.userAgent : kayakProviderUserAgent(vertical, context.userAgent), context.clientIp,
    timing => console.info("[kayak-search:stage-timing]", JSON.stringify({ ...timing, ...correlation })),
    diagnostic => console.warn("[kayak-search:http-rejection]", JSON.stringify({ ...diagnostic, ...correlation })),
    diagnostic => console.info("[kayak-search:car-request]", JSON.stringify({ ...diagnostic, ...correlation })),
    { ...correlation, incomingUserAgent: context.userAgent, product: vertical });
  try {
    const trackId = context.trackId || crypto.randomUUID();
    const resolved = await resolveRegularKayakSearch(vertical, criteria, (term, requested = "hotels") => client.places(requested, term, trackId, context.signal));
    if (!resolved.supported) {
      const pickupTimePast = resolved.reasonCode === "pickup_time_past";
      return {
        provider: "KAYAK sandbox",
        results: [],
        status: "skipped",
        latencyMs: Date.now() - startedAt,
        error: resolved.reason,
        errorCategory: pickupTimePast ? "invalid_search" : resolved.reasonCode === "unsupported_search" ? "unsupported_search" : "unsupported_location",
        errorReason: pickupTimePast ? "pickup_time_past" : resolved.reasonCode === "unsupported_search" ? "unsupported_search" : "unsupported_location",
      };
    }
    const offers = scopeKayakOfferIds(
      await client.search(resolved.search, trackId, context.signal),
      crypto.randomUUID(),
    );
    const results = await protect(offers.flatMap(offer => { const value = map?.(offer); return value ? [value] : []; }));
    reportProviderRows(context.requestId, vertical, "success", offers.length, results.length);
    return { provider: "KAYAK sandbox", results, status: "success", latencyMs: Date.now() - startedAt };
  } catch (error) {
    const reason = error instanceof KayakError ? error.code : "unavailable";
    // Keep the configured identity on rejection, including the original native
    // classification in phase diagnostics; never retry with another identity.
    console.warn("[kayak-search:rejection]", { ...correlation, vertical, category: reason,
      httpStatus: error instanceof KayakError ? error.httpStatus : undefined });
    const errorCategory = reason === "timeout" ? "timeout" : reason === "unauthorized" ? "auth" : reason === "invalid_response" ? "invalid_response" : reason === "unavailable" ? "network" : "server";
    const errorReason = reason === "timeout" ? "provider_timeout" : reason === "unauthorized" ? "provider_auth_error" : reason === "invalid_response" ? "provider_invalid_response" : reason === "unavailable" ? "provider_network_error" : "provider_server_error";
    const results = error instanceof KayakPartialSearchError
      ? scopeKayakOfferIds(error.offers, crypto.randomUUID()).flatMap(offer => { const value = map?.(offer); return value ? [value] : []; })
      : [];
    const retained = await protect(results);
    reportProviderRows(context.requestId, vertical, "failed", error instanceof KayakPartialSearchError ? error.offers.length : 0, retained.length);
    return { provider: "KAYAK sandbox", results: retained, status: "failed", latencyMs: Date.now() - startedAt, error: reason, errorCategory, errorReason };
  }
}

/** The regular-search adapter accepts URL-shaped scalar criteria. Structured
 * canonical fields (notably flight `legs`) must not be stringified into an
 * invalid value that makes an otherwise valid search look unsupported. */
export const kayakProviderCriteria = (value: Record<string, unknown>) => Object.fromEntries(
  Object.entries(value).flatMap(([key, item]) =>
    typeof item === "string" || typeof item === "number" || typeof item === "boolean"
      ? [[key, String(item)]]
      : key === "roomComposition" || key.endsWith("Location") || key.endsWith("LocationTarget")
        ? [[key, JSON.stringify(item)]]
      : [],
  ),
);
export const searchKayakFlights = (criteria: FlightSearchParams, context?: KayakRequestContext) => search<NormalizedFlightResult>("flights", kayakProviderCriteria(criteria as unknown as Record<string, unknown>), context, offer => kayakFlightCardModel(offer, kayakProviderCriteria(criteria as unknown as Record<string, unknown>)));
export const searchKayakHotels = (criteria: HotelSearchParams, context?: KayakRequestContext) => {
  const nights = Math.max(1, Math.round((Date.parse(criteria.checkOut) - Date.parse(criteria.checkIn)) / 86_400_000));
  return search<PublicHotelResult>("hotels", kayakProviderCriteria(criteria as unknown as Record<string, unknown>), context, offer => kayakHotelCardModel(offer, nights));
};

/** Compatibility batch execution shares canonical resolution, identity policy,
 * snapshot scoping and normalization. Cursor signing belongs to the transport.
 * Production compatibility requests already delegate to canonical full search. */
export async function searchKayakHotelBatch(criteria: HotelSearchParams, context: KayakRequestContext, snapshot: string, checkpoint?: import("./kayakSandbox").KayakHotelBatchCheckpoint) {
  if (productionSandboxHost() || !isKayakSandboxEnabled() || !context.clientIp) throw new Error("Hotel batch execution unavailable");
  const client = new KayakSandboxClient(process.env.KAYAK_SANDBOX_API_KEY!, undefined, undefined,
    kayakProviderUserAgent("hotels", context.userAgent), context.clientIp,
    timing => console.info("[kayak-search:stage-timing]", JSON.stringify({ ...timing, ...kayakCorrelation(context.requestId) })),
    diagnostic => console.warn("[kayak-search:http-rejection]", JSON.stringify({ ...diagnostic, ...kayakCorrelation(context.requestId) })),
    undefined, { ...kayakCorrelation(context.requestId), incomingUserAgent: context.userAgent, product: "hotels" });
  const trackId = context.trackId || crypto.randomUUID();
  const resolved = await resolveRegularKayakSearch("hotels", kayakProviderCriteria(criteria as unknown as Record<string,unknown>),
    (term, vertical = "hotels") => client.places(vertical, term, trackId, context.signal));
  if (!resolved.supported || resolved.search.vertical !== "hotels") return { supported: false as const };
  const batch = await client.searchHotelBatch(resolved.search, trackId, checkpoint, context.signal);
  const nights = Math.max(1, Math.round((Date.parse(criteria.checkOut)-Date.parse(criteria.checkIn))/86_400_000));
  const results = scopeKayakOfferIds(batch.offers, snapshot).flatMap(offer => {
    const model = kayakHotelCardModel(offer, nights);
    return model ? [model] : [];
  });
  return { supported: true as const, batch, results };
}
/** Only KAYAK's search-scoped result identity groups cars, never a model name. */
export { groupKayakCarResults } from "@/lib/cars/carResults";

export const searchKayakCars = async (criteria: LocationBoundCarSearchParams, context?: KayakRequestContext) => {
  const days = Math.max(1, Math.ceil((Date.parse(`${criteria.dropoffDate}T${criteria.dropoffTime}:00`) - Date.parse(`${criteria.pickupDate}T${criteria.pickupTime}:00`)) / 86_400_000));
  const pickup = getLocationFieldDisplay(criteria.pickupLocation).primary || criteria.pickupLocation;
  const response = await search<NormalizedCarResult>("cars", kayakProviderCriteria(criteria as unknown as Record<string, unknown>), context, offer => kayakCarCardModel(offer, days, pickup));
  return { ...response, results: groupKayakCarResults(response.results) };
};
