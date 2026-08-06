import {
  buildDealsResultsUrl,
  getIncludedProducts,
  serializeDealsSearchParams,
  type DealsPackageMode,
  type DealsSearch,
} from "./dealsSearchParams";
import { isDealsTripPlanExpired, isDealsTripPlanProductExpired, type DealsTripPlan } from "./dealsTripPlan";

export const dealsJourneyStages = [
  "hotel-results", "hotel-details", "flight-results", "flight-details",
  "car-results", "car-details", "review",
] as const;
export type DealsJourneyStage = (typeof dealsJourneyStages)[number];

const stagesByMode: Record<DealsPackageMode, readonly DealsJourneyStage[]> = {
  "hotel-flight": ["hotel-results", "hotel-details", "flight-results", "flight-details", "review"],
  "hotel-flight-car": dealsJourneyStages,
  "hotel-car": ["hotel-results", "hotel-details", "car-results", "car-details", "review"],
  "flight-car": ["flight-results", "flight-details", "car-results", "car-details", "review"],
};

export const isDealsJourneyStage = (value: unknown): value is DealsJourneyStage =>
  typeof value === "string" && dealsJourneyStages.includes(value as DealsJourneyStage);
export const getDealsJourneyStages = (mode: DealsPackageMode) => [...stagesByMode[mode]];
export const getFirstDealsJourneyStage = (mode: DealsPackageMode) => stagesByMode[mode][0];
export const isStageInDealsMode = (stage: DealsJourneyStage, mode: DealsPackageMode) => stagesByMode[mode].includes(stage);
export const getPreviousDealsJourneyStage = (stage: DealsJourneyStage, mode: DealsPackageMode) => {
  const index = stagesByMode[mode].indexOf(stage); return index > 0 ? stagesByMode[mode][index - 1] : null;
};
export const getNextDealsJourneyStage = (stage: DealsJourneyStage, mode: DealsPackageMode) => {
  const stages = stagesByMode[mode], index = stages.indexOf(stage); return index >= 0 ? stages[index + 1] ?? null : null;
};

export function buildDealsJourneyUrl(stage: DealsJourneyStage, search: DealsSearch): string {
  if (!isStageInDealsMode(stage, search.mode)) throw new TypeError("Stage is not part of this Deals mode");
  return `/deals/journey/${stage}?${serializeDealsSearchParams(search).toString()}`;
}

const MAX_DEALS_JOURNEY_PRODUCT_ID_LENGTH = 256;

function normalizeDealsJourneyProductId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_DEALS_JOURNEY_PRODUCT_ID_LENGTH || /[\u0000-\u001f\u007f]/.test(normalized)) return null;
  return normalized;
}

export function normalizeDealsJourneyHotelId(value: unknown): string | null { return normalizeDealsJourneyProductId(value); }
export function normalizeDealsJourneyFlightId(value: unknown): string | null { return normalizeDealsJourneyProductId(value); }
export function normalizeDealsJourneyCarId(value: unknown): string | null { return normalizeDealsJourneyProductId(value); }

export function buildDealsHotelDetailsJourneyUrl(search: DealsSearch, hotelId: unknown): string | null {
  const normalizedHotelId = normalizeDealsJourneyHotelId(hotelId);
  if (!normalizedHotelId || !isStageInDealsMode("hotel-details", search.mode)) return null;
  const params = serializeDealsSearchParams(search);
  params.set("hotelId", normalizedHotelId);
  return `/deals/journey/hotel-details?${params.toString()}`;
}
export function buildDealsCarDetailsJourneyUrl(search: DealsSearch, carId: unknown): string | null {
  const normalizedCarId = normalizeDealsJourneyCarId(carId);
  if (!normalizedCarId || !isStageInDealsMode("car-details", search.mode)) return null;
  const params = serializeDealsSearchParams(search);
  params.append("carId", normalizedCarId);
  return `/deals/journey/car-details?${params.toString()}`;
}
export const buildLegacyDealsResultsUrl = (search: DealsSearch) => buildDealsResultsUrl(search);

export function validateDealsJourneyUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/deals/journey/") || value.startsWith("//") || value.includes("\\") || value.includes("#")) return null;
  try {
    decodeURIComponent(value);
    const url = new URL(value, "https://kurioticket.invalid");
    const match = /^\/deals\/journey\/([^/]+)$/.exec(url.pathname);
    return url.origin === "https://kurioticket.invalid" && match && isDealsJourneyStage(match[1]) ? `${url.pathname}${url.search}` : null;
  } catch { return null; }
}

const has = (plan: Pick<DealsTripPlan, "hotel" | "flight" | "car"> | null, product: "hotel" | "flight" | "car") => Boolean(plan?.[product]);

export function getEarliestIncompleteDealsJourneyStage(mode: DealsPackageMode, plan: Pick<DealsTripPlan, "hotel" | "flight" | "car"> | null): DealsJourneyStage {
  const included = getIncludedProducts(mode);
  if (included.hotel && !has(plan, "hotel")) return "hotel-results";
  if (included.flight && !has(plan, "flight")) return "flight-results";
  if (included.car && !has(plan, "car")) return "car-results";
  return "review";
}

export function getRequiredDealsJourneyStage(stage: DealsJourneyStage, mode: DealsPackageMode, plan: Pick<DealsTripPlan, "hotel" | "flight" | "car"> | null, transientHotelId?: unknown, transientFlightId?: unknown, transientCarId?: unknown): DealsJourneyStage {
  if (!isStageInDealsMode(stage, mode)) return getFirstDealsJourneyStage(mode);
  const included = getIncludedProducts(mode);
  if (stage === "hotel-results") return "hotel-results";
  if (stage === "hotel-details") return has(plan, "hotel") || normalizeDealsJourneyHotelId(transientHotelId) ? stage : "hotel-results";
  if (included.hotel && !has(plan, "hotel")) return "hotel-results";
  if (stage === "flight-results") return stage;
  if (stage === "flight-details") return has(plan, "flight") || normalizeDealsJourneyFlightId(transientFlightId) ? stage : "flight-results";
  if (included.flight && !has(plan, "flight")) return "flight-results";
  if (stage === "car-results") return stage;
  if (stage === "car-details") return has(plan, "car") || normalizeDealsJourneyCarId(transientCarId) ? stage : "car-results";
  if (included.car && !has(plan, "car")) return "car-results";
  return stage;
}

export function getRequiredDealsJourneyStageAt(requestedStage: DealsJourneyStage, mode: DealsPackageMode, plan: DealsTripPlan | null, ids: { hotelId: string | null; flightId: string | null; carId: string | null }, now: number): DealsJourneyStage {
  const completeness = getRequiredDealsJourneyStage(requestedStage, mode, plan, ids.hotelId, ids.flightId, ids.carId);
  if (completeness !== requestedStage || !plan) return completeness;
  if (isDealsTripPlanExpired(plan, now)) return getFirstDealsJourneyStage(mode);
  if (requestedStage === "review") return requestedStage;
  const included = getIncludedProducts(mode);
  if (included.hotel && plan.hotel && isDealsTripPlanProductExpired(plan.hotel.resultReceivedAt, now)) return "hotel-results";
  if (included.flight && plan.flight && isDealsTripPlanProductExpired(plan.flight.resultReceivedAt, now)) return "flight-results";
  if (included.car && plan.car && isDealsTripPlanProductExpired(plan.car.resultReceivedAt, now)) return "car-results";
  return requestedStage;
}
