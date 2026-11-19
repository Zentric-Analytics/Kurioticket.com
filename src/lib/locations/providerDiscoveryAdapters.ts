import { fromFlightPlaceSuggestion } from "./flightDiscovery";
import { normalizeLocationText } from "./search";
import { providerLocation, type DiscoveryAdapter } from "./discovery";
import type { CanonicalLocation, TravelProduct } from "./types";
import { searchDuffelPlaces } from "@/services/travel/providers/duffelProvider";
import { isKayakSandboxEnabled, KayakSandboxClient, type KayakVertical, type SandboxPlace } from "@/services/travel/kayakSandbox";
import { getKayakClientIp } from "@/lib/kayak-client-ip";
import { timezones as airportTimeZones } from "@/services/travel/airportTimeZones";

const emptyCoverage = { flights: "none", hotels: "none", cars: "none", packages: "none" } as const;
const hotelProviderPlaceKinds = new Set(["city", "district", "landmark", "airport"]);
const broadHotelPlaceLabels = new Map([
  ["country", "Country"],
  ["region", "Region"],
  ["state", "State"],
  ["touristregion", "Tourist region"],
]);
export const canonicalFromProvider = (provider: string, value: string, label: string, kind?: string): CanonicalLocation => {
  const iata = /^[A-Z]{3}$/.test(value) ? value : undefined;
  const providerKind = kind?.trim().toLowerCase() ?? "";
  const normalizedKind = providerKind.includes("city") ? "city"
    : providerKind.includes("district") ? "district"
    : providerKind.includes("landmark") ? "landmark"
    : providerKind.includes("airport") || iata ? "airport" : "city";
  const parts = label.split(",").map((part) => part.trim());
  const base: CanonicalLocation = { id: iata ? `${normalizedKind}:${iata}` : `place:${normalizeLocationText(label).replaceAll(" ", "-").slice(0, 120)}`,
    kind: normalizedKind, primaryLabel: parts[0] || label, supportingLabel: parts.slice(1).join(", "), submittedValue: label,
    codes: iata ? { iata } : undefined, timeZone: iata ? airportTimeZones[iata] : undefined,
    staticCoverage: emptyCoverage, source: { catalog: "kurioticket", datasetVersion: "provider-discovery-v1" } };
  return providerLocation(provider, value, base);
};

function canonicalHotelLocation(place: SandboxPlace): CanonicalLocation | null {
  const kind = place.kind?.trim().toLowerCase() ?? "";
  const scope = broadHotelPlaceLabels.get(kind);
  if (!scope && !hotelProviderPlaceKinds.has(kind)) return null;
  const location = canonicalFromProvider("kayak", place.value, place.label, kind);
  if (!scope) return location;

  // Keep provider-recognized broad searches without merging their IDs into a
  // same-name city. `custom` is already understood by installed native clients.
  const country = kind === "country" ? location.primaryLabel : location.supportingLabel.split(",").at(-1)?.trim();
  const qualifiedId = `${kind}-${normalizeLocationText(place.label).replaceAll(" ", "-")}`.slice(0, 120);
  return providerLocation("kayak", place.value, {
    ...location,
    id: `place:${qualifiedId}`,
    kind: "custom",
    supportingLabel: [scope, location.supportingLabel].filter(Boolean).join(", "),
    country: country ? { name: country } : undefined,
    region: kind === "country" ? undefined : location.primaryLabel,
  });
}

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
  const ip = getKayakClientIp(request);
  if (!ip) return null;
  const client = new KayakSandboxClient(process.env.KAYAK_SANDBOX_API_KEY!, undefined, undefined, request.headers.get("user-agent")?.trim() || undefined, ip);
  return { provider: "kayak", products: ["flights", "hotels", "cars"], async discover(query, { product, signal }) {
    const vertical = product as KayakVertical;
    const places = await client.places(vertical, query, crypto.randomUUID(), signal);
    return places.flatMap((place) => {
      const location = product === "hotels"
        ? canonicalHotelLocation(place)
        : canonicalFromProvider("kayak", place.value, place.label, place.kind);
      return location ? [location] : [];
    });
  } };
}

export function availableDiscoveryAdapters(request: Request, product: TravelProduct) {
  return [product === "flights" ? duffelDiscoveryAdapter() : null, kayakDiscoveryAdapter(request)].filter((adapter): adapter is DiscoveryAdapter => adapter !== null);
}
