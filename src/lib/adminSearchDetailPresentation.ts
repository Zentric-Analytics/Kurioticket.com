import type { AdminSearchRead, AdminSearchDiagnostic } from "@/services/adminOperationalReadContract";

type SearchLocation = Pick<AdminSearchRead, "product" | "origin" | "destination">;

export function searchDetailProductLabel(product: AdminSearchRead["product"]) {
  return product === "FLIGHT" ? "Flight" : product === "HOTEL" ? "Hotel" : product === "CAR" ? "Car" : "Package";
}

export function searchDetailHeadline(search: SearchLocation): string {
  const { origin, destination, product } = search;
  if (product === "HOTEL") return destination || origin ? "Hotels in " + (destination || origin) : "Hotel search";
  if (origin && destination) return origin + " → " + destination;
  if (product === "CAR") return origin || destination ? "Cars in " + (origin || destination) : "Car search";
  if (destination) return (product === "FLIGHT" ? "Flights" : "Packages") + " to " + destination;
  if (origin) return (product === "FLIGHT" ? "Flights" : "Packages") + " from " + origin;
  return searchDetailProductLabel(product) + " search";
}

export function searchDetailOutcomeLabel(outcome: AdminSearchDiagnostic["outcome"]) {
  return outcome === "SUCCESS" ? "Complete"
    : outcome === "ZERO_RESULTS" ? "No results"
    : outcome === "PARTIAL" ? "Partial"
    : "Failed";
}

export function searchDetailDuration(ms: number | null) {
  return ms === null || !Number.isFinite(ms) || ms < 0 ? "—" : (ms / 1000).toFixed(1) + "s";
}

export function searchDetailIdentityLabel(kind: AdminSearchRead["identity"]["kind"]) {
  return kind === "registered" ? "Registered" : kind === "guest" ? "Guest" : "Unattributed";
}
