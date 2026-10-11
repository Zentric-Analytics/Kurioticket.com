import type { HotelDestinationSuggestion } from "@/data/hotelDestinations";
import { searchLocationSchema } from "@/lib/locations/searchTargetSchema";

// The server-issued token, not a client-supplied provider ID, authorizes binding.
export function readHotelDestinationSelection(encoded: string | null, destination: string) {
  if (!encoded || encoded.length > 4096) return undefined;
  try {
    const parsed = searchLocationSchema.safeParse(JSON.parse(encoded));
    if (!parsed.success || parsed.data.submittedValue.trim() !== destination.trim()) return undefined;
    return { ...parsed.data, providerBindings: [] };
  } catch {
    return undefined;
  }
}

export function writeHotelDestinationSelection(params: URLSearchParams, suggestion: HotelDestinationSuggestion | undefined, destination: string) {
  if (!suggestion || suggestion.searchValue.trim() !== destination.trim()) return;
  params.set("destinationId", suggestion.id);
  const location = readHotelDestinationSelection(JSON.stringify(suggestion.canonical) ?? null, destination);
  if (location) params.set("destinationLocation", JSON.stringify(location));
}
