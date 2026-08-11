import {
  canonicalizeDealsConfirmedFlightOfferV2,
  type DealsConfirmedFlightOfferV2,
  type DealsFlightFareV2,
  type DealsTripPlanV2,
} from "./dealsTripPlanV2";
import type { DealsFlightRuntimeV2 } from "./dealsFlightRuntimeStorageV2";
import type { DealsFlightRevalidationRequestV2 } from "./dealsFlightInventoryClientV2";

export type DealsFlightSelectionSnapshotV2 = DealsFlightRevalidationRequestV2;

export type DealsFlightMaterialChangeV2 = {
  field: "Price" | "Cabin" | "Baggage" | "Refunds";
  before: string;
  after: string;
};

export function buildDealsFlightSelectionSnapshotV2(
  runtime: DealsFlightRuntimeV2 | null,
  plan: DealsTripPlanV2,
): DealsFlightSelectionSnapshotV2 | null {
  const journey = plan.flightJourney;
  if (
    !runtime ||
    !journey?.outbound ||
    !journey.fare ||
    !runtime.inventoryToken ||
    !runtime.sourceSearchKey ||
    journey.searchKey !== runtime.sourceSearchKey ||
    runtime.tripType !== journey.tripType ||
    runtime.selectedOutboundKey !== journey.outbound.itineraryKey ||
    runtime.selectedFareKey !== journey.fare.fareKey ||
    (journey.tripType === "round-trip" &&
      (!journey.return ||
        runtime.selectedReturnKey !== journey.return.itineraryKey)) ||
    (journey.tripType === "one-way" &&
      (journey.return || runtime.selectedReturnKey))
  )
    return null;
  return {
    inventoryToken: runtime.inventoryToken,
    sourceSearchKey: runtime.sourceSearchKey,
    outboundItineraryKey: runtime.selectedOutboundKey,
    ...(journey.tripType === "round-trip"
      ? { returnItineraryKey: runtime.selectedReturnKey! }
      : {}),
    fareKey: runtime.selectedFareKey,
  };
}

export const sameDealsFlightSelectionSnapshotV2 = (
  left: DealsFlightSelectionSnapshotV2,
  right: DealsFlightSelectionSnapshotV2 | null,
) =>
  Boolean(
    right &&
    left.inventoryToken === right.inventoryToken &&
    left.sourceSearchKey === right.sourceSearchKey &&
    left.outboundItineraryKey === right.outboundItineraryKey &&
    left.returnItineraryKey === right.returnItineraryKey &&
    left.fareKey === right.fareKey,
  );

export function canonicalOfferForSnapshotV2(
  value: unknown,
  snapshot: DealsFlightSelectionSnapshotV2,
) {
  const offer = canonicalizeDealsConfirmedFlightOfferV2(value);
  return offer &&
    offer.outboundItineraryKey === snapshot.outboundItineraryKey &&
    offer.returnItineraryKey === snapshot.returnItineraryKey &&
    offer.fareKey === snapshot.fareKey
    ? offer
    : null;
}

export function fareFromConfirmedOfferV2(value: unknown):
  | (DealsFlightFareV2 & {
      sourcePrice: number;
      sourceCurrency: string;
      offerExpiresAt: number;
    })
  | null {
  const offer = canonicalizeDealsConfirmedFlightOfferV2(value);
  if (!offer) return null;
  return {
    fareKey: offer.fareKey,
    cabinClass: offer.cabinClass,
    ...(offer.baggageInfo ? { baggageInfo: offer.baggageInfo } : {}),
    ...(offer.refundInfo ? { refundInfo: offer.refundInfo } : {}),
    sourcePrice: offer.sourcePrice,
    sourceCurrency: offer.sourceCurrency,
    offerExpiresAt: offer.offerExpiresAt,
  };
}

const missing = (value: string | undefined, fallback: string) =>
  value || fallback;
export function getDealsFlightMaterialChangesV2(
  fare: DealsFlightRuntimeV2["fareChoices"][number],
  offer: DealsConfirmedFlightOfferV2,
): DealsFlightMaterialChangeV2[] {
  const changes: DealsFlightMaterialChangeV2[] = [];
  const beforePrice = `${fare.sourceCurrency} ${fare.sourcePrice}`;
  const afterPrice = `${offer.sourceCurrency} ${offer.sourcePrice}`;
  if (beforePrice !== afterPrice)
    changes.push({ field: "Price", before: beforePrice, after: afterPrice });
  if (fare.cabinClass !== offer.cabinClass)
    changes.push({
      field: "Cabin",
      before: fare.cabinClass,
      after: offer.cabinClass,
    });
  const beforeBaggage = missing(fare.baggageInfo, "Not provided");
  const afterBaggage = missing(offer.baggageInfo, "Not provided");
  if (beforeBaggage !== afterBaggage)
    changes.push({
      field: "Baggage",
      before: beforeBaggage,
      after: afterBaggage,
    });
  const beforeRefund = missing(fare.refundInfo, "Not provided");
  const afterRefund = missing(offer.refundInfo, "Not provided");
  if (beforeRefund !== afterRefund)
    changes.push({
      field: "Refunds",
      before: beforeRefund,
      after: afterRefund,
    });
  return changes;
}
