import type { FlightFareTerm, PublicFlightResult } from "@/lib/types";

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
    tripType: "one-way" | "round-trip";
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
