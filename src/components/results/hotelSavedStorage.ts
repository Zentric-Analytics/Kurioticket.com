export const SAVED_HOTEL_IDS_STORAGE_KEY =
  "kurioticket:hotels:saved-ids:v1";

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
