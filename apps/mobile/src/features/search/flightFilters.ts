import type { FlightResult } from "../../api/travelApi";

export type TimeBucket = "overnight" | "morning" | "afternoon" | "evening" | "night";
export type StopBucket = "nonstop" | "one" | "twoPlus";
export type NumericRange = { min: number; max: number };
export type JourneyTimeSelection = { departure: TimeBucket[]; arrival: TimeBucket[] };
export type FlightPriceComparisonContext = { currency: string; identity: string; mode: "raw" | "normalized"; valueForResult: (result: FlightResult) => number | null };
export type FlightFilters = {
  maxStops: null | 0 | 1 | 2;
  airlines: string[];
  journeyTimes: Record<string, JourneyTimeSelection>;
  maximumPrice: number | null;
  maximumDuration: number | null;
  maximumLayover: number | null;
  fromAirports: string[];
  toAirports: string[];
  baggageIncluded: boolean;
  refundable: boolean;
  /** Legacy fields accepted while persisted pre-rebuild state drains. */
  stops?: StopBucket[]; times?: TimeBucket[]; timeField?: "takeoff" | "landing"; price?: NumericRange | null; duration?: NumericRange | null;
};
export type FlightSort = "best" | "price" | "duration" | "departure-asc" | "departure-desc";
export const flightSortOptions = [
  { value: "best", label: "Recommended", description: "Best overall option" }, { value: "price", label: "Cheapest", description: "Lowest total price" },
  { value: "duration", label: "Fastest", description: "Shortest total journey" }, { value: "departure-asc", label: "Earliest departure", description: "Leaves earliest" },
  { value: "departure-desc", label: "Latest departure", description: "Leaves latest" },
] as const;
export function flightSortQuickLabel(sort: FlightSort) { return sort === "best" ? "Sort" : flightSortOptions.find((x) => x.value === sort)?.label ?? "Sort"; }
export const emptyFlightFilters = (): FlightFilters => ({ maxStops: null, airlines: [], journeyTimes: {}, maximumPrice: null, maximumDuration: null, maximumLayover: null, fromAirports: [], toAirports: [], baggageIncluded: false, refundable: false });
const finite = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value : null;
const authoritativeLegs = (result: FlightResult) => result.legs?.filter((leg) => leg && (leg.direction === "outbound" || leg.direction === "return" || leg.direction === "leg")) ?? [];
export const journeyKey = (leg: NonNullable<FlightResult["legs"]>[number], index: number) => leg.direction === "leg" ? `leg:${leg.legIndex ?? index}` : leg.direction;
export function flightMaximumStops(result: FlightResult) {
  const values = authoritativeLegs(result).map((leg) => finite(leg.stops)).filter((x): x is number => x != null && x >= 0);
  return values.length ? Math.max(...values) : Math.max(0, finite(result.stops) ?? 0);
}
export const flightStopBucket = (result: FlightResult): StopBucket => flightMaximumStops(result) === 0 ? "nonstop" : flightMaximumStops(result) === 1 ? "one" : "twoPlus";
export function flightFilterDurationMinutes(result: FlightResult): number | null {
  const values = authoritativeLegs(result).map((leg) => finite(leg.durationMinutes)).filter((x): x is number => x != null && x >= 0);
  return values.length ? Math.max(...values) : finite(result.durationMinutes);
}
const durationTextMinutes = (value: unknown) => {
  if (typeof value !== "string") return null;
  const hours = value.match(/(\d+(?:\.\d+)?)\s*h/i); const minutes = value.match(/(\d+)\s*m/i);
  if (!hours && !minutes) return null;
  const total = Number(hours?.[1] ?? 0) * 60 + Number(minutes?.[1] ?? 0); return Number.isFinite(total) && total >= 0 ? total : null;
};
export function flightMaximumLayoverMinutes(result: FlightResult) {
  const legs = authoritativeLegs(result); const layovers = legs.length ? legs.flatMap((leg) => leg.layovers ?? []) : (result.layovers ?? []);
  const values = layovers.map((layover) => durationTextMinutes(layover?.duration)).filter((x): x is number => x != null);
  return values.length ? Math.max(...values) : 0;
}
export const timeBucket = (value: string | undefined): TimeBucket | undefined => {
  const match = value?.match(/T(\d{2}):(\d{2})/); if (!match) return undefined;
  const hour = Number(match[1]); const minute = Number(match[2]); if (hour > 23 || minute > 59) return undefined;
  return hour < 6 ? "overnight" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
};
const fallbackLeg = (result: FlightResult) => ({ direction: "outbound" as const, originAirport: result.originAirport, destinationAirport: result.destinationAirport, departureTime: result.departureTime, arrivalTime: result.arrivalTime, duration: result.duration, durationMinutes: result.durationMinutes, stops: result.stops, layovers: result.layovers , segments: [] });
const matchesTimes = (result: FlightResult, selections: FlightFilters["journeyTimes"]) => {
  const legs = authoritativeLegs(result); const actual = legs.length ? legs : [fallbackLeg(result)];
  return Object.entries(selections).every(([key, group]) => {
    if (!group.departure.length && !group.arrival.length) return true;
    const leg = actual.find((candidate, index) => journeyKey(candidate, index) === key); if (!leg) return false;
    const departure = timeBucket(leg.departureTime); const arrival = timeBucket(leg.arrivalTime);
    return (!group.departure.length || Boolean(departure && group.departure.includes(departure))) && (!group.arrival.length || Boolean(arrival && group.arrival.includes(arrival)));
  });
};
const hasPositiveTerm = (result: FlightResult, category: "baggage" | "refund") => result.fareTerms?.some((x) => x.category === category && x.semantic === "positive") === true;
export function resolveFlightPriceComparisonContext(results: readonly FlightResult[], displayCurrency: string, normalizePrice: (result: FlightResult) => number | null): FlightPriceComparisonContext | null {
  const priced = results.filter((x) => finite(x.price) != null); if (!priced.length) return null;
  const currencies = new Set(priced.map((x) => x.currency?.trim().toUpperCase()).filter((x): x is string => Boolean(x && /^[A-Z]{3}$/.test(x))));
  if (priced.some((x) => !/^[A-Z]{3}$/.test(x.currency?.trim().toUpperCase() ?? ""))) return null;
  const target = displayCurrency.trim().toUpperCase();
  if (currencies.size === 1 && currencies.has(target)) return { currency: target, identity: `raw:${target}`, mode: "raw", valueForResult: (x) => finite(x.price) };
  const normalized = new Map(priced.map((x) => [x, finite(normalizePrice(x))]));
  if ([...normalized.values()].every((x) => x != null)) return { currency: target, identity: `normalized:${target}`, mode: "normalized", valueForResult: (x) => normalized.get(x) ?? null };
  if (currencies.size === 1) { const currency = [...currencies][0]; return { currency, identity: `raw:${currency}`, mode: "raw", valueForResult: (x) => x.currency?.toUpperCase() === currency ? finite(x.price) : null }; }
  return null;
}
export function flightMatchesFilters(result: FlightResult, filters: FlightFilters, priceValue?: (result: FlightResult) => number | null) {
  const price = finite(priceValue ? priceValue(result) : result.price); const duration = flightFilterDurationMinutes(result); const layover = flightMaximumLayoverMinutes(result);
  const legacyTime = filters.times?.length ? timeBucket(filters.timeField === "landing" ? result.arrivalTime : result.departureTime) : undefined;
  return (filters.maxStops == null || flightMaximumStops(result) <= filters.maxStops) && (!filters.stops?.length || filters.stops.includes(flightStopBucket(result))) && (!filters.airlines.length || filters.airlines.includes(result.airlineName)) && matchesTimes(result, filters.journeyTimes) && (!filters.times?.length || Boolean(legacyTime && filters.times.includes(legacyTime))) &&
    (filters.maximumPrice == null || (price != null && price <= filters.maximumPrice)) && (!filters.price || (price != null && price >= filters.price.min && price <= filters.price.max)) && (filters.maximumDuration == null || (duration != null && duration <= filters.maximumDuration)) && (!filters.duration || (duration != null && duration >= filters.duration.min && duration <= filters.duration.max)) &&
    (filters.maximumLayover == null || layover <= filters.maximumLayover) && (!filters.fromAirports.length || filters.fromAirports.includes(result.originAirport)) && (!filters.toAirports.length || filters.toAirports.includes(result.destinationAirport)) &&
    (!filters.baggageIncluded || hasPositiveTerm(result, "baggage")) && (!filters.refundable || hasPositiveTerm(result, "refund"));
}
export const matchingFlightCount = (results: readonly FlightResult[], filters: FlightFilters, priceValue?: (result: FlightResult) => number | null) => results.reduce((n, x) => n + Number(flightMatchesFilters(x, filters, priceValue)), 0);
const extent = (values: (number | null)[]): NumericRange | null => { const valid = values.filter((x): x is number => x != null && Number.isFinite(x)); return valid.length ? { min: Math.floor(Math.min(...valid)), max: Math.ceil(Math.max(...valid)) } : null; };
export function flightFilterOptions(results: readonly FlightResult[], priceContext?: FlightPriceComparisonContext | null) {
  const fromAirports = [...new Set(results.map((x) => x.originAirport).filter(Boolean))].sort(); const toAirports = [...new Set(results.map((x) => x.destinationAirport).filter(Boolean))].sort();
  return { stops: [...new Set(results.map(flightStopBucket))], takeoffTimes: [...new Set(results.map(x=>timeBucket(x.departureTime)).filter((x):x is TimeBucket=>Boolean(x)))], landingTimes: [...new Set(results.map(x=>timeBucket(x.arrivalTime)).filter((x):x is TimeBucket=>Boolean(x)))], airlines: [...new Set(results.map((x) => x.airlineName).filter(Boolean))].sort(), price: priceContext ? extent(results.map((x) => finite(priceContext.valueForResult(x)))) : null, priceCurrency: priceContext?.currency || null,
    duration: extent(results.map(flightFilterDurationMinutes)), layover: extent(results.map(flightMaximumLayoverMinutes)), fromAirports, toAirports, showAirports: fromAirports.length > 1 || toAirports.length > 1,
    baggage: results.some((x) => hasPositiveTerm(x, "baggage")), refundable: results.some((x) => hasPositiveTerm(x, "refund")) };
}
export function flightFacetCounts(results: readonly FlightResult[], filters: FlightFilters, priceValue?: (result: FlightResult) => number | null) {
  const options=flightFilterOptions(results); const count=(next:FlightFilters)=>matchingFlightCount(results,next,priceValue);
  return {stops:Object.fromEntries(options.stops.map(v=>[v,count({...filters,stops:[v]})])),airlines:Object.fromEntries(options.airlines.map(v=>[v,count({...filters,airlines:[v]})])),fromAirports:Object.fromEntries(options.fromAirports.map(v=>[v,count({...filters,fromAirports:[v]})])),toAirports:Object.fromEntries(options.toAirports.map(v=>[v,count({...filters,toAirports:[v]})]))};
}
export type FlightFilterOptions = ReturnType<typeof flightFilterOptions>;
export const isPriceFilteringAvailable = (options: FlightFilterOptions, ready: boolean) => ready && options.price != null;
export function activeFlightFilterCount(filters: FlightFilters, options?: FlightFilterOptions) {
  const airlineRestricted = filters.airlines.length > 0 && (!options || filters.airlines.length < options.airlines.length);
  const groups = Object.values(filters.journeyTimes).reduce((n, x) => n + Number(x.departure.length > 0) + Number(x.arrival.length > 0), 0);
  return Number(filters.maxStops != null) + Number(airlineRestricted) + groups + Number(filters.maximumPrice != null && (!options?.price || filters.maximumPrice < options.price.max)) + Number(filters.maximumDuration != null && (!options?.duration || filters.maximumDuration < options.duration.max)) + Number(filters.maximumLayover != null && (!options?.layover || filters.maximumLayover < options.layover.max)) + filters.fromAirports.length + filters.toAirports.length + Number(filters.baggageIncluded) + Number(filters.refundable);
}
export function filterAndSortFlights(results: readonly FlightResult[], filters: FlightFilters, sort: FlightSort, priceValue?: (result: FlightResult) => number | null, sortPriceValue = priceValue) {
  const optional = (a: number | null, b: number | null, direction = 1) => a == null ? (b == null ? 0 : 1) : b == null ? -1 : (a - b) * direction;
  return results.map((result, originalIndex) => ({ result, originalIndex })).filter(({ result }) => flightMatchesFilters(result, filters, priceValue)).sort((a, b) => { let d = 0;
    if (sort === "best") d = optional(finite(a.result.valueScore), finite(b.result.valueScore), -1); if (sort === "price") d = optional(finite(sortPriceValue ? sortPriceValue(a.result) : a.result.price), finite(sortPriceValue ? sortPriceValue(b.result) : b.result.price));
    if (sort === "duration") d = optional(finite(a.result.durationMinutes), finite(b.result.durationMinutes)); if (sort.startsWith("departure")) d = optional(finite(Date.parse(a.result.departureTime)), finite(Date.parse(b.result.departureTime)), sort === "departure-desc" ? -1 : 1); return d || a.originalIndex - b.originalIndex;
  }).map(({ result }) => result);
}
