import type {
  FlightLeg,
  FlightSearchParams,
  NormalizedFlightResult,
  ProviderResult,
} from "@/lib/types";
import { sanitizeAirportCode } from "@/lib/utils";
import { isFlightProviderOfferUsableAt } from "./flightOfferInventory";
import { getDuffelFlightOffer } from "./providers/duffelProvider";

export type StandaloneFlightRevalidationOutcome =
  | { status: "confirmed" | "changed"; flight: NormalizedFlightResult }
  | { status: "expired" | "unavailable" | "temporary-failure" | "invalid" };

type RefreshOffer = (
  offerId: string,
  search: FlightSearchParams,
) => Promise<ProviderResult<NormalizedFlightResult>>;

function completeLeg(leg: FlightLeg) {
  if (!leg.segments.length || leg.stops !== leg.segments.length - 1) return false;
  if (
    leg.originAirport !== leg.segments[0]?.originAirport ||
    leg.destinationAirport !== leg.segments.at(-1)?.destinationAirport ||
    leg.departureTime !== leg.segments[0]?.departureTime ||
    leg.arrivalTime !== leg.segments.at(-1)?.arrivalTime
  ) return false;
  let previousArrival = 0;
  for (const [index, segment] of leg.segments.entries()) {
    const departure = Date.parse(segment.departureTime);
    const arrival = Date.parse(segment.arrivalTime);
    if (!Number.isFinite(departure) || !Number.isFinite(arrival) || arrival <= departure)
      return false;
    if (index && (
      leg.segments[index - 1]?.destinationAirport !== segment.originAirport ||
      departure < previousArrival
    )) return false;
    previousArrival = arrival;
  }
  return Date.parse(leg.arrivalTime) > Date.parse(leg.departureTime);
}

export function flightMatchesSearch(
  flight: NormalizedFlightResult,
  search: FlightSearchParams,
) {
  const legs = flight.legs ?? [];
  const outbound = legs[0];
  const returnLeg = legs[1];
  const origin = sanitizeAirportCode(search.origin);
  const destination = sanitizeAirportCode(search.destination);
  if (
    !outbound || outbound.direction !== "outbound" || !completeLeg(outbound) ||
    outbound.originAirport !== origin || outbound.destinationAirport !== destination ||
    outbound.departureTime.slice(0, 10) !== search.departureDate
  ) return false;
  if (search.tripType === "one-way") return legs.length === 1;
  if (search.tripType !== "round-trip" || !search.returnDate) return false;
  return Boolean(
    legs.length === 2 && returnLeg?.direction === "return" && completeLeg(returnLeg) &&
    returnLeg.originAirport === destination && returnLeg.destinationAirport === origin &&
    returnLeg.departureTime.slice(0, 10) === search.returnDate &&
    Date.parse(returnLeg.departureTime) >= Date.parse(outbound.arrivalTime),
  );
}

const material = (flight: NormalizedFlightResult) => JSON.stringify({
  providerOfferId: flight.providerOfferId,
  provider: flight.provider,
  legs: flight.legs,
  airlineName: flight.airlineName,
  flightNumber: flight.flightNumber,
  cabinClass: flight.cabinClass,
  fareBrandName: flight.fareBrandName,
  baggageInfo: flight.baggageInfo,
  refundInfo: flight.refundInfo,
  price: flight.price,
  currency: flight.currency,
  providerExpiresAt: flight.providerExpiresAt,
  bookingUrl: flight.bookingUrl,
  partnerRedirectUrl: flight.partnerRedirectUrl,
});

export async function revalidateStandaloneFlightOffer({
  cachedOffer,
  search,
  now = Date.now(),
  refreshDuffelOffer = getDuffelFlightOffer,
}: {
  cachedOffer: NormalizedFlightResult;
  search: FlightSearchParams;
  now?: number;
  refreshDuffelOffer?: RefreshOffer;
}): Promise<StandaloneFlightRevalidationOutcome> {
  if (!cachedOffer.providerOfferId || !isFlightProviderOfferUsableAt(cachedOffer, now))
    return { status: "expired" };
  if (cachedOffer.provider.trim().toLowerCase() !== "duffel" || !flightMatchesSearch(cachedOffer, search))
    return { status: "invalid" };
  const response = await refreshDuffelOffer(cachedOffer.providerOfferId, search);
  if (response.status !== "success") {
    const unavailable = response.errorCategory === "no_inventory" || response.errorCategory === "route_unavailable";
    return { status: unavailable ? "unavailable" : "temporary-failure" };
  }
  if (response.results.length !== 1) return { status: "unavailable" };
  const refreshed = response.results[0];
  if (!isFlightProviderOfferUsableAt(refreshed, now)) return { status: "expired" };
  if (
    refreshed.providerOfferId !== cachedOffer.providerOfferId ||
    refreshed.provider.trim().toLowerCase() !== cachedOffer.provider.trim().toLowerCase() ||
    !flightMatchesSearch(refreshed, search)
  ) return { status: "invalid" };
  return {
    status: material(cachedOffer) === material(refreshed) ? "confirmed" : "changed",
    flight: refreshed,
  };
}
