import type { DealsPackageMode, DealsSearch } from "./dealsSearchParams";
import { buildDealsInternalRedirectHref } from "./dealsProviderHandoff";

export const DEALS_TRIP_PLAN_VERSION = 1 as const;
export const DEALS_TRIP_PLAN_TTL_MS = 25 * 60 * 1000;
export type DealsTripPlanProduct = "flight" | "hotel" | "car";
export type DealsTripPlanFlight = { id: string; provider: string; airline: string; flightNumber?: string; origin: string; destination: string; departure: string; arrival: string; duration: string; sourcePrice: number; sourceCurrency: string; resultReceivedAt: number };
export type DealsTripPlanHotel = { id: string; provider: string; name: string; location: string; checkIn: string; checkOut: string; roomType?: string; sourcePrice: number; sourceCurrency: string; resultReceivedAt: number };
export type DealsTripPlanCar = { id: string; provider: string; rentalCompany: string; modelName: string; categoryLabel: string; pickupLocation: string; returnLocation: string; pickupDate: string; pickupTime: string; dropoffDate: string; dropoffTime: string; sourcePrice: number; sourceCurrency: string; resultReceivedAt: number; detailsPath: string };
export type DealsTripPlan = { version: 1; mode: DealsPackageMode; searchFingerprint: string; resultsPath: string; carsResultsPath?: string; createdAt: number; updatedAt: number; expiresAt: number; flight?: DealsTripPlanFlight; hotel?: DealsTripPlanHotel; car?: DealsTripPlanCar; opened: { flight?: number; hotel?: number; car?: number } };

export function createDealsTripPlan(input: Pick<DealsTripPlan, "mode" | "searchFingerprint" | "resultsPath" | "carsResultsPath">, now = Date.now()): DealsTripPlan {
  return { version: 1, ...input, createdAt: now, updatedAt: now, expiresAt: now + DEALS_TRIP_PLAN_TTL_MS, opened: {} };
}
export function updateDealsTripPlan(plan: DealsTripPlan, patch: Partial<Pick<DealsTripPlan, "flight" | "hotel" | "car">>, now = Date.now()): DealsTripPlan { return { ...plan, ...patch, updatedAt: now, expiresAt: Math.min(plan.createdAt + DEALS_TRIP_PLAN_TTL_MS, now + DEALS_TRIP_PLAN_TTL_MS) }; }
export function clearDealsTripPlan(plan: DealsTripPlan, now = Date.now()): DealsTripPlan { const rest = { ...plan }; delete rest.flight; delete rest.hotel; delete rest.car; return { ...rest, opened: {}, updatedAt: now }; }
export function markDealsProviderOpened(plan: DealsTripPlan, product: DealsTripPlanProduct, now = Date.now()): DealsTripPlan { return { ...plan, updatedAt: now, opened: { ...plan.opened, [product]: now } }; }
export const isDealsTripPlanExpired = (plan: DealsTripPlan, now = Date.now()) => plan.expiresAt <= now;
export const isDealsTripPlanProductExpired = (receivedAt: number, now = Date.now()) => now - receivedAt >= DEALS_TRIP_PLAN_TTL_MS;

export type DealsNextProviderStep = { product: DealsTripPlanProduct | null; href: string | null; allOpened: boolean };

export function getNextDealsProviderStep(plan: DealsTripPlan, now = Date.now()): DealsNextProviderStep {
  const candidates = (["flight", "hotel", "car"] as const).filter(product => {
    const selection = plan[product];
    return selection && !isDealsTripPlanProductExpired(selection.resultReceivedAt, now);
  });
  const product = candidates.find(candidate => !plan.opened[candidate]) ?? null;
  return { product, href: product ? product === "car" ? plan.car!.detailsPath : buildDealsInternalRedirectHref(plan[product]!.id, product) : null, allOpened: candidates.length > 0 && product === null };
}

export function getDealsTripPlanReadiness(mode: DealsPackageMode, plan: Pick<DealsTripPlan, "flight" | "hotel" | "car">) {
  const missing: DealsTripPlanProduct[] = [];
  if (mode !== "hotel-car" && !plan.flight) missing.push("flight");
  if (mode !== "flight-car" && !plan.hotel) missing.push("hotel");
  if (mode !== "hotel-flight" && !plan.car) missing.push("car");
  return { ready: missing.length === 0, missing, guidanceKey: missing.length > 1 ? "deals.tripPlan.chooseMultiple" : missing[0] === "flight" ? "deals.tripPlan.chooseFlight" : missing[0] === "hotel" ? "deals.tripPlan.chooseStay" : missing[0] === "car" ? "deals.tripPlan.chooseCar" : "deals.tripPlan.continue" };
}

export function buildDealsSearchFingerprint(search: DealsSearch): string {
  const includedFlight = search.mode !== "hotel-car", includedHotel = search.mode !== "flight-car", includedCar = search.mode !== "hotel-flight";
  const ordered: Array<[string, string | number | boolean]> = [["mode", search.mode]];
  if (includedFlight) ordered.push(["fo", search.flightOriginCode], ["fd", search.flightDestinationCode], ["fdd", search.flightDepartureDate], ["frd", search.flightTripType === "round-trip" ? search.flightReturnDate : ""], ["ft", search.flightTripType], ["fa", search.flightAdults], ["fc", search.flightChildren], ["fi", search.flightInfants], ["cab", search.flightCabinClass]);
  if (includedHotel) ordered.push(["hd", search.hotelDestination.trim()], ["hi", search.hotelCheckIn], ["ho", search.hotelCheckOut], ["ha", search.hotelAdults], ["hc", search.hotelChildren], ["hr", search.hotelRooms], ["hp", search.hotelPetFriendly]);
  if (includedCar) ordered.push(["cp", search.carPickupLocation.trim()], ["cd", search.carReturnToDifferentLocation], ["cr", search.carReturnToDifferentLocation ? search.carReturnLocation.trim() : ""], ["cpd", search.carPickupDate], ["crd", search.carReturnDate], ["cpt", search.carPickupTime], ["crt", search.carReturnTime], ["ca", search.carDriverAge]);
  return ordered.map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join("&");
}

export function validateDealsInternalPath(value: unknown, allowed: "/deals/results" | "/cars/results" = "/deals/results"): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("\\") || value.includes("#")) return null;
  try { decodeURIComponent(value); const url = new URL(value, "https://kurioticket.invalid"); return url.origin === "https://kurioticket.invalid" && url.pathname === allowed ? `${url.pathname}${url.search}` : null; } catch { return null; }
}

export function validateDealsCarDetailsPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/cars/details/") || value.startsWith("//") || value.includes("\\") || value.includes("#")) return null;
  try {
    decodeURIComponent(value);
    const url = new URL(value, "https://kurioticket.invalid");
    if (url.origin !== "https://kurioticket.invalid") return null;
    const match = /^\/cars\/details\/([^/]+)$/.exec(url.pathname);
    if (!match || !decodeURIComponent(match[1]).trim() || [".", ".."].includes(decodeURIComponent(match[1]))) return null;
    const expected = ["pickupLocation", "dropoffLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge"];
    if ([...url.searchParams.keys()].some(key => !expected.includes(key)) || expected.some(key => !url.searchParams.get(key)?.trim())) return null;
    return `${url.pathname}${url.search}`;
  } catch { return null; }
}
