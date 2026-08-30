import { getAirportByCode, type AirportOption } from "@/data/airports";
import { hotelDestinations, type HotelDestinationSuggestion } from "@/data/hotelDestinations";

export type RecentSearchType = "flight" | "hotel" | "car";
export const RECENT_SEARCH_MAX_ENTRIES = 10;
export const RECENT_SEARCH_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

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

export type RecentCarParams = {
  pickupLocation: string;
  dropoffLocation?: string;
  pickupDate: string;
  dropoffDate: string;
  pickupTime: string;
  dropoffTime: string;
  driverAge: string;
  unverifiedLocation?: boolean;
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
  params: RecentFlightParams | RecentHotelParams | RecentCarParams;
};

const airportCodeFromRecentValue = (value: unknown) => {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toUpperCase();
  const exact = normalized.match(/^[A-Z]{3}$/)?.[0];
  if (exact) return exact;
  return normalized.match(/\(([A-Z]{3})\)\s*$/)?.[1] ?? "";
};

export function deriveRecentAirports(
  entries: readonly RecentSearchEntry[],
  max = 3,
): AirportOption[] {
  if (max <= 0) return [];
  const seen = new Set<string>();
  const result: AirportOption[] = [];
  const ordered = [...entries].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  for (const entry of ordered) {
    if (entry.type !== "flight") continue;
    const params = entry.params as RecentFlightParams;
    for (const value of [params.origin, params.destination]) {
      const code = airportCodeFromRecentValue(value);
      if (!code || seen.has(code)) continue;
      const airport = getAirportByCode(code);
      if (!airport) continue;
      seen.add(code);
      result.push(airport);
      if (result.length >= max) return result;
    }
  }

  return result;
}

const normalizeRecentHotelDestination = (value: string) =>
  value.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLowerCase();

export function deriveRecentHotelDestinations(
  entries: readonly RecentSearchEntry[],
  max = 3,
): HotelDestinationSuggestion[] {
  if (max <= 0) return [];
  const seen = new Set<string>();
  const result: HotelDestinationSuggestion[] = [];
  const ordered = [...entries].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  for (const entry of ordered) {
    if (entry.type !== "hotel") continue;
    const value = (entry.params as RecentHotelParams).destination;
    if (typeof value !== "string" || !value.trim()) continue;
    const normalized = normalizeRecentHotelDestination(value);
    const destination = hotelDestinations.find((option) => {
      const candidates = [option.name, option.searchValue, `${option.name}, ${option.country}`];
      return candidates.some(
        (candidate) => normalizeRecentHotelDestination(candidate) === normalized,
      );
    });
    if (!destination || seen.has(destination.id)) continue;
    seen.add(destination.id);
    result.push(destination);
    if (result.length >= max) return result;
  }
  return result;
}

const STORAGE_KEY = "kurioticket_recent_searches_v1";
const STORAGE_V2_KEY = "kurioticket_recent_searches_v2";
const REMEMBER_KEY = "kurioticket_remember_recent_searches_v1";
const LEGACY_CLEARED_AT_KEY = "kurioticket_recent_searches_legacy_cleared_at_v1";
const REMOVED_IDS_KEY = "kurioticket_recent_searches_removed_ids_v1";

type RecentSearchEnvelope = { version: 2; entries: RecentSearchEntry[] };

const recentTimestamp = (entry: RecentSearchEntry) => Date.parse(entry.createdAt);
const isRetained = (entry: RecentSearchEntry, now: number) => {
  const timestamp = recentTimestamp(entry);
  return Number.isFinite(timestamp) && timestamp <= now + 5 * 60 * 1000 && now - timestamp <= RECENT_SEARCH_RETENTION_MS;
};

export const normalizeRecentSearches = (
  entries: readonly RecentSearchEntry[],
  now = Date.now(),
  max = RECENT_SEARCH_MAX_ENTRIES,
) => {
  const byId = new Map<string, RecentSearchEntry>();
  [...entries]
    .filter((entry) => isRetained(entry, now))
    .sort((a, b) => recentTimestamp(b) - recentTimestamp(a))
    .forEach((entry) => { if (!byId.has(entry.id)) byId.set(entry.id, entry); });
  return [...byId.values()].slice(0, Math.max(0, max));
};

export const mergeRecentSearches = (
  accountEntries: readonly RecentSearchEntry[],
  deviceEntries: readonly RecentSearchEntry[],
  now = Date.now(),
) => normalizeRecentSearches([...accountEntries, ...deviceEntries], now);

export const isRememberRecentSearchesEnabled = () => {
  if (typeof window === "undefined") return true;
  try { return window.localStorage.getItem(REMEMBER_KEY) !== "false"; } catch { return true; }
};

export const setRememberRecentSearches = (enabled: boolean) => {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(REMEMBER_KEY, String(enabled)); } catch { /* best effort */ }
};

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
      }, {}),
  );

const buildId = (type: RecentSearchType, params: Record<string, unknown>) =>
  `${type}:${stableJson(params)}`;

export const readRecentSearches = (): RecentSearchEntry[] => {
  if (typeof window === "undefined") return [];
  if (!isRememberRecentSearchesEnabled()) return [];

  try {
    const rawV2 = window.localStorage.getItem(STORAGE_V2_KEY);
    const parsedV2 = rawV2 ? JSON.parse(rawV2) as Partial<RecentSearchEnvelope> : null;
    const v2Entries = parsedV2?.version === 2 && Array.isArray(parsedV2.entries) ? parsedV2.entries : [];
    const rawLegacy = window.localStorage.getItem(STORAGE_KEY);
    const parsedLegacy = rawLegacy ? JSON.parse(rawLegacy) : [];
    const clearedAt = Date.parse(window.localStorage.getItem(LEGACY_CLEARED_AT_KEY) ?? "");
    const removedIdsValue = JSON.parse(window.localStorage.getItem(REMOVED_IDS_KEY) ?? "[]");
    const removedIds = new Set(Array.isArray(removedIdsValue) ? removedIdsValue.filter((id): id is string => typeof id === "string") : []);
    const legacyEntries = (Array.isArray(parsedLegacy) ? parsedLegacy : []).filter((entry) =>
      !removedIds.has(entry?.id) && (!Number.isFinite(clearedAt) || Date.parse(entry?.createdAt) > clearedAt),
    );
    return normalizeRecentSearches(
      [...v2Entries, ...legacyEntries]
      .filter((entry): entry is RecentSearchEntry =>
        Boolean(entry?.id && entry?.href && entry?.label),
      )
      .map((entry) => ({
        ...entry,
        image: typeof entry.image === "string" ? entry.image : undefined,
        imageAlt:
          typeof entry.imageAlt === "string" ? entry.imageAlt : undefined,
      })),
    );
  } catch {
    return [];
  }
};

export const writeRecentSearches = (entries: RecentSearchEntry[]): void => {
  if (typeof window === "undefined") return;
  if (!isRememberRecentSearchesEnabled()) return;

  try {
    const envelope: RecentSearchEnvelope = { version: 2, entries: normalizeRecentSearches(entries) };
    window.localStorage.setItem(STORAGE_V2_KEY, JSON.stringify(envelope));
  } catch {
    // ignore write failures in Phase 1
  }
};

export const upsertRecentSearch = (
  entry: RecentSearchEntry,
  max = RECENT_SEARCH_MAX_ENTRIES,
): RecentSearchEntry[] => {
  const existing = readRecentSearches();
  try {
    if (typeof window === "undefined") return existing;
    const removed = JSON.parse(window.localStorage.getItem(REMOVED_IDS_KEY) ?? "[]");
    if (Array.isArray(removed) && removed.includes(entry.id)) {
      window.localStorage.setItem(REMOVED_IDS_KEY, JSON.stringify(removed.filter((id) => id !== entry.id)));
    }
  } catch { /* best effort */ }
  const deduped = [
    entry,
    ...existing.filter((item) => item.id !== entry.id),
  ].slice(0, max);
  writeRecentSearches(deduped);
  return deduped;
};

const RECENT_SEARCHES_API = "/api/account/recent-searches";

const isRecentSearchEntry = (entry: unknown): entry is RecentSearchEntry => {
  if (!entry || typeof entry !== "object") return false;
  const candidate = entry as Partial<RecentSearchEntry>;
  return Boolean(
    candidate.id &&
    (candidate.type === "flight" || candidate.type === "hotel") &&
    candidate.createdAt &&
    candidate.label &&
    candidate.subtitle &&
    candidate.href &&
    candidate.params &&
    typeof candidate.params === "object",
  );
};

export const fetchBackendRecentSearches = async (
  signal?: AbortSignal,
): Promise<{ ok: boolean; items?: RecentSearchEntry[] }> => {
  if (!isRememberRecentSearchesEnabled()) return { ok: true, items: [] };
  try {
    const response = await fetch(RECENT_SEARCHES_API, {
      method: "GET",
      credentials: "same-origin",
      signal,
    });

    if (!response.ok) return { ok: false };

    const payload = (await response.json()) as { items?: unknown[] };
    const items = Array.isArray(payload.items)
      ? payload.items.filter(isRecentSearchEntry).map((entry) => ({
          ...entry,
          createdAt: typeof (entry as RecentSearchEntry & { updatedAt?: unknown }).updatedAt === "string"
            ? (entry as RecentSearchEntry & { updatedAt: string }).updatedAt
            : entry.createdAt,
        }))
      : [];

    return { ok: true, items: mergeRecentSearches(items, readRecentSearches()) };
  } catch {
    if (signal?.aborted) return { ok: false };
    return { ok: false };
  }
};

export const syncBackendRecentSearch = async (
  entry: RecentSearchEntry,
): Promise<{ ok: boolean; item?: RecentSearchEntry }> => {
  if (!isRememberRecentSearchesEnabled()) return { ok: true };
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
  id: string,
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

export const clearBackendRecentSearches = async (): Promise<{
  ok: boolean;
}> => {
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
  try {
    if (typeof window === "undefined") return [];
    const removed = JSON.parse(window.localStorage.getItem(REMOVED_IDS_KEY) ?? "[]");
    const ids = new Set(Array.isArray(removed) ? removed.filter((value): value is string => typeof value === "string") : []);
    ids.add(id);
    window.localStorage.setItem(REMOVED_IDS_KEY, JSON.stringify([...ids].slice(-50)));
  } catch { /* best effort */ }
  const nextEntries = readRecentSearches().filter((entry) => entry.id !== id);
  writeRecentSearches(nextEntries);
  return nextEntries;
};

export const clearRecentSearches = (): void => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_V2_KEY);
    window.localStorage.setItem(LEGACY_CLEARED_AT_KEY, new Date().toISOString());
  } catch {
    // ignore write failures in Phase 1
  }
};

export const buildCarRecentSearch = (params: RecentCarParams): RecentSearchEntry => {
  const id = buildId("car", params);
  const dropoff = params.dropoffLocation?.trim();
  const label = dropoff && dropoff !== params.pickupLocation
    ? `${params.pickupLocation} → ${dropoff}`
    : params.pickupLocation;
  const subtitle = `${formatIsoDate(params.pickupDate) || params.pickupDate} – ${formatIsoDate(params.dropoffDate) || params.dropoffDate}${params.unverifiedLocation ? " · Unverified location" : ""}`;
  const query = new URLSearchParams({
    pickupLocation: params.pickupLocation,
    pickupDate: params.pickupDate,
    pickupTime: params.pickupTime,
    dropoffDate: params.dropoffDate,
    dropoffTime: params.dropoffTime,
    driverAge: params.driverAge,
  });
  if (dropoff) query.set("dropoffLocation", dropoff);
  return { id, type: "car", createdAt: new Date().toISOString(), label, subtitle, href: `/cars/results?${query.toString()}`, params };
};

type SearchImageMeta = {
  image?: string;
  imageAlt?: string;
};

export const buildHotelRecentSearch = (
  params: RecentHotelParams,
  imageMeta?: SearchImageMeta,
): RecentSearchEntry => {
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
  imageMeta?: SearchImageMeta,
): RecentSearchEntry => {
  const id = buildId("flight", params);
  const label = `${params.origin} → ${params.destination}`;
  const outbound = formatIsoDate(params.departureDate) || params.departureDate;
  const inbound = params.returnDate
    ? formatIsoDate(params.returnDate) || params.returnDate
    : "One-way";
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
