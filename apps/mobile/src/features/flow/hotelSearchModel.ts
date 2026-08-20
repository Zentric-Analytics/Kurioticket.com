export type RouteValue = string | string[] | undefined;
import { addCalendarDays, localDateFromIso, localIsoDate } from "./localDateModel";
export { addCalendarDays, localDateFromIso, localIsoDate } from "./localDateModel";
export type HotelForm = { destination: string; checkIn: string; checkOut: string; guests: number; rooms: number };
export type HotelFormErrors = Partial<Record<keyof HotelForm, string>>;

export const HOTEL_LIMITS = { guests: { min: 1, max: 12 }, rooms: { min: 1, max: 6 } } as const;
export const firstParam = (value: RouteValue) => (Array.isArray(value) ? value[0] : value) ?? "";
export const defaultHotelDates = (today = new Date()) => {
  const todayIso = localIsoDate(today);
  return { checkIn: addCalendarDays(todayIso, 14), checkOut: addCalendarDays(todayIso, 17) };
};
const integer = (value: RouteValue) => /^\d+$/.test(firstParam(value)) ? Number(firstParam(value)) : undefined;

export function initializeHotelForm(params: Record<string, RouteValue>, today = new Date()): { form: HotelForm; notice?: string } {
  const defaults = defaultHotelDates(today);
  const todayIso = localIsoDate(today);
  const incomingCheckIn = firstParam(params.checkIn);
  const incomingCheckOut = firstParam(params.checkOut);
  const validDates = Boolean(localDateFromIso(incomingCheckIn) && localDateFromIso(incomingCheckOut) && incomingCheckIn >= todayIso && incomingCheckOut > incomingCheckIn);
  const guests = integer(params.guests);
  const rooms = integer(params.rooms);
  const validCounts = guests !== undefined && rooms !== undefined && guests >= HOTEL_LIMITS.guests.min && guests <= HOTEL_LIMITS.guests.max && rooms >= HOTEL_LIMITS.rooms.min && rooms <= HOTEL_LIMITS.rooms.max;
  const hadInvalid = Boolean((incomingCheckIn || incomingCheckOut) && !validDates) || Boolean((firstParam(params.guests) || firstParam(params.rooms)) && !validCounts);
  return {
    form: { destination: firstParam(params.destination), ...(validDates ? { checkIn: incomingCheckIn, checkOut: incomingCheckOut } : defaults), guests: validCounts ? guests! : 2, rooms: validCounts ? rooms! : 1 },
    notice: hadInvalid ? "Some search details were invalid, so safe defaults were used." : undefined,
  };
}

export function validateHotelForm(form: HotelForm, today = new Date()): HotelFormErrors {
  const errors: HotelFormErrors = {};
  if (!form.destination.trim()) errors.destination = "Enter a hotel destination.";
  if (!localDateFromIso(form.checkIn) || form.checkIn < localIsoDate(today)) errors.checkIn = "Choose a valid current or future check-in date.";
  if (!localDateFromIso(form.checkOut) || form.checkOut <= form.checkIn) errors.checkOut = "Choose a check-out date after check-in.";
  if (!Number.isInteger(form.guests) || form.guests < HOTEL_LIMITS.guests.min || form.guests > HOTEL_LIMITS.guests.max) errors.guests = "Choose between 1 and 12 guests.";
  if (!Number.isInteger(form.rooms) || form.rooms < HOTEL_LIMITS.rooms.min || form.rooms > HOTEL_LIMITS.rooms.max) errors.rooms = "Choose between 1 and 6 rooms.";
  return errors;
}
export const changeGuests = (form: HotelForm, delta: number): HotelForm => {
  const guests = Math.max(HOTEL_LIMITS.guests.min, Math.min(HOTEL_LIMITS.guests.max, form.guests + delta));
  return { ...form, guests };
};
export const changeRooms = (form: HotelForm, delta: number): HotelForm => ({ ...form, rooms: Math.max(HOTEL_LIMITS.rooms.min, Math.min(HOTEL_LIMITS.rooms.max, form.rooms + delta)) });
export const countLabel = (count: number, singular: string) => `${count} ${singular}${count === 1 ? "" : "s"}`;
export const hotelSearchParams = (form: HotelForm) => ({ destination: form.destination.trim(), checkIn: form.checkIn, checkOut: form.checkOut, guests: String(form.guests), rooms: String(form.rooms) });
