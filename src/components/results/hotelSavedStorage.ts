export const SAVED_HOTEL_IDS_STORAGE_KEY =
  "kurioticket:hotels:saved-ids:v1";
export const SAVED_HOTEL_IDS_CHANGED_EVENT =
  "kurioticket:hotels:saved-ids-changed";

export function normalizeSavedHotelIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalizedIds: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string") continue;

    const trimmedId = entry.trim();
    if (!trimmedId || seen.has(trimmedId)) continue;

    seen.add(trimmedId);
    normalizedIds.push(trimmedId);
  }

  return normalizedIds;
}

export function parseSavedHotelIds(rawValue: string | null): string[] {
  if (!rawValue) return [];

  try {
    return normalizeSavedHotelIds(JSON.parse(rawValue));
  } catch {
    return [];
  }
}

export function serializeSavedHotelIds(ids: readonly string[]): string {
  return JSON.stringify(normalizeSavedHotelIds([...ids]));
}

export function isHotelIdSaved(
  ids: readonly string[],
  hotelId: unknown,
): boolean {
  if (typeof hotelId !== "string") return false;

  const normalizedHotelId = hotelId.trim();
  if (!normalizedHotelId) return false;

  return normalizeSavedHotelIds([...ids]).includes(normalizedHotelId);
}

export function toggleSavedHotelId(
  ids: readonly string[],
  hotelId: unknown,
): string[] {
  const normalizedIds = normalizeSavedHotelIds([...ids]);

  if (typeof hotelId !== "string") return normalizedIds;

  const normalizedHotelId = hotelId.trim();
  if (!normalizedHotelId) return normalizedIds;

  if (normalizedIds.includes(normalizedHotelId)) {
    return normalizedIds.filter((id) => id !== normalizedHotelId);
  }

  return [...normalizedIds, normalizedHotelId];
}

export function filterHotelsBySavedIds<T extends { id: unknown }>(
  hotels: readonly T[],
  savedIds: readonly string[],
): T[] {
  const normalizedSavedIds = new Set(normalizeSavedHotelIds([...savedIds]));

  return hotels.filter((hotel) => {
    if (typeof hotel.id !== "string") return false;

    const normalizedHotelId = hotel.id.trim();
    if (!normalizedHotelId) return false;

    return normalizedSavedIds.has(normalizedHotelId);
  });
}

export const SAVED_HOTEL_SNAPSHOTS_STORAGE_KEY =
  "kurioticket:hotels:saved-snapshots:v1";

export type SavedHotelSnapshot = {
  id: string;
  provider: string;
  hotelName: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  currency: string;
  image?: string;
  imageAlt?: string;
  location?: string;
  rating?: number;
  href: string;
  savedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeSnapshot(value: unknown): SavedHotelSnapshot | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const hotelName =
    typeof value.hotelName === "string" ? value.hotelName.trim() : "";
  const destination =
    typeof value.destination === "string" ? value.destination.trim() : "";
  const checkIn = typeof value.checkIn === "string" ? value.checkIn : "";
  const checkOut = typeof value.checkOut === "string" ? value.checkOut : "";
  const currency =
    typeof value.currency === "string" && value.currency.trim()
      ? value.currency.trim().toUpperCase()
      : "USD";
  const totalPrice =
    typeof value.totalPrice === "number" && Number.isFinite(value.totalPrice)
      ? value.totalPrice
      : 0;

  if (!id || !hotelName || !destination || !checkIn || !checkOut) return null;

  return {
    id,
    provider:
      typeof value.provider === "string" && value.provider.trim()
        ? value.provider.trim()
        : "hotel",
    hotelName,
    destination,
    checkIn,
    checkOut,
    totalPrice,
    currency,
    image: typeof value.image === "string" && value.image.trim() ? value.image : undefined,
    imageAlt:
      typeof value.imageAlt === "string" && value.imageAlt.trim()
        ? value.imageAlt
        : hotelName,
    location:
      typeof value.location === "string" && value.location.trim()
        ? value.location
        : destination,
    rating:
      typeof value.rating === "number" && Number.isFinite(value.rating)
        ? value.rating
        : undefined,
    href:
      typeof value.href === "string" && value.href.trim()
        ? value.href
        : `/hotels/details/${encodeURIComponent(id)}`,
    savedAt:
      typeof value.savedAt === "string" && value.savedAt.trim()
        ? value.savedAt
        : new Date().toISOString(),
  };
}

export function parseSavedHotelSnapshots(
  rawValue: string | null,
): SavedHotelSnapshot[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const snapshots: SavedHotelSnapshot[] = [];
    for (const entry of parsed) {
      const snapshot = normalizeSnapshot(entry);
      if (!snapshot || seen.has(snapshot.id)) continue;
      seen.add(snapshot.id);
      snapshots.push(snapshot);
    }
    return snapshots;
  } catch {
    return [];
  }
}

export function serializeSavedHotelSnapshots(
  snapshots: readonly SavedHotelSnapshot[],
): string {
  const seen = new Set<string>();
  const normalized: SavedHotelSnapshot[] = [];
  for (const snapshot of snapshots) {
    const normalizedSnapshot = normalizeSnapshot(snapshot);
    if (!normalizedSnapshot || seen.has(normalizedSnapshot.id)) continue;
    seen.add(normalizedSnapshot.id);
    normalized.push(normalizedSnapshot);
  }
  return JSON.stringify(normalized);
}

export function upsertSavedHotelSnapshot(
  snapshots: readonly SavedHotelSnapshot[],
  snapshot: SavedHotelSnapshot,
): SavedHotelSnapshot[] {
  const normalizedSnapshot = normalizeSnapshot(snapshot);
  if (!normalizedSnapshot) return [...snapshots];

  return [
    normalizedSnapshot,
    ...snapshots.filter((item) => item.id !== normalizedSnapshot.id),
  ];
}

export function removeSavedHotelSnapshot(
  snapshots: readonly SavedHotelSnapshot[],
  hotelId: string,
): SavedHotelSnapshot[] {
  return snapshots.filter((item) => item.id !== hotelId);
}
