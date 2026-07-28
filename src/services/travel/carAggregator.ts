import { getCarResultsMode } from "@/lib/env";
import type { CarInventoryStatus, CarResultsMode, CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { buildDemoCarResults } from "@/services/travel/demoCarResults";

export type CarSearchResult = { results: NormalizedCarResult[]; mode: CarResultsMode; status: CarInventoryStatus; sourceLabel: string };

export async function searchCars(search: CarSearchParams): Promise<CarSearchResult> {
  const mode = getCarResultsMode();
  if (!search.pickupLocation || !search.pickupDate || !search.dropoffDate) return { results: [], mode, status: "invalid-search", sourceLabel: "" };
  if (mode === "demo") return { results: buildDemoCarResults(search), mode, status: "available", sourceLabel: "Kurioticket Demo Catalogue" };
  return { results: [], mode: "live", status: "unavailable", sourceLabel: "" };
}

export async function getCarDetails(id: string, search?: CarSearchParams) {
  if (getCarResultsMode() !== "demo" || !search) return null;
  return buildDemoCarResults(search).find((car) => car.id === id) ?? null;
}
