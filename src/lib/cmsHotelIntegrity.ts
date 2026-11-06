import { hotelDestinations } from "@/data/hotelDestinations";
import { resolveHotelDiscoveryIntent } from "@/lib/hotels/hotelDiscoveryIntent";

// The public hotel search catalogue owns this identity. The CMS may change the
// editorial display name and image, but not the search metadata behind that ID.
const byCanonicalId: ReadonlyMap<string, (typeof hotelDestinations)[number]> = new Map(
  hotelDestinations.map((entry) => [`hotel:${entry.id}`, entry] as const),
);

export function cmsHotelCanonicalId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>).canonicalId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getCmsHotelMetadataMismatch(payload: {
  canonicalId: string;
  country: string;
  countryCode: string;
  kind: string;
  searchValue: string;
}): string | null {
  const canonical = byCanonicalId.get(payload.canonicalId);
  if (!canonical) return "Choose a canonical destination from the Kurioticket hotel catalogue.";
  for (const field of ["country", "countryCode", "kind", "searchValue"] as const) {
    if (payload[field].trim() !== canonical[field]) {
      return `The ${field} must match the selected canonical hotel destination. Select the destination again to restore its linked search details.`;
    }
  }
  return null;
}

// Public homepage destinations resolve through the hotel discovery catalogue.
// Keep this definition shared by publication guards and the public response.
export function homepageDestinationHotelCanonicalId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.city !== "string" || typeof record.country !== "string") return null;
  const city = record.city.trim();
  const country = record.country.trim();
  if (!city || !country) return null;
  const intent = resolveHotelDiscoveryIntent(`${city}, ${country}`, "home-popular-stays");
  return intent ? `hotel:${intent.canonicalDestinationId}` : null;
}
