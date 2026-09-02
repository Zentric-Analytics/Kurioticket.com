import { hotelSearchSchema } from "../validation";

export type HotelResultsRouteInput = {
  destination?: string;
  destinationId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  rooms?: string;
  sort?: string;
};

const requiredFields = ["destination", "checkIn", "checkOut", "guests", "rooms"] as const;

function isIsoCalendarDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function recoveryHref(input: HotelResultsRouteInput) {
  const destination = input.destination?.trim();
  const destinationId = input.destinationId?.trim();
  const datesAreRecoverable = isIsoCalendarDate(input.checkIn)
    && isIsoCalendarDate(input.checkOut)
    && input.checkOut! > input.checkIn!;
  const recoverable = {
    ...(destinationId ? { destinationId } : {}),
    ...(destination ? { destination } : {}),
    ...(datesAreRecoverable ? { checkIn: input.checkIn!, checkOut: input.checkOut! } : {}),
  };
  return Object.keys(recoverable).length
    ? `/hotels?${new URLSearchParams(recoverable).toString()}`
    : "/hotels";
}

export function resolveHotelResultsRoute(input: HotelResultsRouteInput) {
  const hasExplicitSearch = requiredFields.every((field) => Boolean(input[field]?.trim()));
  const parsed = hasExplicitSearch ? hotelSearchSchema.safeParse(input) : null;
  if (!parsed?.success) return { resultsReady: false as const, recoveryHref: recoveryHref(input) };
  return { resultsReady: true as const, input: parsed.data };
}
