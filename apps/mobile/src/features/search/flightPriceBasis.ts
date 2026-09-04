import type { DisplayPrice } from "../currency/displayCurrency";
import { currencyAccessibilityLabel, formatCurrency } from "../currency/displayCurrency";
import { firstFlightParam, type RouteValue } from "../flow/flightSearchModel";
import { FLIGHT_TRIP_TYPE_LABELS } from "../flow/flightTripTypeLabels";

type PriceBasisParams = Record<string, RouteValue>;

const compactProviderFare = (formatted: string, currency: string) => {
  if (formatted.length <= 9) return formatted;

  const sign = formatted.startsWith("-") ? "-" : "";
  const unsigned = sign ? formatted.slice(1) : formatted;
  const currencySuffix = ` ${currency}`;

  if (unsigned.endsWith(currencySuffix)) {
    const amount = unsigned.slice(0, -currencySuffix.length).replace(/,/g, "");
    return `${sign}${currency}${amount}`;
  }

  return `${sign}${unsigned.replace(/,/g, "")}`;
};

export function flightProviderFarePresentation(fare?: DisplayPrice | null) {
  if (
    fare?.converted !== true
    || !Number.isFinite(fare.providerAmount)
    || typeof fare.providerCurrency !== "string"
    || !/^[A-Z]{3}$/.test(fare.providerCurrency)
  ) return null;

  const fullFormatted = formatCurrency(fare.providerAmount, fare.providerCurrency);

  return {
    formatted: compactProviderFare(fullFormatted, fare.providerCurrency),
    fullFormatted,
    currency: fare.providerCurrency,
    accessibilityLabel: currencyAccessibilityLabel(fare.providerAmount, fare.providerCurrency),
  };
}

export function flightMainPriceBasis(fare?: DisplayPrice | null) {
  if (!fare) return null;

  return fare.converted === true
    ? { label: "ESTIMATED PRICE", accessibilityText: "estimated price" }
    : { label: "PROVIDER PRICE", accessibilityText: "provider price" };
}

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
};

export function flightPriceBasis(params: PriceBasisParams, fare?: DisplayPrice | null) {
  const travelerCount = flightTravelerCount(params);
  const travelerLabel = `${travelerCount} ${travelerCount === 1 ? "traveler" : "travelers"}`;
  const requestedTripType = firstFlightParam(params.tripType);
  const tripType = requestedTripType === "one-way" || requestedTripType === "multi-city"
    ? requestedTripType
    : "round-trip";
  const tripTypeLabel = FLIGHT_TRIP_TYPE_LABELS[tripType];
  const providerFare = flightProviderFarePresentation(fare);

  return {
    travelerCount,
    travelerLabel,
    tripTypeLabel,
    summary: `${travelerLabel} · ${tripTypeLabel}`,
    providerFareText: providerFare ? `Provider fare ${providerFare.fullFormatted}` : null,
    providerFareAccessibilityText: providerFare
      ? `Provider fare ${providerFare.accessibilityLabel}`
      : null,
  };
}
