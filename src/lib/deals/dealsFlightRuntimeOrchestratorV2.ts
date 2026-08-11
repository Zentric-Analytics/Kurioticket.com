import type { DealsSearch } from "./dealsSearchParams";
import type { DealsJourneyResultV2 } from "./dealsJourneyEngineV2";
import { applyDealsJourneyEventV2 } from "./dealsJourneyEngineV2";
import type { DealsTripPlanV2 } from "./dealsTripPlanV2";
import type { DealsFlightRuntimeV2 } from "./dealsFlightRuntimeStorageV2";

type Apply = typeof applyDealsJourneyEventV2;
type FetchReturns = (
  request: {
    inventoryToken: string;
    sourceSearchKey: string;
    outboundItineraryKey: string;
  },
  signal?: AbortSignal,
) => Promise<DealsFlightRuntimeV2["returnChoices"]>;
type FetchFares = (
  request: {
    inventoryToken: string;
    sourceSearchKey: string;
    outboundItineraryKey: string;
    returnItineraryKey?: string;
  },
  signal?: AbortSignal,
) => Promise<DealsFlightRuntimeV2["fareChoices"]>;

export type DealsFlightRestoreResultV2 = {
  plan: DealsTripPlanV2;
  runtime: DealsFlightRuntimeV2;
  rejectedStage?: "outbound" | "return" | "fare";
};

/** Rebuilds the staged plan while treating the server's downstream lists as authoritative. */
export async function restoreDealsFlightRuntimeV2({
  stored,
  initialPlan,
  search,
  searchKey,
  getReturns,
  getFares,
  signal,
  apply = applyDealsJourneyEventV2,
}: {
  stored: DealsFlightRuntimeV2;
  initialPlan: DealsTripPlanV2;
  search: DealsSearch;
  searchKey: string;
  getReturns: FetchReturns;
  getFares: FetchFares;
  signal?: AbortSignal;
  apply?: Apply;
}): Promise<DealsFlightRestoreResultV2> {
  const empty = (rejectedStage?: "outbound") => ({
    plan: initialPlan,
    runtime: {
      ...stored,
      returnChoices: [],
      fareChoices: [],
      selectedOutboundKey: undefined,
      selectedReturnKey: undefined,
      selectedFareKey: undefined,
    },
    ...(rejectedStage ? { rejectedStage } : {}),
  });
  const outbound = stored.outboundChoices.find(
    (item) => item.itineraryKey === stored.selectedOutboundKey,
  );
  if (!outbound) return empty();
  const outboundApplied = apply(initialPlan, search, {
    type: "FLIGHT_OUTBOUND_SELECTED",
    itinerary: outbound,
    sourceSearchKey: searchKey,
    expectedRevision: initialPlan.revision,
  });
  if (!outboundApplied.ok) return empty("outbound");

  let plan = outboundApplied.plan;
  let runtime: DealsFlightRuntimeV2 = {
    ...stored,
    selectedOutboundKey: outbound.itineraryKey,
    selectedReturnKey: undefined,
    selectedFareKey: undefined,
    returnChoices: [],
    fareChoices: [],
  };
  let selectedReturnKey: string | undefined;
  if (stored.tripType === "round-trip") {
    const returnChoices = await getReturns(
      {
        inventoryToken: stored.inventoryToken,
        sourceSearchKey: stored.sourceSearchKey,
        outboundItineraryKey: outbound.itineraryKey,
      },
      signal,
    );
    runtime = { ...runtime, returnChoices };
    const inbound = returnChoices.find(
      (item) => item.itineraryKey === stored.selectedReturnKey,
    );
    if (!inbound)
      return {
        plan,
        runtime,
        ...(stored.selectedReturnKey ? { rejectedStage: "return" } : {}),
      };
    const returned = apply(plan, search, {
      type: "FLIGHT_RETURN_SELECTED",
      itinerary: inbound,
      sourceSearchKey: searchKey,
      expectedRevision: plan.revision,
    });
    if (!returned.ok) return { plan, runtime, rejectedStage: "return" };
    plan = returned.plan;
    selectedReturnKey = inbound.itineraryKey;
    runtime = { ...runtime, selectedReturnKey };
  }

  const fareChoices = await getFares(
    {
      inventoryToken: stored.inventoryToken,
      sourceSearchKey: stored.sourceSearchKey,
      outboundItineraryKey: outbound.itineraryKey,
      ...(selectedReturnKey ? { returnItineraryKey: selectedReturnKey } : {}),
    },
    signal,
  );
  runtime = { ...runtime, fareChoices };
  const fare = fareChoices.find(
    (item) => item.fareKey === stored.selectedFareKey,
  );
  if (!fare)
    return {
      plan,
      runtime,
      ...(stored.selectedFareKey ? { rejectedStage: "fare" } : {}),
    };
  const fared: DealsJourneyResultV2 = apply(plan, search, {
    type: "FLIGHT_FARE_SELECTED",
    fare,
    sourceSearchKey: searchKey,
    expectedRevision: plan.revision,
  });
  if (!fared.ok) return { plan, runtime, rejectedStage: "fare" };
  return {
    plan: fared.plan,
    runtime: { ...runtime, selectedFareKey: fare.fareKey },
  };
}
