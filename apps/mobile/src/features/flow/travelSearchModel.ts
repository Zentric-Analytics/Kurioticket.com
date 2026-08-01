import type { CarResult, FlightResult, HotelResult } from "../../api/travelApi";

export type Product = "flight" | "hotel" | "car";
export type SearchPlan = { key: string; payload: Record<string, unknown>; summary: string };
const text = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() || "";
const integer = (value: string, fallback: number) => value === "" ? fallback : /^\d+$/.test(value) ? Number(value) : -1;
const isoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
const clockTime = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const httpsUrl = (value?: string | null) => Boolean(value && /^https:\/\/[^/\s]+(?:\/|$)/i.test(value));
const safeImage = (value?: string | null) => !value || httpsUrl(value) || /^\/(?!\/)[^\s]+/.test(value);
const safeAction = (result: FlightResult | HotelResult | CarResult) => {
  const action = result.searchPolicy?.action;
  return Boolean(action && (!action.enabled || (action.kind === "internal-detail" ? /^\/(?:flights|hotels|cars)\/details\/[^/]/.test(action.href) : httpsUrl(action.href))));
};
const future = (value: string, now = new Date()) => isoDate(value) && value >= now.toISOString().slice(0, 10);

export function buildSearchPlan(product: Product, params: Record<string, string | string[] | undefined>, now = new Date()): { plan?: SearchPlan; error?: string } {
  if (product === "flight") {
    const tripType = text(params.tripType) || "round-trip";
    const origin = text(params.from).toUpperCase();
    const destination = text(params.to).toUpperCase();
    const departureDate = text(params.departureDate);
    const returnDate = text(params.returnDate);
    const adults = integer(text(params.adults) || text(params.travelers), 1);
    const children = integer(text(params.children), 0);
    const infants = integer(text(params.infants), 0);
    const cabinClass = (text(params.cabin) || "economy").toLowerCase().replace(/\s+/g, "-");
    if (!["round-trip", "one-way"].includes(tripType)) return { error: "Choose a supported trip type." };
    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination) || origin === destination) return { error: "Choose different valid origin and destination airports." };
    if (!future(departureDate, now)) return { error: "Choose a valid future departure date." };
    if (tripType === "round-trip" && (!future(returnDate, now) || returnDate <= departureDate)) return { error: "Choose a return date after departure." };
    if (adults < 1 || adults > 9 || children < 0 || infants < 0 || adults + children + infants > 9) return { error: "Choose valid traveler counts." };
    if (!["economy", "premium-economy", "business", "first"].includes(cabinClass)) return { error: "Choose a supported cabin class." };
    const payload = { tripType, origin, destination, departureDate, ...(tripType === "round-trip" ? { returnDate } : {}), adults, children, infants, travelers: adults + children + infants, cabinClass };
    return { plan: { payload, key: JSON.stringify(["flight", ...Object.values(payload)]), summary: `${origin} → ${destination} · ${departureDate}` } };
  }
  if (product === "hotel") {
    const destination = text(params.destination);
    const checkIn = text(params.checkIn); const checkOut = text(params.checkOut);
    const guests = integer(text(params.guests), 2); const rooms = integer(text(params.rooms), 1);
    if (!destination) return { error: "Enter a hotel destination." };
    if (!future(checkIn, now) || !future(checkOut, now) || checkOut <= checkIn) return { error: "Choose valid check-in and check-out dates." };
    if (guests < 1 || guests > 20 || rooms < 1 || rooms > 9 || rooms > guests) return { error: "Choose valid guest and room counts." };
    const payload = { destination, checkIn, checkOut, guests, rooms };
    return { plan: { payload, key: JSON.stringify(["hotel", ...Object.values(payload)]), summary: `${destination} · ${checkIn} – ${checkOut}` } };
  }
  const pickupLocation = text(params.pickupLocation); const dropoffLocation = text(params.dropoffLocation) || pickupLocation;
  const pickupDate = text(params.pickupDate); const dropoffDate = text(params.dropoffDate);
  const pickupTime = text(params.pickupTime) || "10:00"; const dropoffTime = text(params.dropoffTime) || "10:00";
  const driverAge = integer(text(params.driverAge), 30);
  if (!pickupLocation || !dropoffLocation) return { error: "Enter valid pickup and drop-off locations." };
  if (!future(pickupDate, now) || !future(dropoffDate, now) || !clockTime(pickupTime) || !clockTime(dropoffTime) || `${dropoffDate}T${dropoffTime}` <= `${pickupDate}T${pickupTime}`) return { error: "Choose a return date and time after pickup." };
  if (driverAge < 18 || driverAge > 70) return { error: "Enter a valid driver age from 18 to 70." };
  const payload = { pickupLocation, dropoffLocation, pickupDate, pickupTime, dropoffDate, dropoffTime, driverAge: String(driverAge) };
  return { plan: { payload, key: JSON.stringify(["car", ...Object.values(payload)]), summary: `${pickupLocation} · ${pickupDate}` } };
}

export function validFlight(result: FlightResult, plan: SearchPlan) {
  const payload = plan.payload;
  return Boolean(result.id && result.provider && result.airlineName && result.originAirport === payload.origin && result.destinationAirport === payload.destination && Number.isFinite(result.price) && result.price >= 0 && /^[A-Z]{3}$/.test(result.currency) && !Number.isNaN(Date.parse(result.departureTime)) && !Number.isNaN(Date.parse(result.arrivalTime)) && safeImage(result.airlineLogo) && safeAction(result));
}
export function validBookableHotel(result: HotelResult) {
  if (result.inventoryKind === "discovery" || result.searchPolicy?.mode === "discovery") return false;
  return Boolean(result.id && result.provider && result.name && Number.isFinite(result.totalPrice) && (result.totalPrice ?? -1) >= 0 && result.currency && /^[A-Z]{3}$/.test(result.currency) && safeImage(result.imageUrl) && safeAction(result));
}
export function validDiscoveryHotel(result: HotelResult) {
  return Boolean(result.id && result.provider && result.name && result.inventoryKind === "discovery" && result.searchPolicy?.mode === "discovery" && !result.searchPolicy.bookable && safeImage(result.imageUrl) && safeAction(result));
}
export function validBookableCar(result: CarResult) {
  return Boolean(result.id && result.rentalCompanyName && Array.isArray(result.offers) && result.offers.length && result.offers.every((offer) => Number.isFinite(offer.totalPrice) && offer.totalPrice >= 0 && /^[A-Z]{3}$/.test(offer.currency)) && safeImage(result.imageUrl) && safeAction(result) && (result.isDemo ? result.searchPolicy.mode === "demo" && !result.searchPolicy.bookable : true));
}
export { httpsUrl };
