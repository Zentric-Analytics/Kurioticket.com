import { fromFlightPlaceSuggestion } from "./flightDiscovery";
import { normalizeLocationText } from "./search";
import { providerLocation, type DiscoveryAdapter } from "./discovery";
import type { CanonicalLocation, TravelProduct } from "./types";
import { searchDuffelPlaces } from "@/services/travel/providers/duffelProvider";
import { isKayakSandboxEnabled, KayakSandboxClient, type KayakVertical } from "@/services/travel/kayakSandbox";

const emptyCoverage = { flights: "none", hotels: "none", cars: "none", packages: "none" } as const;
const canonicalFromProvider = (provider: string, value: string, label: string, kind?: string): CanonicalLocation => {
  const iata = /^[A-Z]{3}$/.test(value) ? value : undefined;
  const normalizedKind = iata ? "airport" : kind === "district" ? "district" : kind === "landmark" ? "landmark" : kind?.includes("airport") ? "airport" : "city";
  const parts = label.split(",").map((part) => part.trim());
  const base: CanonicalLocation = { id: iata ? `airport:${iata}` : `place:${normalizeLocationText(label).replaceAll(" ", "-").slice(0, 120)}`,
    kind: normalizedKind, primaryLabel: parts[0] || label, supportingLabel: parts.slice(1).join(", "), submittedValue: label,
    codes: iata ? { iata } : undefined, staticCoverage: emptyCoverage, source: { catalog: "kurioticket", datasetVersion: "provider-discovery-v1" } };
  return providerLocation(provider, value, base);
};

export function duffelDiscoveryAdapter(): DiscoveryAdapter {
  return { provider: "duffel", products: ["flights"], async discover(query, { signal }) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const result = await searchDuffelPlaces(query, { context: "destination" });
    if (result.status !== "success") throw new Error(result.errorCategory ?? "Duffel unavailable");
    return result.results.map(fromFlightPlaceSuggestion);
  } };
}

export function kayakDiscoveryAdapter(request: Request): DiscoveryAdapter | null {
  if (!isKayakSandboxEnabled()) return null;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";
  const client = new KayakSandboxClient(process.env.KAYAK_SANDBOX_API_KEY!, undefined, undefined, request.headers.get("user-agent") || "kurioticket-server", ip);
  return { provider: "kayak", products: ["flights", "hotels", "cars"], async discover(query, { product, signal }) {
    const vertical = product as KayakVertical;
    const places = await client.places(vertical, query, crypto.randomUUID(), signal);
    return places.map((place) => canonicalFromProvider("kayak", place.value, place.label, place.kind));
  } };
}

export function availableDiscoveryAdapters(request: Request, product: TravelProduct) {
  return [product === "flights" ? duffelDiscoveryAdapter() : null, kayakDiscoveryAdapter(request)].filter((adapter): adapter is DiscoveryAdapter => adapter !== null);
}
