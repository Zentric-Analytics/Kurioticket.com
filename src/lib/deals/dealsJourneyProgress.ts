import type { DealsPackageMode } from "./dealsSearchParams";
import { getIncludedProductList } from "./dealsSearchParams";
import type { DealsTripPlan } from "./dealsTripPlan";
import type { DealsJourneyStage } from "./dealsJourneyRoutes";
import { getRequiredDealsJourneyStateV2 } from "./dealsJourneyEngineV2";
import type { DealsTripPlanV2 } from "./dealsTripPlanV2";

export type DealsJourneyStepId = "hotel" | "flight" | "car" | "review";
export type DealsJourneyStatus =
  | "completed"
  | "current"
  | "upcoming"
  | "needs-attention";
export type DealsJourneySubstate =
  | "choose-property"
  | "choose-room"
  | "choose-outbound"
  | "choose-fare-brand"
  | "choose-return"
  | "choose-final-fare"
  | "verify-flight"
  | "choose-car"
  | "review-flight"
  | "review-car"
  | "review-trip";
export type DealsJourneyStep = {
  id: DealsJourneyStepId;
  status: DealsJourneyStatus;
  substate?: DealsJourneySubstate;
  summary?: string;
};
export type DealsJourneyProgress = {
  mode: DealsPackageMode;
  steps: DealsJourneyStep[];
  currentStepIndex: number;
  total: number;
};

export const getDealsJourneyStepIds = (
  mode: DealsPackageMode,
): DealsJourneyStepId[] => [...getIncludedProductList(mode), "review"];

export function createDealsJourneyProgress(
  mode: DealsPackageMode,
  requested: Partial<
    Record<DealsJourneyStepId, Omit<DealsJourneyStep, "id">>
  > = {},
): DealsJourneyProgress {
  const ids = getDealsJourneyStepIds(mode);
  const requestedCurrent = ids.find(
    (id) => requested[id]?.status === "current",
  );
  const currentId =
    requestedCurrent ??
    ids.find((id) => requested[id]?.status !== "completed") ??
    ids.at(-1)!;
  const currentStepIndex = ids.indexOf(currentId);
  const steps = ids.map(
    (id, index): DealsJourneyStep => ({
      id,
      status:
        requested[id]?.status ??
        (index < currentStepIndex
          ? "completed"
          : index === currentStepIndex
            ? "current"
            : "upcoming"),
      ...(requested[id]?.substate ? { substate: requested[id]!.substate } : {}),
      ...(requested[id]?.summary ? { summary: requested[id]!.summary } : {}),
    }),
  );
  return {
    mode,
    steps,
    currentStepIndex: currentStepIndex + 1,
    total: steps.length,
  };
}

/** Product-oriented chrome derived from the same V2 plan used by the journey. */
export function getDealsJourneyProgressV2(
  plan: DealsTripPlanV2,
  now: number,
  editingCar = false,
): DealsJourneyProgress {
  const required = getRequiredDealsJourneyStateV2(plan, now);
  if (required === "hotel")
    return createDealsJourneyProgress(plan.mode, {
      hotel: { status: "current", substate: "choose-property" },
    });
  if (required === "car" || (required === "review" && editingCar))
    return createDealsJourneyProgress(plan.mode, {
      hotel: plan.hotel ? { status: "completed" } : undefined,
      flight: { status: "completed" },
      car: { status: "current", substate: "choose-car" },
    });
  if (required === "review")
    return createDealsJourneyProgress(plan.mode, {
      hotel: plan.hotel ? { status: "completed" } : undefined,
      flight: { status: "completed" },
      car: plan.car ? { status: "completed" } : undefined,
      review: { status: "current", substate: "review-trip" },
    });

  const phase = plan.flightJourney?.phase ?? "outbound";
  const substate: DealsJourneySubstate =
    phase === "brand"
      ? "choose-fare-brand"
      : phase === "return"
        ? "choose-return"
        : phase === "fare"
          ? "choose-final-fare"
          : phase === "revalidating"
            ? "verify-flight"
            : "choose-outbound";
  return createDealsJourneyProgress(plan.mode, {
    hotel: plan.hotel ? { status: "completed" } : undefined,
    flight: { status: "current", substate },
  });
}

export function getHandoffReadyDealsJourneyProgress(
  plan: Pick<DealsTripPlan, "mode" | "hotel" | "flight" | "car">,
): DealsJourneyProgress {
  const statuses = Object.fromEntries(
    getIncludedProductList(plan.mode).map((id) => [
      id,
      { status: "completed" as const },
    ]),
  ) as Partial<Record<DealsJourneyStepId, Omit<DealsJourneyStep, "id">>>;
  return createDealsJourneyProgress(plan.mode, statuses);
}

export function getGuidedDealsJourneyProgress(
  stage: DealsJourneyStage,
  mode: DealsPackageMode,
  plan: Pick<DealsTripPlan, "hotel" | "flight" | "car"> | null,
): DealsJourneyProgress {
  const currentId: DealsJourneyStepId = stage.startsWith("hotel")
    ? "hotel"
    : stage.startsWith("flight")
      ? "flight"
      : stage.startsWith("car")
        ? "car"
        : "review";
  const substate: DealsJourneySubstate =
    stage === "hotel-results"
      ? "choose-property"
      : stage === "hotel-details"
        ? "choose-room"
        : stage === "flight-results"
          ? "choose-outbound"
          : stage === "flight-details"
            ? "review-flight"
            : stage === "car-results"
              ? "choose-car"
              : stage === "car-details"
                ? "review-car"
                : "review-trip";
  const requested: Partial<
    Record<DealsJourneyStepId, Omit<DealsJourneyStep, "id">>
  > = {};
  for (const id of getDealsJourneyStepIds(mode)) {
    if (id === currentId) requested[id] = { status: "current", substate };
    else if (id !== "review")
      requested[id] = { status: plan?.[id] ? "completed" : "upcoming" };
  }
  return createDealsJourneyProgress(mode, requested);
}
