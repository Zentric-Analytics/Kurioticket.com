import type { FlightResult } from "../../api/travelApi";

export type StopBucket = "nonstop" | "one" | "twoPlus";
export type TimeBucket = "morning" | "afternoon" | "evening" | "night";
export type TimeField = "takeoff" | "landing";
export type NumericRange = { min: number; max: number };
export type FlightPriceComparisonContext = {
  currency: string;
  identity: string;
  mode: "raw" | "normalized";
  valueForResult: (result: FlightResult) => number | null;
};
export type FlightFilters = {
  stops: StopBucket[];
  airlines: string[];
  times: TimeBucket[];
  timeField: TimeField;
  price: NumericRange | null;
  duration: NumericRange | null;
  fromAirports: string[];
  toAirports: string[];
  baggageIncluded: boolean;
  refundable: boolean;
};

export type FlightSort = "best" | "price" | "duration" | "departure-asc" | "departure-desc";
export const flightSortOptions = [
  { value: "best", label: "Recommended", description: "Best overall option" },
  { value: "price", label: "Cheapest", description: "Lowest total price" },
  { value: "duration", label: "Fastest", description: "Shortest total journey" },
  { value: "departure-asc", label: "Earliest departure", description: "Leaves earliest" },
  { value: "departure-desc", label: "Latest departure", description: "Leaves latest" },
] as const;
export function flightSortQuickLabel(sort: FlightSort) {
  return sort === "best" ? "Sort" : flightSortOptions.find((option) => option.value === sort)?.label ?? "Sort";
}

export const emptyFlightFilters = (): FlightFilters => ({
  stops: [], airlines: [], times: [], timeField: "takeoff", price: null, duration: null,
  fromAirports: [], toAirports: [], baggageIncluded: false, refundable: false,
});
export const stopBucket = (stops: number): StopBucket => stops === 0 ? "nonstop" : stops === 1 ? "one" : "twoPlus";
const authoritativeRoundTripLegs = (result: FlightResult) => {
  const legs = result.legs?.filter((leg) => leg?.direction === "outbound" || leg?.direction === "return") ?? [];
  return legs.some((leg) => leg.direction === "return") ? legs : [];
};
/** Round trips are classified by their worst leg: any 2+ leg wins, then any 1-stop leg, otherwise nonstop. */
export function flightStopBucket(result: FlightResult): StopBucket {
  const legStops = authoritativeRoundTripLegs(result).map((leg) => finite(leg.stops)).filter((value): value is number => value != null && value >= 0);
  if (!legStops.length) return stopBucket(result.stops);
  return legStops.some((stops) => stops >= 2) ? "twoPlus" : legStops.some((stops) => stops === 1) ? "one" : "nonstop";
}
/** A round-trip duration means its longest provider-normalized journey leg, not total trip time. */
export function flightFilterDurationMinutes(result: FlightResult): number | null {
  const durations = authoritativeRoundTripLegs(result).map((leg) => finite(leg.durationMinutes)).filter((value): value is number => value != null && value >= 0);
  return durations.length ? Math.max(...durations) : finite(result.durationMinutes);
}
/** Times are intentionally outbound-scoped; use the normalized outbound leg when supplied. */
export function flightTimeForFilter(result: FlightResult, field: TimeField): string | undefined {
  const outbound = result.legs?.find((leg) => leg?.direction === "outbound");
  return field === "landing" ? outbound?.arrivalTime ?? result.arrivalTime : outbound?.departureTime ?? result.departureTime;
}
export const timeBucket = (value: string | undefined): TimeBucket | undefined => {
  if (!value) return undefined;
  const match = value.match(/T(\d{2}):/); // Provider-local clock time; deliberately do not convert zones.
  if (!match) return undefined;
  const hour = Number(match[1]);
  return hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 17 ? "afternoon" : hour >= 17 && hour < 21 ? "evening" : "night";
};
const finite = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value : null;
const extent = (values: (number | null)[]): NumericRange | null => {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value));
  return valid.length ? { min: Math.floor(Math.min(...valid)), max: Math.ceil(Math.max(...valid)) } : null;
};
const hasPositiveTerm = (result: FlightResult, category: "baggage" | "refund") =>
  result.fareTerms?.some((term) => term.category === category && term.semantic === "positive") === true;

export function resolveFlightPriceComparisonContext(results: readonly FlightResult[], displayCurrency: string, normalizePrice: (result: FlightResult) => number | null): FlightPriceComparisonContext | null {
  const priced = results.filter((result) => finite(result.price) != null);
  if (!priced.length) return null;
  const currencies = new Set(priced.map((result) => result.currency?.trim().toUpperCase()).filter((currency): currency is string => Boolean(currency && /^[A-Z]{3}$/.test(currency))));
  if (priced.some((result) => !/^[A-Z]{3}$/.test(result.currency?.trim().toUpperCase() ?? ""))) return null;
  const target = displayCurrency.trim().toUpperCase();
  if (currencies.size === 1 && currencies.has(target)) return { currency: target, identity: `raw:${target}`, mode: "raw", valueForResult: (result) => finite(result.price) };
  const normalized = new Map(priced.map((result) => [result, finite(normalizePrice(result))]));
  if (normalized.size === priced.length && [...normalized.values()].every((value) => value != null)) {
    return { currency: target, identity: `normalized:${target}`, mode: "normalized", valueForResult: (result) => normalized.get(result) ?? finite(normalizePrice(result)) };
  }
  if (currencies.size === 1) {
    const providerCurrency = [...currencies][0];
    return { currency: providerCurrency, identity: `raw:${providerCurrency}`, mode: "raw", valueForResult: (result) => result.currency?.toUpperCase() === providerCurrency ? finite(result.price) : null };
  }
  return null;
}

export function flightMatchesFilters(result: FlightResult, filters: FlightFilters, priceValue?: (result: FlightResult) => number | null) {
  const selectedTime = timeBucket(flightTimeForFilter(result, filters.timeField));
  const price = finite(priceValue ? priceValue(result) : result.price);
  const duration = flightFilterDurationMinutes(result);
  const validRange = (range: NumericRange | null, nonNegative = false) => range && Number.isFinite(range.min) && Number.isFinite(range.max) && range.min <= range.max && (!nonNegative || range.min >= 0) ? range : null;
  const priceRange = validRange(filters.price, true);
  const durationRange = validRange(filters.duration, true);
  return (!filters.stops.length || filters.stops.includes(flightStopBucket(result))) &&
    (!filters.airlines.length || filters.airlines.includes(result.airlineName)) &&
    (!filters.times.length || Boolean(selectedTime && filters.times.includes(selectedTime))) &&
    (!priceRange || (price != null && price >= priceRange.min && price <= priceRange.max)) &&
    (!durationRange || (duration != null && duration >= durationRange.min && duration <= durationRange.max)) &&
    (!filters.fromAirports.length || filters.fromAirports.includes(result.originAirport)) &&
    (!filters.toAirports.length || filters.toAirports.includes(result.destinationAirport)) &&
    (!filters.baggageIncluded || hasPositiveTerm(result, "baggage")) &&
    (!filters.refundable || hasPositiveTerm(result, "refund"));
}

export function matchingFlightCount(results: readonly FlightResult[], filters: FlightFilters, priceValue?: (result: FlightResult) => number | null) {
  return results.reduce((count, result) => count + Number(flightMatchesFilters(result, filters, priceValue)), 0);
}

/** Facet counts replace the current selection in that facet, while retaining every other draft category. */
export function flightFacetCounts(results: readonly FlightResult[], filters: FlightFilters, priceValue?: (result: FlightResult) => number | null) {
  const counts = <K extends "stops" | "airlines" | "fromAirports" | "toAirports">(key: K, values: readonly FlightFilters[K][number][]) =>
    Object.fromEntries(values.map((value) => [value, matchingFlightCount(results, { ...filters, [key]: [value] }, priceValue)])) as Record<string, number>;
  // Facet option identities do not depend on price; the shared predicate below receives the authoritative value function.
  const options = flightFilterOptions(results, null);
  return {
    stops: counts("stops", options.stops),
    airlines: counts("airlines", options.airlines),
    fromAirports: counts("fromAirports", options.fromAirports),
    toAirports: counts("toAirports", options.toAirports),
  };
}

export function flightFilterOptions(results: readonly FlightResult[], priceContext?: FlightPriceComparisonContext | null) {
  const fromAirports = [...new Set(results.map((result) => result.originAirport).filter(Boolean))].sort();
  const toAirports = [...new Set(results.map((result) => result.destinationAirport).filter(Boolean))].sort();
  const priceValues = priceContext ? results.map((result) => finite(priceContext.valueForResult(result))) : [];
  return {
    stops: [...new Set(results.map(flightStopBucket))],
    airlines: [...new Set(results.map((result) => result.airlineName).filter(Boolean))].sort(),
    takeoffTimes: [...new Set(results.map((result) => timeBucket(flightTimeForFilter(result, "takeoff"))).filter((x): x is TimeBucket => Boolean(x)))],
    landingTimes: [...new Set(results.map((result) => timeBucket(flightTimeForFilter(result, "landing"))).filter((x): x is TimeBucket => Boolean(x)))],
    // Never form an extent from unconverted amounts belonging to different currencies.
    price: priceValues.length ? extent(priceValues) : null,
    priceCurrency: priceContext?.currency || null,
    duration: extent(results.map(flightFilterDurationMinutes)),
    fromAirports, toAirports,
    showAirports: fromAirports.length > 1 || toAirports.length > 1,
    baggage: results.some((result) => hasPositiveTerm(result, "baggage")),
    refundable: results.some((result) => hasPositiveTerm(result, "refund")),
  };
}
export type FlightFilterOptions = ReturnType<typeof flightFilterOptions>;
export function isPriceFilteringAvailable(options: FlightFilterOptions, currencyComparisonReady: boolean) {
  return currencyComparisonReady && options.price != null;
}
export function activeFlightFilterCount(filters: FlightFilters, options?: FlightFilterOptions) {
  const changedRange = (selected: NumericRange | null, available?: NumericRange | null) => {
    if (!selected || !Number.isFinite(selected.min) || !Number.isFinite(selected.max) || selected.min < 0 || selected.min > selected.max) return 0;
    return !available || selected.min !== available.min || selected.max !== available.max ? 1 : 0;
  };
  return filters.stops.length + filters.airlines.length + filters.times.length + filters.fromAirports.length +
    filters.toAirports.length + changedRange(filters.price, options?.price) + changedRange(filters.duration, options?.duration) +
    Number(filters.baggageIncluded) + Number(filters.refundable);
}

export function filterAndSortFlights(results: readonly FlightResult[], filters: FlightFilters, sort: FlightSort, priceValue?: (result: FlightResult) => number | null, sortPriceValue = priceValue) {
  return results.map((result, originalIndex) => ({ result, originalIndex })).filter(({ result }) =>
    flightMatchesFilters(result, filters, priceValue)).sort((a, b) => {
    const optional = (left: number | null, right: number | null, direction = 1) => left == null ? (right == null ? 0 : 1) : right == null ? -1 : (left - right) * direction;
    let difference = 0;
    if (sort === "best") difference = optional(finite(a.result.valueScore), finite(b.result.valueScore), -1);
    if (sort === "price") difference = optional(finite(sortPriceValue ? sortPriceValue(a.result) : a.result.price), finite(sortPriceValue ? sortPriceValue(b.result) : b.result.price));
    if (sort === "duration") difference = optional(finite(a.result.durationMinutes), finite(b.result.durationMinutes));
    if (sort === "departure-asc" || sort === "departure-desc") difference = optional(finite(Date.parse(a.result.departureTime)), finite(Date.parse(b.result.departureTime)), sort === "departure-desc" ? -1 : 1);
    return difference || a.originalIndex - b.originalIndex;
  }).map(({ result }) => result);
}
