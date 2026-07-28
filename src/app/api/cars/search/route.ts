import { validateCarsForm, type CarsFormValues } from "@/lib/cars/carsSearchUtils";
import type { CarSearchParams } from "@/lib/cars/types";
import { searchCars } from "@/services/travel/carAggregator";

const noStore = { "Cache-Control": "no-store" };
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

function canonicalSearch(value: unknown): CarSearchParams | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const search: CarSearchParams = { pickupLocation: text(body.pickupLocation), dropoffLocation: text(body.dropoffLocation), pickupDate: text(body.pickupDate), pickupTime: text(body.pickupTime), dropoffDate: text(body.dropoffDate), dropoffTime: text(body.dropoffTime), driverAge: text(body.driverAge) };
  const values: CarsFormValues = { ...search, returnToDifferentLocation: search.dropoffLocation !== search.pickupLocation };
  const today = new Date().toISOString().slice(0, 10);
  if (Object.keys(validateCarsForm(values, today)).length) return null;
  return search;
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON request body." }, { status: 400, headers: noStore }); }
  const search = canonicalSearch(body);
  if (!search) return Response.json({ error: "Invalid car search parameters." }, { status: 400, headers: noStore });
  try {
    const { results, mode, status } = await searchCars(search);
    return Response.json({ results, mode, status }, { headers: noStore });
  } catch {
    return Response.json({ error: "Car search is temporarily unavailable." }, { status: 500, headers: noStore });
  }
}
