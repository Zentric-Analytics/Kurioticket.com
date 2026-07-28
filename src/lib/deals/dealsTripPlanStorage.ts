import { dealsPackageModes } from "./dealsSearchParams";
import { isDealsTripPlanExpired, validateDealsInternalPath, type DealsTripPlan } from "./dealsTripPlan";

export const DEALS_TRIP_PLAN_STORAGE_KEY = "kurioticket_deals_trip_plan_v1";
const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v));
const text = (v: unknown) => typeof v === "string" && Boolean(v.trim());
const time = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const product = (v: unknown, kind: "flight" | "hotel") => {
  if (!record(v) || !text(v.id) || !text(v.provider) || !time(v.resultReceivedAt) || !time(v.sourcePrice) || !text(v.sourceCurrency)) return false;
  return kind === "flight" ? text(v.airline) && text(v.origin) && text(v.destination) && text(v.departure) && text(v.arrival) && text(v.duration) : text(v.name) && text(v.location) && text(v.checkIn) && text(v.checkOut);
};
export function parseDealsTripPlan(raw: string | null): DealsTripPlan | null {
  try {
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (!record(v) || v.version !== 1 || !dealsPackageModes.includes(v.mode as never) || !text(v.searchFingerprint) || !validateDealsInternalPath(v.resultsPath) || !time(v.createdAt) || !time(v.updatedAt) || !time(v.expiresAt) || !record(v.opened)) return null;
    if ((v.expiresAt as number) <= (v.createdAt as number)) return null;
    if (v.carsResultsPath !== undefined && !validateDealsInternalPath(v.carsResultsPath, "/cars/results")) return null;
    if (v.flight !== undefined && !product(v.flight, "flight")) return null;
    if (v.hotel !== undefined && !product(v.hotel, "hotel")) return null;
    if ([v.opened.flight, v.opened.hotel, v.opened.car].some(x => x !== undefined && !time(x))) return null;
    return v as DealsTripPlan;
  } catch { return null; }
}
export const serializeDealsTripPlan = (plan: DealsTripPlan) => JSON.stringify(plan);
const storage = (): Storage | null => { try { return typeof window !== "undefined" && window.localStorage ? window.localStorage : null; } catch { return null; } };
export function readDealsTripPlan(fingerprint?: string, now = Date.now()): DealsTripPlan | null { const s = storage(); if (!s) return null; try { const plan = parseDealsTripPlan(s.getItem(DEALS_TRIP_PLAN_STORAGE_KEY)); if (!plan || isDealsTripPlanExpired(plan, now) || (fingerprint && plan.searchFingerprint !== fingerprint)) { s.removeItem(DEALS_TRIP_PLAN_STORAGE_KEY); return null; } return plan; } catch { return null; } }
export function writeDealsTripPlan(plan: DealsTripPlan): boolean { const s = storage(); if (!s) return false; try { s.setItem(DEALS_TRIP_PLAN_STORAGE_KEY, serializeDealsTripPlan(plan)); return true; } catch { return false; } }
export function removeDealsTripPlan(): void { try { storage()?.removeItem(DEALS_TRIP_PLAN_STORAGE_KEY); } catch { /* unavailable storage is non-fatal */ } }
