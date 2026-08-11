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

export type FlightOfferRevalidationInternalOutcome =
  | {
      status: "confirmed" | "changed";
      offer: DealsConfirmedFlightOfferV2;
      refreshedOffer: NormalizedFlightResult;
    }
  | Exclude<
      FlightOfferRevalidationOutcome,
      { status: "confirmed" | "changed" }
    >;

type RefreshOffer = (
  offerId: string,
  search: FlightSearchParams,
) => Promise<ProviderResult<NormalizedFlightResult>>;

const providerConfirmsUnavailable = (
  response: ProviderResult<NormalizedFlightResult>,
) =>
  response.errorCategory === "no_inventory" ||
  response.errorCategory === "route_unavailable" ||
  response.errorReason === "provider_no_inventory" ||
  response.errorReason === "provider_route_unavailable";

const materiallyChanged = (
  cached: NormalizedFlightResult,
  refreshed: NormalizedFlightResult,
) =>
  cached.price !== refreshed.price ||
  cached.currency !== refreshed.currency ||
  cached.cabinClass !== refreshed.cabinClass ||
  cached.baggageInfo !== refreshed.baggageInfo ||
  cached.refundInfo !== refreshed.refundInfo;

export async function revalidateFlightOfferInternal({
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
}): Promise<FlightOfferRevalidationInternalOutcome> {
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

  const response = await refreshDuffelOffer(
    cachedOffer.providerOfferId,
    search,
  );
  if (response.status !== "success")
    return {
      status: providerConfirmsUnavailable(response)
        ? "unavailable"
        : "temporary-failure",
    };
  if (response.results.length !== 1) return { status: "unavailable" };
  const refreshed = response.results[0];
  if (
    !isFlightProviderOfferUsableAt(refreshed, now) ||
    !refreshed.providerExpiresAt
  )
    return { status: "expired" };
  if (
    refreshed.providerOfferId !== cachedOffer.providerOfferId ||
    resolveDealsFlightOfferV2(
      [refreshed],
      outboundItineraryKey,
      returnItineraryKey,
      fareKey,
    ) !== refreshed
  )
    return { status: "invalid-selection" };

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
    offerExpiresAt: refreshed.providerExpiresAt,
    selectedAt: now,
    validatedAt: now,
  };
  return {
    status: materiallyChanged(cachedOffer, refreshed) ? "changed" : "confirmed",
    offer,
    refreshedOffer: refreshed,
  };
}

/** Browser-safe projection. Provider identities and targets stay server-only. */
export async function revalidateFlightOffer(
  input: Parameters<typeof revalidateFlightOfferInternal>[0],
): Promise<FlightOfferRevalidationOutcome> {
  const outcome = await revalidateFlightOfferInternal(input);
  if (outcome.status === "confirmed" || outcome.status === "changed")
    return { status: outcome.status, offer: outcome.offer };
  return outcome;
}
