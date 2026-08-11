import { getRequiredDealsJourneyStateV2 } from "./dealsJourneyEngineV2";
import {
  getDealsTripPlanV2NextDeadline,
  type DealsTripPlanV2,
  type DealsV2DeadlineKind,
} from "./dealsTripPlanV2";

export type DealsReviewSnapshotV2 = {
  revision: number;
  searchFingerprint: string;
};

export type DealsReviewLifecycleOutcomeV2 =
  | { status: "stale" }
  | { status: "review-ready"; plan: DealsTripPlanV2 }
  | {
      status: "expired";
      kind: DealsV2DeadlineKind;
      plan: DealsTripPlanV2;
    };

export const buildDealsReviewSnapshotV2 = (
  plan: DealsTripPlanV2,
): DealsReviewSnapshotV2 => ({
  revision: plan.revision,
  searchFingerprint: plan.searchFingerprint,
});

export const isCurrentDealsReviewSnapshotV2 = (
  currentPlan: DealsTripPlanV2,
  snapshot: DealsReviewSnapshotV2,
) =>
  currentPlan.revision === snapshot.revision &&
  currentPlan.searchFingerprint === snapshot.searchFingerprint;

/** Evaluates a delayed Review action solely against canonical current state. */
export function evaluateDealsReviewLifecycleV2(
  currentPlan: DealsTripPlanV2,
  snapshot: DealsReviewSnapshotV2,
  now: number,
): DealsReviewLifecycleOutcomeV2 {
  if (!isCurrentDealsReviewSnapshotV2(currentPlan, snapshot))
    return { status: "stale" };
  if (currentPlan.expiresAt <= now)
    return { status: "expired", kind: "plan", plan: currentPlan };

  const deadline = getDealsTripPlanV2NextDeadline(currentPlan);
  if (deadline.expiresAt <= now)
    return { status: "expired", kind: deadline.kind, plan: currentPlan };

  const required = getRequiredDealsJourneyStateV2(currentPlan, now);
  if (required === "hotel")
    return { status: "expired", kind: "hotel", plan: currentPlan };
  if (required.startsWith("flight"))
    return { status: "expired", kind: "flight-offer", plan: currentPlan };
  if (required === "car")
    return { status: "expired", kind: "car", plan: currentPlan };
  return { status: "review-ready", plan: currentPlan };
}
