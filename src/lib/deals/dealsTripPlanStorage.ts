import { dealsPackageModes } from "./dealsSearchParams";
import {
  DEALS_TRIP_PLAN_TTL_MS,
  isDealsTripPlanExpired,
  validateDealsInternalPath,
  type DealsTripPlan,
  type DealsTripPlanFlight,
  type DealsTripPlanHotel,
  type DealsTripPlanCar,
  validateDealsCarDetailsPath,
  validateDealsProductDetailsPath,
} from "./dealsTripPlan";

export const DEALS_TRIP_PLAN_STORAGE_KEY = "kurioticket_deals_trip_plan_v1";

export type DealsTripPlanReadResult =
  | { status: "valid"; plan: DealsTripPlan }
  | { status: "expired"; plan: DealsTripPlan }
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "fingerprint_mismatch" }
  | { status: "storage_unavailable" };

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const requiredText = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const optionalText = (value: unknown): string | undefined | null => value === undefined ? undefined : requiredText(value);
const timestamp = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const finitePrice = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;

function canonicalFlight(value: unknown, updatedAt: number): DealsTripPlanFlight | null {
  if (!record(value) || !timestamp(value.resultReceivedAt) || value.resultReceivedAt > updatedAt || !finitePrice(value.sourcePrice)) return null;
  const id = requiredText(value.id), provider = requiredText(value.provider), airline = requiredText(value.airline);
  const origin = requiredText(value.origin), destination = requiredText(value.destination), departure = requiredText(value.departure);
  const arrival = requiredText(value.arrival), duration = requiredText(value.duration), sourceCurrency = requiredText(value.sourceCurrency);
  const flightNumber = optionalText(value.flightNumber);
  if (!id || !provider || !airline || !origin || !destination || !departure || !arrival || !duration || !sourceCurrency || flightNumber === null) return null;
  const detailsPath = value.detailsPath === undefined ? undefined : validateDealsProductDetailsPath(value.detailsPath, "flight", id);
  if (value.detailsPath !== undefined && !detailsPath) return null;
  return { id, provider, airline, ...(flightNumber ? { flightNumber } : {}), origin, destination, departure, arrival, duration, sourcePrice: value.sourcePrice, sourceCurrency, resultReceivedAt: value.resultReceivedAt, ...(detailsPath ? { detailsPath } : {}) };
}

function canonicalHotel(value: unknown, updatedAt: number): DealsTripPlanHotel | null {
  if (!record(value) || !timestamp(value.resultReceivedAt) || value.resultReceivedAt > updatedAt || !finitePrice(value.sourcePrice)) return null;
  const id = requiredText(value.id), provider = requiredText(value.provider), name = requiredText(value.name), location = requiredText(value.location);
  const checkIn = requiredText(value.checkIn), checkOut = requiredText(value.checkOut), sourceCurrency = requiredText(value.sourceCurrency);
  const roomType = optionalText(value.roomType);
  if (!id || !provider || !name || !location || !checkIn || !checkOut || !sourceCurrency || roomType === null) return null;
  const detailsPath = value.detailsPath === undefined ? undefined : validateDealsProductDetailsPath(value.detailsPath, "hotel", id);
  if (value.detailsPath !== undefined && !detailsPath) return null;
  return { id, provider, name, location, checkIn, checkOut, ...(roomType ? { roomType } : {}), sourcePrice: value.sourcePrice, sourceCurrency, resultReceivedAt: value.resultReceivedAt, ...(detailsPath ? { detailsPath } : {}) };
}

function canonicalCar(value: unknown, updatedAt: number): DealsTripPlanCar | null {
  if (!record(value) || !timestamp(value.resultReceivedAt) || value.resultReceivedAt > updatedAt || !finitePrice(value.sourcePrice)) return null;
  const keys = ["id", "provider", "rentalCompany", "modelName", "categoryLabel", "pickupLocation", "returnLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "sourceCurrency"] as const;
  const values = Object.fromEntries(keys.map(key => [key, requiredText(value[key])]));
  const detailsPath = validateDealsCarDetailsPath(value.detailsPath);
  if (Object.values(values).some(item => !item) || !detailsPath) return null;
  return { ...(values as Record<typeof keys[number], string>), sourcePrice: value.sourcePrice, sourceCurrency: values.sourceCurrency!, resultReceivedAt: value.resultReceivedAt, detailsPath };
}

export function canonicalizeDealsTripPlan(value: unknown): DealsTripPlan | null {
  if (!record(value) || value.version !== 1 || !dealsPackageModes.includes(value.mode as never)) return null;
  const searchFingerprint = requiredText(value.searchFingerprint);
  const resultsPath = validateDealsInternalPath(value.resultsPath);
  if (!searchFingerprint || !resultsPath || !timestamp(value.createdAt) || !timestamp(value.updatedAt) || !timestamp(value.expiresAt) || !record(value.opened)) return null;
  const { createdAt, updatedAt, expiresAt } = value;
  if (updatedAt < createdAt || expiresAt <= createdAt || expiresAt > createdAt + DEALS_TRIP_PLAN_TTL_MS) return null;
  const carsResultsPath = value.carsResultsPath === undefined ? undefined : validateDealsInternalPath(value.carsResultsPath, "/cars/results");
  if (value.carsResultsPath !== undefined && !carsResultsPath) return null;
  const flight = value.flight === undefined ? undefined : canonicalFlight(value.flight, updatedAt);
  const hotel = value.hotel === undefined ? undefined : canonicalHotel(value.hotel, updatedAt);
  const car = value.car === undefined ? undefined : canonicalCar(value.car, updatedAt);
  if (flight === null || hotel === null || car === null) return null;
  const opened: DealsTripPlan["opened"] = {};
  for (const product of ["flight", "hotel", "car"] as const) {
    const openedAt = value.opened[product];
    if (openedAt !== undefined && (!timestamp(openedAt) || openedAt < createdAt || openedAt > updatedAt)) return null;
    if (openedAt !== undefined) opened[product] = openedAt;
  }
  return { version: 1, mode: value.mode as DealsTripPlan["mode"], searchFingerprint, resultsPath, ...(carsResultsPath ? { carsResultsPath } : {}), createdAt, updatedAt, expiresAt, ...(flight ? { flight } : {}), ...(hotel ? { hotel } : {}), ...(car ? { car } : {}), opened };
}

export function parseDealsTripPlan(raw: string | null): DealsTripPlan | null {
  if (raw === null) return null;
  try { return canonicalizeDealsTripPlan(JSON.parse(raw)); } catch { return null; }
}

export function serializeDealsTripPlan(plan: DealsTripPlan): string {
  const canonical = canonicalizeDealsTripPlan(plan);
  if (!canonical) throw new TypeError("Invalid Deals trip plan");
  return JSON.stringify(canonical);
}

function browserStorage(): StorageLike | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

function safelyRemove(storage: StorageLike): boolean {
  try { storage.removeItem(DEALS_TRIP_PLAN_STORAGE_KEY); return true; } catch { return false; }
}

export function readDealsTripPlan(fingerprint?: string, now = Date.now(), providedStorage?: StorageLike | null): DealsTripPlanReadResult {
  const storage = providedStorage === undefined ? browserStorage() : providedStorage;
  if (!storage) return { status: "storage_unavailable" };
  let raw: string | null;
  try { raw = storage.getItem(DEALS_TRIP_PLAN_STORAGE_KEY); } catch { return { status: "storage_unavailable" }; }
  if (raw === null) return { status: "missing" };
  const plan = parseDealsTripPlan(raw);
  if (!plan) { safelyRemove(storage); return { status: "invalid" }; }
  if (isDealsTripPlanExpired(plan, now)) { safelyRemove(storage); return { status: "expired", plan }; }
  if (fingerprint && plan.searchFingerprint !== fingerprint) { safelyRemove(storage); return { status: "fingerprint_mismatch" }; }
  return { status: "valid", plan };
}

export function writeDealsTripPlan(plan: DealsTripPlan, providedStorage?: StorageLike | null): boolean {
  const storage = providedStorage === undefined ? browserStorage() : providedStorage;
  if (!storage) return false;
  try { storage.setItem(DEALS_TRIP_PLAN_STORAGE_KEY, serializeDealsTripPlan(plan)); return true; } catch { return false; }
}

export function removeDealsTripPlan(providedStorage?: StorageLike | null): boolean {
  const storage = providedStorage === undefined ? browserStorage() : providedStorage;
  return storage ? safelyRemove(storage) : false;
}
