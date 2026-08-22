import type { FlightResult } from "../../api/travelApi";
import { firstFlightParam, normalizeCabin, type RouteValue } from "../flow/flightSearchModel";
import { FLIGHT_TRIP_TYPE_LABELS } from "../flow/flightTripTypeLabels";

type HeaderFlight = Pick<FlightResult, "originAirport" | "destinationAirport" | "cabinClass">;

const count = (value: RouteValue) => {
  const parsed = Number(firstFlightParam(value));
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
};
const shortDate = (value: string) => value
  ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  : "";

export function flightDetailHeaderModel(result: HeaderFlight, params: Record<string, RouteValue>) {
  const oneWay = firstFlightParam(params.tripType) === "one-way";
  const departureDate = firstFlightParam(params.departureDate);
  const returnDate = firstFlightParam(params.returnDate);
  const hasPassengerBreakdown = ["adults", "children", "infants"].some((key) => firstFlightParam(params[key]));
  const travelerCount = hasPassengerBreakdown
    ? (count(params.adults) ?? 0) + (count(params.children) ?? 0) + (count(params.infants) ?? 0)
    : count(params.travelers) ?? 1;
  const canonicalCabin = normalizeCabin(firstFlightParam(params.cabin) || firstFlightParam(params.cabinClass));
  const cabin = canonicalCabin ?? normalizeCabin(result.cabinClass) ?? result.cabinClass.replace(/-/g, " ");
  const date = oneWay || !returnDate
    ? shortDate(departureDate)
    : `${shortDate(departureDate)} – ${shortDate(returnDate)}`;

  return {
    route: `${result.originAirport.toUpperCase()} ${oneWay ? "→" : "⇄"} ${result.destinationAirport.toUpperCase()}`,
    tripTypeLabel: FLIGHT_TRIP_TYPE_LABELS[oneWay ? "one-way" : "round-trip"],
    metadata: [
      date,
      `${travelerCount} ${travelerCount === 1 ? "Traveler" : "Travelers"}`,
      cabin,
    ].filter(Boolean).join(" · "),
  };
}
