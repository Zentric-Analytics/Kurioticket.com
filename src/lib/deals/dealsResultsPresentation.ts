import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import { formatItineraryShortDate, formatItineraryTime, isValidItineraryDateTime } from "@/lib/utils";
import type { DealsSearch } from "./dealsSearchParams";
import { getHotelComparableReviewScore, normalizeHotelReviewCount } from "@/lib/hotels/hotelRatingSemantics";

export const dealsPreviewLimit = 3;

export type DealsPreview<T> = { result: T; badgeKey: string; reasonKey: string };

const positive = (value: number | undefined) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
const stableId = (result: { id: string }) => result.id || "";
const compareOptionalAscending = (a: number | undefined, b: number | undefined) => a === undefined ? (b === undefined ? 0 : 1) : b === undefined ? -1 : a - b;
const compareOptionalDescending = (a: number | undefined, b: number | undefined) => compareOptionalAscending(b, a);

function selectDistinct<T extends { id: string }>(results: T[], categories: { badgeKey: string; reasonKey: string; eligible: (item: T) => boolean; compare: (a: T, b: T) => number }[]): DealsPreview<T>[] {
  const selected: DealsPreview<T>[] = []; const used = new Set<string>();
  for (const category of categories) {
    const winner = results.filter(category.eligible).sort(category.compare)[0];
    if (winner && !used.has(stableId(winner))) { used.add(stableId(winner)); selected.push({ result: winner, badgeKey: category.badgeKey, reasonKey: category.reasonKey }); }
  }
  for (const result of results) {
    if (selected.length >= dealsPreviewLimit) break;
    if (!used.has(stableId(result))) { used.add(stableId(result)); selected.push({ result, badgeKey: "deals.results.preview.more.badge", reasonKey: "deals.results.preview.more.reason" }); }
  }
  return selected.slice(0, dealsPreviewLimit);
}

export const selectDealsFlightPreviews = (results: PublicFlightResult[]) => selectDistinct(results, [
  { badgeKey: "deals.results.flight.recommended.badge", reasonKey: "deals.results.flight.recommended.reason", eligible: (item) => positive(item.valueScore) !== undefined, compare: (a, b) => compareOptionalDescending(positive(a.valueScore), positive(b.valueScore)) || compareOptionalAscending(positive(a.price), positive(b.price)) || compareOptionalAscending(positive(a.durationMinutes), positive(b.durationMinutes)) || stableId(a).localeCompare(stableId(b)) },
  { badgeKey: "deals.results.flight.lowest.badge", reasonKey: "deals.results.flight.lowest.reason", eligible: (item) => positive(item.price) !== undefined, compare: (a, b) => compareOptionalAscending(positive(a.price), positive(b.price)) || stableId(a).localeCompare(stableId(b)) },
  { badgeKey: "deals.results.flight.shortest.badge", reasonKey: "deals.results.flight.shortest.reason", eligible: (item) => positive(item.durationMinutes) !== undefined, compare: (a, b) => compareOptionalAscending(positive(a.durationMinutes), positive(b.durationMinutes)) || compareOptionalAscending(positive(a.price), positive(b.price)) || stableId(a).localeCompare(stableId(b)) },
]);

export const selectDealsHotelPreviews = (results: PublicHotelResult[]) => selectDistinct(results, [
  { badgeKey: "deals.results.hotel.recommended.badge", reasonKey: "deals.results.hotel.recommended.reason", eligible: (item) => positive(item.valueScore) !== undefined, compare: (a, b) => compareOptionalDescending(positive(a.valueScore), positive(b.valueScore)) || compareOptionalAscending(getHotelPreviewPrice(a)?.amount, getHotelPreviewPrice(b)?.amount) || stableId(a).localeCompare(stableId(b)) },
  { badgeKey: "deals.results.hotel.lowest.badge", reasonKey: "deals.results.hotel.lowest.reason", eligible: (item) => getHotelPreviewPrice(item) !== null, compare: (a, b) => compareOptionalAscending(getHotelPreviewPrice(a)?.amount, getHotelPreviewPrice(b)?.amount) || stableId(a).localeCompare(stableId(b)) },
  { badgeKey: "deals.results.hotel.rating.badge", reasonKey: "deals.results.hotel.rating.reason", eligible: (item) => getHotelComparableReviewScore(item) !== null, compare: (a, b) => compareOptionalDescending(getHotelComparableReviewScore(a) ?? undefined, getHotelComparableReviewScore(b) ?? undefined) || compareOptionalDescending(normalizeHotelReviewCount(a.reviewCount), normalizeHotelReviewCount(b.reviewCount)) || compareOptionalAscending(getHotelPreviewPrice(a)?.amount, getHotelPreviewPrice(b)?.amount) || stableId(a).localeCompare(stableId(b)) },
]);

export const formatDealsOptionCount = (template: string, visible: number, total: number) => template.replace("{{visible}}", String(visible)).replace("{{total}}", String(total));

const dateOnly = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(time);
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]) ? date : null;
};

export const countHotelNights = (checkIn: string, checkOut: string) => {
  const start = dateOnly(checkIn); const end = dateOnly(checkOut);
  if (!start || !end) return null;
  const nights = (end.getTime() - start.getTime()) / 86_400_000;
  return Number.isInteger(nights) && nights > 0 ? nights : null;
};

export const formatDateOnly = (value: string, locale: string) => {
  const date = dateOnly(value);
  return date ? new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(date) : "";
};

export const getOverviewData = (search: DealsSearch, locale: string) => {
  const flightDates = [formatDateOnly(search.flightDepartureDate, locale), search.flightTripType === "round-trip" ? formatDateOnly(search.flightReturnDate, locale) : ""].filter(Boolean).join(" – ");
  const hotelDates = [formatDateOnly(search.hotelCheckIn, locale), formatDateOnly(search.hotelCheckOut, locale)].filter(Boolean).join(" – ");
  const carDates = [formatDateOnly(search.carPickupDate, locale), formatDateOnly(search.carReturnDate, locale)].filter(Boolean).join(" – ");
  return {
    flight: { title: `${search.flightOriginCode} → ${search.flightDestinationCode}`, dates: flightDates, travelers: search.flightAdults + search.flightChildren + search.flightInfants, cabin: search.flightCabinClass },
    hotel: { title: search.hotelDestination, dates: hotelDates, nights: countHotelNights(search.hotelCheckIn, search.hotelCheckOut), guests: search.hotelAdults + search.hotelChildren, rooms: search.hotelRooms, petFriendly: search.hotelPetFriendly },
    car: { title: `${search.carPickupLocation} → ${search.carReturnToDifferentLocation ? search.carReturnLocation : search.carPickupLocation}`, dates: carDates, pickupTime: search.carPickupTime, returnTime: search.carReturnTime, driverAge: search.carDriverAge },
  };
};

export type FlightPreviewLeg = { direction: "outbound" | "return" | "leg"; origin: string; destination: string; departureTime: string; arrivalTime: string; duration: string; stops: number };
export const normalizeFlightLegs = (flight: PublicFlightResult): FlightPreviewLeg[] => {
  const source = flight.legs?.length ? flight.legs : [flight];
  return source.map((leg) => ({ direction: "direction" in leg ? leg.direction : "outbound", origin: "originAirport" in leg ? leg.originAirport : "", destination: "destinationAirport" in leg ? leg.destinationAirport : "", departureTime: leg.departureTime, arrivalTime: leg.arrivalTime, duration: leg.duration, stops: Number.isFinite(leg.stops) && leg.stops >= 0 ? leg.stops : 0 }));
};

export const getFlightLegLabelKey = (direction: FlightPreviewLeg["direction"]) => direction === "outbound" ? "deals.results.outbound" : direction === "return" ? "deals.results.return" : "flightLeg";

export const safeDateTime = (value: string, locale: string) => {
  if (!value || !isValidItineraryDateTime(value)) return { date: "", time: "" };
  return { date: formatItineraryShortDate({ value, locale }), time: formatItineraryTime({ value, locale }) };
};

export const getHotelPreviewPrice = (hotel: PublicHotelResult) => hotel.inventoryKind === "discovery" || !Number.isFinite(hotel.totalPrice) || hotel.totalPrice <= 0 ? null : { amount: hotel.totalPrice, currency: hotel.currency };
export const normalizeWarnings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
export const normalizeMetadata = (value: unknown) => {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const categories = new Set(["unsupported_destination", "partial_results", "provider_unavailable", "discovery_only"]);
  return { warnings: normalizeWarnings(data.warnings), servedFromFallback: data.servedFromFallback === true, latencyMs: typeof data.latencyMs === "number" && Number.isFinite(data.latencyMs) ? data.latencyMs : undefined, warningCategory: typeof data.warningCategory === "string" && categories.has(data.warningCategory) ? data.warningCategory : undefined };
};
