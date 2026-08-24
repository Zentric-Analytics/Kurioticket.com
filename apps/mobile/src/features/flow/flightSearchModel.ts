import { airports, searchAirports, type Airport } from "./airportData";
import { findAirportByDestination } from "./airportMatching";
import { addCalendarDays, localDateFromIso, localIsoDate } from "./localDateModel";

export type RouteValue = string | string[] | undefined;
export type FlightTripType = "round-trip" | "one-way";
export const FLIGHT_TRIP_TYPES: FlightTripType[] = ["round-trip", "one-way"];
export const FLIGHT_CABINS = ["Economy", "Premium Economy", "Business", "First"] as const;
export type FlightCabin = typeof FLIGHT_CABINS[number];
export type FlightForm = { tripType: FlightTripType; from?: Airport; to?: Airport; departureDate: string; returnDate: string; adults: number; children: number; infants: number; cabin?: FlightCabin };
export type FlightFormErrors = Partial<Record<"tripType" | "from" | "to" | "departureDate" | "returnDate" | "travelers" | "cabin", string>>;

export const firstFlightParam = (value: RouteValue) => (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
export const airportByCode = (value: string) => airports.find((airport) => airport.code === value.trim().toUpperCase());
export const totalTravelers = (form: Pick<FlightForm, "adults" | "children" | "infants">) => form.adults + form.children + form.infants;
const count = (value: string) => /^\d+$/.test(value) ? Number(value) : undefined;
export const normalizeCabin = (value: string): FlightCabin | undefined => FLIGHT_CABINS.find((cabin) => cabin.toLowerCase().replace(/\s+/g, "-") === value.trim().toLowerCase().replace(/\s+/g, "-"));

/** Canonical route parameters understood by the existing flight search form. */
export function flightEditSearchParams(params: Record<string, RouteValue>) {
  const tripType = firstFlightParam(params.tripType);
  const from = firstFlightParam(params.from) || firstFlightParam(params.origin);
  const to = firstFlightParam(params.to) || firstFlightParam(params.destination);
  const departureDate = firstFlightParam(params.departureDate);
  const returnDate = firstFlightParam(params.returnDate);
  const adults = firstFlightParam(params.adults);
  const children = firstFlightParam(params.children);
  const infants = firstFlightParam(params.infants);
  const travelers = firstFlightParam(params.travelers);
  const cabin = firstFlightParam(params.cabin) || firstFlightParam(params.cabinClass);
  return Object.fromEntries(Object.entries({
    tripType,
    from,
    to,
    departureDate,
    ...(tripType !== "one-way" ? { returnDate } : {}),
    adults,
    children,
    infants,
    travelers,
    cabin,
  }).filter(([, value]) => value !== ""));
}

export function defaultFlightForm(): FlightForm {
  return { tripType: "round-trip", departureDate: "", returnDate: "", adults: 1, children: 0, infants: 0, cabin: "Economy" };
}

export function initializeFlightForm(params: Record<string, RouteValue>, today = new Date(), initializeHomepageDates = false): { form: FlightForm; notice?: string } {
  params = {
    ...params,
    from: firstFlightParam(params.from) || firstFlightParam(params.origin),
    cabin: firstFlightParam(params.cabin) || firstFlightParam(params.cabinClass),
  };
  const defaults = defaultFlightForm(); const notices: string[] = [];
  const explicitToText = firstFlightParam(params.to); const destinationText = firstFlightParam(params.destination);
  const explicitTo = airportByCode(explicitToText); const explored = destinationText ? findAirportByDestination(destinationText) : undefined;
  let to = explicitTo ?? explored;
  if ((explicitToText && !explicitTo) || (destinationText && !explored && !explicitTo)) { to = undefined; notices.push("Choose a destination airport; the incoming destination could not be matched."); }
  const fromText = firstFlightParam(params.from); const explicitFrom = airportByCode(fromText);
  if (fromText && !explicitFrom) notices.push("Choose an origin airport; the incoming origin could not be matched.");
  const from = explicitFrom;
  const tripText = firstFlightParam(params.tripType); const tripType = FLIGHT_TRIP_TYPES.includes(tripText as FlightTripType) ? tripText as FlightTripType : defaults.tripType;
  if (tripText && tripType !== tripText) notices.push("Choose a supported trip type.");
  const todayIso = localIsoDate(today); const departureText = firstFlightParam(params.departureDate); const returnText = firstFlightParam(params.returnDate);
  const departureValid = Boolean(departureText && localDateFromIso(departureText) && departureText >= todayIso);
  const returnValid = Boolean(returnText && localDateFromIso(returnText) && departureValid && returnText > departureText);
  if ((departureText && !departureValid) || (returnText && !returnValid)) notices.push("Some incoming dates were invalid. Please select the dates again.");
  const separatePresent = ["adults", "children", "infants"].some((key) => firstFlightParam(params[key]) !== "");
  const legacyTravelerText = firstFlightParam(params.travelers); const legacyTravelerPresent = legacyTravelerText !== "";
  const adultsValue = count(firstFlightParam(params.adults)); const childrenValue = count(firstFlightParam(params.children)); const infantsValue = count(firstFlightParam(params.infants)); const legacy = count(legacyTravelerText);
  let adults = defaults.adults; let children = defaults.children; let infants = defaults.infants;
  if (separatePresent) { adults = adultsValue ?? 0; children = childrenValue ?? 0; infants = infantsValue ?? 0; }
  else if (legacyTravelerPresent) { adults = legacy ?? 0; children = 0; infants = 0; }
  if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0 || !Number.isInteger(infants) || infants < 0 || adults + children + infants > 9) { adults = 0; children = 0; infants = 0; if (separatePresent || legacyTravelerPresent) notices.push("Some traveler counts were invalid. Please select travelers again."); }
  const cabinText = firstFlightParam(params.cabin); const cabin = cabinText ? normalizeCabin(cabinText) : defaults.cabin; if (cabinText && !cabin) notices.push("Choose a supported cabin class.");
  const isFreshHomepageForm = initializeHomepageDates && !Object.values(params).some((value) => firstFlightParam(value));
  const homepageDeparture = isFreshHomepageForm ? todayIso : "";
  const homepageReturn = isFreshHomepageForm && tripType === "round-trip" ? addCalendarDays(todayIso, 7) : "";
  return { form: { ...defaults, tripType, from, to, departureDate: departureValid ? departureText : homepageDeparture, returnDate: returnValid ? returnText : homepageReturn, adults, children, infants, cabin }, notice: notices[0] };
}

export function validateFlightForm(form: FlightForm, today = new Date()): FlightFormErrors {
  const errors: FlightFormErrors = {}; const todayIso = localIsoDate(today);
  if (!FLIGHT_TRIP_TYPES.includes(form.tripType)) errors.tripType = "Choose a supported trip type.";
  if (!form.from || !airportByCode(form.from.code)) errors.from = "Choose an origin airport.";
  if (!form.to || !airportByCode(form.to.code)) errors.to = "Choose a destination airport.";
  if (form.from && form.to && form.from.code === form.to.code) errors.to = "Origin and destination must be different.";
  if (!localDateFromIso(form.departureDate) || form.departureDate < todayIso) errors.departureDate = "Choose a current or future departure date.";
  if (form.tripType === "round-trip" && (!localDateFromIso(form.returnDate) || form.returnDate <= form.departureDate)) errors.returnDate = "Choose a return date after departure.";
  if (![form.adults, form.children, form.infants].every(Number.isInteger) || form.adults < 1 || form.children < 0 || form.infants < 0 || totalTravelers(form) > 9) errors.travelers = "Choose 1 to 9 travelers, including at least one adult.";
  if (!form.cabin || !FLIGHT_CABINS.includes(form.cabin)) errors.cabin = "Choose a supported cabin class.";
  return errors;
}

export function adjustFlightDeparture(form: FlightForm, departureDate: string, initializeHomepageDates = false) {
  if (!form.returnDate || form.returnDate <= departureDate) {
    const returnDate = initializeHomepageDates && form.tripType === "round-trip" ? addCalendarDays(departureDate, 7) : "";
    return { form: { ...form, departureDate, returnDate }, adjusted: Boolean(form.returnDate) || Boolean(returnDate) };
  }
  return { form: { ...form, departureDate }, adjusted: false };
}
export function changeFlightTripType(form: FlightForm, tripType: FlightTripType, initializeHomepageDates = false): FlightForm {
  if (tripType === "round-trip" && initializeHomepageDates && (!localDateFromIso(form.returnDate) || form.returnDate <= form.departureDate)) {
    return { ...form, tripType, returnDate: addCalendarDays(form.departureDate, 7) };
  }
  return { ...form, tripType };
}
export function changeTraveler(form: FlightForm, kind: "adults" | "children" | "infants", delta: number): FlightForm { const next = form[kind] + delta; if (!Number.isInteger(next) || next < (kind === "adults" ? 1 : 0) || (delta > 0 && totalTravelers(form) >= 9)) return form; return { ...form, [kind]: next }; }
export const flightSearchParams = (form: FlightForm) => ({ tripType: form.tripType, from: form.from!.code, to: form.to!.code, departureDate: form.departureDate, ...(form.tripType === "round-trip" ? { returnDate: form.returnDate } : {}), adults: String(form.adults), children: String(form.children), infants: String(form.infants), travelers: String(totalTravelers(form)), cabin: form.cabin });
export { searchAirports };
