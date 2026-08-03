import type { DealsPackageMode } from "./dealsSearchParams";
import { getIncludedProductList } from "./dealsSearchParams";
import type { DealsTripPlan } from "./dealsTripPlan";

export type DealsJourneyStepId = "hotel" | "flight" | "car" | "review";
export type DealsJourneyStatus = "completed" | "current" | "upcoming" | "needs-attention";
export type DealsJourneySubstate = "choose-property" | "choose-room" | "choose-outbound" | "choose-return" | "choose-car" | "review-trip";
export type DealsJourneyStep = { id: DealsJourneyStepId; status: DealsJourneyStatus; substate?: DealsJourneySubstate; summary?: string };
export type DealsJourneyProgress = { mode: DealsPackageMode; steps: DealsJourneyStep[]; currentStepIndex: number; total: number };

export const getDealsJourneyStepIds = (mode: DealsPackageMode): DealsJourneyStepId[] => [...getIncludedProductList(mode), "review"];

export function createDealsJourneyProgress(mode: DealsPackageMode, requested: Partial<Record<DealsJourneyStepId, Omit<DealsJourneyStep, "id">>> = {}): DealsJourneyProgress {
  const ids = getDealsJourneyStepIds(mode);
  const requestedCurrent = ids.find((id) => requested[id]?.status === "current");
  const currentId = requestedCurrent ?? ids.find((id) => requested[id]?.status !== "completed") ?? "review";
  const currentStepIndex = ids.indexOf(currentId);
  const steps = ids.map((id, index): DealsJourneyStep => ({
    id,
    status: requested[id]?.status ?? (index < currentStepIndex ? "completed" : index === currentStepIndex ? "current" : "upcoming"),
    ...requested[id]?.substate ? { substate: requested[id]!.substate } : {},
    ...requested[id]?.summary ? { summary: requested[id]!.summary } : {},
  }));
  return { mode, steps, currentStepIndex: currentStepIndex + 1, total: steps.length };
}

export function getHandoffReadyDealsJourneyProgress(plan: Pick<DealsTripPlan, "mode" | "hotel" | "flight" | "car">): DealsJourneyProgress {
  const statuses = Object.fromEntries(getIncludedProductList(plan.mode).map((id) => [id, { status: "completed" as const }])) as Partial<Record<DealsJourneyStepId, Omit<DealsJourneyStep, "id">>>;
  statuses.review = { status: "current", substate: "review-trip" };
  return createDealsJourneyProgress(plan.mode, statuses);
}
