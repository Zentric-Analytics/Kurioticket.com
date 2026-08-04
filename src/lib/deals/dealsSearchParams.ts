import {
  defaultDriverAge,
  timeOptions,
  validateCarsForm,
  type CarsFormValues,
} from "@/lib/cars/carsSearchUtils";
import type { CarSearchParams } from "@/lib/cars/types";
import { normalizeHotelDestinationSearchValue } from "@/data/hotelDestinations";

export const dealsPackageModes = [
  "hotel-flight",
  "hotel-flight-car",
  "flight-car",
  "hotel-car",
] as const;
export type DealsPackageMode = (typeof dealsPackageModes)[number];
export type DealsCabinClass = "economy" | "business" | "first";
export type DealsFlightTripType = "round-trip" | "one-way";
export type DealsProduct = "hotel" | "flight" | "car";
export const dealsProductOrder = ["hotel", "flight", "car"] as const satisfies readonly DealsProduct[];
export type DealsProductToggleResult =
  | { changed: true; mode: DealsPackageMode }
  | { changed: false; mode: DealsPackageMode; reason: "minimum-products" };

export type DealsSearch = {
  mode: DealsPackageMode;
  flightTripType: DealsFlightTripType;
  flightOriginText: string; flightOriginCode: string;
  flightDestinationText: string; flightDestinationCode: string;
  flightDepartureDate: string; flightReturnDate: string;
  /** Canonical package range. Flight one-way searches intentionally keep the end here. */
  sharedTravelStartDate: string; sharedTravelEndDate: string;
  flightAdults: number; flightChildren: number; flightInfants: number;
  flightCabinClass: DealsCabinClass;
  hotelDestination: string; hotelCheckIn: string; hotelCheckOut: string;
  hotelAdults: number; hotelChildren: number; hotelRooms: number;
  hotelPetFriendly: boolean;
  carPickupLocation: string; carReturnToDifferentLocation: boolean;
  carReturnLocation: string; carPickupDate: string; carReturnDate: string;
  carPickupTime: string; carReturnTime: string; carDriverAge: string;
  stayDestinationLinked: boolean; stayDatesLinked: boolean;
  carPickupLinked: boolean; carDatesLinked: boolean;
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
export const getIncludedProductList = (mode: DealsPackageMode): DealsProduct[] =>
  dealsProductOrder.filter((product) => getIncludedProducts(mode)[product]);

export function getDealsPackageModeForProducts(products: Iterable<DealsProduct>): DealsPackageMode | null {
  const selected = new Set(products);
  const key = dealsProductOrder.filter((product) => selected.has(product)).join("-");
  return isDealsPackageMode(key) ? key : null;
}

export function tryToggleDealsProduct(mode: DealsPackageMode, product: DealsProduct): DealsProductToggleResult {
  const selected = new Set(getIncludedProductList(mode));
  if (selected.has(product)) selected.delete(product); else selected.add(product);
  const nextMode = getDealsPackageModeForProducts(selected);
  return nextMode ? { changed: true, mode: nextMode } : { changed: false, mode, reason: "minimum-products" };
}

export const createDefaultDealsSearch = (): DealsSearch => ({
  mode: "hotel-flight", flightOriginText: "", flightOriginCode: "", flightDestinationText: "", flightDestinationCode: "",
  flightTripType: "round-trip", flightDepartureDate: "", flightReturnDate: "", sharedTravelStartDate: "", sharedTravelEndDate: "", flightAdults: 2, flightChildren: 0, flightInfants: 0, flightCabinClass: "economy",
  hotelDestination: "", hotelCheckIn: "", hotelCheckOut: "", hotelAdults: 2, hotelChildren: 0, hotelRooms: 1, hotelPetFriendly: false,
  carPickupLocation: "", carReturnToDifferentLocation: false, carReturnLocation: "", carPickupDate: "", carReturnDate: "", carPickupTime: "10:00", carReturnTime: "10:00", carDriverAge: defaultDriverAge,
  stayDestinationLinked: true, stayDatesLinked: true, carPickupLinked: true, carDatesLinked: true,
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
  const mode = isDealsPackageMode(modeValue) ? modeValue : defaults.mode;
  const included = getIncludedProducts(mode);
  const cabin = get(input, "flightCabinClass");
  const tripTypeValue = get(input, "flightTripType") || get(input, "tripType");
  const flightTripType = tripTypeValue === "one-way" ? "one-way" : defaults.flightTripType;
  const flightDestinationText = get(input, "flightDestinationText");
  const hotelDestination = get(input, "hotelDestination");
  const flightDepartureDate = date(get(input, "flightDepartureDate"));
  const parsedFlightReturnDate = date(get(input, "flightReturnDate"));
  const hotelCheckIn = date(get(input, "hotelCheckIn"));
  const hotelCheckOut = date(get(input, "hotelCheckOut"));
  const carPickupLocation = get(input, "carPickupLocation");
  const carPickupDate = date(get(input, "carPickupDate"));
  const carReturnDate = date(get(input, "carReturnDate"));
  // Legacy party fields conflict in the wild. Product mode, never query ordering,
  // decides which provider's values seed the canonical party.
  const primaryAdults = included.flight ? get(input, "flightAdults") : get(input, "hotelAdults");
  const fallbackAdults = included.flight ? get(input, "hotelAdults") : get(input, "flightAdults");
  const primaryChildren = included.flight ? get(input, "flightChildren") : get(input, "hotelChildren");
  const fallbackChildren = included.flight ? get(input, "hotelChildren") : get(input, "flightChildren");
  const sharedAdults = integer(primaryAdults || fallbackAdults, defaults.flightAdults);
  const sharedChildren = integer(primaryChildren || fallbackChildren, defaults.flightChildren);
  const explicitLink = (key: string, inferred: boolean) => { const value = get(input, key); return value === "true" ? true : value === "false" ? false : inferred; };
  const stayDatesLinked = explicitLink("stayDatesLinked", (!hotelCheckIn && !hotelCheckOut) || (hotelCheckIn === flightDepartureDate && hotelCheckOut === parsedFlightReturnDate));
  const carDatesLinked = explicitLink("carDatesLinked", (!carPickupDate && !carReturnDate) || (carPickupDate === hotelCheckIn && carReturnDate === hotelCheckOut) || (carPickupDate === flightDepartureDate && carReturnDate === parsedFlightReturnDate));
  const explicitSharedStart = date(get(input, "sharedTravelStartDate"));
  const explicitSharedEnd = date(get(input, "sharedTravelEndDate"));
  const sharedTravelStartDate = explicitSharedStart || (included.flight ? flightDepartureDate : "") || (included.hotel ? hotelCheckIn : "") || (included.car ? carPickupDate : "");
  const sharedTravelEndDate = explicitSharedEnd
    || (included.flight && flightTripType === "round-trip" ? parsedFlightReturnDate : "")
    || (included.hotel && (stayDatesLinked || !included.flight) ? hotelCheckOut : "")
    || (included.car && carDatesLinked ? carReturnDate : "")
    || (included.hotel ? hotelCheckOut : "")
    || (included.car ? carReturnDate : "");
  return {
    mode,
    flightTripType,
    flightOriginText: get(input, "flightOriginText"), flightOriginCode: normalizeIataCode(get(input, "flightOriginCode")),
    flightDestinationText, flightDestinationCode: normalizeIataCode(get(input, "flightDestinationCode")),
    flightDepartureDate: explicitSharedStart || flightDepartureDate, flightReturnDate: flightTripType === "one-way" ? "" : (explicitSharedEnd || parsedFlightReturnDate),
    sharedTravelStartDate, sharedTravelEndDate,
    flightAdults: sharedAdults, flightChildren: sharedChildren, flightInfants: integer(get(input, "flightInfants"), defaults.flightInfants),
    flightCabinClass: cabin === "business" || cabin === "first" ? cabin : "economy",
    hotelDestination, hotelCheckIn, hotelCheckOut,
    hotelAdults: sharedAdults, hotelChildren: sharedChildren, hotelRooms: integer(get(input, "hotelRooms"), defaults.hotelRooms), hotelPetFriendly: bool(get(input, "hotelPetFriendly")),
    carPickupLocation, carReturnToDifferentLocation: bool(get(input, "carReturnToDifferentLocation")), carReturnLocation: get(input, "carReturnLocation"),
    carPickupDate, carReturnDate,
    carPickupTime: timeOptions.includes(get(input, "carPickupTime")) ? get(input, "carPickupTime") : defaults.carPickupTime,
    carReturnTime: timeOptions.includes(get(input, "carReturnTime")) ? get(input, "carReturnTime") : defaults.carReturnTime,
    carDriverAge: get(input, "carDriverAge") || defaults.carDriverAge,
    stayDestinationLinked: explicitLink("stayDestinationLinked", !hotelDestination || hotelDestination === flightDestinationText),
    stayDatesLinked,
    carPickupLinked: explicitLink("carPickupLinked", !carPickupLocation || carPickupLocation === hotelDestination || carPickupLocation === flightDestinationText),
    carDatesLinked,
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
export const buildCarApiPayload = (search: DealsSearch): CarSearchParams => ({ pickupLocation: search.carPickupLocation.trim(), dropoffLocation: search.carReturnToDifferentLocation ? search.carReturnLocation.trim() : search.carPickupLocation.trim(), pickupDate: search.carPickupDate, pickupTime: search.carPickupTime, dropoffDate: search.carReturnDate, dropoffTime: search.carReturnTime, driverAge: search.carDriverAge });
export const buildCarResultsUrl = (search: DealsSearch) => `/cars/results?${new URLSearchParams(buildCarApiPayload(search))}`;
export const buildFlightApiPayload = (search: DealsSearch) => ({ tripType: search.flightTripType, origin: normalizeIataCode(search.flightOriginCode), destination: normalizeIataCode(search.flightDestinationCode), departureDate: search.flightDepartureDate, ...search.flightTripType === "round-trip" ? { returnDate: search.flightReturnDate } : {}, travelers: search.flightAdults + search.flightChildren + search.flightInfants, adults: search.flightAdults, children: search.flightChildren, infants: search.flightInfants, cabinClass: search.flightCabinClass });
export const buildHotelApiPayload = (search: DealsSearch) => ({ destination: normalizeHotelDestinationSearchValue(search.hotelDestination), checkIn: search.hotelCheckIn, checkOut: search.hotelCheckOut, guests: search.hotelAdults + search.hotelChildren, rooms: search.hotelRooms });

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
