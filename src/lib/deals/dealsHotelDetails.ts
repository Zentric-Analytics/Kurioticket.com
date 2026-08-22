import type { PublicHotelResult } from "@/lib/types";
import type { HotelRoomOption } from "@/lib/hotels/hotelRoomOptions";
import { normalizeDealsJourneyHotelId } from "./dealsJourneyRoutes";
import type { DealsSearch } from "./dealsSearchParams";
import {
  validateDealsProductDetailsPath,
  type DealsTripPlanHotel,
} from "./dealsTripPlan";

export type DealsHotelDetailsRequestContext = {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  rooms: string;
};

export function getEffectiveDealsHotelDetailsId(
  transientHotelId: unknown,
  confirmedHotel?: Pick<DealsTripPlanHotel, "id"> | null,
): string | null {
  return (
    normalizeDealsJourneyHotelId(transientHotelId) ??
    normalizeDealsJourneyHotelId(confirmedHotel?.id) ??
    null
  );
}

export function buildDealsHotelDetailsApiParams(
  context: DealsHotelDetailsRequestContext,
): URLSearchParams {
  return new URLSearchParams({
    id: context.id,
    checkIn: context.checkIn,
    checkOut: context.checkOut,
    guests: context.guests,
    rooms: context.rooms,
  });
}

export function buildDealsHotelDetailsRequestContext(
  search: DealsSearch,
  hotelId: string,
): DealsHotelDetailsRequestContext {
  return {
    id: hotelId,
    checkIn: search.hotelCheckIn,
    checkOut: search.hotelCheckOut,
    guests: String(search.hotelAdults + search.hotelChildren),
    rooms: String(search.hotelRooms),
  };
}

export function isCurrentDealsHotelDetailsResponse(
  requestedHotelId: unknown,
  hotel: Pick<PublicHotelResult, "id">,
): boolean {
  const requested = normalizeDealsJourneyHotelId(requestedHotelId);
  const response = normalizeDealsJourneyHotelId(hotel.id);
  return Boolean(requested && response && requested === response);
}

export function buildDealsHotelInternalDetailsPath(
  search: DealsSearch,
  hotelId: unknown,
): string | null {
  const id = normalizeDealsJourneyHotelId(hotelId);
  if (!id) return null;
  const params = new URLSearchParams({
    destination: search.hotelDestination.trim(),
    checkIn: search.hotelCheckIn,
    checkOut: search.hotelCheckOut,
    guests: String(search.hotelAdults + search.hotelChildren),
    rooms: String(search.hotelRooms),
  });
  const path = `/hotels/details/${encodeURIComponent(id)}?${params.toString()}`;
  return validateDealsProductDetailsPath(path, "hotel", id);
}

const isIsoDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));

export function buildDealsHotelDetailsSelection({
  hotel,
  roomOption,
  requestedHotelId,
  search,
  resultReceivedAt,
}: {
  hotel: PublicHotelResult;
  roomOption: HotelRoomOption | null | undefined;
  requestedHotelId: unknown;
  search: DealsSearch;
  resultReceivedAt: number;
}): DealsTripPlanHotel | null {
  const requested = normalizeDealsJourneyHotelId(requestedHotelId);
  if (
    !requested ||
    !isCurrentDealsHotelDetailsResponse(requested, hotel) ||
    hotel.inventoryKind === "discovery"
  )
    return null;
  const provider = hotel.provider.trim();
  const name = hotel.name.trim();
  const location = (hotel.neighbourhood || hotel.location || "").trim();
  const roomOptionId = roomOption?.id.trim() || "";
  const roomType = roomOption?.name.trim() || "";
  const detailsPath = buildDealsHotelInternalDetailsPath(search, requested);
  if (
    !roomOption ||
    roomOption.hotelId !== requested ||
    !roomOptionId ||
    !provider ||
    !name ||
    !location ||
    !roomType ||
    !Number.isFinite(roomOption.totalPrice) ||
    roomOption.totalPrice <= 0 ||
    !roomOption.currency.trim() ||
    !isIsoDate(search.hotelCheckIn) ||
    !isIsoDate(search.hotelCheckOut) ||
    Date.parse(search.hotelCheckOut) <= Date.parse(search.hotelCheckIn) ||
    !Number.isFinite(resultReceivedAt) ||
    resultReceivedAt < 0 ||
    !detailsPath
  )
    return null;
  return {
    id: requested,
    provider,
    name,
    location,
    checkIn: search.hotelCheckIn,
    checkOut: search.hotelCheckOut,
    roomOptionId,
    roomType,
    ...(roomOption.bedConfiguration.trim()
      ? { bedConfiguration: roomOption.bedConfiguration.trim() }
      : {}),
    ...(roomOption.mealPlan.trim()
      ? { mealPlan: roomOption.mealPlan.trim() }
      : {}),
    sourcePrice: roomOption.totalPrice,
    sourceCurrency: roomOption.currency,
    resultReceivedAt,
    detailsPath,
  };
}

export function areDealsHotelSelectionsMateriallyEqual(
  a?: DealsTripPlanHotel | null,
  b?: DealsTripPlanHotel | null,
): boolean {
  return Boolean(
    a &&
    b &&
    a.id === b.id &&
    a.provider === b.provider &&
    a.name === b.name &&
    a.location === b.location &&
    a.checkIn === b.checkIn &&
    a.checkOut === b.checkOut &&
    a.roomOptionId === b.roomOptionId &&
    a.roomType === b.roomType &&
    a.bedConfiguration === b.bedConfiguration &&
    a.mealPlan === b.mealPlan &&
    a.sourcePrice === b.sourcePrice &&
    a.sourceCurrency === b.sourceCurrency &&
    a.detailsPath === b.detailsPath,
  );
}
