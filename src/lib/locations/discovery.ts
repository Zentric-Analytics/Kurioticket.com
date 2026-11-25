import { normalizeLocationText, searchLocations } from "./search";
import { LocationSelectionSizeError, publicLocationSelection } from "./selectionAuthority";
import type { CanonicalLocation, LocationProviderBinding, TravelProduct } from "./types";

export type DiscoveryFailure = "TIMEOUT" | "PROVIDER_UNAVAILABLE" | "AUTH_CONFIGURATION" | "UNSUPPORTED_LOCATION";
export type DiscoveryAdapter = {
  provider: string;
  products: readonly TravelProduct[];
  discover(query: string, context: { product: TravelProduct; signal: AbortSignal }): Promise<CanonicalLocation[]>;
};
export type DiscoverySourceStatus = { provider: string; status: "success" | "failed" | "timeout"; count: number; failure?: DiscoveryFailure };

const identity = (location: CanonicalLocation, product: TravelProduct) => product === "hotels" && location.kind === "custom"
  ? `custom:${location.id}`
  : location.codes?.iata
    ? `iata:${location.kind}:${location.codes.iata.toUpperCase()}`
    : `${location.kind}:${location.primaryLabel.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")}:${(location.country?.code || location.supportingLabel || location.submittedValue).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")}`;

function merge(left: CanonicalLocation, right: CanonicalLocation): CanonicalLocation {
  const bindings = [...(left.providerBindings ?? []), ...(right.providerBindings ?? [])].filter((binding, index, all) =>
    all.findIndex((item) => item.provider === binding.provider && item.value === binding.value) === index,
  );
  return { ...left, country: left.country?.code ? left.country : right.country, region: left.region ?? right.region,
    coordinates: left.coordinates ?? right.coordinates, timeZone: left.timeZone ?? right.timeZone, codes: { ...right.codes, ...left.codes },
    aliases: [...new Set([...(left.aliases ?? []), ...(right.aliases ?? [])])], providerBindings: bindings,
    verification: bindings.some((binding) => binding.verification === "verified") ? "verified" : left.verification };
}

// A catalogue alias helps formulate a discovery query; it never grants supplier
// support. Only returned provider rows retain their original verified binding.
function hotelQueryReference(catalog: readonly CanonicalLocation[], query: string) {
  const matches = searchLocations(catalog, query, 25)
    .filter(({ match }) => match.location.kind === "city" && match.score >= 480);
  return matches.length === 1 ? matches[0].match.location : undefined;
}

function withHotelReferenceAliases(location: CanonicalLocation, catalog: readonly CanonicalLocation[]) {
  if (location.kind !== "city") return location;
  const normalized = normalizeLocationText;
  const providerCountry = location.country?.name || location.supportingLabel.split(",").at(-1)?.trim();
  const references = catalog.filter(reference => {
    if (reference.kind !== location.kind || normalized(reference.primaryLabel) !== normalized(location.primaryLabel)) return false;
    const sameCountry = reference.country?.code && location.country?.code
      ? normalized(reference.country.code) === normalized(location.country.code)
      : reference.country?.name && providerCountry && normalized(reference.country.name) === normalized(providerCountry);
    if (!sameCountry) return false;
    // Same-country cities can share a name. Require an explicit matching region
    // when the owned region is more specific than the city itself.
    const region = reference.region && normalized(reference.region);
    return !region || region === normalized(reference.primaryLabel)
      || region === normalized(location.region || "")
      || location.supportingLabel.split(",").some(part => normalized(part) === region);
  });
  if (references.length !== 1) return location;
  const reference = references[0];
  return { ...location, aliases: [...new Set([...(location.aliases ?? []), reference.primaryLabel, ...(reference.aliases ?? [])])] };
}

async function bounded(adapter: DiscoveryAdapter, query: string, product: TravelProduct, timeoutMs: number, signal?: AbortSignal) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    const abort = () => { controller.abort(); reject(new Error("discovery_cancelled")); };
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, {once:true, signal:controller.signal});
  });
  const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("discovery_timeout")); }, timeoutMs); });
  try { return { locations: await Promise.race([adapter.discover(query, { product, signal: controller.signal }), deadline, cancelled]), status: "success" as const }; }
  catch (error) { return { locations: [], status: controller.signal.aborted ? "timeout" as const : "failed" as const, error }; }
  finally { clearTimeout(timer); controller.abort(); }
}

export async function discoverLocations(options: { query: string; product: TravelProduct; catalog: readonly CanonicalLocation[]; adapters?: readonly DiscoveryAdapter[]; limit?: number; timeoutMs?: number; signal?: AbortSignal; supportedByProviders?: readonly string[] }) {
  const query = options.query.trim();
  if (!query) return { suggestions: [], sources: [] };
  const adapters = (options.adapters ?? []).filter((adapter) => adapter.products.includes(options.product));
  const reference = options.product === "hotels" ? hotelQueryReference(options.catalog, query) : undefined;
  const providerQuery = reference?.primaryLabel || query;
  const outcomes = await Promise.all(adapters.map((adapter) => bounded(adapter, providerQuery, options.product, options.timeoutMs ?? 900, options.signal)));
  const merged = new Map<string, CanonicalLocation>();
  const discovered = outcomes.flatMap(outcome => outcome.locations).map(location => options.product === "hotels"
    ? withHotelReferenceAliases(location, options.catalog) : location);
  for (const location of [...discovered, ...options.catalog]) {
    const match = searchLocations([location], query, 1)[0];
    if (!match) continue;
    const key = identity(location, options.product);
    merged.set(key, merged.has(key) ? merge(merged.get(key)!, location) : location);
  }
  const eligibleLocations = options.supportedByProviders?.length
    ? [...merged.values()].filter((location) => (location.providerBindings ?? []).some((binding) =>
      options.supportedByProviders!.some((provider) => binding.provider.toLowerCase() === provider.toLowerCase())
      && binding.verification === "verified",
    ))
    : [...merged.values()];
  const limit = Math.max(1, Math.min(25, Math.trunc(options.limit ?? 8)));
  const ranked = searchLocations(eligibleLocations, query, options.product === "hotels" ? 25 : limit).map(({ match }) => match.location);
  const suggestions: ReturnType<typeof publicLocationSelection>[] = [];
  for (const location of ranked) {
    if (suggestions.length >= limit) break;
    try { suggestions.push(publicLocationSelection(location, options.product)); }
    catch (error) {
      // One oversized provider row must not hide every usable hotel choice.
      // Configuration failures still surface instead of looking like no matches.
      if (options.product === "hotels" && error instanceof LocationSelectionSizeError) continue;
      throw error;
    }
  }
  return {
    suggestions: options.signal?.aborted ? [] : suggestions,
    state: options.signal?.aborted ? "cancelled" : suggestions.length ? "available" : outcomes.some(outcome => outcome.status !== "success") ? "unavailable" : "no-match",
    sources: adapters.map((adapter, index): DiscoverySourceStatus => ({ provider: adapter.provider, status: outcomes[index].status, count: outcomes[index].locations.length,
      failure: outcomes[index].status === "timeout" ? "TIMEOUT" : outcomes[index].status === "failed" ? "PROVIDER_UNAVAILABLE" : undefined })),
  };
}

export function providerLocation(provider: string, value: string, location: CanonicalLocation): CanonicalLocation {
  const binding: LocationProviderBinding = { provider, value, kind: location.kind, verification: "verified", provenance: "provider-discovery" };
  return { ...location, providerBindings: [...(location.providerBindings ?? []).filter((item) => item.provider !== provider), binding], verification: "verified" };
}
