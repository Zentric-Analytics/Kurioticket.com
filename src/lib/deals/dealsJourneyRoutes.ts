import {
  buildDealsResultsUrl,
  serializeDealsSearchParams,
  type DealsPackageMode,
  type DealsSearch,
} from "./dealsSearchParams";
import {
  isDealsTripPlanExpired,
  isDealsTripPlanProductExpired,
  type DealsTripPlan,
} from "./dealsTripPlan";
import {
  getGuidedDealsPrerequisites,
  getGuidedDealsProductOrder,
} from "./dealsGuidedJourneyOrder";

export const dealsJourneyStages = [
  "hotel-results",
  "hotel-details",
  "flight-results",
  "flight-details",
  "car-results",
  "car-details",
  "review",
] as const;
export type DealsJourneyStage = (typeof dealsJourneyStages)[number];

const getStagesForMode = (mode: DealsPackageMode): DealsJourneyStage[] =>
  getGuidedDealsProductOrder(mode).flatMap((product) =>
    product === "hotel"
      ? (["hotel-results", "hotel-details"] as DealsJourneyStage[])
      : ([`${product}-results`] as DealsJourneyStage[]),
  );
const stagesByMode: Record<DealsPackageMode, readonly DealsJourneyStage[]> = {
  "hotel-flight": getStagesForMode("hotel-flight"),
  "flight-car": getStagesForMode("flight-car"),
  "hotel-car": getStagesForMode("hotel-car"),
  "hotel-flight-car": getStagesForMode("hotel-flight-car"),
};

export const isDealsJourneyStage = (
  value: unknown,
): value is DealsJourneyStage =>
  typeof value === "string" &&
  dealsJourneyStages.includes(value as DealsJourneyStage);
export const getDealsJourneyStages = (mode: DealsPackageMode) => [
  ...stagesByMode[mode],
];
export const getFirstDealsJourneyStage = (mode: DealsPackageMode) =>
  stagesByMode[mode][0];
export const isStageInDealsMode = (
  stage: DealsJourneyStage,
  mode: DealsPackageMode,
) => stagesByMode[mode].includes(stage);
export const getPreviousDealsJourneyStage = (
  stage: DealsJourneyStage,
  mode: DealsPackageMode,
) => {
  const index = stagesByMode[mode].indexOf(stage);
  return index > 0 ? stagesByMode[mode][index - 1] : null;
};
export const getNextDealsJourneyStage = (
  stage: DealsJourneyStage,
  mode: DealsPackageMode,
) => {
  const stages = stagesByMode[mode],
    index = stages.indexOf(stage);
  return index >= 0 ? (stages[index + 1] ?? null) : null;
};

export function buildDealsJourneyUrl(
  stage: DealsJourneyStage,
  search: DealsSearch,
): string {
  if (stage !== "review" && !isStageInDealsMode(stage, search.mode))
    throw new TypeError("Stage is not part of this Deals mode");
  return `/packages/journey/${stage}?${serializeDealsSearchParams(search).toString()}`;
}

const MAX_DEALS_JOURNEY_PRODUCT_ID_LENGTH = 256;

function normalizeDealsJourneyProductId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > MAX_DEALS_JOURNEY_PRODUCT_ID_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  )
    return null;
  return normalized;
}

export function normalizeDealsJourneyHotelId(value: unknown): string | null {
  return normalizeDealsJourneyProductId(value);
}
export function normalizeDealsJourneyFlightId(value: unknown): string | null {
  return normalizeDealsJourneyProductId(value);
}
export function normalizeDealsJourneyCarId(value: unknown): string | null {
  return normalizeDealsJourneyProductId(value);
}

export function buildDealsHotelDetailsJourneyUrl(
  search: DealsSearch,
  hotelId: unknown,
): string | null {
  const normalizedHotelId = normalizeDealsJourneyHotelId(hotelId);
  if (!normalizedHotelId || !isStageInDealsMode("hotel-details", search.mode))
    return null;
  const params = serializeDealsSearchParams(search);
  params.set("hotelId", normalizedHotelId);
  return `/packages/journey/hotel-details?${params.toString()}`;
}
export function buildDealsCarDetailsJourneyUrl(
  search: DealsSearch,
  carId: unknown,
): string | null {
  const normalizedCarId = normalizeDealsJourneyCarId(carId);
  if (!normalizedCarId || !isStageInDealsMode("car-details", search.mode))
    return null;
  const params = serializeDealsSearchParams(search);
  params.append("carId", normalizedCarId);
  return `/packages/journey/car-details?${params.toString()}`;
}
export const buildLegacyDealsResultsUrl = (search: DealsSearch) =>
  buildDealsResultsUrl(search);

export function validateDealsJourneyUrl(value: unknown): string | null {
  const canonicalValue =
    typeof value === "string" && value.startsWith("/deals/journey/")
      ? value.replace("/deals/journey/", "/packages/journey/")
      : value;
  if (
    typeof canonicalValue !== "string" ||
    !canonicalValue.startsWith("/packages/journey/") ||
    canonicalValue.startsWith("//") ||
    canonicalValue.includes("\\") ||
    canonicalValue.includes("#")
  )
    return null;
  try {
    decodeURIComponent(canonicalValue);
    const url = new URL(canonicalValue, "https://kurioticket.invalid");
    const match = /^\/packages\/journey\/([^/]+)$/.exec(url.pathname);
    return url.origin === "https://kurioticket.invalid" &&
      match &&
      isDealsJourneyStage(match[1])
      ? `${url.pathname}${url.search}`
      : null;
  } catch {
    return null;
  }
}

const has = (
  plan: Pick<DealsTripPlan, "hotel" | "flight" | "car"> | null,
  product: "hotel" | "flight" | "car",
) => Boolean(plan?.[product]);

export function getEarliestIncompleteDealsJourneyStage(
  mode: DealsPackageMode,
  plan: Pick<DealsTripPlan, "hotel" | "flight" | "car"> | null,
): DealsJourneyStage {
  for (const product of getGuidedDealsProductOrder(mode))
    if (!has(plan, product)) return `${product}-results`;
  return "review";
}

export function getRequiredDealsJourneyStage(
  stage: DealsJourneyStage,
  mode: DealsPackageMode,
  plan: Pick<DealsTripPlan, "hotel" | "flight" | "car"> | null,
  transientHotelId?: unknown,
  _transientFlightId?: unknown,
  _transientCarId?: unknown,
): DealsJourneyStage {
  void _transientFlightId;
  void _transientCarId;
  if (stage === "review")
    return getEarliestIncompleteDealsJourneyStage(mode, plan);
  // Historical guided Flight Details URLs belong to the retired two-stage
  // journey. Always return them to the canonical Flight V2 entry point.
  if (stage === "flight-details")
    return getRequiredDealsJourneyStage("flight-results", mode, plan);
  if (stage === "car-details")
    return getRequiredDealsJourneyStage("car-results", mode, plan);
  if (!isStageInDealsMode(stage, mode)) return getFirstDealsJourneyStage(mode);
  const product = stage.startsWith("hotel")
    ? "hotel"
    : stage.startsWith("flight")
      ? "flight"
      : "car";
  for (const prerequisite of getGuidedDealsPrerequisites(mode, product))
    if (!has(plan, prerequisite)) return `${prerequisite}-results`;
  if (stage === "hotel-details")
    return has(plan, "hotel") || normalizeDealsJourneyHotelId(transientHotelId)
      ? stage
      : "hotel-results";
  return stage;
}

export function getRequiredDealsJourneyStageAt(
  requestedStage: DealsJourneyStage,
  mode: DealsPackageMode,
  plan: DealsTripPlan | null,
  ids: {
    hotelId: string | null;
    carId: string | null;
  },
  now: number,
): DealsJourneyStage {
  const completeness = getRequiredDealsJourneyStage(
    requestedStage,
    mode,
    plan,
    ids.hotelId,
    null,
    ids.carId,
  );
  if (completeness !== requestedStage || !plan) return completeness;
  if (isDealsTripPlanExpired(plan, now)) return getFirstDealsJourneyStage(mode);
  for (const product of getGuidedDealsProductOrder(mode)) {
    const selection = plan[product];
    if (
      selection &&
      isDealsTripPlanProductExpired(selection.resultReceivedAt, now)
    )
      return `${product}-results`;
  }
  return requestedStage;
}
