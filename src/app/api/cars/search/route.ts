import { after } from "next/server";
import { resolveSearchRequestId } from "@/lib/search-journey";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";
import { logSearchHistory, trackAnalyticsEvent } from "@/services/analyticsService";
import { validateCarsForm, type CarsFormValues } from "@/lib/cars/carsSearchUtils";
import type { LocationBoundCarSearchParams } from "@/lib/cars/types";
import { searchCars } from "@/services/travel/carAggregator";
import { classifyCars } from "@/lib/travel/searchContract";
import { isFeatureEnabled } from "@/lib/feature-controls/service";
import { getKayakClientIp } from "@/lib/kayak-client-ip";
import { searchLocationSchema } from "@/lib/locations/searchTargetSchema";

const noStore = { "Cache-Control": "no-store" };
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

function canonicalSearch(value: unknown): LocationBoundCarSearchParams | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const pickupTarget = searchLocationSchema.safeParse(body.pickupLocationTarget);
  const dropoffTarget = searchLocationSchema.safeParse(body.dropoffLocationTarget);
  const search: LocationBoundCarSearchParams = { pickupLocation: text(body.pickupLocation), dropoffLocation: text(body.dropoffLocation), pickupDate: text(body.pickupDate), pickupTime: text(body.pickupTime), dropoffDate: text(body.dropoffDate), dropoffTime: text(body.dropoffTime), driverAge: text(body.driverAge), ...(pickupTarget.success ? { pickupLocationTarget: pickupTarget.data } : {}), ...(dropoffTarget.success ? { dropoffLocationTarget: dropoffTarget.data } : {}) };
  const values: CarsFormValues = {
    pickupLocation: search.pickupLocation,
    pickupDate: search.pickupDate,
    pickupTime: search.pickupTime,
    dropoffDate: search.dropoffDate,
    dropoffTime: search.dropoffTime,
    driverAge: search.driverAge,
    returnToDifferentLocation:
      search.dropoffLocation !== search.pickupLocation,
    dropoffLocation: search.dropoffLocation,
  };
  const today = new Date().toISOString().slice(0, 10);
  if (Object.keys(validateCarsForm(values, today)).length) return null;
  return search;
}

export async function POST(request: Request) {
  const requestId = resolveSearchRequestId(request.headers.get("x-search-request-id"));
  if (!(await isFeatureEnabled("CAR_SEARCH_ENABLED"))) return Response.json({ error: "Car search is temporarily unavailable.", code: "FEATURE_DISABLED", results: [], status: "unavailable", requestId }, { status: 503, headers: noStore });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON request body.", requestId }, { status: 400, headers: noStore }); }
  const search = canonicalSearch(body);
  if (!search) return Response.json({ error: "Invalid car search parameters.", requestId }, { status: 400, headers: noStore });
  const started = performance.now();
  const recordSearch = (resultCount: number, status: "SUCCESS" | "FAILED") => {
    after(async () => {
      try {
        const { userId, visitorId } = await resolveRequestActivityIdentity(request);
        await Promise.all([
          logSearchHistory({
            userId, visitorId, requestId, type: "CAR",
            origin: search.pickupLocation, destination: search.dropoffLocation,
            query: search, resultCount, latencyMs: Math.max(0, Math.round(performance.now() - started)), status,
          }),
          trackAnalyticsEvent({
            userId, visitorId, type: "SEARCH", name: "car_search",
            metadata: { resultCount },
          }),
        ]);
      } catch {
        // Optional analytics cannot affect results or disclose search criteria.
      }
    });
  };
  try {
    const { results, status, warnings, unsupported } = await searchCars(search, { requestId, kayak: { clientIp: getKayakClientIp(request), userAgent: request.headers.get("user-agent") || undefined, signal: request.signal } });
    const response = classifyCars(results, search, requestId, warnings);
    if (unsupported) return Response.json({ ...response, code: "SEARCH_UNSUPPORTED", error: "The available providers cannot search these rental options. Please change your search." }, { status: 422, headers: noStore });
    if (status === "unavailable") {
      recordSearch(0, "FAILED");
      return Response.json({ ...response, error: "Car search is temporarily unavailable." }, { status: 503, headers: noStore });
    }
    recordSearch(results.length, "SUCCESS");
    return Response.json(response, { headers: noStore });
  } catch {
    recordSearch(0, "FAILED");
    return Response.json({ error: "Car search is temporarily unavailable.", requestId }, { status: 500, headers: noStore });
  }
}
