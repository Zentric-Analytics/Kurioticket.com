const DAY_COUNT = 5;

export type DateStripPrice = {
  amount: number;
  formatted?: string;
  accessibilityLabel?: string;
};

export type DateStripPriceCandidate = DateStripPrice & { date: string };

export type NearbyDateSuggestion = {
  date: string;
  price: DateStripPrice;
  savings: number;
};

export type VerifiedDateFareMemory = {
  contextKey: string;
  priceByDate: Record<string, DateStripPrice>;
};

/** Keeps the lowest authoritative fare for each calendar date. */
export function buildPriceByDate(candidates: DateStripPriceCandidate[]) {
  return candidates.reduce<Record<string, DateStripPrice>>((prices, candidate) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.date) || !Number.isFinite(candidate.amount)) return prices;
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

/** Departure date is deliberately omitted: it is the one variable being compared. */
export function verifiedDateFareContextKey(
  payload: Record<string, unknown>,
  displayCurrencyIdentity: string,
) {
  const { departureDate: _departureDate, ...comparablePayload } = payload;
  return JSON.stringify([comparablePayload, displayCurrencyIdentity]);
}

export function rememberVerifiedDateFares(
  memory: VerifiedDateFareMemory | undefined,
  contextKey: string,
  candidates: DateStripPriceCandidate[],
): VerifiedDateFareMemory {
  const existing = memory?.contextKey === contextKey ? memory.priceByDate : {};
  const current = buildPriceByDate(candidates);
  return {
    contextKey,
    priceByDate: buildPriceByDate([
      ...Object.entries(existing).map(([date, price]) => ({ date, ...price })),
      ...Object.entries(current).map(([date, price]) => ({ date, ...price })),
    ]),
  };
}

export function deriveNearbyDateSuggestion(
  selectedDate: string,
  visibleDates: string[],
  priceByDate: Record<string, DateStripPrice>,
): NearbyDateSuggestion | null {
  const selected = priceByDate[selectedDate];
  if (!selected || !Number.isFinite(selected.amount)) return null;
  const selectedTime = parseCalendarDate(selectedDate).getTime();
  const candidates = visibleDates
    .filter((date) => date !== selectedDate)
    .flatMap((date) => {
      const price = priceByDate[date];
      if (!price || !Number.isFinite(price.amount) || price.amount >= selected.amount) return [];
      return [{ date, price, distance: Math.abs(parseCalendarDate(date).getTime() - selectedTime) }];
    })
    .sort((a, b) => a.price.amount - b.price.amount || a.distance - b.distance || a.date.localeCompare(b.date));
  const cheapest = candidates[0];
  if (!cheapest) return null;
  const savings = selected.amount - cheapest.price.amount;
  return Number.isFinite(savings) && savings > 0
    ? { date: cheapest.date, price: cheapest.price, savings }
    : null;
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
