import { airports, type Airport } from "./airportData";
import { findAirportByDestination } from "./airportMatching";
import { localDateFromIso, localIsoDate } from "./localDateModel";

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

export function defaultFlightForm(): FlightForm {
  return { tripType: "round-trip", departureDate: "", returnDate: "", adults: 0, children: 0, infants: 0 };
}

export function initializeFlightForm(params: Record<string, RouteValue>, today = new Date()): { form: FlightForm; notice?: string } {
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
  const adultsValue = count(firstFlightParam(params.adults)); const childrenValue = count(firstFlightParam(params.children)); const infantsValue = count(firstFlightParam(params.infants)); const legacy = count(firstFlightParam(params.travelers));
  let adults = separatePresent ? adultsValue ?? 0 : legacy ?? 0; let children = separatePresent ? childrenValue ?? 0 : 0; let infants = separatePresent ? infantsValue ?? 0 : 0;
  if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0 || !Number.isInteger(infants) || infants < 0 || adults + children + infants > 9) { adults = 0; children = 0; infants = 0; if (separatePresent || legacy !== undefined) notices.push("Some traveler counts were invalid. Please select travelers again."); }
  const cabinText = firstFlightParam(params.cabin); const cabin = normalizeCabin(cabinText); if (cabinText && !cabin) notices.push("Choose a supported cabin class.");
  return { form: { ...defaults, tripType, from, to, departureDate: departureValid ? departureText : "", returnDate: returnValid ? returnText : "", adults, children, infants, cabin }, notice: notices[0] };
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

export function adjustFlightDeparture(form: FlightForm, departureDate: string) { return !form.returnDate || form.returnDate > departureDate ? { form: { ...form, departureDate }, adjusted: false } : { form: { ...form, departureDate, returnDate: "" }, adjusted: true }; }
export function changeTraveler(form: FlightForm, kind: "adults" | "children" | "infants", delta: number): FlightForm { const next = form[kind] + delta; if (!Number.isInteger(next) || next < (kind === "adults" ? 1 : 0) || (delta > 0 && totalTravelers(form) >= 9)) return form; return { ...form, [kind]: next }; }
export const flightSearchParams = (form: FlightForm) => ({ tripType: form.tripType, from: form.from!.code, to: form.to!.code, departureDate: form.departureDate, ...(form.tripType === "round-trip" ? { returnDate: form.returnDate } : {}), adults: String(form.adults), children: String(form.children), infants: String(form.infants), travelers: String(totalTravelers(form)), cabin: form.cabin });
export function searchAirports(query: string): Airport[] { const q = query.trim().toLowerCase().replace(/\s+/g, " "); const unique = [...new Map(airports.map((airport) => [airport.code, airport])).values()]; if (!q) return unique; const rank = (airport: Airport) => { const values = [airport.code, airport.city, airport.country].map((v) => v.toLowerCase()); if (airport.code.toLowerCase() === q) return 0; if (values.some((v) => v === q)) return 1; if (values.some((v) => v.startsWith(q))) return 2; if (values.some((v) => v.includes(q))) return 3; return 99; }; return unique.filter((airport) => rank(airport) < 99).sort((a, b) => rank(a) - rank(b) || a.code.localeCompare(b.code) || a.city.localeCompare(b.city)); }
