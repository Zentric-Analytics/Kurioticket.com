import type { PublicFlightResult } from "@/lib/types";
import { buildCarResultsUrl, buildDealsResultsUrl, buildFlightResultsUrl, getIncludedProducts, type DealsSearch } from "./dealsSearchParams";
import { normalizeDealsJourneyFlightId } from "./dealsJourneyRoutes";
import { createDealsTripPlan, validateDealsInternalPath, validateDealsProductDetailsPath, type DealsTripPlan, type DealsTripPlanFlight } from "./dealsTripPlan";

const trim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function getEffectiveDealsFlightDetailsId(transientFlightId: unknown, confirmedFlight?: Pick<DealsTripPlanFlight, "id"> | null): string | null {
  return normalizeDealsJourneyFlightId(transientFlightId) ?? normalizeDealsJourneyFlightId(confirmedFlight?.id) ?? null;
}

export function isCurrentDealsFlightDetailsResponse(requestedFlightId: unknown, flight: Pick<PublicFlightResult, "id"> | null | undefined): boolean {
  const requested = normalizeDealsJourneyFlightId(requestedFlightId);
  const response = normalizeDealsJourneyFlightId(flight?.id);
  return Boolean(requested && response && requested === response);
}

export function buildDealsFlightInternalDetailsPath(search: DealsSearch, flightId: unknown): string | null {
  const normalizedId = normalizeDealsJourneyFlightId(flightId);
  if (!normalizedId) return null;
  const resultsUrl = new URL(buildFlightResultsUrl(search), "https://kurioticket.invalid");
  const path = `/flights/details/${encodeURIComponent(normalizedId)}${resultsUrl.search}`;
  return validateDealsProductDetailsPath(path, "flight", normalizedId);
}

export function buildDealsFlightDetailsSelection({ flight, requestedFlightId, search, resultReceivedAt }: { flight: PublicFlightResult; requestedFlightId: unknown; search: DealsSearch; resultReceivedAt: number }): DealsTripPlanFlight | null {
  const id = normalizeDealsJourneyFlightId(requestedFlightId);
  if (!id || !isCurrentDealsFlightDetailsResponse(id, flight)) return null;
  const provider = trim(flight.provider);
  const airline = trim(flight.airlineName);
  const flightNumber = trim(flight.flightNumber);
  const origin = trim(flight.originAirport);
  const destination = trim(flight.destinationAirport);
  const departure = trim(flight.departureTime);
  const arrival = trim(flight.arrivalTime);
  const duration = trim(flight.duration);
  const sourceCurrency = trim(flight.currency);
  const detailsPath = buildDealsFlightInternalDetailsPath(search, id);
  if (!provider || !airline || !origin || !destination || !departure || !arrival || !duration || !Number.isFinite(flight.price) || flight.price <= 0 || !sourceCurrency || !Number.isFinite(resultReceivedAt) || resultReceivedAt < 0 || !detailsPath) return null;
  return { id, provider, airline, ...(flightNumber ? { flightNumber } : {}), origin, destination, departure, arrival, duration, sourcePrice: flight.price, sourceCurrency, resultReceivedAt, detailsPath };
}

const optional = (value: string | undefined) => trim(value);
export function areDealsFlightSelectionsMateriallyEqual(a?: DealsTripPlanFlight | null, b?: DealsTripPlanFlight | null): boolean {
  if (!a || !b) return false;
  return a.id === b.id && a.provider === b.provider && a.airline === b.airline && optional(a.flightNumber) === optional(b.flightNumber) && a.origin === b.origin && a.destination === b.destination && a.departure === b.departure && a.arrival === b.arrival && a.duration === b.duration && a.sourcePrice === b.sourcePrice && a.sourceCurrency === b.sourceCurrency && optional(a.detailsPath) === optional(b.detailsPath);
}

export function buildGuidedDealsBaseTripPlan({ search, fingerprint, now }: { search: DealsSearch; fingerprint: string; now: number }): DealsTripPlan | null {
  if (!fingerprint.trim()) return null;
  const included = getIncludedProducts(search.mode);
  const resultsPath = validateDealsInternalPath(buildDealsResultsUrl(search));
  const carsResultsPath = included.car ? validateDealsInternalPath(buildCarResultsUrl(search), "/cars/results") : undefined;
  if (!resultsPath || (included.car && !carsResultsPath)) return null;
  return createDealsTripPlan({ mode: search.mode, searchFingerprint: fingerprint, resultsPath, ...(included.car && carsResultsPath ? { carsResultsPath } : {}) }, now);
}
