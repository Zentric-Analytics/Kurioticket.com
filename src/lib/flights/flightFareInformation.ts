import type { FlightCabinDetails, FlightOnboardFeature, FlightSegment } from "@/lib/types";
import type { FlightDetailsOffer } from "./flightDetailsContract";

const featureLabels: Record<FlightOnboardFeature["kind"], string> = {
  seat: "Seat", power: "Power / USB", entertainment: "Entertainment", meal: "Meal", wifi: "Wi-Fi", overnight: "Overnight flight",
};
export function flightOnboardFeatureLabel(kind: FlightOnboardFeature["kind"]) { return featureLabels[kind]; }

/** Aircraft-only provider segments still have useful Fare details without inventing a cabin. */
export function flightFareDetailCabins(offer: Pick<FlightDetailsOffer, "legs">): Array<{ segment: FlightSegment; cabin: FlightCabinDetails }> {
  return (offer.legs ?? []).flatMap(leg => leg.segments.flatMap(segment =>
    (segment.cabinDetails?.length ? segment.cabinDetails : segment.aircraft ? [{}] : []).map(cabin => ({ segment, cabin })),
  ));
}
export function flightBaggageTerms(offer: Pick<FlightDetailsOffer, "fareTerms">) { return (offer.fareTerms ?? []).filter(term => term.category === "baggage"); }
