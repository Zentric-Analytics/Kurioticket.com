import type { DealsConfirmedFlightOfferV2 } from "@/lib/deals/dealsTripPlanV2";
import type {
  FlightSearchParams,
  NormalizedFlightResult,
  ProviderResult,
} from "@/lib/types";
import { isFlightProviderOfferUsableAt } from "./flightOfferInventory";
import {
  resolveDealsFlightOfferV2,
  toJourneyItinerary,
} from "./dealsFlightInventoryV2";
import { getDuffelFlightOffer } from "./providers/duffelProvider";

export type FlightOfferRevalidationOutcome =
  | { status: "confirmed" | "changed"; offer: DealsConfirmedFlightOfferV2 }
  | {
      status:
        | "expired"
        | "unavailable"
        | "temporary-failure"
        | "invalid-selection";
    };

type RefreshOffer = (
  offerId: string,
  search: FlightSearchParams,
) => Promise<ProviderResult<NormalizedFlightResult>>;

export type ExactFlightOfferRefreshOutcome = {
  status:
    | "confirmed"
    | "changed"
    | "expired"
    | "unavailable"
    | "temporary-failure"
    | "invalid-selection";
  offer?: NormalizedFlightResult;
};

export type RefreshExactFlightOffer = (input: {
  cachedOffer: NormalizedFlightResult;
  search: FlightSearchParams;
  now: number;
}) => Promise<ExactFlightOfferRefreshOutcome>;

const providerConfirmsUnavailable = (
  response: ProviderResult<NormalizedFlightResult>,
) =>
  response.errorCategory === "no_inventory" ||
  response.errorCategory === "route_unavailable" ||
  response.errorReason === "provider_no_inventory" ||
  response.errorReason === "provider_route_unavailable";

export const flightOfferMateriallyChanged = (
  cached: NormalizedFlightResult,
  refreshed: NormalizedFlightResult,
) =>
  cached.price !== refreshed.price ||
  cached.currency !== refreshed.currency ||
  cached.cabinClass !== refreshed.cabinClass ||
  cached.fareBrandName !== refreshed.fareBrandName ||
  JSON.stringify(cached.legs?.map(({ fareBrandName }) => fareBrandName)) !==
    JSON.stringify(refreshed.legs?.map(({ fareBrandName }) => fareBrandName)) ||
  cached.baggageInfo !== refreshed.baggageInfo ||
  cached.refundInfo !== refreshed.refundInfo ||
  JSON.stringify(cached.fareTerms) !== JSON.stringify(refreshed.fareTerms) ||
  JSON.stringify(cached.providerDetails) !== JSON.stringify(refreshed.providerDetails) ||
  JSON.stringify(cached.legs) !== JSON.stringify(refreshed.legs) ||
  cached.partnerRedirectUrl !== refreshed.partnerRedirectUrl ||
  cached.bookingUrl !== refreshed.bookingUrl;

const physicalItinerary = (offer: NormalizedFlightResult) =>
  (offer.legs ?? []).map((leg) => JSON.stringify([
    leg.direction,
    leg.originAirport,
    leg.destinationAirport,
    leg.departureTime,
    leg.arrivalTime,
    leg.segments.map((segment) => [
      segment.originAirport,
      segment.destinationAirport,
      segment.departureTime,
      segment.arrivalTime,
      segment.airlineName,
      segment.flightNumber,
      segment.marketingCarrier,
      segment.operatingCarrier,
      segment.marketingFlightNumber,
      segment.operatingFlightNumber,
    ]),
  ])).join("|");

export async function refreshExactFlightOffer({
  cachedOffer,
  search,
  now,
  refreshDuffelOffer = getDuffelFlightOffer,
}: {
  cachedOffer: NormalizedFlightResult;
  search: FlightSearchParams;
  now: number;
  refreshDuffelOffer?: RefreshOffer;
}): Promise<ExactFlightOfferRefreshOutcome> {
  if (!isFlightProviderOfferUsableAt(cachedOffer, now))
    return { status: "expired" };
  if (!cachedOffer.providerOfferId)
    return { status: "invalid-selection" };
  if (cachedOffer.provider.trim().toLowerCase() !== "duffel")
    return { status: "unavailable" };
  const response = await refreshDuffelOffer(cachedOffer.providerOfferId, search);
  if (response.status !== "success")
    return {
      status: providerConfirmsUnavailable(response)
        ? "unavailable"
        : "temporary-failure",
    };
  if (response.results.length !== 1) return { status: "unavailable" };
  const refreshed = response.results[0];
  if (!isFlightProviderOfferUsableAt(refreshed, now) || !refreshed.providerExpiresAt)
    return { status: "expired" };
  if (
    !physicalItinerary(cachedOffer) ||
    refreshed.providerOfferId !== cachedOffer.providerOfferId ||
    physicalItinerary(refreshed) !== physicalItinerary(cachedOffer)
  ) return { status: "invalid-selection" };
  return {
    status: flightOfferMateriallyChanged(cachedOffer, refreshed)
      ? "changed"
      : "confirmed",
    offer: refreshed,
  };
}

export async function revalidateFlightOffer({
  cachedOffer,
  search,
  outboundItineraryKey,
  returnItineraryKey,
  fareKey,
  now,
  refreshDuffelOffer = getDuffelFlightOffer,
}: {
  cachedOffer: NormalizedFlightResult;
  search: FlightSearchParams;
  outboundItineraryKey: string;
  returnItineraryKey?: string;
  fareKey: string;
  now: number;
  refreshDuffelOffer?: RefreshOffer;
}): Promise<FlightOfferRevalidationOutcome> {
  if (!isFlightProviderOfferUsableAt(cachedOffer, now))
    return { status: "expired" };
  if (
    !cachedOffer.providerOfferId ||
    resolveDealsFlightOfferV2(
      [cachedOffer],
      outboundItineraryKey,
      returnItineraryKey,
      fareKey,
    ) !== cachedOffer ||
    (search.tripType === "one-way") !== (returnItineraryKey === undefined)
  )
    return { status: "invalid-selection" };
  if (cachedOffer.provider.trim().toLowerCase() !== "duffel")
    return { status: "unavailable" };

  const exact = await refreshExactFlightOffer({
    cachedOffer,
    search,
    now,
    refreshDuffelOffer,
  });
  if (!exact.offer)
    return {
      status:
        exact.status === "confirmed" || exact.status === "changed"
          ? "unavailable"
          : exact.status,
    };
  const refreshed = exact.offer;
  if (
    resolveDealsFlightOfferV2(
      [refreshed],
      outboundItineraryKey,
      returnItineraryKey,
      fareKey,
    ) !== refreshed
  ) return { status: "invalid-selection" };

  const legs = refreshed.legs ?? [];
  const projectedLegs = legs.flatMap((leg) => {
    const key =
      leg.direction === "outbound" ? outboundItineraryKey : returnItineraryKey;
    return key && (leg.direction === "outbound" || leg.direction === "return")
      ? [toJourneyItinerary(key, leg)]
      : [];
  });
  if (projectedLegs.length !== (search.tripType === "round-trip" ? 2 : 1))
    return { status: "invalid-selection" };
  const offer: DealsConfirmedFlightOfferV2 = {
    provider: refreshed.provider,
    airline: refreshed.airlineName,
    ...(refreshed.flightNumber ? { flightNumber: refreshed.flightNumber } : {}),
    outboundItineraryKey,
    ...(returnItineraryKey ? { returnItineraryKey } : {}),
    fareKey,
    legs: projectedLegs,
    cabinClass:
      refreshed.cabinClass as DealsConfirmedFlightOfferV2["cabinClass"],
    baggageInfo: refreshed.baggageInfo,
    refundInfo: refreshed.refundInfo,
    sourcePrice: refreshed.price,
    sourceCurrency: refreshed.currency,
    offerExpiresAt: refreshed.providerExpiresAt!,
    selectedAt: now,
    validatedAt: now,
  };
  return {
    status: exact.status === "changed" ? "changed" : "confirmed",
    offer,
  };
}
