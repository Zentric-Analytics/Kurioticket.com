import type { DealsSearch } from "./dealsSearchParams";
import { applyDealsJourneyEventV2 } from "./dealsJourneyEngineV2";
import type { DealsFlightRuntimeV2 } from "./dealsFlightRuntimeStorageV2";
import type { DealsTripPlanV2 } from "./dealsTripPlanV2";

export type DownstreamLoadState =
  | "idle"
  | "loading"
  | "success"
  | "empty"
  | "error";

type Requests = {
  getReturns: (request: {
    inventoryToken: string;
    sourceSearchKey: string;
    outboundItineraryKey: string;
  }) => Promise<DealsFlightRuntimeV2["returnChoices"]>;
  getFares: (request: {
    inventoryToken: string;
    sourceSearchKey: string;
    outboundItineraryKey: string;
    returnItineraryKey?: string;
  }) => Promise<DealsFlightRuntimeV2["fareChoices"]>;
};

export type RestoredDealsFlightRuntimeV2 = {
  runtime: DealsFlightRuntimeV2;
  plan: DealsTripPlanV2;
  returnState: DownstreamLoadState;
  fareState: DownstreamLoadState;
};

/** Rebuilds staged state only from canonical events and fresh downstream data. */
export async function restoreDealsFlightRuntimeV2({
  stored,
  freshPlan,
  search,
  searchKey,
  requests,
}: {
  stored: DealsFlightRuntimeV2;
  freshPlan: DealsTripPlanV2;
  search: DealsSearch;
  searchKey: string;
  requests: Requests;
}): Promise<RestoredDealsFlightRuntimeV2> {
  const cleared: DealsFlightRuntimeV2 = {
    ...stored,
    returnChoices: [],
    fareChoices: [],
    selectedOutboundKey: undefined,
    selectedReturnKey: undefined,
    selectedFareKey: undefined,
  };
  const outbound = stored.outboundChoices.find(
    (choice) => choice.itineraryKey === stored.selectedOutboundKey,
  );
  if (!outbound)
    return {
      runtime: cleared,
      plan: freshPlan,
      returnState: "idle",
      fareState: "idle",
    };
  const outboundResult = applyDealsJourneyEventV2(freshPlan, search, {
    type: "FLIGHT_OUTBOUND_SELECTED",
    itinerary: outbound,
    sourceSearchKey: searchKey,
    expectedRevision: freshPlan.revision,
  });
  if (!outboundResult.ok)
    return {
      runtime: cleared,
      plan: freshPlan,
      returnState: "idle",
      fareState: "idle",
    };

  let runtime = { ...cleared, selectedOutboundKey: outbound.itineraryKey };
  let plan = outboundResult.plan;
  let returnState: DownstreamLoadState = "idle";
  let returnItineraryKey: string | undefined;
  if (stored.tripType === "round-trip") {
    const returnChoices = await requests.getReturns({
      inventoryToken: stored.inventoryToken,
      sourceSearchKey: stored.sourceSearchKey,
      outboundItineraryKey: outbound.itineraryKey,
    });
    returnState = returnChoices.length === 0 ? "empty" : "success";
    runtime = { ...runtime, returnChoices };
    const inbound = returnChoices.find(
      (choice) => choice.itineraryKey === stored.selectedReturnKey,
    );
    if (!inbound) return { runtime, plan, returnState, fareState: "idle" };
    const returnResult = applyDealsJourneyEventV2(plan, search, {
      type: "FLIGHT_RETURN_SELECTED",
      itinerary: inbound,
      sourceSearchKey: searchKey,
      expectedRevision: plan.revision,
    });
    if (!returnResult.ok)
      return { runtime, plan, returnState, fareState: "idle" };
    plan = returnResult.plan;
    returnItineraryKey = inbound.itineraryKey;
    runtime = { ...runtime, selectedReturnKey: returnItineraryKey };
  }

  const fares = await requests.getFares({
    inventoryToken: stored.inventoryToken,
    sourceSearchKey: stored.sourceSearchKey,
    outboundItineraryKey: outbound.itineraryKey,
    ...(returnItineraryKey ? { returnItineraryKey } : {}),
  });
  const fareState: DownstreamLoadState =
    fares.length === 0 ? "empty" : "success";
  runtime = { ...runtime, fareChoices: fares };
  const fare = fares.find(
    (choice) => choice.fareKey === stored.selectedFareKey,
  );
  if (!fare) return { runtime, plan, returnState, fareState };
  const fareResult = applyDealsJourneyEventV2(plan, search, {
    type: "FLIGHT_FARE_SELECTED",
    fare,
    sourceSearchKey: searchKey,
    expectedRevision: plan.revision,
  });
  if (!fareResult.ok) return { runtime, plan, returnState, fareState };
  return {
    runtime: { ...runtime, selectedFareKey: fare.fareKey },
    plan: fareResult.plan,
    returnState,
    fareState,
  };
}

export const isFatalFlightInventoryError = (code: string) =>
  code === "UNKNOWN_INVENTORY" ||
  code === "INVENTORY_EXPIRED" ||
  code === "STALE_SEARCH";

export const shouldRenderDownstreamEmpty = (
  state: DownstreamLoadState,
  choiceCount: number,
) => state === "empty" && choiceCount === 0;
