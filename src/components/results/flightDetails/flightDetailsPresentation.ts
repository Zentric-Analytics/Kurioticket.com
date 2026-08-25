import type { FlightFareTerm, FlightSegment, TripType } from "@/lib/types";

export function resolveSegmentCarrierName(
  segment: FlightSegment,
  offerAirlineName: string,
) {
  return (
    segment.airlineName?.trim() ||
    segment.marketingCarrier?.name.trim() ||
    offerAirlineName.trim()
  );
}

export function canUseOfferAirlineLogo(
  segment: FlightSegment,
  offerAirlineName: string,
  offerAirlineLogo?: string | null,
) {
  if (!offerAirlineLogo) return false;
  return (
    normalizeCarrierIdentity(
      resolveSegmentCarrierName(segment, offerAirlineName),
    ) === normalizeCarrierIdentity(offerAirlineName)
  );
}

export function compactFareTerms(terms: FlightFareTerm[], tripType: TripType) {
  return terms
    .map((term, index) => ({
      term,
      index,
      text:
        tripType === "one-way"
          ? term.text.replace(/^Outbound:\s*/i, "")
          : term.text,
    }))
    .sort((left, right) => {
      const priorityDifference =
        fareTermPriority(left.term) - fareTermPriority(right.term);
      return priorityDifference || left.index - right.index;
    })
    .slice(0, 3);
}

function normalizeCarrierIdentity(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function fareTermPriority(term: FlightFareTerm) {
  if (
    term.semantic === "negative" &&
    (term.category === "change" || term.category === "refund")
  ) {
    return 0;
  }
  if (term.semantic === "negative") return 1;
  if (term.category === "baggage") return 2;
  if (term.category === "change" || term.category === "refund") return 3;
  return 4;
}
