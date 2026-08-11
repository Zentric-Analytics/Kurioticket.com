import type {
  DealsFlightFareV2,
  DealsFlightItineraryV2,
} from "@/lib/deals/dealsTripPlanV2";
import type { FlightLeg, NormalizedFlightResult } from "@/lib/types";
import {
  buildFlightFareKey,
  getCompatibleFlightReturnOptions,
  getFlightFareOptions,
  getFlightOffersForItinerary,
  getFlightOutboundOptions,
} from "./flightOfferInventory";

const toJourneyItinerary = (
  itineraryKey: string,
  leg: FlightLeg,
): DealsFlightItineraryV2 => ({
  itineraryKey,
  direction: leg.direction as "outbound" | "return",
  originAirport: leg.originAirport,
  destinationAirport: leg.destinationAirport,
  departureTime: leg.departureTime,
  arrivalTime: leg.arrivalTime,
  duration: leg.duration,
  durationMinutes: leg.durationMinutes,
  stops: leg.stops,
  layovers: leg.layovers,
  segments: leg.segments,
});

export const getDealsFlightOutboundChoicesV2 = (
  results: NormalizedFlightResult[],
) =>
  getFlightOutboundOptions(results).map(({ itineraryKey, leg }) =>
    toJourneyItinerary(itineraryKey, leg),
  );

export const getDealsFlightReturnChoicesV2 = (
  results: NormalizedFlightResult[],
  outboundItineraryKey: string,
) =>
  getCompatibleFlightReturnOptions(results, outboundItineraryKey).map(
    ({ itineraryKey, leg }) => toJourneyItinerary(itineraryKey, leg),
  );

export type DealsFlightFareChoiceV2 = DealsFlightFareV2 & {
  resultId: string;
  sourcePrice: number;
  sourceCurrency: string;
  offerExpiresAt?: number;
};

export const getDealsFlightFareChoicesV2 = (
  results: NormalizedFlightResult[],
  outboundItineraryKey: string,
  returnItineraryKey?: string,
): DealsFlightFareChoiceV2[] =>
  getFlightFareOptions(
    getFlightOffersForItinerary(
      results,
      outboundItineraryKey,
      returnItineraryKey,
    ),
  ).flatMap((fare) =>
    fare.cabinClass === "premium-economy"
      ? []
      : [
          {
            fareKey: fare.fareKey,
            resultId: fare.resultId,
            cabinClass: fare.cabinClass as DealsFlightFareV2["cabinClass"],
            baggageInfo: fare.baggageInfo,
            refundInfo: fare.refundInfo,
            sourcePrice: fare.price,
            sourceCurrency: fare.currency,
            offerExpiresAt: fare.offerExpiresAt,
          },
        ],
  );

/** Server-only: resolves a selection to one complete provider offer, failing closed. */
export function resolveDealsFlightOfferV2(
  results: NormalizedFlightResult[],
  outboundItineraryKey: string,
  returnItineraryKey: string | undefined,
  fareKey: string,
) {
  const matches = getFlightOffersForItinerary(
    results,
    outboundItineraryKey,
    returnItineraryKey,
  ).filter((result) => buildFlightFareKey(result) === fareKey);
  return matches.length === 1 ? matches[0] : null;
}

export { toJourneyItinerary };
