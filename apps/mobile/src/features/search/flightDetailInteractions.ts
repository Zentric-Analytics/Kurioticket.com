import type { FlightResult } from "../../api/travelApi";

export function flightShareMessage(result: FlightResult, displayedFare?: string) {
  const route = `${result.originAirport} → ${result.destinationAirport}`;
  const departure = new Date(result.departureTime).toLocaleString();
  return [
    route,
    result.airlineName,
    `Departs ${departure}`,
    displayedFare && displayedFare !== "—" ? `Fare ${displayedFare}` : null,
  ].filter(Boolean).join("\n");
}

export function authoritativeProviderUrl(result: FlightResult) {
  return result.partnerRedirectUrl || result.bookingUrl;
}
