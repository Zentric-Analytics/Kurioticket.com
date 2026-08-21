import type { FlightResult } from "../../api/travelApi";

export type FlightTripDetailIcon = "baggage" | "seat" | "changes" | "cancellation";
export type FlightTripDetailLeg = { label: "Outbound" | "Return"; value: string };
export type FlightTripDetail = {
  label: string;
  icon: FlightTripDetailIcon;
  value?: string;
  legs?: FlightTripDetailLeg[];
};

type FareTermCategory = "baggage" | "change" | "refund";

const termsFor = (result: FlightResult, category: FareTermCategory) =>
  result.fareTerms?.filter(
    (term) => term.category === category && term.text.trim(),
  ) ?? [];

const joinedTerms = (result: FlightResult, category: FareTermCategory) =>
  termsFor(result, category)
    .map((term) => term.text.trim())
    .join(". ");

function legTerms(result: FlightResult, category: FareTermCategory) {
  const terms = termsFor(result, category);
  const legs: FlightTripDetailLeg[] = (["outbound", "return"] as const).flatMap((direction) => {
    const value = terms
      .filter((term) => term.legDirection === direction)
      .map((term) => term.text.trim())
      .join(". ");
    return value
      ? [{ label: direction === "outbound" ? "Outbound" as const : "Return" as const, value }]
      : [];
  });

  // A partial or mixed set of scoped terms should retain the existing generic
  // presentation rather than implying that provider data covers both legs.
  return legs.length === 2 && terms.every((term) => term.legDirection)
    ? legs
    : undefined;
}

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

/** Uses only normalized provider-authored facts and existing truthful fallbacks. */
export function flightTripDetails(result: FlightResult): FlightTripDetail[] {
  const baggageLegs = legTerms(result, "baggage");
  const changeLegs = legTerms(result, "change");
  const cancellationLegs = legTerms(result, "refund");

  return [
    baggageLegs
      ? { label: "Baggage", icon: "baggage", legs: baggageLegs }
      : { label: "Baggage", icon: "baggage", value: result.baggageInfo?.trim() || "Information unavailable" },
    { label: "Seat selection", icon: "seat", value: seatSelection(result) },
    changeLegs
      ? { label: "Changes", icon: "changes", legs: changeLegs }
      : { label: "Changes", icon: "changes", value: joinedTerms(result, "change") || "Fare rules apply" },
    cancellationLegs
      ? { label: "Cancellation", icon: "cancellation", legs: cancellationLegs }
      : { label: "Cancellation", icon: "cancellation", value: joinedTerms(result, "refund") || result.refundInfo?.trim() || "Provider rules apply" },
  ];
}
