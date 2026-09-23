import type { FlightDetailsDeal, FlightDetailsFareChoice } from "./flightDetailsContract";

export function nativeFlightDealSelection(
  currentOfferId: string | null,
  choice: FlightDetailsFareChoice,
): FlightDetailsDeal | null {
  return choice.deals.find(({ offerId }) => offerId === currentOfferId)
    ?? choice.deals.find(({ offerId }) => offerId === choice.offer.id)
    ?? (choice.deals.length === 1 ? choice.deals[0] : null);
}
