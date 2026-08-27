import type { FlightResult } from "../../api/travelApi";
import { firstFlightParam, normalizeCabin, type RouteValue } from "../flow/flightSearchModel";
import { FLIGHT_TRIP_TYPE_LABELS } from "../flow/flightTripTypeLabels";
import { flightTravelerCount } from "./flightPriceBasis";

type HeaderFlight = Pick<FlightResult, "originAirport" | "destinationAirport" | "cabinClass">;

const shortDate = (value: string) => value
  ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  : "";

export function flightDetailHeaderModel(result: HeaderFlight, params: Record<string, RouteValue>) {
  const oneWay = firstFlightParam(params.tripType) === "one-way";
  const departureDate = firstFlightParam(params.departureDate);
  const returnDate = firstFlightParam(params.returnDate);
  const travelerCount = flightTravelerCount(params);
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
