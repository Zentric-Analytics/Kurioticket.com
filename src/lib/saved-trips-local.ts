const SAVED_TRIPS_STORAGE_KEY = "curioticket_saved_trips_v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readSavedTripIds(): string[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(SAVED_TRIPS_STORAGE_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function writeSavedTripIds(ids: string[]) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      SAVED_TRIPS_STORAGE_KEY,
      JSON.stringify(Array.from(new Set(ids))),
    );
  } catch {
    // Ignore local storage write errors (private mode, quota, etc.)
  }
}

export function toggleSavedTripId(ids: string[], id: string): string[] {
  if (ids.includes(id)) {
    return ids.filter((itemId) => itemId !== id);
  }

  return [...ids, id];
}
