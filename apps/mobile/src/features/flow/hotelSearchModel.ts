export type RouteValue = string | string[] | undefined;
export type HotelForm = { destination: string; checkIn: string; checkOut: string; guests: number; rooms: number };
export type HotelFormErrors = Partial<Record<keyof HotelForm, string>>;

export const HOTEL_LIMITS = { guests: { min: 1, max: 20 }, rooms: { min: 1, max: 9 } } as const;
export const firstParam = (value: RouteValue) => (Array.isArray(value) ? value[0] : value) ?? "";
const pad = (value: number) => String(value).padStart(2, "0");
export const localIsoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const localDateFromIso = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return localIsoDate(date) === iso ? date : undefined;
};
export const addCalendarDays = (iso: string, days: number) => {
  const date = localDateFromIso(iso);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
};
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
  const validCounts = guests !== undefined && rooms !== undefined && guests >= 1 && guests <= 20 && rooms >= 1 && rooms <= 9 && rooms <= guests;
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
  if (!Number.isInteger(form.guests) || form.guests < 1 || form.guests > 20) errors.guests = "Choose between 1 and 20 guests.";
  if (!Number.isInteger(form.rooms) || form.rooms < 1 || form.rooms > 9) errors.rooms = "Choose between 1 and 9 rooms.";
  if (!errors.rooms && form.rooms > form.guests) errors.rooms = "Rooms cannot exceed guests.";
  return errors;
}
export const changeGuests = (form: HotelForm, delta: number): HotelForm => {
  const guests = Math.max(1, Math.min(20, form.guests + delta));
  return { ...form, guests, rooms: Math.min(form.rooms, guests) };
};
export const changeRooms = (form: HotelForm, delta: number): HotelForm => ({ ...form, rooms: Math.max(1, Math.min(9, form.guests, form.rooms + delta)) });
export const countLabel = (count: number, singular: string) => `${count} ${singular}${count === 1 ? "" : "s"}`;
export const hotelSearchParams = (form: HotelForm) => ({ destination: form.destination.trim(), checkIn: form.checkIn, checkOut: form.checkOut, guests: String(form.guests), rooms: String(form.rooms) });
