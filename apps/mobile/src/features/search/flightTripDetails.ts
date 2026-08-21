import type { FlightResult } from "../../api/travelApi";

export type FlightTripDetail = { label: string; value: string };

const joinedTerms = (result: FlightResult, category: "change" | "refund") =>
  result.fareTerms
    ?.filter((term) => term.category === category && term.text.trim())
    .map((term) => term.text.trim())
    .join(". ");

function seatSelection(result: FlightResult) {
  const conditions = result.providerDetails?.conditions?.filter(
    (condition) => condition.category === "advance-seat-selection",
  );
  if (!conditions?.length || conditions.some(({ state }) => state === "unknown"))
    return "Information unavailable";
  if (conditions.every(({ state }) => state === "allowed")) return "Available";
  if (conditions.every(({ state }) => state === "not-allowed")) return "Unavailable";
  return "Availability varies by flight";
}

/** Uses only normalized provider-authored facts; baggageInfo is a generic allowance. */
export function flightTripDetails(result: FlightResult): FlightTripDetail[] {
  return [
    { label: "Baggage", value: result.baggageInfo?.trim() || "Information unavailable" },
    { label: "Seat selection", value: seatSelection(result) },
    { label: "Changes", value: joinedTerms(result, "change") || "Fare rules apply" },
    { label: "Cancellation", value: joinedTerms(result, "refund") || result.refundInfo?.trim() || "Provider rules apply" },
  ];
}
