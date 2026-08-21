import type { FlightFareTerm, FlightLeg, FlightSearchLeg, PublicFlightResult, TripType } from "@/lib/types";

export type FlightDetailsOffer = Omit<
  PublicFlightResult,
  "bookingUrl" | "partnerRedirectUrl"
>;

export type FlightDetailsFareChoice = {
  key: string;
  label: string;
  offer: FlightDetailsOffer;
  distinguishingTerms: FlightFareTerm[];
  selectedOffer: boolean;
  handoff: FlightDetailsHandoff;
};

export type FlightDetailsHandoff =
  | { available: true; providerName: string }
  | { available: false; providerName?: never };

export type FlightDetailsSuccess = {
  status: "available";
  flight: FlightDetailsOffer;
  fareChoices: FlightDetailsFareChoice[];
  handoff: FlightDetailsHandoff;
  revalidation: { status: "confirmed" | "changed" };
  search: {
    tripType: TripType;
    legs: FlightSearchLeg[];
    departureDate: string;
    returnDate?: string;
    adults: number;
    children: number;
    infants: number;
    travelers: number;
  };
};

export type FlightDetailsUnavailable = {
  status: "unavailable";
  error: string;
};

export type FlightDetailsResponse =
  | FlightDetailsSuccess
  | FlightDetailsUnavailable;

export function flightDetailsTotalLabel(travelerCount: number) {
  return travelerCount === 1 ? "Trip total" : `Total for ${travelerCount} travelers`;
}

export function flightDetailsRouteLabel(
  tripType: TripType,
  legs: Pick<FlightLeg, "originAirport" | "destinationAirport">[],
  fallbackOrigin: string,
  fallbackDestination: string,
) {
  if (tripType === "multi-city" && legs.length > 0) {
    let route = `${cleanRouteLocation(legs[0].originAirport)} → ${cleanRouteLocation(legs[0].destinationAirport)}`;

    for (let index = 1; index < legs.length; index += 1) {
      const previousDestination = cleanRouteLocation(legs[index - 1].destinationAirport);
      const origin = cleanRouteLocation(legs[index].originAirport);
      const destination = cleanRouteLocation(legs[index].destinationAirport);
      route += previousDestination === origin
        ? ` → ${destination}`
        : ` · ${origin} → ${destination}`;
    }

    return route;
  }

  return `${cleanRouteLocation(fallbackOrigin)} to ${cleanRouteLocation(fallbackDestination)}`;
}

function cleanRouteLocation(value: string) {
  return value.split("(")[0].split(",")[0].trim() || value;
}
