export type DealsPackageMode =
  | "hotel-flight"
  | "hotel-flight-car"
  | "flight-car"
  | "hotel-car";
export type DealsProducts = { flight: boolean; hotel: boolean; car: boolean };
export type HotelStayMode = "match-trip" | "custom";
export type DealsSearch = {
  mode: DealsPackageMode;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  rooms: number;
  cabinClass: "economy" | "business" | "first";
  hotelStayMode: HotelStayMode;
  hotelCheckIn: string;
  hotelCheckOut: string;
  carPickupLocation: string;
  carDropoffLocation: string;
  carPickupDate: string;
  carDropoffDate: string;
  carPickupTime: string;
  carDropoffTime: string;
  driverAge: string;
};

export const DEALS_PRODUCTS: Record<DealsPackageMode, DealsProducts> = {
  "hotel-flight": { flight: true, hotel: true, car: false },
  "hotel-flight-car": { flight: true, hotel: true, car: true },
  "flight-car": { flight: true, hotel: false, car: true },
  "hotel-car": { flight: false, hotel: true, car: true },
};
export const dealsModes = Object.keys(DEALS_PRODUCTS) as DealsPackageMode[];
export const getDealsProducts = (mode: DealsPackageMode) =>
  DEALS_PRODUCTS[mode];
const one = (value: string | string[] | null | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
const integer = (value: string, fallback: number) =>
  /^\d+$/.test(value) ? Number(value) : fallback;
const modeOf = (value: string): DealsPackageMode =>
  dealsModes.includes(value as DealsPackageMode)
    ? (value as DealsPackageMode)
    : "hotel-flight";

export function parseDealsSearchParams(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): DealsSearch {
  const read = (key: string) =>
    input instanceof URLSearchParams ? (input.get(key) ?? "") : one(input[key]);
  const mode = modeOf(read("mode"));
  const startDate = read("startDate");
  const endDate = read("endDate");
  const destination = read("destination");
  const hotelStayMode =
    read("hotelStayMode") === "custom" ? "custom" : "match-trip";
  const pickup = read("carPickupLocation") || destination;
  return {
    mode,
    origin: read("origin"),
    destination,
    startDate,
    endDate,
    adults: integer(read("adults"), 1),
    children: integer(read("children"), 0),
    rooms: integer(read("rooms"), 1),
    cabinClass: (["economy", "business", "first"].includes(read("cabinClass"))
      ? read("cabinClass")
      : "economy") as DealsSearch["cabinClass"],
    hotelStayMode,
    hotelCheckIn: hotelStayMode === "custom" ? read("hotelCheckIn") : startDate,
    hotelCheckOut: hotelStayMode === "custom" ? read("hotelCheckOut") : endDate,
    carPickupLocation: pickup,
    carDropoffLocation: read("carDropoffLocation") || pickup,
    carPickupDate: read("carPickupDate") || startDate,
    carDropoffDate: read("carDropoffDate") || endDate,
    carPickupTime: read("carPickupTime") || "10:00",
    carDropoffTime: read("carDropoffTime") || "10:00",
    driverAge: read("driverAge") || "18-70",
  };
}

const iso = /^\d{4}-\d{2}-\d{2}$/;
const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function validateDealsSearch(
  search: DealsSearch,
  today = new Date(),
): Partial<Record<keyof DealsSearch, string>> {
  const errors: Partial<Record<keyof DealsSearch, string>> = {};
  const p = getDealsProducts(search.mode);
  const todayIso = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
    .toISOString()
    .slice(0, 10);
  if (!search.destination.trim())
    errors.destination = "deals.error.destination";
  if (search.adults < 1 || search.adults + search.children > 12)
    errors.adults = "deals.error.adults";
  if (search.children < 0) errors.children = "deals.error.children";
  if (p.flight) {
    if (!search.origin.trim()) errors.origin = "deals.error.origin";
    if (!iso.test(search.startDate) || search.startDate < todayIso)
      errors.startDate = "deals.error.startDate";
    if (!iso.test(search.endDate)) errors.endDate = "deals.error.endDate";
    else if (search.endDate <= search.startDate)
      errors.endDate = "deals.error.dateOrder";
    if (!["economy", "business", "first"].includes(search.cabinClass))
      errors.cabinClass = "deals.error.cabinClass";
  }
  if (p.hotel) {
    if (search.rooms < 1) errors.rooms = "deals.error.rooms";
    if (!iso.test(search.hotelCheckIn) || search.hotelCheckIn < todayIso)
      errors.hotelCheckIn = "deals.error.hotelDates";
    if (
      !iso.test(search.hotelCheckOut) ||
      search.hotelCheckOut <= search.hotelCheckIn
    )
      errors.hotelCheckOut = "deals.error.hotelDateOrder";
    if (
      p.flight &&
      search.hotelStayMode === "custom" &&
      (search.hotelCheckIn < search.startDate ||
        search.hotelCheckOut > search.endDate)
    )
      errors.hotelCheckIn = "deals.error.hotelBoundary";
  }
  if (p.car) {
    if (!search.carPickupLocation.trim())
      errors.carPickupLocation = "deals.error.carPickup";
    if (!search.carDropoffLocation.trim())
      errors.carDropoffLocation = "deals.error.carDropoff";
    if (!iso.test(search.carPickupDate))
      errors.carPickupDate = "deals.error.carDates";
    if (
      !iso.test(search.carDropoffDate) ||
      search.carDropoffDate < search.carPickupDate
    )
      errors.carDropoffDate = "deals.error.carDateOrder";
    if (!time.test(search.carPickupTime))
      errors.carPickupTime = "deals.error.carTime";
    if (
      !time.test(search.carDropoffTime) ||
      (search.carDropoffDate === search.carPickupDate &&
        search.carDropoffTime <= search.carPickupTime)
    )
      errors.carDropoffTime = "deals.error.carTimeOrder";
    if (!/^\d{2}(?:-\d{2,3})?$/.test(search.driverAge))
      errors.driverAge = "deals.error.driverAge";
  }
  return errors;
}

export function buildDealsQuery(search: DealsSearch) {
  const p = getDealsProducts(search.mode);
  const q = new URLSearchParams({
    mode: search.mode,
    destination: search.destination,
    startDate: search.startDate,
    endDate: search.endDate,
    adults: String(search.adults),
    children: String(search.children),
  });
  if (p.flight) {
    q.set("origin", search.origin);
    q.set("cabinClass", search.cabinClass);
  }
  if (p.hotel) {
    q.set("rooms", String(search.rooms));
    q.set("hotelStayMode", search.hotelStayMode);
    q.set("hotelCheckIn", search.hotelCheckIn);
    q.set("hotelCheckOut", search.hotelCheckOut);
  }
  if (p.car)
    for (const key of [
      "carPickupLocation",
      "carDropoffLocation",
      "carPickupDate",
      "carDropoffDate",
      "carPickupTime",
      "carDropoffTime",
      "driverAge",
    ] as const)
      q.set(key, String(search[key]));
  return q;
}
export const buildDealsResultsUrl = (s: DealsSearch) =>
  `/deals/results?${buildDealsQuery(s)}`;
export const buildModifyDealsUrl = (s: DealsSearch) =>
  `/deals?${buildDealsQuery(s)}`;
export const buildFlightApiRequest = (s: DealsSearch, currency: string) =>
  getDealsProducts(s.mode).flight
    ? {
        origin: s.origin,
        destination: s.destination,
        departureDate: s.startDate,
        returnDate: s.endDate,
        adults: s.adults,
        children: s.children,
        infants: 0,
        cabinClass: s.cabinClass,
        currency,
      }
    : null;
export function buildStandaloneFlightUrl(s: DealsSearch) {
  const q = new URLSearchParams({
    origin: s.origin,
    destination: s.destination,
    tripType: "round-trip",
    departureDate: s.startDate,
    returnDate: s.endDate,
    adults: String(s.adults),
    children: String(s.children),
    infants: "0",
    travelers: String(s.adults + s.children),
    cabinClass: s.cabinClass,
  });
  return `/flights/results?${q}`;
}
export const getHotelSearchSummary = (s: DealsSearch) => ({
  destination: s.destination,
  checkIn: s.hotelCheckIn,
  checkOut: s.hotelCheckOut,
  travelers: s.adults + s.children,
  rooms: s.rooms,
});
export const getCarSearchSummary = (s: DealsSearch) => ({
  pickupLocation: s.carPickupLocation,
  dropoffLocation: s.carDropoffLocation,
  pickupDate: s.carPickupDate,
  dropoffDate: s.carDropoffDate,
  pickupTime: s.carPickupTime,
  dropoffTime: s.carDropoffTime,
  driverAge: s.driverAge,
});
