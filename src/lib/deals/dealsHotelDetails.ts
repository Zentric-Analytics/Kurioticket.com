import type { PublicHotelResult } from "@/lib/types";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import { normalizeDealsJourneyHotelId } from "./dealsJourneyRoutes";
import { getIncludedProducts, type DealsSearch } from "./dealsSearchParams";
import { createDealsTripPlan, replaceDealsHotelSelection, validateDealsInternalPath, validateDealsProductDetailsPath, type DealsTripPlan, type DealsTripPlanHotel } from "./dealsTripPlan";

export type DealsHotelDetailsRequestContext = { id: string; checkIn: string; checkOut: string; guests: string; rooms: string };

export function getEffectiveDealsHotelDetailsId(transientHotelId: unknown, confirmedHotel?: Pick<DealsTripPlanHotel, "id"> | null): string | null {
  return normalizeDealsJourneyHotelId(transientHotelId) ?? normalizeDealsJourneyHotelId(confirmedHotel?.id) ?? null;
}

export function buildDealsHotelDetailsApiParams(context: DealsHotelDetailsRequestContext): URLSearchParams {
  return new URLSearchParams({ id: context.id, checkIn: context.checkIn, checkOut: context.checkOut, guests: context.guests, rooms: context.rooms });
}

export function buildDealsHotelDetailsRequestContext(search: DealsSearch, hotelId: string): DealsHotelDetailsRequestContext {
  return { id: hotelId, checkIn: search.hotelCheckIn, checkOut: search.hotelCheckOut, guests: String(search.hotelAdults + search.hotelChildren), rooms: String(search.hotelRooms) };
}

export function isCurrentDealsHotelDetailsResponse(requestedHotelId: unknown, hotel: Pick<PublicHotelResult, "id">): boolean {
  const requested = normalizeDealsJourneyHotelId(requestedHotelId);
  const response = normalizeDealsJourneyHotelId(hotel.id);
  return Boolean(requested && response && requested === response);
}

export function buildDealsHotelInternalDetailsPath(search: DealsSearch, hotelId: unknown): string | null {
  const id = normalizeDealsJourneyHotelId(hotelId);
  if (!id) return null;
  const params = new URLSearchParams({ destination: search.hotelDestination.trim(), checkIn: search.hotelCheckIn, checkOut: search.hotelCheckOut, guests: String(search.hotelAdults + search.hotelChildren), rooms: String(search.hotelRooms) });
  const path = `/hotels/details/${encodeURIComponent(id)}?${params.toString()}`;
  return validateDealsProductDetailsPath(path, "hotel", id);
}

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));

export function buildDealsHotelDetailsSelection({ hotel, requestedHotelId, search, resultReceivedAt }: { hotel: PublicHotelResult; requestedHotelId: unknown; search: DealsSearch; resultReceivedAt: number }): DealsTripPlanHotel | null {
  const requested = normalizeDealsJourneyHotelId(requestedHotelId);
  if (!requested || !isCurrentDealsHotelDetailsResponse(requested, hotel) || hotel.inventoryKind === "discovery") return null;
  const provider = hotel.provider.trim();
  const name = hotel.name.trim();
  const location = (hotel.neighbourhood || hotel.location || "").trim();
  const roomType = (hotel.roomType || "").trim();
  const price = getHotelPriceDetails(hotel);
  const detailsPath = buildDealsHotelInternalDetailsPath(search, requested);
  if (!provider || !name || !location || !roomType || !price || !Number.isFinite(price.totalPrice) || price.totalPrice <= 0 || !price.currency.trim() || !isIsoDate(search.hotelCheckIn) || !isIsoDate(search.hotelCheckOut) || Date.parse(search.hotelCheckOut) <= Date.parse(search.hotelCheckIn) || !Number.isFinite(resultReceivedAt) || resultReceivedAt < 0 || !detailsPath) return null;
  return { id: requested, provider, name, location, checkIn: search.hotelCheckIn, checkOut: search.hotelCheckOut, roomType, sourcePrice: price.totalPrice, sourceCurrency: price.currency, resultReceivedAt, detailsPath };
}

export function areDealsHotelSelectionsMateriallyEqual(a?: DealsTripPlanHotel | null, b?: DealsTripPlanHotel | null): boolean {
  return Boolean(a && b && a.id === b.id && a.provider === b.provider && a.name === b.name && a.location === b.location && a.checkIn === b.checkIn && a.checkOut === b.checkOut && a.roomType === b.roomType && a.sourcePrice === b.sourcePrice && a.sourceCurrency === b.sourceCurrency && a.detailsPath === b.detailsPath);
}

export function applyDealsHotelDetailsConfirmation(plan: DealsTripPlan | null, selection: DealsTripPlanHotel, search: DealsSearch, now = Date.now()): { plan: DealsTripPlan; changed: boolean } {
  const included = getIncludedProducts(search.mode);
  const base = plan ?? createDealsTripPlan({ mode: search.mode, searchFingerprint: "", resultsPath: validateDealsInternalPath(`/deals/results`) || "/deals/results", ...(included.car ? { carsResultsPath: validateDealsInternalPath(`/cars/results`, "/cars/results") || "/cars/results" } : {}) }, now);
  if (areDealsHotelSelectionsMateriallyEqual(base.hotel, selection)) return { plan: base, changed: false };
  return { plan: replaceDealsHotelSelection(base, selection, now), changed: true };
}
