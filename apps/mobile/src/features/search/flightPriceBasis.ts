import type { DisplayPrice } from "../currency/displayCurrency";
import { currencyAccessibilityLabel, formatCurrency } from "../currency/displayCurrency";
import { firstFlightParam, type RouteValue } from "../flow/flightSearchModel";
import { FLIGHT_TRIP_TYPE_LABELS } from "../flow/flightTripTypeLabels";

type PriceBasisParams = Record<string, RouteValue>;

const nonNegativeInteger = (value: RouteValue) => {
  const raw = firstFlightParam(value);
  if (raw === "" || raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
};

export function flightTravelerCount(params: PriceBasisParams) {
  const breakdownKeys = ["adults", "children", "infants"] as const;
  const hasPassengerBreakdown = breakdownKeys.some((key) => firstFlightParam(params[key]) !== "");
  if (hasPassengerBreakdown) {
    const total = breakdownKeys.reduce((sum, key) => sum + (nonNegativeInteger(params[key]) ?? 0), 0);
    if (total > 0) return total;
  }

  const legacyCount = nonNegativeInteger(params.travelers);
  return legacyCount && legacyCount > 0 ? legacyCount : 1;
}

export function flightPriceBasis(params: PriceBasisParams, fare?: DisplayPrice | null) {
  const travelerCount = flightTravelerCount(params);
  const travelerLabel = `${travelerCount} ${travelerCount === 1 ? "traveler" : "travelers"}`;
  const requestedTripType = firstFlightParam(params.tripType);
  const tripType = requestedTripType === "one-way" || requestedTripType === "multi-city"
    ? requestedTripType
    : "round-trip";
  const tripTypeLabel = FLIGHT_TRIP_TYPE_LABELS[tripType];
  const validProviderFare = fare?.converted === true
    && Number.isFinite(fare.providerAmount)
    && typeof fare.providerCurrency === "string"
    && /^[A-Z]{3}$/.test(fare.providerCurrency);
  const providerFare = validProviderFare
    ? formatCurrency(fare!.providerAmount, fare!.providerCurrency)
    : null;

  return {
    travelerCount,
    travelerLabel,
    tripTypeLabel,
    summary: `${travelerLabel} · ${tripTypeLabel}`,
    providerFareText: providerFare ? `Provider fare ${providerFare}` : null,
    providerFareAccessibilityText: validProviderFare
      ? `Provider fare ${currencyAccessibilityLabel(fare!.providerAmount, fare!.providerCurrency)}`
      : null,
  };
}
