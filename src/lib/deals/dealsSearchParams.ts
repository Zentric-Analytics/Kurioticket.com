import {
  defaultDriverAge,
  timeOptions,
  validateCarsForm,
  type CarsFormValues,
} from "@/lib/cars/carsSearchUtils";

export const dealsPackageModes = [
  "hotel-flight",
  "hotel-flight-car",
  "flight-car",
  "hotel-car",
] as const;
export type DealsPackageMode = (typeof dealsPackageModes)[number];
export type DealsCabinClass = "economy" | "business" | "first";
export type DealsFlightTripType = "round-trip" | "one-way";
export type DealsProduct = "flight" | "hotel" | "car";

export type DealsSearch = {
  mode: DealsPackageMode;
  flightTripType: DealsFlightTripType;
  flightOriginText: string; flightOriginCode: string;
  flightDestinationText: string; flightDestinationCode: string;
  flightDepartureDate: string; flightReturnDate: string;
  flightAdults: number; flightChildren: number; flightInfants: number;
  flightCabinClass: DealsCabinClass;
  hotelDestination: string; hotelCheckIn: string; hotelCheckOut: string;
  hotelAdults: number; hotelChildren: number; hotelRooms: number;
  hotelPetFriendly: boolean;
  carPickupLocation: string; carReturnToDifferentLocation: boolean;
  carReturnLocation: string; carPickupDate: string; carReturnDate: string;
  carPickupTime: string; carReturnTime: string; carDriverAge: string;
};

export type DealsValidationErrors = Partial<Record<DealsProduct, Record<string, string>>>;
type QueryInput = URLSearchParams | Record<string, string | string[] | undefined>;

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const todayIso = () => iso(new Date());
export const isValidIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};
export const isDealsPackageMode = (value: string): value is DealsPackageMode => dealsPackageModes.includes(value as DealsPackageMode);
export const getIncludedProducts = (mode: DealsPackageMode): Record<DealsProduct, boolean> => ({
  flight: mode !== "hotel-car", hotel: mode !== "flight-car", car: mode !== "hotel-flight",
});

export const createDefaultDealsSearch = (): DealsSearch => ({
  mode: "hotel-flight", flightOriginText: "", flightOriginCode: "", flightDestinationText: "", flightDestinationCode: "",
  flightTripType: "round-trip", flightDepartureDate: "", flightReturnDate: "", flightAdults: 1, flightChildren: 0, flightInfants: 0, flightCabinClass: "economy",
  hotelDestination: "", hotelCheckIn: "", hotelCheckOut: "", hotelAdults: 2, hotelChildren: 0, hotelRooms: 1, hotelPetFriendly: false,
  carPickupLocation: "", carReturnToDifferentLocation: false, carReturnLocation: "", carPickupDate: "", carReturnDate: "", carPickupTime: "10:00", carReturnTime: "10:00", carDriverAge: defaultDriverAge,
});

const get = (input: QueryInput, key: string) => {
  const value = input instanceof URLSearchParams ? input.get(key) : input[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
};
const integer = (value: string, fallback: number) => /^-?\d+$/.test(value) ? Number(value) : fallback;
const bool = (value: string, fallback = false) => value === "true" ? true : value === "false" ? false : fallback;
const date = (value: string) => isValidIsoDate(value) ? value : "";
export const normalizeIataCode = (value: string) => /^[a-z]{3}$/i.test(value.trim()) ? value.trim().toUpperCase() : "";

export function parseDealsSearchParams(input: QueryInput): DealsSearch {
  const defaults = createDefaultDealsSearch();
  const modeValue = get(input, "mode");
  const cabin = get(input, "flightCabinClass");
  const tripTypeValue = get(input, "flightTripType") || get(input, "tripType");
  const flightTripType = tripTypeValue === "one-way" ? "one-way" : defaults.flightTripType;
  return {
    mode: isDealsPackageMode(modeValue) ? modeValue : defaults.mode,
    flightTripType,
    flightOriginText: get(input, "flightOriginText"), flightOriginCode: normalizeIataCode(get(input, "flightOriginCode")),
    flightDestinationText: get(input, "flightDestinationText"), flightDestinationCode: normalizeIataCode(get(input, "flightDestinationCode")),
    flightDepartureDate: date(get(input, "flightDepartureDate")), flightReturnDate: flightTripType === "one-way" ? "" : date(get(input, "flightReturnDate")),
    flightAdults: integer(get(input, "flightAdults"), defaults.flightAdults), flightChildren: integer(get(input, "flightChildren"), defaults.flightChildren), flightInfants: integer(get(input, "flightInfants"), defaults.flightInfants),
    flightCabinClass: cabin === "business" || cabin === "first" ? cabin : "economy",
    hotelDestination: get(input, "hotelDestination"), hotelCheckIn: date(get(input, "hotelCheckIn")), hotelCheckOut: date(get(input, "hotelCheckOut")),
    hotelAdults: integer(get(input, "hotelAdults"), defaults.hotelAdults), hotelChildren: integer(get(input, "hotelChildren"), defaults.hotelChildren), hotelRooms: integer(get(input, "hotelRooms"), defaults.hotelRooms), hotelPetFriendly: bool(get(input, "hotelPetFriendly")),
    carPickupLocation: get(input, "carPickupLocation"), carReturnToDifferentLocation: bool(get(input, "carReturnToDifferentLocation")), carReturnLocation: get(input, "carReturnLocation"),
    carPickupDate: date(get(input, "carPickupDate")), carReturnDate: date(get(input, "carReturnDate")),
    carPickupTime: timeOptions.includes(get(input, "carPickupTime")) ? get(input, "carPickupTime") : defaults.carPickupTime,
    carReturnTime: timeOptions.includes(get(input, "carReturnTime")) ? get(input, "carReturnTime") : defaults.carReturnTime,
    carDriverAge: get(input, "carDriverAge") || defaults.carDriverAge,
  };
}

export const serializeDealsSearchParams = (search: DealsSearch) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) params.set(key, String(value));
  return params;
};
export const buildDealsResultsUrl = (search: DealsSearch) => `/deals/results?${serializeDealsSearchParams(search)}`;
export const buildDealsModifyUrl = (search: DealsSearch) => `/deals?${serializeDealsSearchParams(search)}`;

export const buildFlightResultsUrl = (search: DealsSearch) => {
  const travelers = search.flightAdults + search.flightChildren + search.flightInfants;
  return `/flights/results?${new URLSearchParams({ tripType: search.flightTripType, origin: normalizeIataCode(search.flightOriginCode), destination: normalizeIataCode(search.flightDestinationCode), departureDate: search.flightDepartureDate, ...search.flightTripType === "round-trip" ? { returnDate: search.flightReturnDate } : {}, adults: String(search.flightAdults), children: String(search.flightChildren), infants: String(search.flightInfants), travelers: String(travelers), cabinClass: search.flightCabinClass })}`;
};
export const buildHotelResultsUrl = (search: DealsSearch) => `/hotels/results?${new URLSearchParams({ destination: search.hotelDestination.trim(), checkIn: search.hotelCheckIn, checkOut: search.hotelCheckOut, guests: String(search.hotelAdults + search.hotelChildren), rooms: String(search.hotelRooms) })}`;
export const buildCarResultsUrl = (search: DealsSearch) => `/cars/results?${new URLSearchParams({ pickupLocation: search.carPickupLocation.trim(), dropoffLocation: search.carReturnToDifferentLocation ? search.carReturnLocation.trim() : search.carPickupLocation.trim(), pickupDate: search.carPickupDate, pickupTime: search.carPickupTime, dropoffDate: search.carReturnDate, dropoffTime: search.carReturnTime, driverAge: search.carDriverAge })}`;
export const buildFlightApiPayload = (search: DealsSearch) => ({ tripType: search.flightTripType, origin: normalizeIataCode(search.flightOriginCode), destination: normalizeIataCode(search.flightDestinationCode), departureDate: search.flightDepartureDate, ...search.flightTripType === "round-trip" ? { returnDate: search.flightReturnDate } : {}, travelers: search.flightAdults + search.flightChildren + search.flightInfants, adults: search.flightAdults, children: search.flightChildren, infants: search.flightInfants, cabinClass: search.flightCabinClass });
export const buildHotelApiPayload = (search: DealsSearch) => ({ destination: search.hotelDestination.trim(), checkIn: search.hotelCheckIn, checkOut: search.hotelCheckOut, guests: search.hotelAdults + search.hotelChildren, rooms: search.hotelRooms });

export function validateFlightSearch(search: DealsSearch, today = todayIso()) {
  const errors: Record<string, string> = {};
  if (!normalizeIataCode(search.flightOriginCode)) errors.flightOriginCode = "deals.error.flightOriginCode";
  if (!normalizeIataCode(search.flightDestinationCode)) errors.flightDestinationCode = "deals.error.flightDestinationCode";
  const counts = [search.flightAdults, search.flightChildren, search.flightInfants];
  if (!counts.every(Number.isInteger) || search.flightAdults < 1 || search.flightChildren < 0 || search.flightInfants < 0 || counts.reduce((a, b) => a + b, 0) > 9) errors.flightPassengers = "deals.error.flightPassengers";
  if (search.flightInfants > search.flightAdults) errors.flightInfants = "deals.error.flightInfants";
  if (!isValidIsoDate(search.flightDepartureDate) || search.flightDepartureDate < today) errors.flightDepartureDate = "deals.error.flightDates";
  if (search.flightTripType === "round-trip" && (!isValidIsoDate(search.flightReturnDate) || search.flightReturnDate < search.flightDepartureDate)) errors.flightReturnDate = "deals.error.flightDates";
  return errors;
}
export function validateHotelSearch(search: DealsSearch, today = todayIso()) {
  const errors: Record<string, string> = {};
  if (search.hotelDestination.trim().length < 2) errors.hotelDestination = "deals.error.hotelDestination";
  const guests = search.hotelAdults + search.hotelChildren;
  if (![search.hotelAdults, search.hotelChildren, search.hotelRooms].every(Number.isInteger) || search.hotelAdults < 1 || search.hotelChildren < 0 || guests > 12) errors.hotelGuests = "deals.error.hotelGuests";
  if (!Number.isInteger(search.hotelRooms) || search.hotelRooms < 1 || search.hotelRooms > 6) errors.hotelRooms = "deals.error.hotelRooms";
  if (!isValidIsoDate(search.hotelCheckIn) || !isValidIsoDate(search.hotelCheckOut) || search.hotelCheckIn < today || search.hotelCheckOut <= search.hotelCheckIn) errors.hotelDates = "deals.error.hotelDates";
  return errors;
}
export function toCarsFormValues(search: DealsSearch): CarsFormValues { return { pickupLocation: search.carPickupLocation, pickupDate: search.carPickupDate, pickupTime: search.carPickupTime, dropoffDate: search.carReturnDate, dropoffTime: search.carReturnTime, driverAge: search.carDriverAge, returnToDifferentLocation: search.carReturnToDifferentLocation, dropoffLocation: search.carReturnToDifferentLocation ? search.carReturnLocation : "" }; }
export const validateCarSearch = (search: DealsSearch, today = todayIso()) => validateCarsForm(toCarsFormValues(search), today);
export function validateDealsSearch(search: DealsSearch, today = todayIso()): DealsValidationErrors {
  const included = getIncludedProducts(search.mode); const errors: DealsValidationErrors = {};
  if (included.flight) { const value = validateFlightSearch(search, today); if (Object.keys(value).length) errors.flight = value; }
  if (included.hotel) { const value = validateHotelSearch(search, today); if (Object.keys(value).length) errors.hotel = value; }
  if (included.car) { const value = validateCarSearch(search, today); if (Object.keys(value).length) errors.car = value; }
  return errors;
}
export const getDealsSummaries = (search: DealsSearch) => ({
  flight: search.flightDepartureDate && (search.flightTripType === "one-way" || search.flightReturnDate) ? `${search.flightOriginCode}–${search.flightDestinationCode} · ${search.flightDepartureDate}${search.flightReturnDate ? `–${search.flightReturnDate}` : ""}` : "Travel dates",
  hotel: search.hotelCheckIn && search.hotelCheckOut ? `${search.hotelDestination} · ${search.hotelCheckIn}–${search.hotelCheckOut}` : "Check-in — Check-out",
  car: search.carPickupDate && search.carReturnDate ? `${search.carPickupLocation} · ${search.carPickupDate}–${search.carReturnDate}` : "Pickup date — Return date",
});
