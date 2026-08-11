import {
  buildCarApiPayload,
  buildFlightApiPayload,
  buildHotelApiPayload,
  type DealsSearch,
} from "./dealsSearchParams";

const key = (
  entries: ReadonlyArray<readonly [string, string | number | boolean]>,
) =>
  entries
    .map(([name, value]) => `${name}=${encodeURIComponent(String(value))}`)
    .join("&");

export const buildDealsFlightSearchKey = (search: DealsSearch) => {
  const value = buildFlightApiPayload(search);
  return key([
    ["tripType", value.tripType],
    ["origin", value.origin],
    ["destination", value.destination],
    ["departureDate", value.departureDate],
    ["returnDate", "returnDate" in value ? (value.returnDate ?? "") : ""],
    ["adults", value.adults],
    ["children", value.children],
    ["infants", value.infants],
    ["cabinClass", value.cabinClass],
  ]);
};

export const buildDealsHotelSearchKey = (search: DealsSearch) => {
  const value = buildHotelApiPayload(search);
  return key([
    ["destination", value.destination],
    ["checkIn", value.checkIn],
    ["checkOut", value.checkOut],
    ["adults", search.hotelAdults],
    ["children", search.hotelChildren],
    ["rooms", value.rooms],
    ["petFriendly", search.hotelPetFriendly],
  ]);
};

export const buildDealsCarSearchKey = (search: DealsSearch) => {
  const value = buildCarApiPayload(search);
  return key([
    ["pickupLocation", value.pickupLocation],
    ["dropoffLocation", value.dropoffLocation],
    ["pickupDate", value.pickupDate],
    ["pickupTime", value.pickupTime],
    ["dropoffDate", value.dropoffDate],
    ["dropoffTime", value.dropoffTime],
    ["driverAge", value.driverAge],
  ]);
};

export type DealsProductSearchKeys = {
  hotel: string;
  flight: string;
  car: string;
};
export const buildDealsProductSearchKeys = (
  search: DealsSearch,
): DealsProductSearchKeys => ({
  hotel: buildDealsHotelSearchKey(search),
  flight: buildDealsFlightSearchKey(search),
  car: buildDealsCarSearchKey(search),
});
