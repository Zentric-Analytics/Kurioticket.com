import type { FlightResult } from "../../api/travelApi";

export type StopBucket = "nonstop" | "one" | "twoPlus";
export type TimeBucket = "morning" | "afternoon" | "evening" | "night";
export type TimeField = "takeoff" | "landing";
export type NumericRange = { min: number; max: number };
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

export function flightMatchesFilters(result: FlightResult, filters: FlightFilters, normalizePrice?: (result: FlightResult) => number | null) {
  const selectedTime = timeBucket(filters.timeField === "landing" ? result.arrivalTime : result.departureTime);
  const price = finite(normalizePrice ? normalizePrice(result) : result.price);
  const duration = finite(result.durationMinutes);
  const validRange = (range: NumericRange | null, nonNegative = false) => range && Number.isFinite(range.min) && Number.isFinite(range.max) && range.min <= range.max && (!nonNegative || range.min >= 0) ? range : null;
  const priceRange = validRange(filters.price, true);
  const durationRange = validRange(filters.duration, true);
  return (!filters.stops.length || filters.stops.includes(stopBucket(result.stops))) &&
    (!filters.airlines.length || filters.airlines.includes(result.airlineName)) &&
    (!filters.times.length || Boolean(selectedTime && filters.times.includes(selectedTime))) &&
    (!priceRange || (price != null && price >= priceRange.min && price <= priceRange.max)) &&
    (!durationRange || (duration != null && duration >= durationRange.min && duration <= durationRange.max)) &&
    (!filters.fromAirports.length || filters.fromAirports.includes(result.originAirport)) &&
    (!filters.toAirports.length || filters.toAirports.includes(result.destinationAirport)) &&
    (!filters.baggageIncluded || hasPositiveTerm(result, "baggage")) &&
    (!filters.refundable || hasPositiveTerm(result, "refund"));
}

export function matchingFlightCount(results: readonly FlightResult[], filters: FlightFilters, normalizePrice?: (result: FlightResult) => number | null) {
  return results.reduce((count, result) => count + Number(flightMatchesFilters(result, filters, normalizePrice)), 0);
}

/** Facet counts replace the current selection in that facet, while retaining every other draft category. */
export function flightFacetCounts(results: readonly FlightResult[], filters: FlightFilters, normalizePrice?: (result: FlightResult) => number | null) {
  const counts = <K extends "stops" | "airlines" | "fromAirports" | "toAirports">(key: K, values: readonly FlightFilters[K][number][]) =>
    Object.fromEntries(values.map((value) => [value, matchingFlightCount(results, { ...filters, [key]: [value] }, normalizePrice)])) as Record<string, number>;
  const options = flightFilterOptions(results, normalizePrice);
  return {
    stops: counts("stops", options.stops),
    airlines: counts("airlines", options.airlines),
    fromAirports: counts("fromAirports", options.fromAirports),
    toAirports: counts("toAirports", options.toAirports),
  };
}

export function flightFilterOptions(results: readonly FlightResult[], normalizePrice?: (result: FlightResult) => number | null, normalizedCurrency?: string) {
  const fromAirports = [...new Set(results.map((result) => result.originAirport).filter(Boolean))].sort();
  const toAirports = [...new Set(results.map((result) => result.destinationAirport).filter(Boolean))].sort();
  const pricedResults = results.filter((result) => finite(result.price) != null);
  const currencies = new Set(pricedResults.map((result) => result.currency?.toUpperCase()).filter(Boolean));
  const normalizedPrices = normalizePrice ? pricedResults.map((result) => finite(normalizePrice(result))) : [];
  const completeNormalization = Boolean(normalizePrice && pricedResults.length && normalizedPrices.every((price) => price != null));
  const sameProviderCurrency = currencies.size <= 1;
  const priceValues = completeNormalization ? normalizedPrices : sameProviderCurrency ? pricedResults.map((result) => finite(result.price)) : [];
  return {
    stops: [...new Set(results.map((result) => stopBucket(result.stops)))],
    airlines: [...new Set(results.map((result) => result.airlineName).filter(Boolean))].sort(),
    takeoffTimes: [...new Set(results.map((result) => timeBucket(result.departureTime)).filter((x): x is TimeBucket => Boolean(x)))],
    landingTimes: [...new Set(results.map((result) => timeBucket(result.arrivalTime)).filter((x): x is TimeBucket => Boolean(x)))],
    // Never form an extent from unconverted amounts belonging to different currencies.
    price: priceValues.length ? extent(priceValues) : null,
    priceCurrency: completeNormalization ? normalizedCurrency ?? null : sameProviderCurrency ? [...currencies][0] ?? normalizedCurrency ?? null : null,
    duration: extent(results.map((result) => finite(result.durationMinutes))),
    fromAirports, toAirports,
    showAirports: fromAirports.length > 1 || toAirports.length > 1,
    baggage: results.some((result) => hasPositiveTerm(result, "baggage")),
    refundable: results.some((result) => hasPositiveTerm(result, "refund")),
  };
}
export type FlightFilterOptions = ReturnType<typeof flightFilterOptions>;
export function activeFlightFilterCount(filters: FlightFilters, options?: FlightFilterOptions) {
  const changedRange = (selected: NumericRange | null, available?: NumericRange | null) => {
    if (!selected || !Number.isFinite(selected.min) || !Number.isFinite(selected.max) || selected.min < 0 || selected.min > selected.max) return 0;
    return !available || selected.min !== available.min || selected.max !== available.max ? 1 : 0;
  };
  return filters.stops.length + filters.airlines.length + filters.times.length + filters.fromAirports.length +
    filters.toAirports.length + changedRange(filters.price, options?.price) + changedRange(filters.duration, options?.duration) +
    Number(filters.baggageIncluded) + Number(filters.refundable);
}

export function filterAndSortFlights(results: readonly FlightResult[], filters: FlightFilters, sort: FlightSort, normalizePrice?: (result: FlightResult) => number | null) {
  return results.map((result, originalIndex) => ({ result, originalIndex })).filter(({ result }) =>
    flightMatchesFilters(result, filters, normalizePrice)).sort((a, b) => {
    const optional = (left: number | null, right: number | null, direction = 1) => left == null ? (right == null ? 0 : 1) : right == null ? -1 : (left - right) * direction;
    let difference = 0;
    if (sort === "best") difference = optional(finite(a.result.valueScore), finite(b.result.valueScore), -1);
    if (sort === "price") difference = optional(finite(normalizePrice ? normalizePrice(a.result) : a.result.price), finite(normalizePrice ? normalizePrice(b.result) : b.result.price));
    if (sort === "duration") difference = optional(finite(a.result.durationMinutes), finite(b.result.durationMinutes));
    if (sort === "departure-asc" || sort === "departure-desc") difference = optional(finite(Date.parse(a.result.departureTime)), finite(Date.parse(b.result.departureTime)), sort === "departure-desc" ? -1 : 1);
    return difference || a.originalIndex - b.originalIndex;
  }).map(({ result }) => result);
}
