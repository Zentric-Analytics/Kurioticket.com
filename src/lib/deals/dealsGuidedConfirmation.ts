import { areDealsCarSelectionsMateriallyEqual } from "./dealsCarDetails";
import {
  areDealsFlightSelectionsMateriallyEqual,
  buildGuidedDealsBaseTripPlan,
} from "./dealsFlightDetails";
import { areDealsHotelSelectionsMateriallyEqual } from "./dealsHotelDetails";
import type { DealsSearch } from "./dealsSearchParams";
import {
  getGuidedDealsFirstProduct,
  getGuidedDealsPrerequisites,
} from "./dealsGuidedJourneyOrder";
import {
  isDealsTripPlanExpired,
  replaceDealsCarSelection,
  replaceDealsFlightSelection,
  replaceDealsHotelSelection,
  type DealsTripPlan,
  type DealsTripPlanCar,
  type DealsTripPlanFlight,
  type DealsTripPlanHotel,
  type DealsTripPlanProduct,
} from "./dealsTripPlan";
import type { DealsTripPlanReadResult } from "./dealsTripPlanStorage";

type Selection = DealsTripPlanHotel | DealsTripPlanFlight | DealsTripPlanCar;
export type DealsGuidedConfirmationFailure =
  | "storage-read-unavailable"
  | "plan-missing"
  | "plan-invalid"
  | "fingerprint-mismatch"
  | "mode-mismatch"
  | "plan-expired"
  | "prerequisite-missing"
  | "prerequisite-changed"
  | "persistence-failed";
export type AttemptGuidedConfirmationResult =
  | { ok: true; plan: DealsTripPlan; wrote: boolean }
  | {
      ok: false;
      failure: DealsGuidedConfirmationFailure;
      currentPlan?: DealsTripPlan;
    };

const same = (
  product: DealsTripPlanProduct,
  left: Selection | undefined,
  right: Selection | undefined,
) =>
  product === "hotel"
    ? areDealsHotelSelectionsMateriallyEqual(
        left as DealsTripPlanHotel | undefined,
        right as DealsTripPlanHotel | undefined,
      )
    : product === "flight"
      ? areDealsFlightSelectionsMateriallyEqual(
          left as DealsTripPlanFlight | undefined,
          right as DealsTripPlanFlight | undefined,
        )
      : areDealsCarSelectionsMateriallyEqual(
          left as DealsTripPlanCar | undefined,
          right as DealsTripPlanCar | undefined,
        );

export function attemptGuidedConfirmation(input: {
  product: DealsTripPlanProduct;
  selection: Selection;
  renderedPlan: DealsTripPlan | null;
  search: DealsSearch;
  fingerprint: string;
  now: number;
  read: (fingerprint: string, now: number) => DealsTripPlanReadResult;
  write: (plan: DealsTripPlan) => boolean;
}): AttemptGuidedConfirmationResult {
  const read = input.read(input.fingerprint, input.now);
  if (read.status === "storage_unavailable")
    return { ok: false, failure: "storage-read-unavailable" };
  if (read.status === "invalid") return { ok: false, failure: "plan-invalid" };
  if (read.status === "fingerprint_mismatch")
    return {
      ok: false,
      failure: "fingerprint-mismatch",
      currentPlan: read.plan,
    };
  if (read.status === "expired")
    return { ok: false, failure: "plan-expired", currentPlan: read.plan };

  const first = getGuidedDealsFirstProduct(input.search.mode);
  let current: DealsTripPlan;
  if (read.status === "missing") {
    if (input.product !== first) return { ok: false, failure: "plan-missing" };
    const created = buildGuidedDealsBaseTripPlan({
      search: input.search,
      fingerprint: input.fingerprint,
      now: input.now,
    });
    if (!created) return { ok: false, failure: "plan-invalid" };
    current = created;
  } else {
    current = read.plan;
    if (current.searchFingerprint !== input.fingerprint)
      return {
        ok: false,
        failure: "fingerprint-mismatch",
        currentPlan: current,
      };
    if (current.mode !== input.search.mode)
      return { ok: false, failure: "mode-mismatch", currentPlan: current };
    if (isDealsTripPlanExpired(current, input.now))
      return { ok: false, failure: "plan-expired", currentPlan: current };
  }

  const prerequisites = getGuidedDealsPrerequisites(
    input.search.mode,
    input.product,
  );
  for (const prerequisite of prerequisites) {
    if (!current[prerequisite] || !input.renderedPlan?.[prerequisite])
      return {
        ok: false,
        failure: "prerequisite-missing",
        currentPlan: current,
      };
    if (
      !same(
        prerequisite,
        current[prerequisite],
        input.renderedPlan[prerequisite],
      )
    )
      return {
        ok: false,
        failure: "prerequisite-changed",
        currentPlan: current,
      };
  }
  if (same(input.product, current[input.product], input.selection))
    return { ok: true, plan: current, wrote: false };
  const next =
    input.product === "hotel"
      ? replaceDealsHotelSelection(
          current,
          input.selection as DealsTripPlanHotel,
          input.now,
        )
      : input.product === "flight"
        ? replaceDealsFlightSelection(
            current,
            input.selection as DealsTripPlanFlight,
            input.now,
          )
        : replaceDealsCarSelection(
            current,
            input.selection as DealsTripPlanCar,
            input.now,
          );
  if (!input.write(next))
    return { ok: false, failure: "persistence-failed", currentPlan: current };
  return { ok: true, plan: next, wrote: true };
}
