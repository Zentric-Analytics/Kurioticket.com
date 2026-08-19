const DAY_COUNT = 5;

export type DateStripPrice = {
  amount: number;
  formatted?: string;
  accessibilityLabel?: string;
};

export type DateStripPriceCandidate = DateStripPrice & { date: string };

/** Keeps the lowest authoritative fare for each calendar date. */
export function buildPriceByDate(candidates: DateStripPriceCandidate[]) {
  return candidates.reduce<Record<string, DateStripPrice>>((prices, candidate) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.date)) return prices;
    const current = prices[candidate.date];
    if (!current || candidate.amount < current.amount) {
      prices[candidate.date] = {
        amount: candidate.amount,
        formatted: candidate.formatted,
        accessibilityLabel: candidate.accessibilityLabel,
      };
    }
    return prices;
  }, {});
}

export function calendarIsoFromTimestamp(timestamp: string) {
  return timestamp.match(/^(\d{4}-\d{2}-\d{2})T/)?.[1];
}

export function parseCalendarDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function toCalendarIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftCalendarDate(iso: string, days: number) {
  const date = parseCalendarDate(iso);
  date.setDate(date.getDate() + days);
  return toCalendarIso(date);
}

export function initialDateWindowStart(selectedDate: string) {
  return shiftCalendarDate(selectedDate, -Math.floor(DAY_COUNT / 2));
}

export function getDateWindow(startDate: string) {
  return Array.from({ length: DAY_COUNT }, (_, offset) =>
    shiftCalendarDate(startDate, offset),
  );
}
