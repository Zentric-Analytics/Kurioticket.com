import { searchLocations } from "./search";
import { publicLocationSelection } from "./selectionAuthority";
import type { CanonicalLocation, LocationProviderBinding, TravelProduct } from "./types";

export type DiscoveryFailure = "TIMEOUT" | "PROVIDER_UNAVAILABLE" | "AUTH_CONFIGURATION" | "UNSUPPORTED_LOCATION";
export type DiscoveryAdapter = {
  provider: string;
  products: readonly TravelProduct[];
  discover(query: string, context: { product: TravelProduct; signal: AbortSignal }): Promise<CanonicalLocation[]>;
};
export type DiscoverySourceStatus = { provider: string; status: "success" | "failed" | "timeout"; count: number; failure?: DiscoveryFailure };

const identity = (location: CanonicalLocation) => location.codes?.iata
  ? `iata:${location.codes.iata.toUpperCase()}`
  : `${location.kind}:${location.primaryLabel.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "")}:${location.country?.code?.toUpperCase() ?? ""}`;

function merge(left: CanonicalLocation, right: CanonicalLocation): CanonicalLocation {
  const bindings = [...(left.providerBindings ?? []), ...(right.providerBindings ?? [])].filter((binding, index, all) =>
    all.findIndex((item) => item.provider === binding.provider && item.value === binding.value) === index,
  );
  return { ...left, country: left.country?.code ? left.country : right.country, region: left.region ?? right.region,
    coordinates: left.coordinates ?? right.coordinates, codes: { ...right.codes, ...left.codes },
    aliases: [...new Set([...(left.aliases ?? []), ...(right.aliases ?? [])])], providerBindings: bindings,
    verification: bindings.some((binding) => binding.verification === "verified") ? "verified" : left.verification };
}

async function bounded(adapter: DiscoveryAdapter, query: string, product: TravelProduct, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return { locations: await adapter.discover(query, { product, signal: controller.signal }), status: "success" as const }; }
  catch (error) { return { locations: [], status: controller.signal.aborted ? "timeout" as const : "failed" as const, error }; }
  finally { clearTimeout(timer); }
}

export async function discoverLocations(options: { query: string; product: TravelProduct; catalog: readonly CanonicalLocation[]; adapters?: readonly DiscoveryAdapter[]; limit?: number; timeoutMs?: number }) {
  const query = options.query.trim();
  if (!query) return { suggestions: [], sources: [] };
  const adapters = (options.adapters ?? []).filter((adapter) => adapter.products.includes(options.product));
  const outcomes = await Promise.all(adapters.map((adapter) => bounded(adapter, query, options.product, options.timeoutMs ?? 900)));
  const merged = new Map<string, CanonicalLocation>();
  for (const location of [...outcomes.flatMap((outcome) => outcome.locations), ...options.catalog]) {
    const match = searchLocations([location], query, 1)[0];
    if (!match) continue;
    const key = identity(location);
    merged.set(key, merged.has(key) ? merge(merged.get(key)!, location) : location);
  }
  const ranked = searchLocations([...merged.values()], query, options.limit ?? 8).map(({ match }) => match.location);
  return {
    suggestions: ranked.map((location) => publicLocationSelection(location, options.product)),
    sources: adapters.map((adapter, index): DiscoverySourceStatus => ({ provider: adapter.provider, status: outcomes[index].status, count: outcomes[index].locations.length,
      failure: outcomes[index].status === "timeout" ? "TIMEOUT" : outcomes[index].status === "failed" ? "PROVIDER_UNAVAILABLE" : undefined })),
  };
}

export function providerLocation(provider: string, value: string, location: CanonicalLocation): CanonicalLocation {
  const binding: LocationProviderBinding = { provider, value, kind: location.kind, verification: "verified", provenance: "provider-discovery" };
  return { ...location, providerBindings: [...(location.providerBindings ?? []).filter((item) => item.provider !== provider), binding], verification: "verified" };
}
