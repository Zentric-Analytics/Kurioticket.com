import { buildFlightApiPayload, serializeDealsSearchParams, type DealsSearch } from "./dealsSearchParams";
import { isStageInDealsMode, normalizeDealsJourneyFlightId } from "./dealsJourneyRoutes";

export function buildDealsFlightResultsSearchInput(search: DealsSearch, displayCurrency: string) {
  const payload = buildFlightApiPayload(search);
  return { ...payload, currency: displayCurrency };
}

export function buildDealsFlightInventoryIdentity(search: DealsSearch, displayCurrency: string) {
  const input = buildDealsFlightResultsSearchInput(search, displayCurrency);
  return [input.origin, input.destination, input.departureDate, input.returnDate ?? "", input.tripType, input.adults, input.children, input.infants, input.travelers, input.cabinClass, input.currency].join("|");
}

export function buildDealsFlightDetailsJourneyUrl(search: DealsSearch, flightId: unknown): string | null {
  const normalizedFlightId = normalizeDealsJourneyFlightId(flightId);
  if (!normalizedFlightId || !isStageInDealsMode("flight-details", search.mode)) return null;
  const params = serializeDealsSearchParams(search);
  params.set("flightId", normalizedFlightId);
  return `/deals/journey/flight-details?${params.toString()}`;
}
