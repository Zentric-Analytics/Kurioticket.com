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
  image?: string;
  imageAlt?: string;
  href: string;
  params: RecentFlightParams | RecentHotelParams;
};

const STORAGE_KEY = "kurioticket_recent_searches_v1";

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
    return parsed
      .filter((entry): entry is RecentSearchEntry => Boolean(entry?.id && entry?.href && entry?.label))
      .map((entry) => ({
        ...entry,
        image: typeof entry.image === "string" ? entry.image : undefined,
        imageAlt: typeof entry.imageAlt === "string" ? entry.imageAlt : undefined,
      }));
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

const RECENT_SEARCHES_API = "/api/account/recent-searches";

const isRecentSearchEntry = (entry: unknown): entry is RecentSearchEntry => {
  if (!entry || typeof entry !== "object") return false;
  const candidate = entry as Partial<RecentSearchEntry>;
  return Boolean(
    candidate.id &&
      candidate.type === "flight" &&
      candidate.createdAt &&
      candidate.label &&
      candidate.subtitle &&
      candidate.href &&
      candidate.params &&
      typeof candidate.params === "object"
  );
};

export const fetchBackendRecentSearches = async (
  signal?: AbortSignal
): Promise<{ ok: boolean; items?: RecentSearchEntry[] }> => {
  try {
    const response = await fetch(RECENT_SEARCHES_API, {
      method: "GET",
      credentials: "same-origin",
      signal,
    });

    if (!response.ok) return { ok: false };

    const payload = (await response.json()) as { items?: unknown[] };
    const items = Array.isArray(payload.items)
      ? payload.items.filter(isRecentSearchEntry)
      : [];

    return { ok: true, items };
  } catch {
    if (signal?.aborted) return { ok: false };
    return { ok: false };
  }
};

export const syncBackendRecentSearch = async (
  entry: RecentSearchEntry
): Promise<{ ok: boolean; item?: RecentSearchEntry }> => {
  try {
    const response = await fetch(RECENT_SEARCHES_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(entry),
    });

    if (!response.ok) return { ok: false };

    const payload = (await response.json()) as { item?: unknown };
    return {
      ok: true,
      item: isRecentSearchEntry(payload.item) ? payload.item : undefined,
    };
  } catch {
    return { ok: false };
  }
};

export const deleteBackendRecentSearch = async (
  id: string
): Promise<{ ok: boolean }> => {
  try {
    const response = await fetch(RECENT_SEARCHES_API, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id }),
    });

    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
};

export const clearBackendRecentSearches = async (): Promise<{ ok: boolean }> => {
  try {
    const response = await fetch(`${RECENT_SEARCHES_API}?clear=all`, {
      method: "DELETE",
      credentials: "same-origin",
    });

    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
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

type SearchImageMeta = {
  image?: string;
  imageAlt?: string;
};

export const buildHotelRecentSearch = (params: RecentHotelParams, imageMeta?: SearchImageMeta): RecentSearchEntry => {
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
    image: imageMeta?.image,
    imageAlt: imageMeta?.imageAlt,
    href: `/hotels/results?${query.toString()}`,
    params,
  };
};

export const buildFlightRecentSearch = (
  params: RecentFlightParams,
  imageMeta?: SearchImageMeta
): RecentSearchEntry => {
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
    image: imageMeta?.image,
    imageAlt: imageMeta?.imageAlt,
    href: `/flights/results?${query.toString()}`,
    params,
  };
};
