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
  getFareBrands?: (request: {
    inventoryToken: string;
    sourceSearchKey: string;
    outboundItineraryKey: string;
  }) => Promise<NonNullable<DealsFlightRuntimeV2["fareBrandOptions"]>>;
  getBrandReturns?: (request: {
    inventoryToken: string;
    sourceSearchKey: string;
    outboundItineraryKey: string;
    brandOptionKey: string;
  }) => Promise<DealsFlightRuntimeV2["returnChoices"]>;
  getBrandFares?: (request: {
    inventoryToken: string;
    sourceSearchKey: string;
    outboundItineraryKey: string;
    brandOptionKey: string;
    returnItineraryKey: string;
  }) => Promise<DealsFlightRuntimeV2["fareChoices"]>;
};

export type RestoredDealsFlightRuntimeV2 = {
  runtime: DealsFlightRuntimeV2;
  plan: DealsTripPlanV2;
  brandState: DownstreamLoadState;
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
    fareBrandOptions: stored.version === 2 ? [] : undefined,
    selectedBrandOptionKey: undefined,
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
      brandState: "idle",
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
      brandState: "idle",
      returnState: "idle",
      fareState: "idle",
    };

  let runtime = { ...cleared, selectedOutboundKey: outbound.itineraryKey };
  let plan = outboundResult.plan;
  let brandState: DownstreamLoadState = "idle";
  let brandOptionKey: string | undefined;
  if (stored.version === 2 && stored.tripType === "round-trip") {
    if (
      !requests.getFareBrands ||
      !requests.getBrandReturns ||
      !requests.getBrandFares
    )
      return {
        runtime,
        plan,
        brandState: "idle",
        returnState: "idle",
        fareState: "idle",
      };
    const fareBrandOptions = await requests.getFareBrands({
      inventoryToken: stored.inventoryToken,
      sourceSearchKey: stored.sourceSearchKey,
      outboundItineraryKey: outbound.itineraryKey,
    });
    brandState = fareBrandOptions.length ? "success" : "empty";
    runtime = { ...runtime, fareBrandOptions };
    const option = fareBrandOptions.find(
      (candidate) => candidate.brandOptionKey === stored.selectedBrandOptionKey,
    );
    if (!option)
      return {
        runtime,
        plan: {
          ...plan,
          flightJourney: { ...plan.flightJourney!, phase: "brand" },
        },
        brandState,
        returnState: "idle",
        fareState: "idle",
      };
    const brandResult = applyDealsJourneyEventV2(plan, search, {
      type: "FLIGHT_FARE_BRAND_SELECTED",
      fareBrand: {
        brandOptionKey: option.brandOptionKey,
        fareBrandName: option.fareBrandName,
        ...(option.cabinClass ? { cabinClass: option.cabinClass } : {}),
      },
      sourceSearchKey: searchKey,
      expectedRevision: plan.revision,
    });
    if (!brandResult.ok)
      return {
        runtime,
        plan,
        brandState,
        returnState: "idle",
        fareState: "idle",
      };
    plan = brandResult.plan;
    brandOptionKey = option.brandOptionKey;
    runtime = { ...runtime, selectedBrandOptionKey: brandOptionKey };
  }
  let returnState: DownstreamLoadState = "idle";
  let returnItineraryKey: string | undefined;
  if (stored.tripType === "round-trip") {
    const returnChoices = brandOptionKey
      ? await requests.getBrandReturns!({
          inventoryToken: stored.inventoryToken,
          sourceSearchKey: stored.sourceSearchKey,
          outboundItineraryKey: outbound.itineraryKey,
          brandOptionKey,
        })
      : await requests.getReturns({
          inventoryToken: stored.inventoryToken,
          sourceSearchKey: stored.sourceSearchKey,
          outboundItineraryKey: outbound.itineraryKey,
        });
    returnState = returnChoices.length === 0 ? "empty" : "success";
    runtime = { ...runtime, returnChoices };
    const inbound = returnChoices.find(
      (choice) => choice.itineraryKey === stored.selectedReturnKey,
    );
    if (!inbound)
      return { runtime, plan, brandState, returnState, fareState: "idle" };
    const returnResult = applyDealsJourneyEventV2(plan, search, {
      type: "FLIGHT_RETURN_SELECTED",
      itinerary: inbound,
      sourceSearchKey: searchKey,
      expectedRevision: plan.revision,
    });
    if (!returnResult.ok)
      return { runtime, plan, brandState, returnState, fareState: "idle" };
    plan = returnResult.plan;
    returnItineraryKey = inbound.itineraryKey;
    runtime = { ...runtime, selectedReturnKey: returnItineraryKey };
  }

  const fares = brandOptionKey
    ? await requests.getBrandFares!({
        inventoryToken: stored.inventoryToken,
        sourceSearchKey: stored.sourceSearchKey,
        outboundItineraryKey: outbound.itineraryKey,
        brandOptionKey,
        returnItineraryKey: returnItineraryKey!,
      })
    : await requests.getFares({
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
  if (!fare) return { runtime, plan, brandState, returnState, fareState };
  const fareResult = applyDealsJourneyEventV2(plan, search, {
    type: "FLIGHT_FARE_SELECTED",
    fare,
    sourceSearchKey: searchKey,
    expectedRevision: plan.revision,
  });
  if (!fareResult.ok)
    return { runtime, plan, brandState, returnState, fareState };
  return {
    runtime: { ...runtime, selectedFareKey: fare.fareKey },
    plan: fareResult.plan,
    brandState,
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
