export const HOTEL_EXPLORATION_SOURCES = [
  "home-popular-stays",
  "home-promo",
  "home-country-directory",
  "hotels-featured",
  "explore",
] as const;

export type HotelExplorationSource = (typeof HOTEL_EXPLORATION_SOURCES)[number];

export type HotelExplorationSearch = {
  destination: string;
  destinationId?: string;
  checkIn: string;
  checkOut: string;
  guests: "2";
  rooms: "1";
  sort: "cheapest";
  intentSource: HotelExplorationSource;
};

function safeText(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 2 && normalized.length <= 120 && !/[\u0000-\u001f\u007f]/.test(normalized)
    ? normalized
    : null;
}

function utcCalendarStart(value: Date) {
  if (Number.isNaN(value.valueOf())) return null;
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function buildHotelExplorationSearch(input: {
  destination: string;
  destinationId?: string;
  source: HotelExplorationSource;
  now?: Date;
}): HotelExplorationSearch | null {
  const destination = safeText(input.destination);
  const today = utcCalendarStart(input.now ?? new Date());
  if (!destination || !today) return null;
  const destinationId = input.destinationId?.trim();
  const checkIn = addUtcDays(today, 28);
  const checkOut = addUtcDays(checkIn, 7);
  return {
    destination,
    ...(destinationId ? { destinationId } : {}),
    checkIn: dateKey(checkIn),
    checkOut: dateKey(checkOut),
    guests: "2",
    rooms: "1",
    sort: "cheapest",
    intentSource: input.source,
  };
}

export function buildHotelExplorationHref(
  input: Parameters<typeof buildHotelExplorationSearch>[0],
  pathname: "/hotels/results" | "/hotel-results" = "/hotels/results",
) {
  const search = buildHotelExplorationSearch(input);
  return search ? `${pathname}?${new URLSearchParams(search).toString()}` : null;
}
