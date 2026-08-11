import { normalizeHotelDestinationSearchValue } from "@/data/hotelDestinations";
import {
  buildCarApiPayload,
  buildFlightApiPayload,
  type DealsSearch,
} from "./dealsSearchParams";

export type DealsProductSearchKeys = {
  hotel: string;
  flight: string;
  car: string;
};

const key = (
  entries: ReadonlyArray<readonly [string, string | number | boolean]>,
) =>
  entries
    .map(([name, value]) => `${name}=${encodeURIComponent(String(value))}`)
    .join("&");

export function buildDealsHotelSearchKey(search: DealsSearch): string {
  return key([
    [
      "destination",
      normalizeHotelDestinationSearchValue(search.hotelDestination),
    ],
    ["checkIn", search.hotelCheckIn],
    ["checkOut", search.hotelCheckOut],
    ["adults", search.hotelAdults],
    ["children", search.hotelChildren],
    ["rooms", search.hotelRooms],
    ["petFriendly", search.hotelPetFriendly],
  ]);
}

export function buildDealsFlightSearchKey(search: DealsSearch): string {
  const payload = buildFlightApiPayload(search);
  return key([
    ["tripType", payload.tripType],
    ["origin", payload.origin],
    ["destination", payload.destination],
    ["departureDate", payload.departureDate],
    ...(payload.tripType === "round-trip"
      ? ([["returnDate", payload.returnDate ?? ""]] as const)
      : []),
    ["adults", payload.adults],
    ["children", payload.children],
    ["infants", payload.infants],
    ["cabinClass", payload.cabinClass],
  ]);
}

export function buildDealsCarSearchKey(search: DealsSearch): string {
  const payload = buildCarApiPayload(search);
  return key([
    ["pickupLocation", payload.pickupLocation],
    ["dropoffLocation", payload.dropoffLocation],
    ["pickupDate", payload.pickupDate],
    ["pickupTime", payload.pickupTime],
    ["dropoffDate", payload.dropoffDate],
    ["dropoffTime", payload.dropoffTime],
    ["driverAge", payload.driverAge],
  ]);
}

export const buildDealsProductSearchKeys = (
  search: DealsSearch,
): DealsProductSearchKeys => ({
  hotel: buildDealsHotelSearchKey(search),
  flight: buildDealsFlightSearchKey(search),
  car: buildDealsCarSearchKey(search),
});
