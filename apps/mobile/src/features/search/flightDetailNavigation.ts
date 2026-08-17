import type { FlightResult } from "../../api/travelApi";
import type { DisplayCurrencyResolution, DisplayPrice } from "../currency/displayCurrency";

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
] as const;

export function buildFlightDetailParams({
  searchParams,
  result,
  fare,
  displayCurrencyContext,
}: {
  searchParams: Record<string, RouteValue>;
  result: FlightResult;
  fare?: DisplayPrice;
  displayCurrencyContext?: DisplayCurrencyResolution;
}) {
  const safeSearchParams = Object.fromEntries(inheritedFlightDetailKeys.flatMap((key) => {
    const raw = searchParams[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ? [[key, value]] : [];
  }));

  return {
    ...safeSearchParams,
    result: JSON.stringify(result),
    ...(fare ? { displayFare: JSON.stringify(fare) } : {}),
    ...(displayCurrencyContext ? { displayCurrencyContext: JSON.stringify(displayCurrencyContext) } : {}),
  };
}
