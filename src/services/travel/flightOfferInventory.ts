import type { FlightLeg, NormalizedFlightResult } from "@/lib/types";

export type FlightItineraryOption = {
  itineraryKey: string;
  leg: FlightLeg;
  compatibleResultIds: string[];
};

export type FlightFareOption = {
  fareKey: string;
  resultId: string;
  provider: string;
  offerExpiresAt?: number;
  cabinClass: string;
  baggageInfo: string;
  refundInfo: string;
  price: number;
  currency: string;
};

const canonical = (value: string | undefined) =>
  value?.trim().toUpperCase() ?? "";

export function buildFlightItineraryKey(leg: FlightLeg) {
  return JSON.stringify([
    "flight-itinerary-v1",
    leg.direction,
    canonical(leg.originAirport),
    canonical(leg.destinationAirport),
    leg.departureTime,
    leg.arrivalTime,
    leg.segments.map((segment) => [
      canonical(segment.originAirport),
      canonical(segment.destinationAirport),
      segment.departureTime,
      segment.arrivalTime,
      canonical(segment.airlineName),
      canonical(segment.flightNumber),
    ]),
  ]);
}

export function isProviderBackedFlightOffer(
  result: NormalizedFlightResult,
): result is NormalizedFlightResult & { providerOfferId: string } {
  return Boolean(result.provider.trim() && result.providerOfferId?.trim());
}

export function isFlightProviderOfferUsableAt(
  result: NormalizedFlightResult,
  now: number,
) {
  return (
    result.providerExpiresAt === undefined || result.providerExpiresAt > now
  );
}

export function deduplicateFlightOffers(results: NormalizedFlightResult[]) {
  const seenProviderOffers = new Set<string>();
  return results.filter((result) => {
    if (!isProviderBackedFlightOffer(result)) return true;
    const key = JSON.stringify([
      result.provider.trim().toLowerCase(),
      result.providerOfferId.trim(),
    ]);
    if (seenProviderOffers.has(key)) return false;
    seenProviderOffers.add(key);
    return true;
  });
}

function completeOfferLegs(result: NormalizedFlightResult) {
  const outbound = result.legs?.find((leg) => leg.direction === "outbound");
  const returnLeg = result.legs?.find((leg) => leg.direction === "return");
  if (!outbound) return null;
  return { outbound, returnLeg };
}

export function getFlightOutboundOptions(results: NormalizedFlightResult[]) {
  const groups = new Map<string, FlightItineraryOption>();
  for (const result of deduplicateFlightOffers(results)) {
    if (!isProviderBackedFlightOffer(result)) continue;
    const legs = completeOfferLegs(result);
    if (!legs) continue;
    const itineraryKey = buildFlightItineraryKey(legs.outbound);
    const group = groups.get(itineraryKey);
    if (group) group.compatibleResultIds.push(result.id);
    else
      groups.set(itineraryKey, {
        itineraryKey,
        leg: legs.outbound,
        compatibleResultIds: [result.id],
      });
  }
  return [...groups.values()];
}

export function getCompatibleFlightReturnOptions(
  results: NormalizedFlightResult[],
  outboundItineraryKey: string,
) {
  const groups = new Map<string, FlightItineraryOption>();
  const compatibleOffers = deduplicateFlightOffers(results).filter((result) => {
    if (!isProviderBackedFlightOffer(result)) return false;
    const legs = completeOfferLegs(result);
    return Boolean(
      legs?.returnLeg &&
      buildFlightItineraryKey(legs.outbound) === outboundItineraryKey,
    );
  });
  for (const result of compatibleOffers) {
    const returnLeg = completeOfferLegs(result)?.returnLeg;
    if (!returnLeg) continue;
    const itineraryKey = buildFlightItineraryKey(returnLeg);
    const group = groups.get(itineraryKey);
    if (group) group.compatibleResultIds.push(result.id);
    else
      groups.set(itineraryKey, {
        itineraryKey,
        leg: returnLeg,
        compatibleResultIds: [result.id],
      });
  }
  return [...groups.values()];
}

export function getFlightOffersForItinerary(
  results: NormalizedFlightResult[],
  outboundItineraryKey: string,
  returnItineraryKey?: string,
) {
  return deduplicateFlightOffers(results).filter((result) => {
    if (!isProviderBackedFlightOffer(result)) return false;
    const legs = completeOfferLegs(result);
    if (
      !legs ||
      buildFlightItineraryKey(legs.outbound) !== outboundItineraryKey
    )
      return false;
    if (returnItineraryKey === undefined) return legs.returnLeg === undefined;
    return Boolean(
      legs.returnLeg &&
      buildFlightItineraryKey(legs.returnLeg) === returnItineraryKey,
    );
  });
}

export function buildFlightFareKey(result: NormalizedFlightResult) {
  if (!isProviderBackedFlightOffer(result)) return null;
  return JSON.stringify(["flight-fare-v2", result.id]);
}

export function getFlightFareOptions(
  results: NormalizedFlightResult[],
): FlightFareOption[] {
  return deduplicateFlightOffers(results).flatMap((result) => {
    const fareKey = buildFlightFareKey(result);
    if (!fareKey || !result.providerOfferId) return [];
    return [
      {
        fareKey,
        resultId: result.id,
        provider: result.provider,
        offerExpiresAt: result.providerExpiresAt,
        cabinClass: result.cabinClass,
        baggageInfo: result.baggageInfo,
        refundInfo: result.refundInfo,
        price: result.price,
        currency: result.currency,
      },
    ];
  });
}
