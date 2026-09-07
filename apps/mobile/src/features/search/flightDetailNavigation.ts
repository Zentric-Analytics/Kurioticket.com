import type { FlightResult } from "../../api/travelApi";

type RouteValue = string | string[] | undefined;

// Only search metadata used by Flight Details is inherited. Offer snapshots are
// always supplied below so stale route state can never replace the current card.
const inheritedFlightDetailKeys = [
  "departureDate",
  "returnDate",
  "travelers",
  "adults",
  "children",
  "infants",
  "tripType",
  "origin",
  "destination",
  "from",
  "to",
  "cabin",
  "cabinClass",
  "currency",
  "legCount",
] as const;

export function buildFlightDetailParams({
  searchParams,
  result,
}: {
  searchParams: Record<string, RouteValue>;
  result: FlightResult;
}) {
  const safeSearchParams = Object.fromEntries(inheritedFlightDetailKeys.flatMap((key) => {
    const raw = searchParams[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? [[key, value]] : [];
  }));

  const legCount = Number(Array.isArray(searchParams.legCount) ? searchParams.legCount[0] : searchParams.legCount);
  if (Number.isInteger(legCount) && legCount > 0) {
    for (let index = 1; index <= legCount; index += 1) {
      for (const prefix of ["origin", "destination", "departureDate"] as const) {
        const raw = searchParams[`${prefix}${index}`];
        const value = Array.isArray(raw) ? raw[0] : raw;
        if (value) safeSearchParams[`${prefix}${index}`] = value;
      }
    }
  }

  return {
    ...safeSearchParams,
    id: result.id,
  };
}
