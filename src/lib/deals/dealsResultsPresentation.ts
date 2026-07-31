import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import { formatItineraryShortDate, formatItineraryTime, isValidItineraryDateTime } from "@/lib/utils";
import type { DealsSearch } from "./dealsSearchParams";
import { getIncludedProducts } from "./dealsSearchParams";
import { getHotelComparableReviewScore, normalizeHotelReviewCount } from "@/lib/hotels/hotelRatingSemantics";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { getPrimaryCarOffer, sortCarResults } from "@/lib/cars/carResults";

export const dealsPreviewLimit = 3;

export type DealsPreview<T> = { result: T; badgeKey: string; reasonKey?: string };

const positive = (value: number | undefined) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
const stableId = (result: { id: string }) => result.id || "";
const compareOptionalAscending = (a: number | undefined, b: number | undefined) => a === undefined ? (b === undefined ? 0 : 1) : b === undefined ? -1 : a - b;
const compareOptionalDescending = (a: number | undefined, b: number | undefined) => compareOptionalAscending(b, a);

function selectDistinct<T extends { id: string }>(results: T[], categories: { badgeKey: string; reasonKey?: string; eligible: (item: T) => boolean; compare: (a: T, b: T) => number }[]): DealsPreview<T>[] {
  const selected: DealsPreview<T>[] = []; const used = new Set<string>();
  for (const category of categories) {
    const winner = results.filter(category.eligible).sort(category.compare)[0];
    if (winner && !used.has(stableId(winner))) { used.add(stableId(winner)); selected.push({ result: winner, badgeKey: category.badgeKey, ...(category.reasonKey ? { reasonKey: category.reasonKey } : {}) }); }
  }
  for (const result of results) {
    if (selected.length >= dealsPreviewLimit) break;
    if (!used.has(stableId(result))) { used.add(stableId(result)); selected.push({ result, badgeKey: "deals.results.preview.more.badge" }); }
  }
  return selected.slice(0, dealsPreviewLimit);
}

export const selectDealsFlightPreviews = <T extends PublicFlightResult>(results: T[]) => selectDistinct(results, [
  { badgeKey: "deals.results.flight.recommended.badge", eligible: (item) => positive(item.valueScore) !== undefined, compare: (a, b) => compareOptionalDescending(positive(a.valueScore), positive(b.valueScore)) || compareOptionalAscending(positive(a.price), positive(b.price)) || compareOptionalAscending(positive(a.durationMinutes), positive(b.durationMinutes)) || stableId(a).localeCompare(stableId(b)) },
  { badgeKey: "deals.results.flight.lowest.badge", eligible: (item) => positive(item.price) !== undefined, compare: (a, b) => compareOptionalAscending(positive(a.price), positive(b.price)) || stableId(a).localeCompare(stableId(b)) },
  { badgeKey: "deals.results.flight.shortest.badge", eligible: (item) => positive(item.durationMinutes) !== undefined, compare: (a, b) => compareOptionalAscending(positive(a.durationMinutes), positive(b.durationMinutes)) || compareOptionalAscending(positive(a.price), positive(b.price)) || stableId(a).localeCompare(stableId(b)) },
]);

export const selectDealsHotelPreviews = <T extends PublicHotelResult>(results: T[]) => selectDistinct(results, [
  { badgeKey: "deals.results.hotel.recommended.badge", eligible: (item) => positive(item.valueScore) !== undefined, compare: (a, b) => compareOptionalDescending(positive(a.valueScore), positive(b.valueScore)) || compareOptionalAscending(getHotelPreviewPrice(a)?.amount, getHotelPreviewPrice(b)?.amount) || stableId(a).localeCompare(stableId(b)) },
  { badgeKey: "deals.results.hotel.lowest.badge", eligible: (item) => getHotelPreviewPrice(item) !== null, compare: (a, b) => compareOptionalAscending(getHotelPreviewPrice(a)?.amount, getHotelPreviewPrice(b)?.amount) || stableId(a).localeCompare(stableId(b)) },
  { badgeKey: "deals.results.hotel.rating.badge", reasonKey: "deals.results.hotel.rating.reason", eligible: (item) => getHotelComparableReviewScore(item) !== null, compare: (a, b) => compareOptionalDescending(getHotelComparableReviewScore(a) ?? undefined, getHotelComparableReviewScore(b) ?? undefined) || compareOptionalDescending(normalizeHotelReviewCount(a.reviewCount), normalizeHotelReviewCount(b.reviewCount)) || compareOptionalAscending(getHotelPreviewPrice(a)?.amount, getHotelPreviewPrice(b)?.amount) || stableId(a).localeCompare(stableId(b)) },
]);

export function selectDealsCarPreviews(results: NormalizedCarResult[]): DealsPreview<NormalizedCarResult>[] {
  const valid = results.filter(car => car.id.trim() && getPrimaryCarOffer(car));
  const orders = [sortCarResults(valid, "recommended"), sortCarResults(valid, "lowestTotal"), sortCarResults(valid, "topRated")];
  const categories = [
    { badgeKey: "deals.results.car.recommended.badge" },
    { badgeKey: "deals.results.car.lowest.badge" },
    { badgeKey: "deals.results.car.rating.badge" },
  ];
  const selected: DealsPreview<NormalizedCarResult>[] = []; const used = new Set<string>();
  orders.forEach((order, index) => { const winner = order.find(car => !used.has(car.id) && (index !== 2 || car.supplierRating !== undefined)); if (winner) { used.add(winner.id); selected.push({ result: winner, ...categories[index] }); } });
  for (const car of orders[0]) { if (selected.length >= dealsPreviewLimit) break; if (!used.has(car.id)) { used.add(car.id); selected.push({ result: car, badgeKey: "deals.results.preview.more.badge" }); } }
  return selected.slice(0, dealsPreviewLimit);
}

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

export type DealsResultsSummary = {
  primary: string;
  routeLabelKey: string;
  hasFlight: boolean;
  dates: { labelKey?: string; value: string }[];
  travelers?: number;
  guests?: number;
  rooms?: number;
  cabin?: string;
  carIncluded: boolean;
};

export const getDealsResultsSummary = (search: DealsSearch, locale: string): DealsResultsSummary => {
  const included = getIncludedProducts(search.mode);
  const overview = getOverviewData(search, locale);
  const flightTitle = [search.flightOriginText || search.flightOriginCode, search.flightDestinationText || search.flightDestinationCode]
    .map((name, index) => name && !name.toUpperCase().includes(index === 0 ? search.flightOriginCode : search.flightDestinationCode) ? `${name} (${index === 0 ? search.flightOriginCode : search.flightDestinationCode})` : name)
    .join(" → ");
  const dates: DealsResultsSummary["dates"] = [];
  if (included.flight && included.hotel && overview.flight.dates === overview.hotel.dates) dates.push({ value: overview.flight.dates });
  else {
    if (included.flight) dates.push({ labelKey: included.hotel ? "deals.results.summary.flightDates" : undefined, value: overview.flight.dates });
    if (included.hotel) dates.push({ labelKey: included.flight ? "deals.results.summary.stayDates" : undefined, value: overview.hotel.dates });
  }
  if (included.car && overview.car.dates && !dates.some(({ value }) => value === overview.car.dates)) dates.push({ labelKey: "deals.results.summary.carDates", value: overview.car.dates });
  return {
    primary: included.flight ? flightTitle : overview.hotel.title,
    routeLabelKey: included.flight ? "deals.results.summary.route" : "deals.results.summary.destination",
    hasFlight: included.flight,
    dates,
    travelers: included.flight ? overview.flight.travelers : undefined,
    guests: included.hotel ? overview.hotel.guests : undefined,
    rooms: included.hotel ? overview.hotel.rooms : undefined,
    cabin: included.flight && !included.hotel ? search.flightCabinClass : undefined,
    carIncluded: included.car,
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
