import { settleWithDeadline } from "./metasearch";
import { getFlightProviderCapabilities } from "./flightProviderCapabilities";
import type { FlightSearchParams, HotelSearchParams, NormalizedFlightResult, NormalizedHotelResult, ProviderResult } from "@/lib/types";
import type { LocationBoundCarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import type { LocationKind } from "@/lib/locations/types";
import { searchDuffelFlights } from "./providers/duffelProvider";
import { searchKayakFlights, searchKayakHotels, searchKayakCars, searchKayakHotelBatch, type KayakRequestContext } from "./kayakMetasearchProvider";
import { adaptKayakFlightSearch } from "./kayakSearchAdapter";

export type ProductContracts = {
  flights: { query: FlightSearchParams; offer: NormalizedFlightResult };
  hotels: { query: HotelSearchParams; offer: NormalizedHotelResult };
  cars: { query: LocationBoundCarSearchParams; offer: NormalizedCarResult };
};
export type SearchProduct = keyof ProductContracts;
/** Only authentic end-client context crosses this boundary. Supplier secrets,
 * account sessions and operational-session credentials are never fields here. */
export type ProviderExecutionContext = {
  requestId?: string;
  signal?: AbortSignal;
  kayak?: KayakRequestContext;
  onProviderStart?: () => void;
};
export type ProviderCapabilities = {
  mode: "live" | "sandbox" | "test";
  environments: readonly ("production" | "development" | "test")[];
  locationKinds: readonly LocationKind[];
  clientEligibility: "existing-server-policy";
  marketEligibility: "adapter-validated";
  authenticContext: readonly ("client-ip" | "user-agent" | "tracking-id")[];
  discovery: "existing-server-adapter" | "none";
  execution: "single" | "adapter-polling";
  pagination: "none" | "adapter-checkpoint";
  snapshot: "certified-cache" | "search-scoped";
  expiry: "provider-specific";
  details: "cached-snapshot" | "none";
  refresh: "exact-offer" | "none";
  booking: "existing-duffel-flow" | "none";
  handoff: "existing-authorized-flow" | "none";
};
export type ProviderRegistration<P extends SearchProduct> = {
  id: string;
  label: string;
  product: P;
  capabilities: ProviderCapabilities;
  timeoutMs: number;
  hotelBatch?: P extends "hotels" ? typeof searchKayakHotelBatch : never;
  supports(query: ProductContracts[P]["query"]): boolean;
  execute(query: ProductContracts[P]["query"], context: ProviderExecutionContext): Promise<ProviderResult<ProductContracts[P]["offer"]>>;
};

const kayakCapabilities: ProviderCapabilities = {
  mode: "sandbox", environments: ["production", "development", "test"],
  locationKinds: ["airport", "city", "district", "landmark", "rental-area"],
  clientEligibility: "existing-server-policy", marketEligibility: "adapter-validated",
  authenticContext: ["client-ip", "user-agent", "tracking-id"], discovery: "existing-server-adapter",
  execution: "adapter-polling", pagination: "adapter-checkpoint", snapshot: "search-scoped",
  expiry: "provider-specific", details: "cached-snapshot", refresh: "none", booking: "none", handoff: "none",
};
const kayakContext = (context: ProviderExecutionContext): KayakRequestContext | undefined => context.kayak ? {
  ...context.kayak, requestId: context.requestId ?? context.kayak.requestId,
  signal: context.signal ?? context.kayak.signal,
} : undefined;

const flights: readonly ProviderRegistration<"flights">[] = [
  {
    id: "duffel", label: "Duffel", product: "flights", timeoutMs: 12_000,
    capabilities: { ...kayakCapabilities, mode: "live", locationKinds: ["airport"], authenticContext: [], execution: "single", pagination: "none", snapshot: "certified-cache", refresh: getFlightProviderCapabilities("Duffel")?.exactSelectionRefresh === "exact-offer" ? "exact-offer" : "none", booking: "none" },
    supports: () => true,
    execute: (query, context) => { context.onProviderStart?.(); return searchDuffelFlights(query, context.signal); },
  },
  { id: "kayak", label: "KAYAK sandbox", product: "flights", timeoutMs: 30_000, capabilities: kayakCapabilities,
    supports: query => adaptKayakFlightSearch(query).supported,
    execute: (query, context) => searchKayakFlights(query, kayakContext(context)) },
];
const hotels: readonly ProviderRegistration<"hotels">[] = [
  { id: "kayak", label: "KAYAK sandbox", product: "hotels", hotelBatch: searchKayakHotelBatch, timeoutMs: 30_000, capabilities: kayakCapabilities,
    // Location binding is resolved authoritatively inside the adapter.
    supports: () => true, // Adapter validates criteria together with authoritative destination resolution.
    execute: (query, context) => searchKayakHotels(query, kayakContext(context)) },
];
const cars: readonly ProviderRegistration<"cars">[] = [
  { id: "kayak", label: "KAYAK sandbox", product: "cars", timeoutMs: 30_000, capabilities: kayakCapabilities,
    supports: () => true, // Adapter validates rental-local criteria after authoritative location resolution.
    execute: (query, context) => searchKayakCars(query, kayakContext(context)) },
];
const registrations = { flights, hotels, cars };

/** No environment variable, API payload or admin switch can register code.
 * Test registries are per-call dependencies and are forbidden in production. */
export function providersFor<P extends SearchProduct>(product: P, injected?: readonly ProviderRegistration<P>[]): readonly ProviderRegistration<P>[] {
  const selected = injected ?? registrations[product] as readonly ProviderRegistration<P>[];
  if (injected && process.env.NODE_ENV !== "test") throw new Error("Injected providers are test-only");
  const ids = new Set<string>();
  for (const provider of selected) {
    if (provider.product !== product || !provider.id.trim() || ids.has(provider.id)) throw new Error("Invalid provider registration");
    if (provider.capabilities.mode === "test" && process.env.NODE_ENV !== "test") throw new Error("Test provider cannot execute outside tests");
    ids.add(provider.id);
  }
  return selected;
}

export async function executeRegisteredProvider<P extends SearchProduct>(provider: ProviderRegistration<P>, query: ProductContracts[P]["query"], context: ProviderExecutionContext): Promise<ProviderResult<ProductContracts[P]["offer"]>> {
  if (provider.capabilities.mode === "test" && process.env.NODE_ENV !== "test") throw new Error("Test provider cannot execute outside tests");
  const started = Date.now();
  if (!provider.supports(query)) return { provider: provider.label, results: [], status: "skipped", latencyMs: 0, errorCategory: "unsupported_search", errorReason: "unsupported_search" };
  if (!provider.capabilities.environments.includes(process.env.NODE_ENV === "production" ? "production" : process.env.NODE_ENV === "test" ? "test" : "development")) return { provider:provider.label,results:[],status:"skipped",latencyMs:0,errorCategory:"skipped",errorReason:"provider_skipped" };
  const response = await provider.execute(query, context);
  // Adapter return values cannot relabel the registration's provenance.
  return { ...response, provider: provider.label, latencyMs: response.latencyMs ?? Date.now() - started };
}

/** Product services share execution policy while retaining their own inventory rules. */
export async function runRegisteredProviders<P extends SearchProduct>(providers: readonly ProviderRegistration<P>[], query: ProductContracts[P]["query"], context: ProviderExecutionContext & {deadlineMs?:number}): Promise<ProviderResult<ProductContracts[P]["offer"]>[]> {
  return Promise.all(providers.map(provider => {
    const started=Date.now();
    return settleWithDeadline<ProviderResult<ProductContracts[P]["offer"]>>(signal=>executeRegisteredProvider(provider,query,{...context,signal}),Math.min(provider.timeoutMs,context.deadlineMs??30_000),context.signal??context.kayak?.signal,
      reason=>({provider:provider.label,results:[],status:"failed",latencyMs:Date.now()-started,errorCategory:reason==="failed"?"failed":"timeout",errorReason:reason==="failed"?"provider_failed":"provider_timeout"}));
  }));
}
