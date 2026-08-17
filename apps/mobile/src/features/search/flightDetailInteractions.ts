import type { FlightResult } from "../../api/travelApi";

type ShareFlight = Pick<FlightResult, "airlineName" | "originAirport" | "destinationAirport" | "departureTime">;

/** Builds useful public copy without including offer IDs or provider redirect data. */
export function flightShareMessage(result: ShareFlight, displayedFare: string) {
  const departure = new Date(result.departureTime);
  const departureText = Number.isNaN(departure.getTime())
    ? ""
    : departure.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return [
    `${result.originAirport} → ${result.destinationAirport}`,
    result.airlineName,
    departureText ? `Departs ${departureText}` : null,
    displayedFare && displayedFare !== "—" ? `Fare ${displayedFare}` : null,
  ].filter(Boolean).join(" · ");
}
