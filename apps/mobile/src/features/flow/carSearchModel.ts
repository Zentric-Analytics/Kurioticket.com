import { addCalendarDays, compareLocalDateTimes, localDateFromIso, localIsoDate } from "./localDateModel";
import type { RouteValue } from "./hotelSearchModel";

export const CAR_AGE = { min: 18, max: 70, default: 30 } as const;
export const DEFAULT_CAR_TIME = "10:00";
export type CarForm = { pickupLocation: string; separateDropoff: boolean; dropoffLocation: string; pickupDate: string; pickupTime: string; dropoffDate: string; dropoffTime: string; driverAge?: number };
export type CarFormErrors = Partial<Record<"pickupLocation" | "dropoffLocation" | "pickupDate" | "pickupTime" | "dropoffDate" | "dropoffTime" | "driverAge", string>>;
export const firstRouteParam = (value: RouteValue) => (Array.isArray(value) ? value[0] : value) ?? "";
export const validTime = (value: string) => /^(?:[01]\d|2[0-3]):(?:00|30)$/.test(value);
export const timeOptions = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`);
export const formatTime = (time: string) => { const [hour, minute] = time.split(":").map(Number); return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); };
export const parseDriverAge = (value: string) => /^\d+$/.test(value) && Number(value) >= CAR_AGE.min && Number(value) <= CAR_AGE.max ? Number(value) : undefined;
export const boundedAge = (age: number, delta: number) => Math.max(CAR_AGE.min, Math.min(CAR_AGE.max, age + delta));

export function defaultCarForm(today = new Date()): CarForm {
  const iso = localIsoDate(today);
  return { pickupLocation: "", separateDropoff: false, dropoffLocation: "", pickupDate: addCalendarDays(iso, 14), pickupTime: DEFAULT_CAR_TIME, dropoffDate: addCalendarDays(iso, 17), dropoffTime: DEFAULT_CAR_TIME, driverAge: CAR_AGE.default };
}

export function initializeCarForm(params: Record<string, RouteValue>, today = new Date()): { form: CarForm; notice?: string } {
  const defaults = defaultCarForm(today); const todayIso = localIsoDate(today);
  const pickupLocation = firstRouteParam(params.pickupLocation); const dropoffLocation = firstRouteParam(params.dropoffLocation);
  const pickupDate = firstRouteParam(params.pickupDate); const dropoffDate = firstRouteParam(params.dropoffDate);
  const pickupTime = firstRouteParam(params.pickupTime); const dropoffTime = firstRouteParam(params.dropoffTime); const ageText = firstRouteParam(params.driverAge);
  const datesValid = Boolean(localDateFromIso(pickupDate) && localDateFromIso(dropoffDate) && pickupDate >= todayIso && dropoffDate >= pickupDate);
  const timesValid = validTime(pickupTime) && validTime(dropoffTime) && (!datesValid || compareLocalDateTimes(dropoffDate, dropoffTime, pickupDate, pickupTime) > 0);
  const age = parseDriverAge(ageText); const separateDropoff = Boolean(dropoffLocation.trim() && dropoffLocation.trim() !== pickupLocation.trim());
  const hadInvalid = Boolean((pickupDate || dropoffDate) && !datesValid) || Boolean((pickupTime || dropoffTime) && !timesValid) || Boolean(ageText && age === undefined);
  return { form: { ...defaults, pickupLocation, dropoffLocation, separateDropoff, ...(datesValid && timesValid ? { pickupDate, dropoffDate, pickupTime, dropoffTime } : {}), driverAge: age ?? CAR_AGE.default }, notice: hadInvalid ? "Some search details were invalid, so safe defaults were used." : undefined };
}

/** Cars-route initialization: valid incoming intent wins, while a fresh form stays empty. */
export function initializeCarsPageForm(params: Record<string, RouteValue>, today = new Date()): { form: CarForm; notice?: string } {
  const todayIso = localIsoDate(today);
  const pickupLocation = firstRouteParam(params.pickupLocation);
  const dropoffLocation = firstRouteParam(params.dropoffLocation);
  const incomingPickupDate = firstRouteParam(params.pickupDate);
  const incomingDropoffDate = firstRouteParam(params.dropoffDate);
  const incomingPickupTime = firstRouteParam(params.pickupTime);
  const incomingDropoffTime = firstRouteParam(params.dropoffTime);
  const ageText = firstRouteParam(params.driverAge);
  const pickupDate = localDateFromIso(incomingPickupDate) && incomingPickupDate >= todayIso ? incomingPickupDate : "";
  const dropoffDate = pickupDate && localDateFromIso(incomingDropoffDate) && incomingDropoffDate >= pickupDate ? incomingDropoffDate : "";
  const pickupTime = validTime(incomingPickupTime) ? incomingPickupTime : "";
  let dropoffTime = validTime(incomingDropoffTime) ? incomingDropoffTime : "";
  if (pickupDate && dropoffDate && pickupTime && dropoffTime && compareLocalDateTimes(dropoffDate, dropoffTime, pickupDate, pickupTime) <= 0) dropoffTime = "";
  return { form: { pickupLocation, separateDropoff: Boolean(dropoffLocation.trim() && dropoffLocation.trim() !== pickupLocation.trim()), dropoffLocation, pickupDate, pickupTime, dropoffDate, dropoffTime, driverAge: parseDriverAge(ageText) } };
}

export function selectCarsPickupDate(form: CarForm, pickupDate: string): CarForm {
  const dropoffDate = form.dropoffDate && form.dropoffDate < pickupDate ? "" : form.dropoffDate;
  const dropoffTime = dropoffDate && form.pickupTime && form.dropoffTime && compareLocalDateTimes(dropoffDate, form.dropoffTime, pickupDate, form.pickupTime) <= 0 ? "" : form.dropoffTime;
  return { ...form, pickupDate, dropoffDate, dropoffTime };
}

export function selectCarsPickupTime(form: CarForm, pickupTime: string): CarForm {
  const dropoffTime = form.pickupDate && form.dropoffDate && form.dropoffTime && compareLocalDateTimes(form.dropoffDate, form.dropoffTime, form.pickupDate, pickupTime) <= 0 ? "" : form.dropoffTime;
  return { ...form, pickupTime, dropoffTime };
}

export function validateCarForm(form: CarForm, today = new Date()): CarFormErrors {
  const errors: CarFormErrors = {}; const todayIso = localIsoDate(today);
  if (!form.pickupLocation.trim()) errors.pickupLocation = "Enter a pick-up location.";
  if (form.separateDropoff && !form.dropoffLocation.trim()) errors.dropoffLocation = "Enter a drop-off location.";
  if (!localDateFromIso(form.pickupDate) || form.pickupDate < todayIso) errors.pickupDate = "Choose a current or future pick-up date.";
  if (!localDateFromIso(form.dropoffDate) || form.dropoffDate < form.pickupDate || form.dropoffDate < todayIso) errors.dropoffDate = "Choose a drop-off date on or after pick-up.";
  if (!validTime(form.pickupTime)) errors.pickupTime = "Choose a valid pick-up time.";
  if (!validTime(form.dropoffTime)) errors.dropoffTime = "Choose a valid drop-off time.";
  if (!errors.pickupDate && !errors.dropoffDate && !errors.pickupTime && !errors.dropoffTime && compareLocalDateTimes(form.dropoffDate, form.dropoffTime, form.pickupDate, form.pickupTime) <= 0) errors.dropoffTime = "Drop-off must be later than pick-up.";
  if (form.driverAge === undefined || !Number.isInteger(form.driverAge) || form.driverAge < CAR_AGE.min || form.driverAge > CAR_AGE.max) errors.driverAge = "Driver age must be a whole number from 18 to 70.";
  return errors;
}

export function adjustDropoff(form: CarForm): { form: CarForm; adjusted: boolean } {
  if (compareLocalDateTimes(form.dropoffDate, form.dropoffTime, form.pickupDate, form.pickupTime) > 0) return { form, adjusted: false };
  const option = timeOptions.find((time) => time > form.pickupTime);
  return option ? { form: { ...form, dropoffDate: form.pickupDate, dropoffTime: option }, adjusted: true } : { form: { ...form, dropoffDate: addCalendarDays(form.pickupDate, 1), dropoffTime: "00:00" }, adjusted: true };
}

export const carSearchParams = (form: CarForm) => ({ pickupLocation: form.pickupLocation.trim(), dropoffLocation: (form.separateDropoff ? form.dropoffLocation : form.pickupLocation).trim(), pickupDate: form.pickupDate, pickupTime: form.pickupTime, dropoffDate: form.dropoffDate, dropoffTime: form.dropoffTime, driverAge: form.driverAge === undefined ? "" : String(form.driverAge) });
