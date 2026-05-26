export type RecentSearchType = "flight" | "hotel";

export type RecentFlightParams = {
  tripType: "round-trip" | "one-way";
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  travelers: number;
  cabinClass: string;
};

export type RecentHotelParams = {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
};

export type RecentSearchEntry = {
  id: string;
  type: RecentSearchType;
  createdAt: string;
  label: string;
  subtitle: string;
  href: string;
  params: RecentFlightParams | RecentHotelParams;
};

const STORAGE_KEY = "curioticket_recent_searches_v1";

const formatIsoDate = (value: string) => {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const stableJson = (value: Record<string, unknown>) =>
  JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const nextValue = value[key];
        if (nextValue !== undefined && nextValue !== "") {
          acc[key] = nextValue;
        }
        return acc;
      }, {})
  );

const buildId = (type: RecentSearchType, params: Record<string, unknown>) =>
  `${type}:${stableJson(params)}`;

export const readRecentSearches = (): RecentSearchEntry[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is RecentSearchEntry => Boolean(entry?.id && entry?.href && entry?.label));
  } catch {
    return [];
  }
};

export const writeRecentSearches = (entries: RecentSearchEntry[]): void => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore write failures in Phase 1
  }
};

export const upsertRecentSearch = (entry: RecentSearchEntry, max = 5): RecentSearchEntry[] => {
  const existing = readRecentSearches();
  const deduped = [entry, ...existing.filter((item) => item.id !== entry.id)].slice(0, max);
  writeRecentSearches(deduped);
  return deduped;
};

export const removeRecentSearch = (id: string): RecentSearchEntry[] => {
  const nextEntries = readRecentSearches().filter((entry) => entry.id !== id);
  writeRecentSearches(nextEntries);
  return nextEntries;
};

export const clearRecentSearches = (): void => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore write failures in Phase 1
  }
};

export const buildFlightRecentSearch = (params: RecentFlightParams): RecentSearchEntry => {
  const id = buildId("flight", params);
  const label = `${params.origin} → ${params.destination}`;
  const outbound = formatIsoDate(params.departureDate) || params.departureDate;
  const inbound = params.returnDate ? formatIsoDate(params.returnDate) || params.returnDate : "One-way";
  const subtitle = `${outbound}${params.returnDate ? ` – ${inbound}` : ""} · ${params.travelers} traveler${params.travelers === 1 ? "" : "s"} · ${params.cabinClass}`;
  const query = new URLSearchParams({
    tripType: params.tripType,
    origin: params.origin,
    destination: params.destination,
    departureDate: params.departureDate,
    adults: String(params.adults),
    children: String(params.children),
    infants: String(params.infants),
    travelers: String(params.travelers),
    cabinClass: params.cabinClass,
  });

  if (params.returnDate) {
    query.set("returnDate", params.returnDate);
  }

  return {
    id,
    type: "flight",
    createdAt: new Date().toISOString(),
    label,
    subtitle,
    href: `/flights/results?${query.toString()}`,
    params,
  };
};

export const buildHotelRecentSearch = (params: RecentHotelParams): RecentSearchEntry => {
  const id = buildId("hotel", params);
  const label = params.destination;
  const subtitle = `${formatIsoDate(params.checkIn) || params.checkIn} – ${formatIsoDate(params.checkOut) || params.checkOut} · ${params.guests} guest${params.guests === 1 ? "" : "s"} · ${params.rooms} room${params.rooms === 1 ? "" : "s"}`;
  const query = new URLSearchParams({
    destination: params.destination,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    guests: String(params.guests),
    rooms: String(params.rooms),
  });

  return {
    id,
    type: "hotel",
    createdAt: new Date().toISOString(),
    label,
    subtitle,
    href: `/hotels/results?${query.toString()}`,
    params,
  };
};
